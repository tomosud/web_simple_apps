# 目の開閉検出（Blendshape方針）計画

このプロジェクトは「瞬きを真似する」デモ `blink_mimic.html` を中核に、MediaPipe Tasks版 Face Landmarker の Blendshape（例: `eyeBlinkLeft`, `eyeBlinkRight`）を活用して、EARしきい値依存からの脱却と時系列の安定化（パカパカ抑制）を目的とします。

## 現状と変更点
- 不要ファイルを整理し、`blink_mimic.html` + `assets/eye/*` + `run.bat` + ドキュメント（README/PLAN）の最小構成へ縮小。
- 以後は Blendshape ベースの時系列推定に移行。EARは参考指標に留める。

## 成果物（スコープ）
- `blink_mimic.html`（Blendshape版）
  - MediaPipe Tasks Vision の Face Landmarker（`vision_bundle.js` + `face_landmarker.task`）をCDN利用で読み込み。
  - 推論出力の `faceBlendshapes` から `eyeBlinkLeft/Right` を取得し、確率の時系列を状態機械で「開/半目/閉」へ安定判定。
  - 画像スワップ（white/open/close）・瞬き時間の可視化は現仕様を踏襲。

## 設計方針（安定化ロジック）
- ヒステリシス: 開判定と閉判定の閾値を分離（例: 開0.35↑, 閉0.65↑を「閉」とし、戻りは0.45↓など）。
- 最小継続時間: 状態切替は一定時間（例: 80–120ms）以上継続で確定（デバウンス）。
- リフラクトリ: まばたき確定後の短時間は再検出を抑制。
- 片目/両目: 左右それぞれの `eyeBlink*` を評価し、UIは「両目」「片目」を区別。まばたきは左右平均で確定。
- セルフキャリブレーション（任意）: 初回5–10秒のサンプル分布で個体差を吸収（中央値±MAD等）。

## 実装計画（タスク）
1) 依存切替準備
- CDN読み込みを MediaPipe Tasks Vision へ変更（`vision_bundle.js`）。
- Face Landmarker 作成時に `outputFaceBlendshapes: true` を指定。

2) 取得データと状態機械
- 毎フレーム `faceBlendshapes` の `eyeBlinkLeft/Right`（スコア0〜1）を取得。
- 時系列バッファ（直近N=8〜16）を保持し、上記の安定化ロジックで開閉状態を推定。

3) UI連携
- 状態に応じた画像スワップ・タイマーUIは現行ロジックを踏襲。
- デバッグ表示（`?debug=true`）でブレンドシェイプ値・しきい値・状態をオーバーレイ表示。

4) パフォーマンス/互換
- 解像度・fpsを環境に合わせて自動調整（30fps目安）。
- モバイルSafari/Android Chromeでの権限・HTTPS要件を考慮（公開時はGitHub Pages想定）。

## 動作要件
- HTTPS配信（カメラアクセスのため）。
- MediaPipe Tasks Vision をCDNから取得可能なネットワーク環境。

## テスト観点
- 点滅照明/逆光/眼鏡/斜め顔での誤反応の抑制。
- 「半目」停滞時に状態が安定して維持されること。
- レイテンシ: 目標100–150ms以内で状態変化が確定。

## ファイル構成（現在）
```
eye_close/
├── blink_mimic.html        # メイン（Blendshape版に更新予定）
├── assets/
│   └── eye/{eye_white.png, eye_open.png, eye_close.png}
├── run.bat                 # ローカルHTTPサーバ起動
├── README.md               # 仕様
└── PLAN.md                 # 本計画（このファイル）
```

## 今後のマイルストーン
- M1: Blendshape版の最小実装（両目の開閉推定・画像スワップ・ログ）
- M2: ヒステリシス＋最小継続＋リフラクトリ導入で安定化
- M3: デバッグUI・簡易キャリブレーション
- M4: 軽い検証（モバイル/デスクトップ）と閾値の微調整

## 変更履歴（今回）
- 未参照のファイル/サンプルを削除（index.html, blink_detection.html, tensorflow_test.html, css/, js/, samplecode/, simple_test.html）。
- PLAN.md を Blendshape 方針に全面更新。

