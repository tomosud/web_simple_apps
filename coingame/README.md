# Nexus WebGPU Coin Benchmark

PC版Chrome / Edge向けのNexus 0.5.0 GPU rigid-bodyベンチマークです。初期シーンは10,000枚の薄いネイティブCylinderです。物理計算、姿勢同期、インスタンス描画を同じWebGPUデバイス上で実行し、CPU readbackを避けます。

## 実行

`run.bat` をダブルクリックしてください。8000番から空いているポートを自動選択し、ブラウザを開きます。ページ左側のExamplesから1,000 / 2,000 / 5,000 / 10,000枚を切り替えられます。右上にFPS、frame time、GPU physics time、CPU encoding timeを表示します。

要件:

- Windows 10/11
- PC版ChromeまたはEdge（WebGPU有効）
- Python 3（ローカルサーバー用）

Safari/iPhone、Firefox、WebGLフォールバックは対象外です。

## シーン

- Nexus 0.5.0 / WebGPU backend
- 共有された解析的Cylinder collider（radius 0.5、thickness 0.1）
- Dense stack、seed固定の微小jitter
- X/Z傾斜をロック、Y軸回転は有効
- 1 physics step / rendered frame
- floor + 4 walls
- 初期値10,000 coins

## 再ビルド

初回のみRust-GPU環境を準備します。

```powershell
cargo install cargo-gpu --version 0.10.0-alpha.1
cargo gpu install
rustup target add wasm32-unknown-unknown --toolchain nightly-2026-04-11
```

その後:

```bat
scripts\build_nexus.bat
```

ビルドは`wasm-bindgen-cli`のCargo.lock一致版をプロジェクト内`.tools/`へ自動導入し、`pkg/`を生成します。完了時に`index.html`とWASM URLのキャッシュバスターもUTC時刻へ更新します。`pkg/`はGitHub Pages向けのビルド済み成果物です。

## 構成

- `rust/main.rs`: Nexus physics scene、GPU計測、UI
- `pkg/`: GitHub Pagesで配信する生成済みJS/WASM
- `scripts/build_nexus.ps1`: 再現ビルド
- `scripts/bump_cache_buster.ps1`: JS/WASMキャッシュ更新
- `scripts/serve.py`: 空きポート選択、no-storeローカルサーバー
- `box3d_wasm_coin_benchmark_spec_old.md`: 旧Box3D仕様（参照用）

旧Box3Dソース／ビルド資産は移行の比較用に残していますが、`index.html`からは一切参照されず、実行版はNexus専用です。

## 既知の制約

Nexusは開発途上です。ブラウザ起動時のGPUパイプライン作成に時間がかかります。生成WASMは最適化前で約28MBです。10,000枚・60FPS達成可否はGPUとブラウザのWebGPU実装に依存します。
