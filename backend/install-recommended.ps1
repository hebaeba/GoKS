# Installed only on explicit request. The desktop host sets the working directory
# to the GoKS.exe directory, never to a renderer-supplied path.
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding($false)
$stage=$null
$code='write'
try {
 $base=(Get-Location).ProviderPath
 $dest=Join-Path $base 'katago'
 if(Test-Path -LiteralPath $dest){$code='exists';throw 'exists'}
 $stage=Join-Path $base ('.goks-install-'+[guid]::NewGuid().ToString('N'))
 [void][IO.Directory]::CreateDirectory($stage)
 $asset='katago-v1.18.1-eigen-windows-x64.zip'
 $model='kata1-b10c128-s1141046784-d204142634.txt.gz'
 $zip=Join-Path $stage $asset
 $code='download'
 [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
 $release=Invoke-RestMethod -Uri 'https://api.github.com/repos/lightvector/KataGo/releases/tags/v1.18.1' -Headers @{'User-Agent'='GoKS-engine-setup'} -TimeoutSec 45
 $meta=@($release.assets | Where-Object name -eq $asset)
 $code='verify'
 if($meta.Count -ne 1 -or $meta[0].digest -notmatch '^sha256:[a-fA-F0-9]{64}$'){throw 'digest'}
 $code='download'
 Invoke-WebRequest -UseBasicParsing -TimeoutSec 300 -Uri ('https://github.com/lightvector/KataGo/releases/download/v1.18.1/'+$asset) -OutFile $zip
 $code='verify'
 if('sha256:'+(Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash -ne $meta[0].digest){throw 'zip'}
 $code='extract'
 $unpack=Join-Path $stage 'unpacked'
 Add-Type -AssemblyName System.IO.Compression.FileSystem
 [IO.Compression.ZipFile]::ExtractToDirectory($zip,$unpack)
 $exe=@(Get-ChildItem -LiteralPath $unpack -Recurse -File | Where-Object {$_.Name -in 'katago.exe','katago-eigen.exe'})
 if($exe.Count -ne 1){throw 'exe'}
 $root=$exe[0].Directory.FullName
 $models=Join-Path $root 'models'
 [void][IO.Directory]::CreateDirectory($models)
 $file=Join-Path $models $model
 $code='download'
 Invoke-WebRequest -UseBasicParsing -TimeoutSec 300 -Uri ('https://media.katagotraining.org/uploaded/networks/models/kata1/'+$model) -OutFile $file
 $code='verify'
 $stream=[IO.File]::OpenRead($file)
 try {
  $gz=New-Object IO.Compression.GZipStream($stream,[IO.Compression.CompressionMode]::Decompress)
  try {$sha=[Security.Cryptography.SHA256]::Create();try {$hash=[BitConverter]::ToString($sha.ComputeHash($gz)).Replace('-','')}finally{$sha.Dispose()}} finally {$gz.Dispose()}
 } finally {$stream.Dispose()}
 if($hash -ne '3086fce524b9e7a8a979f6eed740d095ef8f3891233b60c709e3d640f997bc13'){throw 'model'}
 $info=@{exe=('./katago/'+$exe[0].Name);model=('./katago/models/'+$model);workdir='./katago';config=''}
 $code='write'
 [IO.Directory]::Move($root,$dest)
 $result=$info
} catch {$result=@{error=$code}}
finally {if($stage -and (Test-Path -LiteralPath $stage)){Remove-Item -LiteralPath $stage -Force -Recurse -ErrorAction SilentlyContinue}}
Write-Output ($result|ConvertTo-Json -Compress)
