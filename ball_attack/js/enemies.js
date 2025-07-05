/**
 * Ball Attack - 敵システム
 * 地球表面に配置された敵の管理と衝突判定
 */

/**
 * DestroyParticleSystem - 敵撃破用パーティクルエフェクト
 */
class DestroyParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.activeExplosions = [];
        this.maxParticles = 80; // 大幅増加
        
        // 軽量な平面パーティクル用のジオメトリとマテリアル
        this.particleGeometry = new THREE.PlaneGeometry(0.006, 0.006); // 小さな平面
        this.particleMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000, // 赤色
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide // 両面描画で見栄えを良く
        });
        
        // より細かいパーティクル用（点群）
        this.fineParticleGeometry = new THREE.BufferGeometry();
        this.fineParticleMaterial = new THREE.PointsMaterial({
            color: 0xff0000,
            size: 0.008,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });
    }
    
    createExplosion(position, scale = 2.0, color = 0xff0000) {
        const particles = [];
        const fineParticles = [];
        
        // メイン平面パーティクル（中程度の数）
        const mainParticleCount = Math.min(20, 15 + Math.floor(scale * 3));
        
        for (let i = 0; i < mainParticleCount; i++) {
            const particle = new THREE.Mesh(this.particleGeometry, this.particleMaterial.clone());
            particle.material.color.setHex(color);
            particle.position.copy(position);
            
            // ランダム散布
            const angle = Math.random() * Math.PI * 2;
            const elevation = (Math.random() - 0.5) * Math.PI * 0.6;
            const speed = (0.002 + Math.random() * 0.004) * scale;
            
            particle.velocity = new THREE.Vector3(
                Math.cos(angle) * Math.cos(elevation) * speed,
                Math.sin(elevation) * speed,
                Math.sin(angle) * Math.cos(elevation) * speed
            );
            
            particle.life = 1.5 + Math.random() * 1.0;
            particle.maxLife = particle.life;
            particle.initialScale = (0.6 + Math.random() * 0.8) * scale;
            particle.scale.setScalar(particle.initialScale);
            
            // ランダム回転で見栄えを良く
            particle.rotation.z = Math.random() * Math.PI * 2;
            
            this.scene.add(particle);
            particles.push(particle);
        }
        
        // 細かい点群パーティクル（大量）
        const fineParticleCount = Math.min(60, 40 + Math.floor(scale * 10));
        const positions = new Float32Array(fineParticleCount * 3);
        const velocities = [];
        const lives = [];
        
        for (let i = 0; i < fineParticleCount; i++) {
            const i3 = i * 3;
            positions[i3] = position.x;
            positions[i3 + 1] = position.y;
            positions[i3 + 2] = position.z;
            
            // ランダム速度
            const angle = Math.random() * Math.PI * 2;
            const elevation = (Math.random() - 0.5) * Math.PI * 0.8;
            const speed = (0.001 + Math.random() * 0.006) * scale;
            
            velocities.push(new THREE.Vector3(
                Math.cos(angle) * Math.cos(elevation) * speed,
                Math.sin(elevation) * speed,
                Math.sin(angle) * Math.cos(elevation) * speed
            ));
            
            lives.push({
                current: 1.0 + Math.random() * 1.5,
                max: 1.0 + Math.random() * 1.5
            });
        }
        
        const fineGeometry = this.fineParticleGeometry.clone();
        fineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const fineParticleSystem = new THREE.Points(fineGeometry, this.fineParticleMaterial.clone());
        fineParticleSystem.material.color.setHex(color);
        fineParticleSystem.userData = {
            velocities: velocities,
            lives: lives,
            active: true
        };
        
        this.scene.add(fineParticleSystem);
        fineParticles.push(fineParticleSystem);
        
        this.activeExplosions.push({
            particles: particles,
            fineParticles: fineParticles,
            life: 2.5,
            maxLife: 2.5
        });
    }
    
    update(deltaTime) {
        for (let i = this.activeExplosions.length - 1; i >= 0; i--) {
            const explosion = this.activeExplosions[i];
            explosion.life -= deltaTime;
            
            // メイン平面パーティクルの更新
            explosion.particles.forEach(particle => {
                if (particle.life > 0) {
                    // 位置を更新
                    particle.position.add(particle.velocity);
                    
                    // 速度を減衰
                    particle.velocity.multiplyScalar(0.98);
                    
                    // ライフタイムを減少
                    particle.life -= deltaTime;
                    
                    // フェードアウト
                    const lifeRatio = particle.life / particle.maxLife;
                    particle.material.opacity = Math.max(0.1, lifeRatio);
                    particle.scale.setScalar(particle.initialScale * Math.max(0.3, lifeRatio));
                    
                    // 回転で動的効果
                    particle.rotation.z += deltaTime * 2;
                }
            });
            
            // 細かい点群パーティクルの更新
            if (explosion.fineParticles) {
                explosion.fineParticles.forEach(fineSystem => {
                    if (fineSystem.userData.active) {
                        const positions = fineSystem.geometry.attributes.position.array;
                        const velocities = fineSystem.userData.velocities;
                        const lives = fineSystem.userData.lives;
                        let activeCount = 0;
                        
                        for (let j = 0; j < velocities.length; j++) {
                            const j3 = j * 3;
                            const life = lives[j];
                            
                            if (life.current > 0) {
                                // 位置を更新
                                positions[j3] += velocities[j].x;
                                positions[j3 + 1] += velocities[j].y;
                                positions[j3 + 2] += velocities[j].z;
                                
                                // 速度を減衰
                                velocities[j].multiplyScalar(0.985);
                                
                                // ライフタイムを減少
                                life.current -= deltaTime;
                                activeCount++;
                            }
                        }
                        
                        // バッファを更新
                        fineSystem.geometry.attributes.position.needsUpdate = true;
                        
                        // フェードアウト
                        const systemLifeRatio = explosion.life / explosion.maxLife;
                        fineSystem.material.opacity = Math.max(0.05, systemLifeRatio);
                        
                        // 全パーティクルが非アクティブになったら停止
                        if (activeCount === 0) {
                            fineSystem.userData.active = false;
                        }
                    }
                });
            }
            
            // 爆発が終了した場合、パーティクルを削除
            if (explosion.life <= 0) {
                explosion.particles.forEach(particle => {
                    this.scene.remove(particle);
                    particle.material.dispose();
                });
                
                if (explosion.fineParticles) {
                    explosion.fineParticles.forEach(fineSystem => {
                        this.scene.remove(fineSystem);
                        fineSystem.geometry.dispose();
                        fineSystem.material.dispose();
                    });
                }
                
                this.activeExplosions.splice(i, 1);
            }
        }
    }
    
    dispose() {
        this.activeExplosions.forEach(explosion => {
            explosion.particles.forEach(particle => {
                this.scene.remove(particle);
                particle.material.dispose();
            });
            
            if (explosion.fineParticles) {
                explosion.fineParticles.forEach(fineSystem => {
                    this.scene.remove(fineSystem);
                    fineSystem.geometry.dispose();
                    fineSystem.material.dispose();
                });
            }
        });
        this.activeExplosions = [];
        
        this.particleMaterial.dispose();
        this.particleGeometry.dispose();
        this.fineParticleMaterial.dispose();
        this.fineParticleGeometry.dispose();
    }
}

