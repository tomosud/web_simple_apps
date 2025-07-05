# Ball Attack - 現状と問題点

## 現在の状況

### 動作している機能
1. **親敵システム**
   - 親敵（青い大きな球体）が地球表面を移動
   - HP: 1250、HPに比例したサイズ変化
   - 被弾エフェクト（青いライト + パーティクル）
   - 移動速度調整済み

2. **子敵配置システム**
   - 親敵が移動中に子敵を動的配置
   - 配置制約（距離チェック）が機能
   - スポーンエフェクト（3秒間青色 → 赤色）

3. **初期配置の子敵**
   - 現在は0個で開始（設定済み）
   - 初期配置時は正常な赤い子敵として表示

### 問題点

#### 🔴 **重大問題: 親敵配置の子敵が攻撃しない**

**症状:**
```
✅ 敵攻撃成功: 12発撃発射, 総発射数: 471
```
- ログでは攻撃成功と表示
- しかし弾丸が全く見えない
- 初期配置の子敵（テスト時100個）では弾丸が見えていた

**根本原因分析:**
親敵が配置する子敵と初期配置の子敵で、敵オブジェクトの構造が微妙に異なっている可能性

#### **データ構造の違い**

**初期配置の子敵 (generateEnemies):**
```javascript
// generateEnemies()で作成
enemy.userData.latitude = lat;
enemy.userData.longitude = lng;
enemy.userData.position.copy(position);
enemy.userData.active = true;
enemy.userData.id = `enemy_${timestamp}_${random}`;
enemy.position.copy(position);
enemy.visible = true;

// スポーンエフェクトなし
enemy.userData.isSpawning = false;
```

**親敵配置の子敵 (addEnemyAtPosition):**
```javascript
// addEnemyAtPosition()で作成
const latLng = this.cartesianToLatLng(position);
enemy.userData.latitude = latLng.lat;
enemy.userData.longitude = latLng.lng;
enemy.userData.position.copy(position);
enemy.userData.active = true;
enemy.userData.id = `enemy_${timestamp}_${random}`;
enemy.position.copy(position);
enemy.visible = true;

// スポーンエフェクトあり（3秒間）
enemy.userData.isSpawning = true;
enemy.userData.spawnTime = Date.now();
enemy.userData.spawnDuration = 3000;
```

#### **敵攻撃システムの位置参照**
```javascript
// enemy-attack.js の fireAtPlayer()
this.fireAtPlayer(enemy.userData.position, playerPosition)
```

**推定問題:**
1. **座標変換の差異**: `cartesianToLatLng()`による座標変換で微小な誤差
2. **スポーンエフェクト影響**: 3秒間のスポーン状態が攻撃判定に影響
3. **オブジェクト再利用**: `enemies.find(e => !e.visible)`でプール取得時の状態不整合

## 解決すべき課題

### 🎯 **主要課題: 完全仕様統一**
親敵配置の子敵を初期配置の子敵と**完全に同じ仕様**にする

**要求仕様:**
- ✅ 同じ外観（赤いスフィア、エミッシブ発光）
- ✅ 同じ攻撃能力（緑の細い弾丸を発射）
- ✅ 同じ破壊可能性
- ✅ 同じ物理的挙動

### 🔧 **技術的解決方針**

#### **方針1: 生成関数統一**
```javascript
// 共通の子敵生成関数を作成
createChildEnemy(position, isInitial = true) {
  // 初期配置も親敵配置も同じロジック
}
```

#### **方針2: オブジェクト完全複製**
```javascript
// 初期配置の子敵をテンプレートとして、完全複製
cloneEnemyFromTemplate(templateEnemy, newPosition) {
  // 全てのプロパティを完全コピー
}
```

#### **方針3: 状態管理分離**
```javascript
// スポーンエフェクトを攻撃システムから完全分離
// userData.isSpawning は視覚効果のみ使用
// 攻撃判定には一切影響させない
```

## 検証済み事項

### ✅ **正常動作確認済み**
- 初期配置100個 → 弾丸発射・視認OK
- 親敵移動・配置システム → OK
- 音声システム（Enemy_Canon.wav）→ OK
- 衝突判定・破壊システム → OK

### ❌ **問題確認済み**
- 親敵配置の子敵 → 攻撃ログ出るが弾丸見えない
- 位置データ不整合の可能性
- オブジェクトプール再利用時の状態問題

## 次回修正計画

1. **デバッグ情報追加**: 攻撃時の敵情報詳細ログ
2. **位置データ検証**: userData.position vs position の差異確認
3. **完全統一実装**: 初期配置と親敵配置で同一関数使用
4. **段階的テスト**: 1個ずつ配置して動作確認

## コード状態

### 現在の設定
- 初期敵配置: 0個
- 親敵数: 1個
- 敵プールサイズ: 800個
- 弾丸: 緑色細い形状（元仕様）
- 攻撃間隔: 頻繁（0.02秒）

### 重要ファイル
- `js/enemies.js`: EnemySystem, addEnemyAtPosition()
- `js/parent-enemies.js`: ParentEnemySystem
- `js/enemy-attack.js`: EnemyAttackSystem
- `js/main.js`: システム統合