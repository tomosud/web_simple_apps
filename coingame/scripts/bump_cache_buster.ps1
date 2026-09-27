param([string]$Version)
$ErrorActionPreference = 'Stop'
if (-not $Version) { $Version = (Get-Date).ToUniversalTime().ToString('yyyyMMddHHmmss') }
$utf8 = New-Object System.Text.UTF8Encoding($false)
$indexPath = Join-Path $PSScriptRoot '..\index.html'
$index = [IO.File]::ReadAllText($indexPath)
$index = [regex]::Replace($index, "const CACHE_VERSION = '[^']+';", "const CACHE_VERSION = '$Version';")
[IO.File]::WriteAllText($indexPath, $index, $utf8)
$jsPath = Join-Path $PSScriptRoot '..\pkg\nexus_coin_benchmark.js'
if (Test-Path $jsPath) {
  $js = [IO.File]::ReadAllText($jsPath)
  $js = [regex]::Replace($js, "nexus_coin_benchmark_bg\.wasm(?:\?v=[^']+)?", "nexus_coin_benchmark_bg.wasm?v=$Version")
  [IO.File]::WriteAllText($jsPath, $js, $utf8)
}
Write-Host "Cache version: $Version"