class EnemySystem {
    constructor(scene, earthRadius = 1, soundSystem = null) {
        this.scene = scene;
        this.earthRadius = earthRadius;
        this.soundSystem = soundSystem;
        
        // 敵管理
        this.enemies = [];
        this.maxEnemies = 300;
        this.activeEnemyCount = 0;
        
        // 敵の設定
        this.enemyRadius = 0.01; // 敵の半径（小さな赤いスフィア）
        this.enemyHeightOffset = 0.005; // 地表からの浮上量
        this.minEnemyDistance = 0.05; // 敵同士の最小距離
        
        // 敵撃破エフェクト設定
        this.destroyParticleSystem = null;
        this.destroyLights = [];
        this.destroyLightPool = [];
        this.maxDestroyLights = 10;
        
        // 敵の外観設定
        this.enemyColor = 0xff0000; // 赤色
        this.enemyEmissiveColor = 0xff3333; // 赤色の発光（3倍明るく）
        
        // 撃破エフェクト設定
        this.destroyAnimationDuration = 0.5; // 撃破アニメーション時間
        
        // 統計情報
        this.totalEnemiesSpawned = 0;
        this.enemiesDestroyed = 0;
        
        this.initEnemyPool();
        this.initDestroyParticleSystem();
        this.initDestroyLightPool();
    }
    
