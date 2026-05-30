# HDR Glow Tap

`three.js` の bloom と露出制御を使って、明るいポリゴンとパーティクルを見せる軽量デモです。GitHub Pages にそのまま置ける静的構成で、iOS ブラウザでも動かしやすいよう依存は CDN の ES Modules のみにしています。

## ファイル

- `index.html`: UI とキャンバス
- `style.css`: HUD とモバイル向けレイアウト
- `main.js`: Three.js シーン、postprocessing、ゲーム処理

## 操作

- 画面タップ: 発光ポリゴンを壊して得点
- `Brightness` スライダー: `renderer.toneMappingExposure` を変更
- 赤いターゲットや空打ちはエネルギー減少

## 実装メモ

- レンダラは `ACESFilmicToneMapping` を使用
- 発光体は高い `emissiveIntensity` を設定
- `UnrealBloomPass` で bloom を追加
- `dynamic-range: high` の media query が使える環境では表示ラベルを切り替え

## 参考にした公式情報

- Three.js `WebGLRenderer` docs  
  https://threejs.org/docs/#api/en/renderers/WebGLRenderer
- Three.js `UnrealBloomPass` example  
  https://threejs.org/examples/#webgl_postprocessing_unreal_bloom
- WebKit blog: Safari 14 の `dynamic-range: high` 対応  
  https://webkit.org/blog/11340/new-webkit-features-in-safari-14/

## GitHub Pages

この `hdr/` フォルダを公開対象に含めれば、たとえば以下で開けます。

`https://<username>.github.io/web_simple_apps/hdr/`

## 注意

このデモは「高輝度レンダリング + トーンマッピング + bloom」による HDR 風表現です。iPhone / Safari 上での実パネルHDR表示は端末とブラウザ実装依存なので、見え方は機種ごとに変わります。
