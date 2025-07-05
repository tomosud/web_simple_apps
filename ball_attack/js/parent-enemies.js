/**
 * Ball Attack - 親敵システム
 * 地球表面を移動し子敵を配置する大型敵の管理
 */

/**
 * ParentEnemy - 個別の親敵オブジェクト
 */
class ParentEnemy {
    constructor(id, scene, earthRadius = 1.0) {
        this.id = id;
        this.scene = scene;
        this.earthRadius = earthRadius;
        
        // HP管理
        this.maxHp = 1250; // 5倍に増加
        this.hp = this.maxHp;
        
        // 位置・移動関連
        this.position = new THREE.Vector3();
        this.targetPosition = new THREE.Vector3();
        this.moveSpeed = 0.125; // rad/sec（速度を半分に）
        this.isMoving = false;
        
        // 回復システム関連
        this.lastEnergySource = null;
        this.hasReceivedEnergyOnce = false;
        this.isHealing = false;
        this.healingTimer = 0;
        this.healingDuration = 0.5; // 回復エフェクト継続時間（秒）
        
        // 3Dオブジェクト
        this.mesh = null;
        this.laserCylinder = null;
        
        // 被弾エフェクト
        this.hitLight = null;
        this.hitLightTimer = 0;
        this.hitLightDuration = 0.3; // 0.3秒間点灯
        
        this.createMesh();
        this.setRandomPosition();
        
        // 初期移動を開始
        setTimeout(() => {
            this.generateNewTarget();
        }, 100); // 0.1秒後に最初の移動を開始
    }
    