    initEnemyPool() {
        // 敵オブジェクトプールを初期化
        const enemyGeometry = new THREE.SphereGeometry(this.enemyRadius, 8, 6);
        const enemyMaterial = new THREE.MeshStandardMaterial({
            color: this.enemyColor,
            emissive: this.enemyEmissiveColor,
            transparent: true,
            opacity: 1.0
        });
        
        for (let i = 0; i < this.maxEnemies; i++) {
            const enemy = new THREE.Mesh(enemyGeometry, enemyMaterial.clone());
            enemy.visible = false;
            enemy.userData = {
                active: false,
                position: new THREE.Vector3(),
                latitude: 0,
                longitude: 0,
                id: i,
                destroyStartTime: 0,
                isDestroying: false,
                maxLife: 1.0,
                currentLife: 1.0
            };
            
            this.scene.add(enemy);
            this.enemies.push(enemy);
        }
        
        debugLog(`敵プールを初期化: ${this.maxEnemies}個`);
    }
    
    generateEnemies(count = 300) {
        const targetCount = Math.min(count, this.maxEnemies);
        const positions = [];
        
        // 重複回避のため既存の位置を記録
        const existingPositions = [];
        
        for (let i = 0; i < targetCount; i++) {
            let attempts = 0;
            let validPosition = false;
            let lat, lng, position;
            
            // 最大100回試行して有効な位置を見つける
            while (!validPosition && attempts < 100) {
                // ランダムな緯度経度を生成
                lat = (Math.random() - 0.5) * 180; // -90°〜90°
                lng = (Math.random() - 0.5) * 360; // -180°〜180°
                
                // 3D座標に変換
                position = this.latLngToCartesian(lat, lng, this.earthRadius + this.enemyHeightOffset);
                
                // 既存の敵との距離チェック
                validPosition = true;
                for (let existingPos of existingPositions) {
                    if (position.distanceTo(existingPos) < this.minEnemyDistance) {
                        validPosition = false;
                        break;
                    }
                }
                
                attempts++;
            }
            
            if (validPosition) {
                // 敵を配置
                const enemy = this.getInactiveEnemy();
                if (enemy) {
                    enemy.userData.latitude = lat;
                    enemy.userData.longitude = lng;
                    enemy.userData.position.copy(position);
                    enemy.userData.active = true;
                    enemy.userData.isDestroying = false;
                    enemy.userData.currentLife = enemy.userData.maxLife;
                    
                    enemy.position.copy(position);
                    enemy.visible = true;
                    enemy.scale.setScalar(1.0);
                    enemy.material.opacity = 1.0;
                    
                    existingPositions.push(position.clone());
                    this.activeEnemyCount++;
                    this.totalEnemiesSpawned++;
                }
            }
        }
        
        debugLog(`敵を配置: ${this.activeEnemyCount}個（目標: ${targetCount}個）`);
        return this.activeEnemyCount;
    }
    
    getInactiveEnemy() {
        for (let enemy of this.enemies) {
            if (!enemy.userData.active) {
                return enemy;
            }
        }
        return null;
    }
    
    // 緯度経度から3D座標への変換
    latLngToCartesian(lat, lng, radius = 1) {
        const phi = (90 - lat) * Math.PI / 180;
        const theta = (lng + 180) * Math.PI / 180;
        
        return new THREE.Vector3(
            radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.cos(phi),
            radius * Math.sin(phi) * Math.sin(theta)
        );
    }
    
    // 攻撃判定球との衝突判定
    checkCollisions(attackSpheres) {
        const hits = [];
        
        for (let attackSphere of attackSpheres) {
            const attackPos = attackSphere.position;
            const attackRadius = attackSphere.userData?.radius || 0.036;
            
            // アクティブな敵との衝突チェック
            for (let enemy of this.enemies) {
                if (!enemy.userData.active || enemy.userData.isDestroying) {
                    continue;
                }
                
                const distance = attackPos.distanceTo(enemy.userData.position);
                if (distance <= attackRadius + this.enemyRadius) {
                    // 衝突が発生
                    const damage = this.calculateDamage(distance, attackRadius);
                    
                    hits.push({
                        enemy: enemy,
                        damage: damage,
                        distance: distance,
                        attackRadius: attackRadius,
                        hitChance: this.calculateHitChance(distance, attackRadius)
                    });
                }
            }
        }
        
        return hits;
    }
    
