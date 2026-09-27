$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root
function Assert-LastExit([string]$Step) {
  if ($LASTEXITCODE -ne 0) { throw "$Step failed with exit code $LASTEXITCODE" }
}
rustup target add wasm32-unknown-unknown --toolchain nightly-2026-04-11
Assert-LastExit 'rustup target add'
if (-not (Get-Command cargo-gpu -ErrorAction SilentlyContinue)) {
  cargo install cargo-gpu --version 0.10.0-alpha.1
  Assert-LastExit 'cargo-gpu install'
  cargo gpu install
  Assert-LastExit 'Rust-GPU toolchain install'
}
cargo +nightly-2026-04-11 build --release --target wasm32-unknown-unknown
Assert-LastExit 'Nexus WASM build'
$lock = Get-Content -Raw (Join-Path $root 'Cargo.lock')
$match = [regex]::Match($lock, 'name = "wasm-bindgen"\r?\nversion = "([^"]+)"')
if (-not $match.Success) { throw 'wasm-bindgen version was not found in Cargo.lock' }
$version = $match.Groups[1].Value
$toolRoot = Join-Path $root ".tools\wasm-bindgen-$version"
$bindgen = Join-Path $toolRoot 'bin\wasm-bindgen.exe'
if (-not (Test-Path $bindgen)) {
  cargo install wasm-bindgen-cli --version $version --root $toolRoot
  Assert-LastExit 'wasm-bindgen-cli install'
}
New-Item -ItemType Directory -Force (Join-Path $root 'pkg') | Out-Null
& $bindgen (Join-Path $root 'target\wasm32-unknown-unknown\release\nexus_coin_benchmark.wasm') `
  --out-dir (Join-Path $root 'pkg') --out-name nexus_coin_benchmark --target web --no-typescript
Assert-LastExit 'wasm-bindgen'
& (Join-Path $PSScriptRoot 'bump_cache_buster.ps1')
Write-Host 'Nexus WebAssembly build complete.' -ForegroundColor Green
