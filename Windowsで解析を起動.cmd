@echo off
setlocal
"%ComSpec%" /d /k call "%~dp0backend\start-windows.cmd"
endlocal
exit /b
