@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Kifu Editor - Startup diagnostics
echo Kifu Editor - Windows launcher 02.1
echo.
pushd "%~dp0.."
if errorlevel 1 goto folder_error
echo Application folder: %CD%
echo.
if not exist "backend\server.cjs" goto files_error
if not exist "backend\engine.cjs" goto files_error
if not exist "web\index.html" goto files_error
set "KIFU_NODE=node.exe"
where.exe node.exe >nul 2>nul
if not errorlevel 1 goto node_found
if exist "%ProgramFiles%\nodejs\node.exe" goto standard_node
if exist "%LocalAppData%\Programs\nodejs\node.exe" goto local_node
echo ERROR: Node.js was not found.
echo Install Node.js LTS, then close this window and try again.
echo https://nodejs.org/
goto done
:standard_node
set "KIFU_NODE=%ProgramFiles%\nodejs\node.exe"
goto node_found
:local_node
set "KIFU_NODE=%LocalAppData%\Programs\nodejs\node.exe"
:node_found
echo Node.js version:
"%KIFU_NODE%" --version
if errorlevel 1 goto node_error
"%KIFU_NODE%" -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)"
if errorlevel 1 goto version_error
echo.
echo Starting the local server...
echo Keep this window open while using the editor.
echo If the browser does not open, visit http://127.0.0.1:47831/
echo.
"%KIFU_NODE%" "backend\server.cjs"
set "KIFU_EXIT=%ERRORLEVEL%"
echo.
echo Server stopped. Exit code: %KIFU_EXIT%
goto done
:version_error
echo ERROR: Node.js 20 or later is required. Install the current LTS version.
goto done
:node_error
echo ERROR: Node.js could not start. Please check the message above.
goto done
:files_error
echo ERROR: Application files are missing.
echo Extract the entire original ZIP before applying this patch.
goto done
:folder_error
echo ERROR: Could not open the application folder.
endlocal
exit /b 1
:done
echo.
echo If startup failed, send a screenshot of this entire window.
echo You can close this window with the X button.
popd
endlocal
exit /b
