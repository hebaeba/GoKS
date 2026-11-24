# Exercise the real script against a tiny offline release, including rollback.
$ErrorActionPreference='Stop'
$source=Get-Content -Raw -LiteralPath "$PSScriptRoot/../backend/install-recommended.ps1"
$temp=Join-Path ([IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString())
[void][IO.Directory]::CreateDirectory($temp)
$originalCfg=$env:GOKS_HUMAN_CFG
$env:GOKS_HUMAN_CFG=$null
Push-Location $temp
try {
 $fixtures=New-Item -ItemType Directory archive
 [IO.File]::WriteAllText((Join-Path $fixtures.FullName 'katago.exe'),'test')
 Add-Type -AssemblyName System.IO.Compression.FileSystem
 $archive=Join-Path $temp 'fixture.zip'
 [IO.Compression.ZipFile]::CreateFromDirectory($fixtures.FullName,$archive)
 $modelPath=Join-Path $temp 'test.gz'
 $bytes=[Text.Encoding]::UTF8.GetBytes('test model')
 $file=[IO.File]::Create($modelPath)
 $gz=New-Object IO.Compression.GZipStream($file,[IO.Compression.CompressionMode]::Compress)
 $gz.Write($bytes,0,$bytes.Length);$gz.Dispose();$file.Dispose()
 $sha=[Security.Cryptography.SHA256]::Create()
 $expected=[BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-','');$sha.Dispose()
 $run=[scriptblock]::Create($source.Replace('3086fce524b9e7a8a979f6eed740d095ef8f3891233b60c709e3d640f997bc13',$expected))
 $digest=(Get-FileHash $archive).Hash
 function Invoke-RestMethod {param($Uri,$Headers,$TimeoutSec) [pscustomobject]@{assets=@([pscustomobject]@{name='katago-v1.18.1-eigen-windows-x64.zip';digest=('sha256:'+$digest)})}}
 function Invoke-WebRequest {param([switch]$UseBasicParsing,$TimeoutSec,$Uri,$OutFile) if($Uri.EndsWith('.zip')){Copy-Item $archive $OutFile}else{Copy-Item $modelPath $OutFile}}
 $r=((& $run)|Select-Object -Last 1)|ConvertFrom-Json
 if(!$r.exe -or !(Test-Path $r.exe) -or !(Test-Path $r.model)){throw "Failed setup: $($r.error)"}
 # Deliberately break the old installation and leave a custom file.
 [IO.File]::WriteAllText((Join-Path $temp 'katago/custom-model.txt'),'custom user data')
 Remove-Item -LiteralPath (Join-Path $temp 'katago/models/kata1-b10c128-s1141046784-d204142634.txt.gz') -Force
 $existing=((& $run)|Select-Object -Last 1)|ConvertFrom-Json
 if(!$existing.exe -or !(Test-Path $existing.model) -or !$existing.backup){throw 'Existing installation was not repaired'}
 # Preserve the leading dot in '.goks-katago-backup-*'.
 # TrimStart('./') is wrong: it also removes the dot from the backup folder name.
 if ($existing.backup -notmatch '^\./\.goks-katago-backup-[0-9a-f]{32}$') {throw 'Unexpected backup location'}
 $backupFolder=Join-Path $temp ($existing.backup.Substring(2))
 if (!(Test-Path -LiteralPath (Join-Path $backupFolder 'custom-model.txt'))) {throw 'Custom files not backed up'}
 if(Test-Path (Join-Path $temp 'katago/custom-model.txt')){throw 'Old installation was not swapped out'}
 # Use the same verified fixture to exercise the second installation independently.
 $env:GOKS_HUMAN_CFG='humanSLProfile = rank_1d'
 $humanScript=$run.ToString().Replace('637746e44f0efe00ad1245a50aa9bbf0716efe364c43965ead97bd6835d84ab5',(Get-FileHash $modelPath).Hash)
 $humanRun=[scriptblock]::Create($humanScript)
 $humanResult=((& $humanRun)|Select-Object -Last 1)|ConvertFrom-Json
 if(!(Test-Path $existing.exe) -or !(Test-Path $humanResult.exe) -or $existing.exe -eq $humanResult.exe){throw 'Installations are not independent'}
 if((Get-Content -Raw $humanResult.config) -ne $env:GOKS_HUMAN_CFG){throw 'Human config mismatch'}
 if($humanResult.extraArgs[0] -ne '-human-model' -or !(Test-Path (Join-Path $humanResult.workdir $humanResult.extraArgs[1]))){throw 'Human model not registered'}
 $failedHuman=((& $run)|Select-Object -Last 1)|ConvertFrom-Json
 if($failedHuman.error -ne 'verify' -or !(Test-Path $humanResult.config)){throw 'Corrupt human model replaced existing installation'}
 $env:GOKS_HUMAN_CFG=$null
 Remove-Item katago -Recurse -Force
 $digest='0'*64
 $bad=((& $run)|Select-Object -Last 1)|ConvertFrom-Json
 if($bad.error -ne 'verify'){throw 'Bad hash not rejected'}
 if((Test-Path katago) -or @(Get-ChildItem -Force -Filter '.goks-install-*').Count){throw 'Failed install left files'}
} finally {$env:GOKS_HUMAN_CFG=$originalCfg;Pop-Location;Remove-Item -LiteralPath $temp -Recurse -Force}
