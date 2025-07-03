# Ball Attack - 実装計画

## 開発計画概要

### フェーズ別実装計画

#### Phase 1: 基本地球システム (4-6時間) ✅ **完了**
**目標**: 回転可能な地球の表示

**実装タスク**:
1. **基本セットアップ** ✅
   - Three.js シーン、カメラ、レンダラー初期化
   - `sample/js/main.js` のセットアップ部分を参考
   - レスポンシブキャンバス設定

2. **地球オブジェクト** ✅
   - SphereGeometry (半径: 1, segments: 64)
   - TextureLoader で `assets/world.topo.bathy.200412.3x5400x2700.jpg` 読み込み
   - MeshLambertMaterial で地球マテリアル作成

3. **回転制御システム** ✅
   - 地球固定・カメラ軌道移動方式を採用
   - 球面座標系でのカメラ制御
   - 超重い石の物理挙動（慣性係数: 0.02、抵抗係数: 0.995）
   - ズーム制御（距離: 1.5-8）
   - ジンバルロック問題を根本解決

**実装完了内容**:
- 地球固定・カメラ軌道移動システム
- スクリーンスペースの直感的な操作
- 超重い石の物理挙動（動き始めにくく、慣性で長時間回転）
- 球面座標系でのジンバルロック問題軽減
- レスポンシブデザイン対応
- キーボードショートカット（F: リセット、D: デバッグ、R: ゲームリセット）

**カメラ制御システムの改善** (最新追加):
- **縦回転方向修正**: 二重符号反転問題を解決し、直感的な操作を実現
- **スマホ対応強化**: 
  - passive: falseオプションでpreventDefault()有効化
  - 独立したタッチイベント処理（getTouchPosition専用メソッド）
  - CSS touch-action: none設定
- **極地回転継続**: 
  - 北極・南極通過時の180度回転処理
  - theta角度正規化による連続回転
  - 極地での回転停止問題を大幅改善
- **数値安定性**: 球面座標変換の精度向上

**解決した主要問題**:
1. **縦回転逆方向問題**: 186行目と212行目の二重符号反転を修正
2. **スマホタッチ無効問題**: passiveイベントリスナーの設定を修正
3. **極地回転停止問題**: 極地通過時の特別処理で連続回転を実現
4. **ジンバルロック問題**: 球面座標系の制約を軽減する処理を追加

**参考コード**: `sample/js/main.js` のカメラ制御部分、`CAMERA_CONTROL_IMPROVEMENTS.md`

#### Phase 2: 敵システム (6-8時間)
**目標**: 地球表面を移動する敵点群

**実装タスク**:
1. **敵クラス設計**
   ```javascript
   class Enemy {
     constructor(lat, lng, speed, direction)
     update(deltaTime)
     getWorldPosition() // 緯度経度→3D座標変換
   }
   ```

2. **敵生成システム**
   - ランダム位置での敵スポーン
   - 最大敵数制限 (50-100体)
   - 経時的な敵増加システム

3. **移動アルゴリズム**
   - 球面上の移動（大円経路）
   - 方向転換ロジック
   - 地球表面への吸着

4. **レンダリング最適化**
   - `sample/js/instanced-rendering.js` を参考
   - InstancedMesh での大量描画
   - LOD システム適用

**技術詳細**:
- 緯度経度→3D座標変換関数
- 球面三角法による移動計算
- インスタンス化レンダリングで高パフォーマンス

#### Phase 3: 弾システム (5-7時間)
**目標**: 自動発射される弾丸システム

**実装タスク**:
1. **弾クラス設計**
   ```javascript
   class Bullet {
     constructor(startPos, targetPos, speed)
     update(deltaTime)
     checkEarthCollision()
   }
   ```

2. **発射システム**
   - 画面左右の発射ポイント設定
   - 一定間隔での自動発射 (0.2-0.5秒間隔)
   - 地球中心への弾道計算

3. **弾道物理**
   - 直線移動 (非重力)
   - 地球表面での停止
   - 弾丸プール最適化

4. **ビジュアルエフェクト**
   - 軌跡エフェクト
   - 発射時のエフェクト

**技術詳細**:
- オブジェクトプールによる弾丸管理
- レイキャスティングによる地球衝突判定

#### Phase 4: 当たり判定・ゲームロジック (4-6時間)
**目標**: 弾と敵の衝突判定・スコアシステム

**実装タスク**:
1. **衝突判定システム**
   ```javascript
   class CollisionDetector {
     checkBulletEnemyCollision(bullets, enemies)
     checkBulletEarthCollision(bullet)
   }
   ```

2. **ゲーム状態管理**
   - スコアシステム
   - 敵撃墜カウント
   - レベル進行システム