    // 距離ベースのダメージ計算
    calculateDamage(distance, attackRadius) {
        if (distance > attackRadius) {
            return 0;
        }
        
        // 中心部100%、境界部20%の線形補間
        const centerDamage = 1.0;
        const borderDamage = 0.2;
        const damageRatio = 1.0 - (distance / attackRadius);
        
        return borderDamage + (centerDamage - borderDamage) * damageRatio;
    }
    
    // 命中確率計算
    calculateHitChance(distance, attackRadius) {
        const damage = this.calculateDamage(distance, attackRadius);
        return damage; // ダメージ = 確率として使用
    }
    
    // 敵を撃破
    destroyEnemy(enemy, damage = 1.0) {
        if (!enemy.userData.active || enemy.userData.isDestroying) {
            return false;
        }
        
        // 確率的撃破判定
        const hitChance = damage; // ダメージ値を確率として使用
        if (Math.random() > hitChance) {
            return false; // 撃破失敗
        }
        
        // 撃破成功
        enemy.userData.isDestroying = true;
        enemy.userData.destroyStartTime = performance.now() / 1000;
        
        this.enemiesDestroyed++;
        this.activeEnemyCount--;
        
        // 撃破エフェクトを開始
        this.startDestroyAnimation(enemy);
        this.createDestroyEffects(enemy.userData.position);
        
        // 撃破音を再生
        if (this.soundSystem) {
            this.soundSystem.playEnemyDestroySound();
        }
        
        debugLog(`敵を撃破: ${this.enemiesDestroyed}/${this.totalEnemiesSpawned}`);
        return true;
    }
    
    // 撃破アニメーション開始
    startDestroyAnimation(enemy) {
        // スケールダウンアニメーション
        const startScale = 1.0;
        const endScale = 0.0;
        
        // 色の変化（赤→オレンジ→黄色）
        const originalColor = enemy.material.color.getHex();
        const originalEmissive = enemy.material.emissive.getHex();
        
        enemy.userData.startScale = startScale;
        enemy.userData.endScale = endScale;
        enemy.userData.originalColor = originalColor;
        enemy.userData.originalEmissive = originalEmissive;
    }
    
    // 敵を完全に削除
    removeEnemy(enemy) {
        enemy.userData.active = false;
        enemy.userData.isDestroying = false;
        enemy.visible = false;
        enemy.scale.setScalar(1.0);
        enemy.material.opacity = 1.0;
        
        // 色を元に戻す
        if (enemy.userData.originalColor !== undefined) {
            enemy.material.color.setHex(enemy.userData.originalColor);
            enemy.material.emissive.setHex(enemy.userData.originalEmissive);
        }
    }
    
    initDestroyParticleSystem() {
        // 敵撃破用パーティクルシステムを初期化（赤い大きなパーティクル）
        this.destroyParticleSystem = new DestroyParticleSystem(this.scene);
    }
    
    initDestroyLightPool() {
        // 敵撃破用赤いライトプールを初期化
        for (let i = 0; i < this.maxDestroyLights; i++) {
            const destroyLight = new THREE.PointLight(0xff0000, 150.0, 0.19); // 赤い光、攻撃範囲の2倍
            destroyLight.visible = false;
            destroyLight.userData = {
                lifetime: 0,
                maxLifetime: 0.8, // 少し長めに点灯
                active: false
            };
            this.scene.add(destroyLight);
            this.destroyLightPool.push(destroyLight);
        }
    }

    // システム更新
    update(deltaTime) {
        // 撃破アニメーションの更新
        for (let enemy of this.enemies) {
            if (enemy.userData.isDestroying) {
                this.updateDestroyAnimation(enemy, deltaTime);
            }
        }
        
        // 撃破パーティクルシステムの更新
        if (this.destroyParticleSystem) {
            this.destroyParticleSystem.update(deltaTime);
        }
        
        // 撃破ライトの更新
        this.updateDestroyLights(deltaTime);
    }
    
    // 撃破アニメーション更新
    updateDestroyAnimation(enemy, deltaTime) {
        const currentTime = performance.now() / 1000;
        const elapsedTime = currentTime - enemy.userData.destroyStartTime;
        const progress = Math.min(elapsedTime / this.destroyAnimationDuration, 1.0);
        
        // スケールダウン
        const scale = enemy.userData.startScale * (1.0 - progress);
        enemy.scale.setScalar(Math.max(0, scale));
        
        // フェードアウト
        enemy.material.opacity = 1.0 - progress;
        
        // 色の変化（赤→オレンジ→黄色）
        const colorProgress = progress;
        const r = 1.0;
        const g = colorProgress * 0.5;
        const b = 0.0;
        enemy.material.color.setRGB(r, g, b);
        enemy.material.emissive.setRGB(r * 0.3, g * 0.3, b * 0.3);
        
        // アニメーション完了時に削除
        if (progress >= 1.0) {
            this.removeEnemy(enemy);
        }
    }
    
