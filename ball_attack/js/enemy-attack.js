/**
 * Ball Attack - 敵砲撃システム
 * 敵からプレイヤーへの反撃システム
 */

/**
 * EnemyAttackSystem - 敵の砲撃システム
 */
class EnemyAttackSystem {
    constructor(scene, playerTarget, soundSystem = null) {
        this.scene = scene;
        this.playerTarget = playerTarget; // プレイヤー（人工衛星）への参照
        this.soundSystem = soundSystem;
        
        // 敵弾丸管理
        this.enemyProjectiles = [];
        this.maxProjectiles = 500; // さらに大幅増加
        this.projectilePool = [];
        
        // 攻撃設定
        this.attackAngleMin = 10; // 攻撃角度の最小値（度）- さらに低い角度から攻撃可能
        this.attackAngleMax = 90; // 攻撃角度の最大値（度）- ほぼ真上まで
        this.attackInterval = 0.02; // 攻撃間隔（秒）- 極めて頻繁に
        this.maxSimultaneousAttacks = 50; // 同時攻撃可能数 - 大幅増加
        this.projectileSpeed = 0.1; // 弾丸速度（ゆっくりして見えやすく）
        
        // 弾丸仕様
        this.projectileRadius = 0.003; // 弾丸半径（元のサイズ）
        this.projectileColor = 0x00ff00; // 緑色
        this.projectileEmissive = 0x00ff00; // 緑色の発光
        this.projectileLifetime = 20.0; // 弾丸寿命（秒）- 地球から人工衛星まで届くよう延長
        
        // 攻撃状態管理
        this.attackingEnemies = new Map(); // 攻撃中の敵リスト
        this.lastAttackTime = 0;
        this.attackCycleStartTime = 0;
        this.isAttackPhase = true; // true:攻撃フェーズ、false:待機フェーズ
        this.attackPhaseDuration = 5.0; // 攻撃フェーズ時間（秒）- 長めに
        this.waitPhaseDuration = 1.0; // 待機フェーズ時間（秒）- 短く
        
        // 照準散らばり
        this.aimSpread = 0.1; // 照準の散らばり係数
        
        // 統計情報
        this.totalShotsFired = 0;
        this.activeProjectileCount = 0;
        
        // デバッグ用
        this.lastDebugTime = 0;
        
        this.initProjectilePool();
        
        debugLog('敵砲撃システムを初期化');
    }
    
    initProjectilePool() {
        // 敵弾丸プールを初期化
        const geometry = new THREE.SphereGeometry(this.projectileRadius, 6, 4);
        geometry.scale(0.5, 0.5, 5); // X,Y軸を半分にして、Z軸を5倍に伸ばす（細い形状）
        const material = new THREE.MeshStandardMaterial({
            color: this.projectileColor,
            emissive: this.projectileEmissive,
            transparent: true,
            opacity: 1.0
        });
        
        for (let i = 0; i < this.maxProjectiles; i++) {
            const projectile = new THREE.Mesh(geometry, material.clone());
            projectile.visible = false;
            projectile.userData = {
                active: false,
                velocity: new THREE.Vector3(),
                lifetime: 0,
                maxLifetime: this.projectileLifetime,
                startTime: 0,
                sourceEnemy: null,
                id: i
            };
            
            this.scene.add(projectile);
            this.projectilePool.push(projectile);
        }
        
        debugLog(`敵弾丸プールを初期化: ${this.maxProjectiles}個`);
    }
    
