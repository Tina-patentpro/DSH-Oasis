@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "SCRIPT_DIR=%~dp0"
node "%SCRIPT_DIR%dsh-isolated.mjs" %*
exit /b %ERRORLEVEL%
