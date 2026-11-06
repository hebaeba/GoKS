# Exercise the real script against a tiny offline release, including rollback.
$ErrorActionPreference='Stop'
$source=Get-Content -Raw -LiteralPath "$PSScriptRoot/../backend/install-recommended.ps1"
$temp=Join-Path ([IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString())
[void][IO.Directory]::CreateDirectory($temp)
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
 $r=(& $run)|ConvertFrom-Json
 if(!$r.exe -or !(Test-Path $r.exe) -or !(Test-Path $r.model)){throw "Failed setup: $($r.error)"}
 if(((& $run)|ConvertFrom-Json).error -ne 'exists'){throw 'Existing directory overwritten'}
 Remove-Item katago -Recurse -Force
 $digest='0'*64
 if(((& $run)|ConvertFrom-Json).error -ne 'verify'){throw 'Bad hash not rejected'}
 if((Test-Path katago) -or @(Get-ChildItem -Force -Filter '.goks-install-*').Count){throw 'Failed install left files'}
} finally {Pop-Location;Remove-Item -LiteralPath $temp -Recurse -Force}
