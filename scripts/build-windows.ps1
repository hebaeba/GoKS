$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) { throw 'Rust and Visual Studio C++ Build Tools are required on the build machine.' }
node scripts/check-window-assets.cjs
if ($LASTEXITCODE -ne 0) { throw 'Update all independent-window files together before building.' }
# Cargo embeds web assets. End users do not need Node.js or Rust.
cargo build --release --manifest-path src-tauri/Cargo.toml --features custom-protocol
if ($LASTEXITCODE -ne 0) { throw 'Windows build failed. No release was created.' }
# Recreate the generated release directory: never carry old engines into the ZIP.
if (Test-Path dist) { Remove-Item dist -Recurse -Force }
New-Item -ItemType Directory dist | Out-Null
Copy-Item src-tauri/target/release/kifu-editor.exe dist/GoKS.exe
Copy-Item README.md, README-en.md, Manual.html, THIRD_PARTY_NOTICES.md dist -Force
Copy-Item web/LICENSE.txt dist/LICENSE.txt -Force
Copy-Item web/licenses.html, web/licenses-en.html dist -Force
Copy-Item web/licenses dist/licenses -Recurse -Force
node scripts/check-release-docs.cjs dist
if ($LASTEXITCODE -ne 0) { throw 'Release documentation is incomplete.' }
Get-FileHash dist/GoKS.exe -Algorithm SHA256 | Format-List | Out-File dist/SHA256.txt -Encoding utf8
Write-Host 'Created dist/GoKS.exe. Test on Windows before distribution.'
