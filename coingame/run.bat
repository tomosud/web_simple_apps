@echo off
cd /d "%~dp0"

where python >nul 2>nul
if %errorlevel%==0 (
    echo Starting server at http://localhost:8000
    python -m http.server 8000
    goto end
)

where py >nul 2>nul
if %errorlevel%==0 (
    echo Starting server at http://localhost:8000
    py -m http.server 8000
    goto end
)

echo Python was not found.
pause

:end