    /**
     * 親敵の3Dメッシュを作成
     */
    createMesh() {
        // 子敵の5倍のサイズ（子敵のサイズは仮に0.02とする）
        const radius = 0.02 * 5;
        const geometry = new THREE.SphereGeometry(radius, 16, 12);
        
        // 青色エミッシブマテリアル（強化）
        const material = new THREE.MeshStandardMaterial({
            color: 0x0066ff,
            emissive: 0x0044cc,
            emissiveIntensity: 0.8,
            roughness: 0.7,
            metalness: 0.1
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.mesh);
        
        // 被弾エフェクト用ライト
        this.createHitLight();
        
        this.updatePosition();
    }
    
    /**
     * 被弾エフェクト用ライトを作成
     */
    createHitLight() {
        // 親敵サイズの2倍の範囲を照らす青いポイントライト
        const lightRange = 0.02 * 5 * 2; // 子敵の5倍 × 2
        this.hitLight = new THREE.PointLight(0x0044cc, 0, lightRange, 2);
        this.hitLight.position.copy(this.mesh.position);
        this.scene.add(this.hitLight);
    }
    
    /**
     * ランダムな位置に配置
     */
    setRandomPosition() {
        const lat = (Math.random() - 0.5) * 180; // -90 to 90
        const lng = (Math.random() - 0.5) * 360; // -180 to 180
        
        this.position = this.latLngToCartesian(lat, lng, this.earthRadius);
        this.updatePosition();
        this.generateNewTarget();
    }
    
    /**
     * 緯度経度から3D座標に変換
     */
    latLngToCartesian(lat, lng, radius = 1) {
        const phi = (90 - lat) * Math.PI / 180;
        const theta = (lng + 180) * Math.PI / 180;
        return new THREE.Vector3(
            radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.cos(phi),
            radius * Math.sin(phi) * Math.sin(theta)
        );
    }
    
    /**
     * 3D座標から緯度経度に変換
     */
    cartesianToLatLng(position) {
        const radius = position.length();
        const lat = 90 - Math.acos(position.y / radius) * 180 / Math.PI;
        const lng = Math.atan2(position.z, position.x) * 180 / Math.PI - 180;
        return { lat, lng };
    }
    
    /**
     * 新しい移動目標を生成
     */
    generateNewTarget() {
        const currentLatLng = this.cartesianToLatLng(this.position);
        
        // 現在位置から移動（距離を度単位で指定）
        const moveDistance = 10 + Math.random() * 20; // 10-30度の移動（範囲を縮小）
        const moveAngle = Math.random() * Math.PI * 2;
        
        const newLat = Math.max(-85, Math.min(85, 
            currentLatLng.lat + Math.cos(moveAngle) * moveDistance));
        const newLng = currentLatLng.lng + Math.sin(moveAngle) * moveDistance;
        
        this.targetPosition = this.latLngToCartesian(newLat, newLng, this.earthRadius);
        this.isMoving = true;
        
        console.log(`Parent Enemy ${this.id}: 移動開始 from (${currentLatLng.lat.toFixed(1)}, ${currentLatLng.lng.toFixed(1)}) to (${newLat.toFixed(1)}, ${newLng.toFixed(1)})`);
    }
    
    /**
     * 位置を更新（地球表面に固定）
     */
    updatePosition() {
        if (this.mesh) {
            // 地球表面に正確に配置
            const normalizedPos = this.position.clone().normalize();
            this.mesh.position.copy(normalizedPos.multiplyScalar(this.earthRadius));
            
            // 地球の中心を向くように回転
            this.mesh.lookAt(0, 0, 0);
            
            // HPに比例してサイズを変更（最小1/5）
            const hpRatio = this.hp / this.maxHp;
            const minScale = 0.2; // 1/5
            const scale = minScale + (1.0 - minScale) * hpRatio;
            this.mesh.scale.setScalar(scale);
        }
    }
    
    /**
     * 移動システムの更新
     */
    updateMovement(deltaTime) {
        if (!this.isMoving) {
            // 停止中は新しい目標を設定（より頻繁に）
            if (Math.random() < deltaTime * 2.0) { // 平均0.5秒で新しい目標
                this.generateNewTarget();
            }
            return;
        }
        
        // 現在位置から目標位置への移動
        const currentDir = this.position.clone().normalize();
        const targetDir = this.targetPosition.clone().normalize();
        
        // 球面線形補間での移動
        const angle = currentDir.angleTo(targetDir);
        if (angle < 0.01) {
            // 目標に到達
            this.position.copy(this.targetPosition);
            this.isMoving = false;
            this.updatePosition();
            console.log(`Parent Enemy ${this.id}: 目標到達`);
            return;
        }
        
        // 移動速度に基づいて補間
        const moveAmount = Math.min(this.moveSpeed * deltaTime, angle);
        const rotationAxis = new THREE.Vector3().crossVectors(currentDir, targetDir).normalize();
        const quaternion = new THREE.Quaternion().setFromAxisAngle(rotationAxis, moveAmount);
        
        this.position.applyQuaternion(quaternion);
        this.position.normalize().multiplyScalar(this.earthRadius);
        this.updatePosition();
    }
    
    /**
     * ダメージを受ける
     */
    takeDamage(amount) {
        this.hp = Math.max(0, this.hp - amount);
        
        // 被弾エフェクトを開始
        this.triggerHitEffect();
        
        return this.hp <= 0; // 撃破されたかどうか
    }
    
    /**
     * 被弾エフェクトを発動
     */
    triggerHitEffect() {
        // ポイントライト点灯
        this.hitLightTimer = this.hitLightDuration;
        if (this.hitLight) {
            this.hitLight.intensity = 150.0;
        }
        
        // 青いパーティクルエフェクト（ParentEnemySystemから取得）
        console.log(`Parent Enemy ${this.id}: 被弾エフェクト発動`);
    }
    
    /**
     * エネルギー回復（現在は基本実装のみ）
     */
    receiveEnergy(childEnemyId) {
        // Phase Cで詳細実装予定
        this.hp = Math.min(this.maxHp, this.hp + 3);
        this.lastEnergySource = childEnemyId;
        this.hasReceivedEnergyOnce = true;
        
        // 回復エフェクト開始
        this.isHealing = true;
        this.healingTimer = this.healingDuration;
    }
    
    /**
     * 回復エフェクトの更新
     */
    updateHealingEffect(deltaTime) {
        if (!this.isHealing) return;
        
        this.healingTimer -= deltaTime;
        
        if (this.healingTimer > 0) {
            // 赤い発光エフェクト
            const intensity = this.healingTimer / this.healingDuration;
            this.mesh.material.emissive.setHex(0xff0000);
            this.mesh.material.emissiveIntensity = 0.8 * intensity;
        } else {
            // 元の青色に戻る（強化版）
            this.mesh.material.emissive.setHex(0x0044cc);
            this.mesh.material.emissiveIntensity = 0.8;
            this.isHealing = false;
        }
    }
    
    /**
     * フレーム更新
     */
    update(deltaTime) {
        this.updateMovement(deltaTime);
        this.updateHealingEffect(deltaTime);
        this.updateHitEffect(deltaTime);
    }
    
    /**
     * 被弾エフェクトの更新
     */
    updateHitEffect(deltaTime) {
        if (this.hitLightTimer > 0) {
            this.hitLightTimer -= deltaTime;
            
            if (this.hitLight) {
                if (this.hitLightTimer > 0) {
                    // ライト強度を時間で減衰
                    const intensity = (this.hitLightTimer / this.hitLightDuration) * 150.0;
                    this.hitLight.intensity = intensity;
                    // ライト位置を親敵と同期
                    this.hitLight.position.copy(this.mesh.position);
                } else {
                    // タイマー終了でライト消灯
                    this.hitLight.intensity = 0;
                }
            }
        }
    }
    
    /**
     * 親敵を破棄
     */
    dispose() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
        if (this.laserCylinder) {
            this.scene.remove(this.laserCylinder);
            this.laserCylinder.geometry.dispose();
            this.laserCylinder.material.dispose();
        }
        if (this.hitLight) {
            this.scene.remove(this.hitLight);
        }
    }
}

