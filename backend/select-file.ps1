param([ValidateSet('exe','model','config','folder','cpu','network')][string]$Kind,[string]$FolderPath)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName System.Windows.Forms
if ($Kind -eq 'cpu' -or $Kind -eq 'network') {
 $url = if ($Kind -eq 'cpu') {'https://github.com/lightvector/KataGo/releases/download/v1.18.1/katago-v1.18.1-eigen-windows-x64.zip'} else {'https://media.katagotraining.org/uploaded/networks/models/kata1/kata1-b10c128-s1141046784-d204142634.txt.gz'}
 Start-Process $url
 return
}
if ($Kind -eq 'folder') {
 $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
 try {
  if ($FolderPath) { $root = $FolderPath } else {
   if ($dialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { return }; $root = $dialog.SelectedPath
  }
  $files = @(Get-ChildItem -LiteralPath $root -File)
  foreach ($sub in 'models','model','configs','config') {
   $dir = Join-Path $root $sub
   if (Test-Path -LiteralPath $dir -PathType Container) { $files += @(Get-ChildItem -LiteralPath $dir -File) }
  }
  $result = @{
   folder = $root
   exe = @($files | Where-Object Name -Match '^katago.*\.exe$' | Sort-Object FullName | ForEach-Object FullName)
   model = @($files | Where-Object Name -Match '(\.bin(\.gz)?$|\.txt\.gz$|^model\.txt$)' | Sort-Object FullName | ForEach-Object FullName)
   config = @($files | Where-Object { $_.Extension -eq '.cfg' -and $_.Name -notmatch 'analysis|contribute|match|benchmark|selfplay' } | Sort-Object FullName | ForEach-Object FullName)
  }
  Write-Output ($result | ConvertTo-Json -Compress)
 } finally { $dialog.Dispose() }
 return
}
$filters = @{
 exe = 'All files (*.*)|*.*'
 model = 'All files (*.*)|*.*'
 config = 'All files (*.*)|*.*'
}
$owner = New-Object System.Windows.Forms.Form
$dialog = New-Object System.Windows.Forms.OpenFileDialog
try {
 $owner.TopMost = $true
 $owner.ShowInTaskbar = $false
 $owner.Opacity = 0
 $owner.Show()
 $dialog.Title = 'Select engine ' + $Kind
 $dialog.Filter = $filters[$Kind]
 $dialog.CheckFileExists = $true
 $dialog.Multiselect = $false
 $dialog.RestoreDirectory = $true
 if ($dialog.ShowDialog($owner) -eq [System.Windows.Forms.DialogResult]::OK) {
  [Console]::WriteLine($dialog.FileName)
 }
} finally {
 $dialog.Dispose()
 $owner.Close()
 $owner.Dispose()
}