    // 攻撃条件をチェック
    checkAttackConditions(enemies, playerPosition) {
        const currentTime = performance.now() / 1000;
        const attackableEnemies = [];
        
        // 攻撃サイクル管理
        this.updateAttackCycle(currentTime);
        
        // 待機フェーズ中は攻撃しない
        if (!this.isAttackPhase) {
            return attackableEnemies;
        }
        
        // 攻撃間隔チェック
        if (currentTime - this.lastAttackTime < this.attackInterval) {
            return attackableEnemies;
        }
        
        // 同時攻撃数制限チェック
        if (this.attackingEnemies.size >= this.maxSimultaneousAttacks) {
            return attackableEnemies;
        }
        
        // 各敵の攻撃可能性をチェック
        let totalEnemies = 0;
        let activeEnemies = 0;
        let nonDestroyingEnemies = 0;
        let availableEnemies = 0;
        let inRangeEnemies = 0;
        let spawningEnemies = 0;
        let nonSpawningEnemies = 0;
        
        for (let enemy of enemies) {
            totalEnemies++;
            
            if (!enemy.userData.active || enemy.userData.isDestroying) {
                continue;
            }
            activeEnemies++;
            nonDestroyingEnemies++;
            
            // スポーン中の敵をカウント（削除：初期配置と同じ仕様にする）
            // if (enemy.userData.isSpawning) {
            //     spawningEnemies++;
            //     continue; // スポーン中の敵は攻撃しない
            // } else {
                nonSpawningEnemies++;
            // }
            
            // 既に攻撃中の敵はスキップ
            if (this.attackingEnemies.has(enemy.userData.id)) {
                continue;
            }
            availableEnemies++;
            
            // 攻撃角度チェック
            const canAttack = this.isPlayerInAttackRange(enemy.userData.position, playerPosition);
            if (canAttack) {
                attackableEnemies.push(enemy);
                inRangeEnemies++;
            }
        }
        
        // デバッグ情報（5秒に1回出力）
        if (currentTime - this.lastDebugTime > 5.0) {
            console.log(`EnemyAttack Debug: Total=${totalEnemies}, Active=${activeEnemies}, Available=${availableEnemies}, InRange=${inRangeEnemies}, NonSpawning=${nonSpawningEnemies}, AttackPhase=${this.isAttackPhase}`);
            this.lastDebugTime = currentTime;
        }
        
        return attackableEnemies;
    }
    
    // 攻撃サイクル管理（3秒攻撃→3秒待機）
    updateAttackCycle(currentTime) {
        if (this.attackCycleStartTime === 0) {
            this.attackCycleStartTime = currentTime;
        }
        
        const elapsedTime = currentTime - this.attackCycleStartTime;
        
        if (this.isAttackPhase) {
            // 攻撃フェーズ中
            if (elapsedTime >= this.attackPhaseDuration) {
                // 攻撃フェーズ終了、待機フェーズに移行
                this.isAttackPhase = false;
                this.attackCycleStartTime = currentTime;
                debugLog('敵攻撃: 待機フェーズに移行');
            }
        } else {
            // 待機フェーズ中
            if (elapsedTime >= this.waitPhaseDuration) {
                // 待機フェーズ終了、攻撃フェーズに移行
                this.isAttackPhase = true;
                this.attackCycleStartTime = currentTime;
                debugLog('敵攻撃: 攻撃フェーズに移行');
            }
        }
    }
    
    // プレイヤーが攻撃範囲内にいるかチェック
    isPlayerInAttackRange(enemyPosition, playerPosition) {
        // 敵から人工衛星への方向ベクトル
        const toPlayer = playerPosition.clone().sub(enemyPosition);
        
        // 敵の位置での地表法線ベクトル（地球中心から敵への方向）
        const surfaceNormal = enemyPosition.clone().normalize();
        
        // 仰角を計算
        const angle = Math.acos(surfaceNormal.dot(toPlayer.normalize()));
        const angleDegrees = angle * 180 / Math.PI;
        
        // 攻撃可能角度範囲内かチェック
        return angleDegrees >= this.attackAngleMin && angleDegrees <= this.attackAngleMax;
    }
    
    // プレイヤーに向けて発射
    fireAtPlayer(enemyPosition, targetPosition) {
        const projectile = this.getProjectileFromPool();
        if (!projectile) {
            return false;
        }
        
        // デバッグ情報出力（10%の確率で）
        if (Math.random() < 0.1) {
            console.log(`発射デバッグ: 発射位置=${enemyPosition.x.toFixed(3)}, ${enemyPosition.y.toFixed(3)}, ${enemyPosition.z.toFixed(3)}, 目標位置=${targetPosition.x.toFixed(3)}, ${targetPosition.y.toFixed(3)}, ${targetPosition.z.toFixed(3)}`);
        }
        
        // 発射位置設定
        projectile.position.copy(enemyPosition);
        
        
        // 目標方向計算（散らばりを追加）
        const direction = targetPosition.clone().sub(enemyPosition).normalize();
        
        // 散らばり追加
        const spreadAngle = this.aimSpread * (Math.random() - 0.5);
        const perpendicular = new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
        ).normalize();
        
