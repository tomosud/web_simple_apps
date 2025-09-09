# Eye Gaze Tracker - eyeTrack2

MediaPipe Tasks Face Landmarkerを使用した視線推定・追跡システム

## 概要

ユーザーの視線方向をリアルタイムで推定し、画面上に視線ベクトルを表示するWebアプリケーションです。MediaPipe Tasks版のFace Landmarkerのblendshapeデータを活用して、眼球の動きや顔の向きから視線方向を計算します。

## 技術仕様

### 使用技術
- **MediaPipe Tasks Vision** v0.10.3
- **Face Landmarker** - 顔のランドマークとblendshapeデータを取得
- **HTML5 Canvas** - 視線ベクトルの描画
- **Web Audio API** - デバッグ用音声フィードバック（オプション）

### 主要機能

#### 1. 視線推定
- Blendshapeデータから眼球の動きを検出
  - `eyeLookOutLeft`, `eyeLookInLeft`, `eyeLookUpLeft`, `eyeLookDownLeft`
  - `eyeLookInRight`, `eyeLookOutRight`, `eyeLookUpRight`, `eyeLookDownRight`
- 顔の向きも考慮した総合的な視線ベクトル計算
- リアルタイム処理（60FPS対応）

#### 2. 視覚表示
- **メインキャンバス**: 全画面表示
  - 画面中央からの両目視線ライン（緑色）
  - 視線先の赤い点
  - 中央十字線（キャリブレーション用）

- **デバッグビュー**: 右上小画面
  - カメラ映像とランドマーク表示
  - 目の中心点（黄色）
  - 目からの視線ライン（シアン色）
  - 視線先ポイント（マゼンタ色）

#### 3. キャリブレーション機能
- 中央十字線クリックでキャリブレーション実行
- 現在の視線方向を「画面中央」として記録
- オフセット補正による精度向上
- 光るアニメーション効果でフィードバック

#### 4. 状態管理
- 顔検出失敗時の警告表示
- リアルタイム座標表示
- キャリブレーション状態の表示

## ファイル構成

```
eyeTrack2/
├── eye_gaze_tracker.html    # メインアプリケーション
└── README.md               # このファイル
```

## 使用方法

### 基本操作
1. `eye_gaze_tracker.html`をブラウザで開く
2. カメラアクセス許可を与える
3. 顔をカメラに向ける
4. 視線ベクトルが自動的に表示される

### キャリブレーション
1. 画面中央の十字線を見つめる
2. 十字線をクリック
3. 光るアニメーションでキャリブレーション完了を確認
4. 以降、画面中央への視線が正確に判定される

### デバッグモード
URLパラメータに `?debug=true` を追加すると、詳細なデバッグ情報が表示されます。

## 実装詳細

### 座標系
- **ランドマーク座標**: MediaPipeの正規化座標 (0-1)
- **視線ベクトル**: 相対座標 (-1 to 1 range)
- **スクリーン座標**: ピクセル座標系

### アルゴリズム
```javascript
// 視線ベクトル計算
horizontalGaze = (eyeLookRight - eyeLookLeft) / 2
verticalGaze = (eyeLookDown - eyeLookUp) / 2
faceDirection = (noseTip - faceCenter) * 2
gazeVector = eyeMovement + faceDirection

// キャリブレーション補正
adjustedGaze = currentGaze - calibrationOffset
screenPoint = center + (adjustedGaze * sensitivity)
```

### パフォーマンス最適化
- GPU加速によるMediaPipe処理
- requestAnimationFrame によるスムーズな描画
- 効率的なキャンバス描画とクリア処理

## 対応環境

### ブラウザ対応
- Chrome 88+
- Firefox 78+
- Safari 14+
- Edge 88+

### デバイス対応
- デスクトップ（Windows, Mac, Linux）
- モバイル（iOS Safari, Android Chrome）
- Webカメラ必須

## 制限事項

1. **精度**: 環境光や角度により精度が変動
2. **レイテンシ**: 処理遅延約50-100ms
3. **キャリブレーション**: 使用前のキャリブレーションが推奨
4. **顔検出**: 正面向き時の検出精度が最適

## 今後の拡張予定

- [ ] 複数点キャリブレーション
- [ ] 視線履歴の可視化
- [ ] アイトラッキングゲーム要素
- [ ] 精度向上のためのML調整
- [ ] モバイル最適化

## ライセンス

MediaPipe Tasks Vision利用規約に従います。

## 更新履歴

### v1.0.0 (2025-09-09)
- 初回実装
- 基本的な視線推定機能
- デバッグビュー付き視線ライン表示
- ワンクリック キャリブレーション機能