    // 撃破エフェクト作成
    createDestroyEffects(position) {
        // 赤い大きなパーティクルエフェクト
        if (this.destroyParticleSystem) {
            this.destroyParticleSystem.createExplosion(position, 2.0, 0xff0000);
        }
        
        // 攻撃範囲の2倍の赤いライト
        const destroyLight = this.getDestroyLightFromPool();
        if (destroyLight) {
            destroyLight.position.copy(position);
            destroyLight.userData.lifetime = 0;
            destroyLight.userData.active = true;
            destroyLight.visible = true;
            
            this.destroyLights.push(destroyLight);
        }
    }
    
    // 撃破ライトプールから取得
    getDestroyLightFromPool() {
        for (let light of this.destroyLightPool) {
            if (!light.userData.active) {
                return light;
            }
        }
        return null;
    }
    
    // 撃破ライト更新
    updateDestroyLights(deltaTime) {
        for (let i = this.destroyLights.length - 1; i >= 0; i--) {
            const light = this.destroyLights[i];
            light.userData.lifetime += deltaTime;
            
            // 滑らかな減衰
            const progress = light.userData.lifetime / light.userData.maxLifetime;
            const easeOut = 1 - Math.pow(progress, 2);
            light.intensity = 150.0 * easeOut;
            
            // ライト削除
            if (light.userData.lifetime > light.userData.maxLifetime) {
                light.visible = false;
                light.userData.active = false;
                this.destroyLights.splice(i, 1);
            }
        }
    }
    
    // アクティブな敵の数を取得
    getActiveEnemyCount() {
        return this.activeEnemyCount;
    }
    
    // 撃破済みの敵数を取得
    getEnemiesDestroyed() {
        return this.enemiesDestroyed;
    }
    
    // 全敵撃破チェック
    isAllEnemiesDestroyed() {
        return this.activeEnemyCount === 0;
    }
    
    // 撃破率を取得
    getDestroyRate() {
        if (this.totalEnemiesSpawned === 0) return 0;
        return this.enemiesDestroyed / this.totalEnemiesSpawned;
    }
    
    // 統計情報を取得
    getStats() {
        return {
            totalSpawned: this.totalEnemiesSpawned,
            activeCount: this.activeEnemyCount,
            destroyed: this.enemiesDestroyed,
            destroyRate: this.getDestroyRate(),
            remainingCount: this.activeEnemyCount,
            isAllDestroyed: this.isAllEnemiesDestroyed()
        };
    }
    
    // 敵をリセット
    reset() {
        for (let enemy of this.enemies) {
            this.removeEnemy(enemy);
        }
        
        this.activeEnemyCount = 0;
        this.enemiesDestroyed = 0;
        this.totalEnemiesSpawned = 0;
        
        debugLog('敵システムをリセット');
    }
    
    // デバッグ情報を取得
    getDebugInfo() {
        return {
            maxEnemies: this.maxEnemies,
            activeEnemyCount: this.activeEnemyCount,
            enemiesDestroyed: this.enemiesDestroyed,
            totalEnemiesSpawned: this.totalEnemiesSpawned,
            destroyRate: this.getDestroyRate(),
            enemyRadius: this.enemyRadius,
            minEnemyDistance: this.minEnemyDistance,
            destroyAnimationDuration: this.destroyAnimationDuration
        };
    }
    
    // リソースの解放
    dispose() {
        for (let enemy of this.enemies) {
            this.scene.remove(enemy);
            enemy.geometry.dispose();
            enemy.material.dispose();
        }
        
        // 撃破パーティクルシステムの削除
        if (this.destroyParticleSystem) {
            this.destroyParticleSystem.dispose();
        }
        
        // 撃破ライトの削除
        for (let light of this.destroyLightPool) {
            this.scene.remove(light);
        }
        
        this.enemies = [];
        this.destroyLights = [];
        this.destroyLightPool = [];
        this.activeEnemyCount = 0;
        this.enemiesDestroyed = 0;
        this.totalEnemiesSpawned = 0;
        
        debugLog('敵システムを終了');
    }
}