/**
 * ParentEnemySystem - 親敵システム管理クラス
 */
class ParentEnemySystem {
    constructor(scene, earthRadius = 1.0) {
        this.scene = scene;
        this.earthRadius = earthRadius;
        this.parentEnemies = new Map();
        this.nextId = 1;
        
        // 統計情報
        this.totalParentEnemies = 0;
        this.destroyedCount = 0;
        
        // 子敵配置システム
        this.enemySystem = null; // EnemySystemの参照
        this.childEnemyRadius = 0.01; // 子敵の半径
        this.placementCheckRadius = this.childEnemyRadius * 5; // 配置制約範囲
        this.placementInterval = 1.0; // 配置間隔（秒）- 頻度を倍に
        this.lastPlacementTime = 0;
        
        // エフェクト用参照
        this.destroyParticleSystem = null;
    }
    
    /**
     * EnemySystemの参照を設定
     */
    setEnemySystem(enemySystem) {
        this.enemySystem = enemySystem;
        // エフェクトシステムの参照も設定
        if (enemySystem && enemySystem.destroyParticleSystem) {
            this.destroyParticleSystem = enemySystem.destroyParticleSystem;
        }
    }
    
    /**
     * 親敵を追加
     */
    addParentEnemy() {
        const id = `parent_${this.nextId++}`;
        const parentEnemy = new ParentEnemy(id, this.scene, this.earthRadius);
        this.parentEnemies.set(id, parentEnemy);
        this.totalParentEnemies++;
        return parentEnemy;
    }
    
    /**
     * 指定数の親敵を作成
     */
    createParentEnemies(count) {
        const created = [];
        for (let i = 0; i < count; i++) {
            created.push(this.addParentEnemy());
        }
        return created;
    }
    
    /**
     * 配置可能位置チェック
     */
    canPlaceChildEnemy(position) {
        if (!this.enemySystem || !this.enemySystem.enemies) {
            return true;
        }
        
        // 既存の子敵との距離をチェック
        for (const enemy of this.enemySystem.enemies) {
            if (!enemy.visible) continue;
            
            const distance = position.distanceTo(enemy.position);
            if (distance < this.placementCheckRadius) {
                return false; // 距離が近すぎる
            }
        }
        
        return true;
    }
    
    /**
     * 親敵による子敵配置処理
     */
    tryPlaceChildEnemies(deltaTime) {
        if (!this.enemySystem) return;
        
        this.lastPlacementTime += deltaTime;
        
        // 配置間隔チェック
        if (this.lastPlacementTime < this.placementInterval) {
            return;
        }
        
        this.lastPlacementTime = 0;
        
        // 各親敵が子敵配置を試行
        for (const parentEnemy of this.parentEnemies.values()) {
            this.tryPlaceChildEnemyFromParent(parentEnemy);
        }
    }
    
    /**
     * 特定の親敵から子敵配置を試行
     */
    tryPlaceChildEnemyFromParent(parentEnemy) {
        if (!parentEnemy.mesh) return;
        
        const parentPosition = parentEnemy.mesh.position.clone();
        
        // 段階的に範囲を拡大して配置可能位置を探す
        const maxAttempts = 15; // 試行回数増加
        const searchRanges = [
            { min: 0.02, max: 0.08 },   // 近距離
            { min: 0.08, max: 0.15 },   // 中距離
            { min: 0.15, max: 0.25 }    // 遠距離
        ];
        
        for (const range of searchRanges) {
            for (let i = 0; i < Math.ceil(maxAttempts / searchRanges.length); i++) {
                // 親敵の周辺にランダムな位置を生成
                const angle = Math.random() * Math.PI * 2;
                const distance = range.min + Math.random() * (range.max - range.min);
                
                const testPosition = parentPosition.clone();
                const offsetX = Math.cos(angle) * distance;
                const offsetZ = Math.sin(angle) * distance;
                
                testPosition.x += offsetX;
                testPosition.z += offsetZ;
                
                // 地球表面に正規化（初期配置と同じ高度）
                testPosition.normalize().multiplyScalar(this.earthRadius + 0.005);
                
                // 配置可能かチェック
                if (this.canPlaceChildEnemy(testPosition)) {
                    // 子敵を配置
                    const placedEnemy = this.placeChildEnemy(testPosition, parentEnemy.id);
                    if (placedEnemy) {
                        console.log(`Parent Enemy ${parentEnemy.id}: 子敵を配置 at distance ${distance.toFixed(3)}, ID: ${placedEnemy.userData.id}`);
                    }
                    return; // 配置成功で終了
                }
            }
        }
        
        // 配置できなかった場合の警告（一定確率で出力）
        if (Math.random() < 0.1) {
            console.log(`Parent Enemy ${parentEnemy.id}: 配置可能位置が見つかりません（密度が高い可能性）`);
        }
    }
    
