$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) { throw 'Rust and Visual Studio C++ Build Tools are required on the build machine.' }
# Cargo embeds web assets. End users do not need Node.js or Rust.
cargo build --release --manifest-path src-tauri/Cargo.toml --features custom-protocol
if ($LASTEXITCODE -ne 0) { throw 'Windows build failed. No release was created.' }
New-Item -ItemType Directory -Force dist | Out-Null
Copy-Item src-tauri/target/release/kifu-editor.exe dist/kifu-editor.exe -Force
if (Test-Path dist/engines) { Remove-Item dist/engines -Recurse -Force }
Copy-Item engines dist/engines -Recurse -Force
node scripts/check-bundled-engine.cjs
if ($LASTEXITCODE -ne 0) { throw 'Bundled KataGo startup or analysis check failed.' }
if (Test-Path dist/engines/eigen/analysis_logs) { Remove-Item dist/engines/eigen/analysis_logs -Recurse -Force }
Copy-Item WINDOWS-TEST.md dist/README.txt -Force
Copy-Item web/LICENSE.txt dist/LICENSE.txt -Force
Copy-Item web/licenses.html dist/licenses.html -Force
Copy-Item web/licenses dist/licenses -Recurse -Force
Get-FileHash dist/kifu-editor.exe -Algorithm SHA256 | Format-List | Out-File dist/SHA256.txt -Encoding utf8
Write-Host 'Created dist/kifu-editor.exe. Test on Windows before distribution.'
