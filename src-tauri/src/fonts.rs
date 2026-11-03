#[tauri::command]
pub async fn desktop_fonts()->Result<Vec<String>,String>{
 tauri::async_runtime::spawn_blocking(||{
  #[cfg(windows)] {
   use std::os::windows::process::CommandExt;
   let script=r#"$ErrorActionPreference='Stop'; [Console]::OutputEncoding=New-Object System.Text.UTF8Encoding($false); Add-Type -AssemblyName System.Drawing; $fonts=New-Object System.Drawing.Text.InstalledFontCollection; try { ConvertTo-Json -Compress -InputObject @($fonts.Families | ForEach-Object { $_.Name } | Sort-Object -Unique) } finally { $fonts.Dispose() }"#;
   let output=std::process::Command::new("powershell.exe").args(["-NoLogo","-NoProfile","-NonInteractive","-Command",script]).creation_flags(0x08000000).output().map_err(|e|format!("Font enumeration failed: {}",e))?;
   if !output.status.success(){return Err("Installed fonts could not be listed. Enter a font family manually.".into());}
   let mut fonts:Vec<String>=serde_json::from_slice(&output.stdout).map_err(|e|format!("Invalid font list: {}",e))?;
   fonts.retain(|s|!s.is_empty()&&s.chars().count()<=80&&!s.starts_with('@'));fonts.sort();fonts.dedup();Ok(fonts)
  }
  #[cfg(not(windows))] {Ok(Vec::<String>::new())}
 }).await.map_err(|e|e.to_string())?
}