    /**
     * 子敵を配置
     */
    placeChildEnemy(position, parentId) {
        if (!this.enemySystem) return null;
        
        // EnemySystemに新しい敵を追加
        return this.enemySystem.addEnemyAtPosition(position, parentId);
    }
    
    /**
     * 親敵への攻撃判定
     */
    checkAttack(attackPosition, attackRadius, damage) {
        const hitParents = [];
        
        for (const [id, parentEnemy] of this.parentEnemies) {
            const distance = attackPosition.distanceTo(parentEnemy.mesh.position);
            if (distance <= attackRadius) {
                const destroyed = parentEnemy.takeDamage(damage);
                
                // 被弾パーティクルエフェクト
                if (this.destroyParticleSystem) {
                    this.destroyParticleSystem.createExplosion(
                        parentEnemy.mesh.position.clone(),
                        1.5, // スケール
                        0x0044cc // 青色
                    );
                }
                
                hitParents.push({
                    id: id,
                    parentEnemy: parentEnemy,
                    destroyed: destroyed
                });
                
                if (destroyed) {
                    this.destroyParentEnemy(id);
                }
            }
        }
        
        return hitParents;
    }
    
    /**
     * 親敵を破棄
     */
    destroyParentEnemy(id) {
        const parentEnemy = this.parentEnemies.get(id);
        if (parentEnemy) {
            // 全親敵が撃破される場合、子敵を破壊
            if (this.parentEnemies.size === 1) { // 最後の親敵
                this.destroyAllChildEnemies();
            }
            
            parentEnemy.dispose();
            this.parentEnemies.delete(id);
            this.destroyedCount++;
        }
    }
    
    /**
     * 全子敵を破壊（親敵全滅時）
     */
    destroyAllChildEnemies() {
        if (!this.enemySystem || !this.enemySystem.enemies) return;
        
        const activeEnemies = this.enemySystem.enemies.filter(enemy => enemy.visible);
        const maxSimultaneous = 10;
        let destroyedCount = 0;
        
        // 最大10個まで同時破壊
        const destroyNext = () => {
            const enemiesToDestroy = activeEnemies.slice(destroyedCount, destroyedCount + maxSimultaneous);
            
            enemiesToDestroy.forEach(enemy => {
                if (enemy.visible) {
                    // 爆撃を受けた時と同じ処理
                    this.enemySystem.destroyEnemy(enemy, 100, true); // forceDestroy = true
                }
            });
            
            destroyedCount += enemiesToDestroy.length;
            
            // まだ破壊する敵がいる場合は続行
            if (destroyedCount < activeEnemies.length) {
                setTimeout(destroyNext, 50); // 0.05秒間隔で次のバッチ
            }
        };
        
        destroyNext();
        console.log(`全親敵撃破により${activeEnemies.length}個の子敵が破壊されます`);
    }
    
    /**
     * すべての親敵が撃破されたかチェック
     */
    allParentEnemiesDestroyed() {
        return this.parentEnemies.size === 0 && this.totalParentEnemies > 0;
    }
    
    /**
     * 親敵の統計情報を取得
     */
    getStats() {
        const alive = Array.from(this.parentEnemies.values());
        return {
            total: this.totalParentEnemies,
            alive: alive.length,
            destroyed: this.destroyedCount,
            parentEnemies: alive
        };
    }
    
    /**
     * フレーム更新
     */
    update(deltaTime) {
        for (const parentEnemy of this.parentEnemies.values()) {
            parentEnemy.update(deltaTime);
        }
        
        // 子敵配置処理
        this.tryPlaceChildEnemies(deltaTime);
    }
    
    /**
     * システムをリセット
     */
    reset() {
        // すべての親敵を破棄
        for (const parentEnemy of this.parentEnemies.values()) {
            parentEnemy.dispose();
        }
        this.parentEnemies.clear();
        this.totalParentEnemies = 0;
        this.destroyedCount = 0;
        this.nextId = 1;
    }
    
    /**
     * システムを破棄
     */
    dispose() {
        this.reset();
    }
}