3. **エフェクトシステム**
   - 爆発エフェクト
   - スコア表示アニメーション
   - パーティクルシステム

**技術詳細**:
- 球体-球体衝突判定
- 空間分割による効率化
- パーティクルシステム (`sample/js/effects.js` 参考)

#### Phase 5: UI・UXシステム (3-5時間)
**目標**: ゲームUI・メニュー・スコア表示

**実装タスク**:
1. **ゲームUI**
   - スコア表示
   - 敵撃墜数表示
   - レベル/ウェーブ表示

2. **メニューシステム**
   - スタート画面
   - ゲームオーバー画面
   - ポーズ機能

3. **レスポンシブデザイン**
   - スマホ UI 最適化
   - タッチ操作最適化
   - 画面サイズ適応

**参考**: `sample/index.html` のレスポンシブCSS

#### Phase 6: 最適化・エフェクト (4-6時間)
**目標**: パフォーマンス最適化・視覚効果

**実装タスク**:
1. **パフォーマンス最適化**
   - フラスタムカリング
   - LOD システム
   - ガベージコレクション最適化

2. **視覚エフェクト**
   - 地球の大気効果
   - リムライティング
   - パーティクルエフェクト

3. **サウンドシステム**
   - 発射音
   - 爆発音
   - 背景音楽

**参考コード**:
- `sample/js/performance.js` - パフォーマンス監視
- `sample/js/effects.js` - エフェクトシステム

## 技術仕様詳細

### 座標系統一
- **地球**: 中心 (0, 0, 0)、半径 1
- **緯度経度**: 標準的な地理座標系 (-90°〜90°, -180°〜180°)
- **テクスチャ**: Equirectangular投影、UV座標 (0-1, 0-1)

### 座標変換関数
```javascript
// 緯度経度→3D座標 (sample実装を参考)
function latLngToCartesian(lat, lng, radius = 1) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lng + 180) * Math.PI / 180;
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}
```

### パフォーマンス目標
- **フレームレート**: 60fps (デスクトップ), 30fps (スマホ)
- **敵数**: 最大100体同時表示
- **弾数**: 最大50発同時表示
- **メモリ使用量**: 100MB以下

### ファイル構成
```
ball_attack/
├── index.html              ✅ # メインHTML
├── js/
│   ├── main.js            ✅ # メインゲームクラス
│   ├── controls.js        ✅ # カメラ軌道制御システム
│   ├── utils.js           ✅ # ユーティリティ関数
│   ├── enemies.js          # 敵システム (Phase 2)
│   ├── weapons.js          # 弾システム (Phase 3)
│   ├── collision.js        # 当たり判定 (Phase 4)
│   ├── ui.js              # UIシステム (Phase 5)
│   ├── effects.js         # エフェクトシステム (Phase 6)
│   └── performance.js     # パフォーマンス最適化 (Phase 6)
├── css/
│   └── style.css          ✅ # メインスタイル
└── assets/
    ├── world.topo.bathy.200412.3x5400x2700.jpg ✅ # 高解像度地形テクスチャ
    ├── eo_base_2020_clean_720x360.jpg  # 旧テクスチャ（参考用）
    └── sounds/             # サウンドファイル (Phase 6)
```

**Phase 1完了ファイル**:
- ✅ `index.html` - 基本HTML構造、レスポンシブデザイン
- ✅ `css/style.css` - ゲームUI、モバイル対応スタイル、タッチ操作最適化
- ✅ `js/main.js` - ゲームメインクラス、Three.jsセットアップ
- ✅ `js/controls.js` - カメラ軌道制御、物理挙動、タッチ操作対応
- ✅ `js/utils.js` - ユーティリティ関数、パフォーマンス監視
- 📋 `CAMERA_CONTROL_IMPROVEMENTS.md` - カメラ制御問題の分析と改善案

### sample/ フォルダ活用箇所
1. **Three.js セットアップ**: `sample/js/main.js` (1-100行目)
2. **インスタンス化レンダリング**: `sample/js/instanced-rendering.js` 全体
3. **パフォーマンス最適化**: `sample/js/performance.js` 全体
4. **エフェクトシステム**: `sample/js/effects.js` 全体
5. **レスポンシブCSS**: `sample/index.html` スタイル部分
6. **UV座標系**: テクスチャマッピング手法

## テスト計画
1. **各フェーズ後の動作確認**
2. **複数ブラウザでのテスト**
3. **スマホ・タブレットでの操作テスト**
4. **パフォーマンステスト**
5. **GitHub Pages デプロイテスト**

## デプロイメント
- GitHub Pages での静的ホスティング
- 全ファイルが相対パスで動作
- CDN依存は Three.js のみ