        // 散らばり方向を加算
        direction.add(perpendicular.multiplyScalar(spreadAngle)).normalize();
        
        // 弾丸の向きを進行方向に設定（速度設定前に）
        const lookDirection = direction.clone();
        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), lookDirection);
        projectile.quaternion.copy(quaternion);
        
        // 速度設定（方向ベクトルは既に正規化済みなので、速度を直接掛ける）
        projectile.userData.velocity.copy(direction.clone().multiplyScalar(this.projectileSpeed));
        
        // 弾丸状態設定
        projectile.userData.active = true;
        projectile.userData.lifetime = this.projectileLifetime;
        projectile.userData.maxLifetime = this.projectileLifetime;
        projectile.userData.startTime = performance.now() / 1000;
        projectile.visible = true;
        projectile.scale.setScalar(1.0);
        projectile.material.opacity = 1.0;
        
        // デバッグ情報出力（10%の確率で）
        if (Math.random() < 0.1) {
            console.log(`弾丸生成: 位置=${projectile.position.x.toFixed(3)}, ${projectile.position.y.toFixed(3)}, ${projectile.position.z.toFixed(3)}, 速度=${projectile.userData.velocity.x.toFixed(3)}, ${projectile.userData.velocity.y.toFixed(3)}, ${projectile.userData.velocity.z.toFixed(3)}, visible=${projectile.visible}, active=${projectile.userData.active}, inScene=${this.scene.children.includes(projectile)}, poolIndex=${this.projectilePool.indexOf(projectile)}`);
        }
        
        this.enemyProjectiles.push(projectile);
        this.activeProjectileCount++;
        this.totalShotsFired++;
        
        // 発光エフェクト開始
        this.startProjectileGlow(projectile);
        
        // 敵攻撃音を再生
        if (this.soundSystem) {
            this.soundSystem.playEnemyAttackSound();
        }
        
        return true;
    }
    
    // 弾丸の発光エフェクト
    startProjectileGlow(projectile) {
        projectile.userData.glowPhase = 0;
        projectile.userData.glowSpeed = 4.0; // 発光速度
    }
    
    // プロジェクタイルプールから取得
    getProjectileFromPool() {
        for (let projectile of this.projectilePool) {
            if (!projectile.userData.active) {
                return projectile;
            }
        }
        return null; // プールが満杯
    }
    
    // 弾丸を更新
    updateProjectiles(deltaTime) {
        // デバッグ: アクティブ弾丸数を定期的に出力
        const currentTime = performance.now() / 1000;
        if (!this.lastProjectileDebugTime) this.lastProjectileDebugTime = 0;
        if (currentTime - this.lastProjectileDebugTime > 3.0) {
            console.log(`弾丸更新: アクティブ弾丸数=${this.enemyProjectiles.length}, プール使用率=${this.activeProjectileCount}/${this.maxProjectiles}`);
            this.lastProjectileDebugTime = currentTime;
        }
        
        for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
            const projectile = this.enemyProjectiles[i];
            
            // 位置更新
            projectile.position.add(
                projectile.userData.velocity.clone().multiplyScalar(deltaTime)
            );
            
            // 発光エフェクト更新
            this.updateProjectileGlow(projectile, deltaTime);
            
            // 寿命チェック
            projectile.userData.lifetime -= deltaTime;
            
            // 地球との衝突チェック（地球から遠ざかっている弾丸のみチェック）
            const distanceFromCenter = projectile.position.length();
            if (distanceFromCenter <= 1.0 + this.projectileRadius) {
                // 地球に衝突
                console.log(`弾丸削除: 地球衝突 距離=${distanceFromCenter.toFixed(3)}`);
                this.removeProjectile(projectile, i);
                continue;
            }
            
            // 人工衛星軌道より大幅に遠くに行った弾丸は削除
            if (distanceFromCenter > 5.0) {
                console.log(`弾丸削除: 軌道外 距離=${distanceFromCenter.toFixed(3)}`);
                this.removeProjectile(projectile, i);
                continue;
            }
            
            // 寿命切れチェック
            if (projectile.userData.lifetime <= 0) {
                console.log(`弾丸削除: 寿命切れ lifetime=${projectile.userData.lifetime.toFixed(3)}`);
                this.removeProjectile(projectile, i);
                continue;
            }
        }
    }
    
    // 弾丸の発光エフェクト更新
    updateProjectileGlow(projectile, deltaTime) {
        projectile.userData.glowPhase += deltaTime * projectile.userData.glowSpeed;
        
        // sin波による発光の明滅
        const glowIntensity = 0.5 + 0.5 * Math.sin(projectile.userData.glowPhase);
        
        // エミッシブ色の明度調整（10倍明るく）
        const baseEmissive = 0x00ff00; // 緑色のエミッシブ
        const r = ((baseEmissive >> 16) & 0xff) / 255;
        const g = ((baseEmissive >> 8) & 0xff) / 255;
        const b = (baseEmissive & 0xff) / 255;
        
        // 発光強度を10倍に
        const brightGlow = Math.min(1.0, glowIntensity * 10.0);
        
        projectile.material.emissive.setRGB(
            r * brightGlow,
            g * brightGlow,
            b * brightGlow
        );
    }
    
    // プレイヤーとの衝突チェック
    checkPlayerHit(playerPosition, playerRadius = 0.02) {
        const hits = [];
        
        for (let projectile of this.enemyProjectiles) {
            const distance = projectile.position.distanceTo(playerPosition);
            if (distance <= playerRadius + this.projectileRadius) {
                hits.push({
                    projectile: projectile,
                    distance: distance,
                    position: projectile.position.clone()
                });
            }
        }
        
        return hits;
    }
    
    // 弾丸を削除
    removeProjectile(projectile, index) {
        projectile.userData.active = false;
        projectile.visible = false;
        projectile.userData.lifetime = 0;
        
        // 発光リセット
        projectile.material.emissive.setHex(this.projectileEmissive);
        
        this.enemyProjectiles.splice(index, 1);
        this.activeProjectileCount--;
    }
    
    // 攻撃実行
    executeAttack(enemies, playerPosition) {
        const attackableEnemies = this.checkAttackConditions(enemies, playerPosition);
        
        if (attackableEnemies.length === 0) {
            return 0;
        }
        
        let attacksExecuted = 0;
        const maxAttacks = Math.min(
            attackableEnemies.length,
            this.maxSimultaneousAttacks - this.attackingEnemies.size
        );
        
        for (let i = 0; i < maxAttacks; i++) {
            const enemy = attackableEnemies[i];
            
            // 攻撃実行
            const success = this.fireAtPlayer(enemy.userData.position, playerPosition);
            if (success) {
                // 攻撃中リストに追加
                this.attackingEnemies.set(enemy.userData.id, {
                    enemy: enemy,
                    startTime: performance.now() / 1000
                });
                attacksExecuted++;
                
                // 攻撃ログ（すべての敵で統一）
                if (Math.random() < 0.05) { // 5%の確率でログ出力
                    console.log(`🎯 子敵が攻撃: ID=${enemy.userData.id}, 位置=(${enemy.userData.position.x.toFixed(3)}, ${enemy.userData.position.y.toFixed(3)}, ${enemy.userData.position.z.toFixed(3)})`);
                }
            }
        }
        
        if (attacksExecuted > 0) {
            this.lastAttackTime = performance.now() / 1000;
            console.log(`✅ 敵攻撃成功: ${attacksExecuted}発撃発射, 総発射数: ${this.totalShotsFired}`);
        }
        
        return attacksExecuted;
    }
    
    // システム更新
    update(deltaTime, enemies, playerPosition) {
        // 弾丸更新
        this.updateProjectiles(deltaTime);
        
        // 攻撃中の敵の状態更新
        this.updateAttackingEnemies(deltaTime);
        
        // 攻撃実行チェック
        this.executeAttack(enemies, playerPosition);
    }
    
    // 攻撃中の敵の状態更新
    updateAttackingEnemies(deltaTime) {
        const currentTime = performance.now() / 1000;
        
        for (let [enemyId, attackInfo] of this.attackingEnemies) {
            const elapsedTime = currentTime - attackInfo.startTime;
            
            // 攻撃クールダウン完了チェック（攻撃後1秒間はクールダウン）
            if (elapsedTime >= 1.0) {
                this.attackingEnemies.delete(enemyId);
            }
        }
    }
    
    // アクティブな弾丸数を取得
    getActiveProjectileCount() {
        return this.activeProjectileCount;
    }
    
    // 統計情報を取得
    getStats() {
        return {
            totalShotsFired: this.totalShotsFired,
            activeProjectileCount: this.activeProjectileCount,
            attackingEnemyCount: this.attackingEnemies.size,
            maxProjectiles: this.maxProjectiles,
            projectilePoolUsage: this.activeProjectileCount / this.maxProjectiles
        };
    }
    
    // デバッグ情報を取得
    getDebugInfo() {
        return {
            attackAngleMin: this.attackAngleMin,
            attackAngleMax: this.attackAngleMax,
            attackInterval: this.attackInterval,
            maxSimultaneousAttacks: this.maxSimultaneousAttacks,
            projectileSpeed: this.projectileSpeed,
            projectileRadius: this.projectileRadius,
            projectileLifetime: this.projectileLifetime,
            aimSpread: this.aimSpread,
            ...this.getStats()
        };
    }
    
    // システムリセット
    reset() {
        // 全弾丸をシーンから削除
        for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
            const projectile = this.enemyProjectiles[i];
            if (projectile && projectile.parent) {
                projectile.parent.remove(projectile);
            }
        }
        this.enemyProjectiles = [];
        
        // プールもクリア
        for (let poolProjectile of this.projectilePool) {
            if (poolProjectile && poolProjectile.parent) {
                poolProjectile.parent.remove(poolProjectile);
            }
        }
        this.projectilePool = [];
        
        // 攻撃状態リセット
        this.attackingEnemies.clear();
        this.lastAttackTime = 0;
        // 攻撃サイクルを現在時刻から再開
        this.attackCycleStartTime = performance.now() / 1000;
        this.isAttackPhase = true;
        
        // 統計リセット
        this.totalShotsFired = 0;
        this.activeProjectileCount = 0;
        
        console.log('敵砲撃システムをリセット - 弾丸全削除完了');
    }
    
    // 弾丸のみクリア（攻撃システムは維持）
    clearProjectiles() {
        // 全弾丸をシーンから削除
        for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
            const projectile = this.enemyProjectiles[i];
            if (projectile && projectile.parent) {
                projectile.parent.remove(projectile);
            }
        }
        this.enemyProjectiles = [];
        
        // アクティブな弾丸数をリセット
        this.activeProjectileCount = 0;
        
        // 攻撃サイクルを確実に再開（攻撃フェーズで開始）
        this.attackCycleStartTime = performance.now() / 1000;
        this.isAttackPhase = true;
        
        console.log('敵弾丸のみクリア完了 - 攻撃システムは継続・攻撃サイクル再開');
    }
    
    // 弾丸の物理更新のみ（新しい攻撃は行わない）
    updateProjectilesOnly(deltaTime) {
        const currentTime = performance.now() / 1000;
        
        // 既存の弾丸のみ更新
        for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
            const projectile = this.enemyProjectiles[i];
            
            if (!projectile.userData.active) continue;
            
            // 弾丸の位置を更新
            projectile.position.add(
                projectile.userData.velocity.clone().multiplyScalar(deltaTime)
            );
            
            // 寿命チェック
            projectile.userData.lifetime += deltaTime;
            if (projectile.userData.lifetime >= projectile.userData.maxLifetime) {
                this.removeProjectile(projectile, i);
                continue;
            }
            
            // 地球との衝突チェック
            const distanceFromEarth = projectile.position.length();
            if (distanceFromEarth <= 1.0) {
                this.removeProjectile(projectile, i);
                continue;
            }
        }
        
        // 統計更新
        this.activeProjectileCount = this.enemyProjectiles.length;
    }
    
    // リソースの解放
    dispose() {
        for (let projectile of this.projectilePool) {
            this.scene.remove(projectile);
            projectile.geometry.dispose();
            projectile.material.dispose();
        }
        
        this.projectilePool = [];
        this.enemyProjectiles = [];
        this.attackingEnemies.clear();
        
        debugLog('敵砲撃システムを終了');
    }
}