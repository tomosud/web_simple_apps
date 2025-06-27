@echo off
echo 音ゲー(otoge) ローカルサーバー起動中...
echo.
echo ポート: 8008
echo URL: http://localhost:8008
echo.
echo サーバーを停止するには Ctrl+C を押してください
echo.

cd /d "%~dp0"
start http://localhost:8008
python -m http.server 8008