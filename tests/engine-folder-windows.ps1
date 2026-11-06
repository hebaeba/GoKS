$ErrorActionPreference='Stop'
$root=Join-Path ([System.IO.Path]::GetTempPath()) ([guid]::NewGuid())
try {
 New-Item -ItemType Directory -Path "$root/models","$root/configs" -Force | Out-Null
 foreach ($file in 'katago.exe','models/a.bin.gz','models/b.txt.gz','configs/default_gtp.cfg','configs/analysis_example.cfg','README.txt') {
  New-Item -ItemType File -Path (Join-Path $root $file) | Out-Null
 }
 $found=(& "$PSScriptRoot/../backend/select-file.ps1" -Kind folder -FolderPath $root) | ConvertFrom-Json
 if ($found.folder -ne $root -or $found.exe.Count -ne 1 -or $found.model.Count -ne 2 -or $found.config.Count -ne 1) {throw 'Unexpected KataGo folder candidate list'}
} finally {if(Test-Path $root){Remove-Item $root -Recurse -Force}}
