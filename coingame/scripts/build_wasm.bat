@echo off
setlocal
cd /d "%~dp0\.."

where emcmake >nul 2>nul
if errorlevel 1 (
  echo Emscripten is not active. Run emsdk_env.bat first.
  exit /b 1
)

if exist build-wasm rmdir /s /q build-wasm
call emcmake cmake -S . -B build-wasm -DBOX3D_SAMPLES=OFF -DCMAKE_BUILD_TYPE=Release
if errorlevel 1 exit /b 1
cmake --build build-wasm --config Release
if errorlevel 1 exit /b 1
python scripts\bump_cache_buster.py
if errorlevel 1 exit /b 1
echo Built wasm\box3d_bridge.js and wasm\box3d_bridge.wasm



