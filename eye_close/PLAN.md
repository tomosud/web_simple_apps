# 目の開閉検出ゲーム - 実装計画

## 開発ルール
このフォルダ以下で実装し、コーディングするAIは他フォルダを更新しないこと。

- Github pageに静的にhostできる技術で作成する事
- スマホでの実行を可能とすること
- 関数のファイルは約４００行までを限度とし、それ以上になりそうな場合は計画的にファイルを分割する事
- 各ゲームのフォルダ以下にREADME.md（仕様）とPLAN.md（実装計画）を作成し、常に内容を最新にしながら実装する事

## Phase 1: 技術検証実装 (現在)

### 1. プロジェクト構造作成
```
eye_close/
├── index.html          # エントリポイント
├── js/
│   ├── camera.js       # カメラ制御ロジック (~200行)
│   ├── faceDetector.js # 顔・目検出ロジック (~300行)
│   └── gameUI.js       # UI制御とアニメーション (~200行)
├── css/
│   └── style.css       # スタイルシート
├── run.bat            # 開発用サーバー起動
├── README.md          # 仕様書
└── PLAN.md           # 本ファイル
```

### 2. 実装ステップ

#### Step 1: 基本HTML構造
- **index.html**: 基本レイアウト作成
- カメラ表示エリア
- 状態表示エリア (クレジット風)
- MediaPipe CDN読み込み
- 必要なJSファイル読み込み

#### Step 2: カメラ制御実装
- **camera.js**: カメラアクセスと表示
- `getUserMedia()` でカメラアクセス
- エラーハンドリング (権限拒否、カメラなし等)
- モバイル対応 (前面カメラ優先)

#### Step 3: MediaPipe統合
- **faceDetector.js**: Face Landmarker統合
- MediaPipe Tasks for Web 初期化
- リアルタイム顔検出
- Face Mesh描画
- EAR (Eye Aspect Ratio) 計算実装

#### Step 4: UI制御とアニメーション
- **gameUI.js**: ユーザーインターフェース制御
- 状態メッセージ表示 (顔認識、目の状態)
- クレジット風アニメーション
- 0.5秒間隔での状態更新
- モバイル最適化UI

#### Step 5: スタイリング
- **style.css**: レスポンシブデザイン
- モバイルファースト設計
- カメラ表示の最適化
- アニメーション効果

### 3. 技術実装詳細

#### MediaPipe Tasks for Web
- **CDN**: `@mediapipe/tasks-vision@latest`
- **必要要素**: FaceLandmarker, FilesetResolver
- **モデル**: face_landmarker.task (約10MB)
- **GPU推奨**: モバイルパフォーマンス向上

#### EAR (Eye Aspect Ratio) による目の開閉検出
- **概念**: 目の縦横比で開閉度を判定
- **左目ポイント**: 386(上), 374(下), 263(左), 362(右)
- **右目ポイント**: 159(上), 145(下), 33(左), 133(右)
- **計算式**: 縦距離 / (2 × 横距離)
- **閾値**: 0.1〜0.15の範囲で調整

#### Face Mesh描画
- **468ランドマーク**: 目の領域を重点的に表示
- **Canvas描画**: リアルタイムでオーバーレイ
- **デバッグ表示**: 開発時のランドマーク可視化

#### 状態表示システム
- **更新間隔**: 500ms
- **履歴管理**: 最新10件程度
- **色分け**: 青(開)、赤(閉)、グレー(認識なし)
- **アニメーション**: クレジット風スクロール

### 4. ファイル別実装計画

#### index.html (~100行)
- viewport meta設定 (モバイル対応)
- MediaPipe CDN読み込み
- カメラ表示用video要素とFace Mesh描画用canvas要素
- 状態表示用div要素
- JSファイル読み込み

#### camera.js (~200行)
- カメラ初期化クラス
- getUserMedia設定 (前面カメラ優先)
- ストリーム管理とエラーハンドリング
- カメラ切り替え機能

#### faceDetector.js (~300行)
- MediaPipe Face Landmarker初期化
- 顔検出処理ループとEAR計算関数群
- Face Mesh描画機能
- 検出結果管理

