param([ValidateSet('exe','model','config')][string]$Kind)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName System.Windows.Forms
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
