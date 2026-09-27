@echo off
cd /d "%~dp0"

where python >nul 2>nul
if %errorlevel%==0 (
    python scripts\serve.py
    goto end
)

where py >nul 2>nul
if %errorlevel%==0 (
    py scripts\serve.py
    goto end
)

echo Python was not found.
pause

:end