#### gameUI.js (~200行)
- 状態メッセージ管理
- クレジット風アニメーション
- 色分け表示制御と履歴管理システム
- モバイルUI最適化

#### style.css (~150行)
- レスポンシブレイアウト
- カメラ表示最適化
- クレジット風アニメーション
- モバイルファースト設計とアクセシビリティ対応

#### run.bat (~10行)
- Pythonサーバー起動とポート8008設定
- ブラウザ自動起動と停止方法表示

### 5. Phase 2 以降の計画

#### ゲーム機能追加
1. **タイマーチャレンジ**: 指定時間目をつぶるゲーム
2. **精度測定**: 目標時間との誤差計算
3. **難易度設定**: 1秒〜10秒の範囲
4. **スコアリング**: 精度に基づく点数システム

#### 首振り検出
1. **頭部姿勢行列**: MediaPipeの変換マトリックス利用
2. **YES/NO判定**: 縦横の首振り検出
3. **感度調整**: デバイスに応じた閾値設定

#### UI/UX改善
1. **チュートリアル**: 初回使用時の説明
2. **設定画面**: 感度調整、カメラ選択
3. **統計画面**: プレイ履歴、成績推移
4. **PWA対応**: オフライン動作、ホーム画面追加

### 6. テスト計画

#### 動作確認項目
- [ ] iPhone Safari での動作
- [ ] Android Chrome での動作
- [ ] デスクトップブラウザでの動作
- [ ] 明るい環境での精度
- [ ] 暗い環境での動作
- [ ] 顔の角度変化への対応
- [ ] カメラ権限拒否時の処理
- [ ] ネットワーク切断時の処理

#### パフォーマンステスト
- [ ] FPS測定 (目標: 30fps以上)
- [ ] メモリ使用量確認
- [ ] バッテリー消費テスト
- [ ] 長時間動作安定性

## 実装優先度

### 最優先 (MVP)
1. カメラアクセスと表示
2. 基本的な顔検出
3. 目の開閉判定
4. 状態表示

### 高優先
1. Face Mesh表示
2. クレジット風アニメーション
3. モバイル最適化
4. エラーハンドリング

### 中優先
1. UI改善
2. パフォーマンス最適化
3. 設定機能

### 低優先 (将来機能)
1. ゲーム機能
2. 首振り検出
3. 統計機能
4. PWA対応

## 技術的課題と対策

### 課題1: モバイルでのパフォーマンス
- **対策**: 検出頻度の調整、軽量化されたモデル使用

### 課題2: 照明条件への対応
- **対策**: 動的閾値調整、ユーザーフィードバックによる校正

### 課題3: 顔の角度変化
- **対策**: 複数角度での検証、姿勢補正アルゴリズム

### 課題4: バッテリー消費
- **対策**: 適応的フレームレート、不要時の処理停止

## トラブルシューティング

### 1. MediaPipe関連の注意点
- **モデル読み込み**: CORS エラー対策として正しいCDNパス使用
- **GPU初期化失敗**: CPU delegate へのフォールバック処理
- **タイムアウト**: 大きなモデルファイルの読み込み時間を考慮

### 2. カメラアクセス問題
- **権限拒否**: ユーザーフレンドリーなエラーメッセージ
- **デバイス未検出**: カメラの利用可能性チェック
- **モバイル対応**: 前面カメラ優先設定

### 3. ブラウザ別対応
- **Safari (iOS)**: HTTPS必須、viewport設定重要
- **Chrome (Android)**: GPU加速活用、メモリ管理
- **Firefox**: WebAssembly対応確認

### 4. パフォーマンス対策
- **低FPS対応**: 動的な検出頻度調整
- **メモリリーク**: 適切なクリーンアップ処理
- **バッテリー消費**: 適応的フレームレート制御

### 5. デバッグ支援
- **開発モード**: 本番/開発の切り替え
- **ランドマーク可視化**: 目の領域ハイライト
- **パフォーマンス監視**: FPS測定機能

## まとめ
Phase 1では技術的実現可能性を検証し、基本的な目の開閉検出機能を実装する。モバイル対応とリアルタイム性を重視し、段階的に機能を拡張していく。
