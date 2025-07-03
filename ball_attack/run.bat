@echo off

echo サーバーを停止するには Ctrl+C を押してください
echo.
cd /d "%~dp0"
start http://localhost:8089
python -m http.server 8089
