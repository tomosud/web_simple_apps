/**
 * Ball Attack - 武器システム
 * 弾丸の発射、軌道計算、衝突検出を管理
 */

/**
 * ParticleSystem - 爆発パーティクル効果
 */
class ParticleSystem {
    constructor(scene, camera = null) {
        this.scene = scene;
        this.camera = camera;
        this.activeExplosions = [];
        this.maxParticles = 30;
        this.updateCounter = 0; // 負荷軽減用カウンター
        
        // パーティクル用のジオメトリとマテリアル（小さく明るく）
        this.particleGeometry = new THREE.SphereGeometry(0.003, 4, 3); // サイズ縮小、ポリゴン削減
        this.particleMaterial = new THREE.MeshStandardMaterial({
            color: 0xff6600, // やや赤いオレンジ色
            emissive: 0xff6600, // エミッシブで明るく発光
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
    }
    
    createExplosion(position, scale = 1.0, color = 0xffaa00) {
        // カメラからの距離による動的パーティクル数調整
        let particleCount = 8;
        if (this.camera) {
            const distance = this.camera.position.distanceTo(position);
            if (distance > 4.0) {
                particleCount = 4; // 遠い場合は半分
            } else if (distance > 2.5) {
                particleCount = 6; // 中距離は少し減らす
            }
        }
        
        const particles = [];
        particleCount = Math.min(particleCount, 6 + Math.floor(scale * 2));
        
        // 重力なしの自然な散布
        
        // エミッターごとのランダムオフセット
        const emitterRandomOffset = {
            angleOffset: (Math.random() - 0.5) * Math.PI * 2,
            speedMultiplier: 0.7 + Math.random() * 0.6, // 0.7-1.3の範囲
            elevationBias: (Math.random() - 0.5) * 0.3
        };
        
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(this.particleGeometry, this.particleMaterial.clone());
            particle.material.color.setHex(0xff6600); // やや赤いオレンジ色
            particle.material.emissive.setHex(0xff6600); // エミッシブも同じ色
            particle.position.copy(position);
            
            // 改良された角度計算（全方向に等しく散布）
            const angle = (i / particleCount) * Math.PI * 2 + emitterRandomOffset.angleOffset + (Math.random() - 0.5) * 0.5;
            const elevation = (Math.random() - 0.5) * Math.PI * 0.3 + emitterRandomOffset.elevationBias; // より幅広い角度
            const speed = (0.001 + Math.random() * 0.0015) * emitterRandomOffset.speedMultiplier; // 速度半分、勢いを弱く
            
            // 球面座標で正しい方向ベクトルを計算
            particle.velocity = new THREE.Vector3(
                Math.cos(angle) * Math.cos(elevation) * speed,
                Math.sin(elevation) * speed,
                Math.sin(angle) * Math.cos(elevation) * speed
            );
            
            // 重力なし
            
            particle.life = 1.5 + Math.random() * 0.5;
            particle.maxLife = particle.life;
            particle.initialScale = 0.6 + Math.random() * 0.2;
            particle.scale.setScalar(particle.initialScale);
            
            this.scene.add(particle);
            particles.push(particle);
        }
        
        this.activeExplosions.push({
            particles: particles,
            life: 2.0,
            maxLife: 2.0
        });
    }
    
    update(deltaTime) {
        this.updateCounter++;
        
        // パーティクル更新を間引いて負荷軽減（2フレームに1回）
        const shouldUpdate = this.updateCounter % 2 === 0;
        
        // アクティブな爆発エフェクトを更新
        for (let i = this.activeExplosions.length - 1; i >= 0; i--) {
            const explosion = this.activeExplosions[i];
            explosion.life -= deltaTime;
            
            // パーティクルを更新（間引き処理）
            if (shouldUpdate) {
                explosion.particles.forEach(particle => {
                    if (particle.life > 0) {
                        // 重力なし、自然な散布のみ
                        
                        // 位置を更新
                        particle.position.add(particle.velocity);
                        
                        // 速度を減衰（よりゆっくりと）
                        particle.velocity.multiplyScalar(0.985);
                        
                        // ライフタイムを減少
                        particle.life -= deltaTime;
                        
                        // フェードアウト（計算を簡略化）
                        const lifeRatio = particle.life / particle.maxLife;
                        particle.material.opacity = Math.max(0.2, lifeRatio);
                        particle.scale.setScalar(particle.initialScale * Math.max(0.5, lifeRatio));
                    }
                });
            }
            
            // 爆発が終了した場合、パーティクルを削除
            if (explosion.life <= 0) {
                explosion.particles.forEach(particle => {
                    this.scene.remove(particle);
                    particle.material.dispose();
                });
                this.activeExplosions.splice(i, 1);
            }
        }
    }
    
    dispose() {
        // 全ての爆発エフェクトをクリア
        this.activeExplosions.forEach(explosion => {
            explosion.particles.forEach(particle => {
                this.scene.remove(particle);
                particle.material.dispose();
            });
        });
        this.activeExplosions = [];
        
        // 基本マテリアルとジオメトリを破棄
        this.particleMaterial.dispose();
        this.particleGeometry.dispose();
    }
}

class WeaponSystem {
    constructor(scene, camera, earth, satellite) {
        this.scene = scene;
        this.camera = camera;
        this.earth = earth;
        this.satellite = satellite;
        
        // 弾丸管理
        this.bullets = [];
        this.bulletPool = [];
        this.maxBullets = 50;
        
        // 振動パラメータ
        this.vibrationFrequency = 20.0; // 振動頻度
        this.vibrationAmplitude = 0.00133; // 振動幅（1/3に縮小）
        
        // ポイントライト重複チェック用
        this.maxActiveFlashLights = 3; // 最大3個まで同時点灯
        this.flashLightOverlapDistance = 0.1; // 重複判定距離
        
        // 攻撃判定球仕様
        this.attackRange = 0.036; // 攻撃範囲半径（0.6倍に縮小、ポイントライトと連動）
        this.centerDamage = 1.0; // 中心部致死性100%
        this.borderDamage = 0.2; // 境界部致死性20%
        
        // 発射設定
        this.fireRate = 0.15; // 0.15秒間隔
        this.lastFireTime = 0;
        this.isLeftGun = true; // 左右交互発射用
        
        // 弾丸設定
        this.bulletSpeed = 0.15; // 弾丸速度係数 (0.6の1/4)
        this.bulletLifetime = 10.0; // 弾丸寿命（秒）を延長
        
        // 銃の位置設定
        this.gunOffset = 0.1; // 人工衛星から銃までの距離
        this.gunSpread = 0.075; // 左右の銃の間隔（半分に縮小）
        this.convergenceDistance = 0.8; // 収束距離（地球表面近く）
        
        // 爆発エフェクト（パーティクルシステムに置き換え）
        this.particleSystem = null;
        
        // 点灯用プール
        this.flashLights = [];
        this.flashLightPool = [];
        this.maxFlashLights = 10;
        
        // ワイヤーフレーム表示用
        this.wireframeSpheres = [];
        this.wireframeSpherePool = [];
        this.showWireframes = false; // デバッグ用フラグ
        
        this.initBulletPool();
        this.initParticleSystem();
        this.initFlashLightPool();
        this.initWireframePool();
    }
    
    initBulletPool() {
        // 弾丸オブジェクトプールを初期化（Sphereに戻す）
        for (let i = 0; i < this.maxBullets; i++) {
            const bulletGeometry = new THREE.SphereGeometry(0.002, 8, 8); // 大きさ半分
            const bulletMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xffff00,
                emissive: 0xffff00, // エミッシブで明るく発光
                transparent: true,
                opacity: 1.0,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            
            const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
            bullet.visible = false;
            bullet.userData = {
                baseVelocity: new THREE.Vector3(), // 基本移動ベクトル
                basePosition: new THREE.Vector3(), // 基本位置
                lifetime: 0,
                active: false,
                vibrationPhaseX: Math.random() * Math.PI * 2, // X軸振動位相
                vibrationPhaseY: Math.random() * Math.PI * 2, // Y軸振動位相
                vibrationPhaseZ: Math.random() * Math.PI * 2, // Z軸振動位相
                vibrationFreqX: 15.0 + Math.random() * 10.0, // X軸振動頻度（ランダム）
                vibrationFreqY: 15.0 + Math.random() * 10.0, // Y軸振動頻度（ランダム）
                vibrationFreqZ: 15.0 + Math.random() * 10.0  // Z軸振動頻度（ランダム）
            };
            this.scene.add(bullet);
            this.bulletPool.push(bullet);
        }
    }
    
    initParticleSystem() {
        // パーティクルシステムを初期化
        this.particleSystem = new ParticleSystem(this.scene, this.camera);
    }
    
    initFlashLightPool() {
        // 点灯用ポイントライトプールを初期化
        for (let i = 0; i < this.maxFlashLights; i++) {
            const flashLight = new THREE.PointLight(0xffaa00, 100.0, this.attackRange); // 明るさ100に復帰、攻撃範囲と連動
            flashLight.visible = false;
            flashLight.userData = {
                lifetime: 0,
                maxLifetime: 0.3, // 0.3秒に延長（3倍）
                active: false
            };
            this.scene.add(flashLight);
            this.flashLightPool.push(flashLight);
        }
    }
    
    fire(currentTime) {
        // 発射レート制御
        if (currentTime - this.lastFireTime < this.fireRate) {
            return false;
        }
        
        this.lastFireTime = currentTime;
        
        // 未使用の弾丸を取得
        const bullet = this.getBulletFromPool();
        if (!bullet) {
            return false; // プールに空きがない
        }
        
        // 人工衛星の現在位置と向きを取得
        const satellitePosition = new THREE.Vector3();
        this.satellite.getWorldPosition(satellitePosition);
        
        // 地球中心への方向ベクトルを計算
        const earthCenter = new THREE.Vector3(0, 0, 0);
        const directionToEarth = earthCenter.clone().sub(satellitePosition).normalize();
        
        // 人工衛星の右方向ベクトルを計算
        const satelliteRight = new THREE.Vector3(1, 0, 0);
        
        // 銃の位置を計算（左右交互）
        const gunPosition = satellitePosition.clone();
        gunPosition.add(directionToEarth.clone().multiplyScalar(this.gunOffset));
        
        // 収束角度を計算（地表で収束させる）
        const distanceToEarth = satellitePosition.length();
        const convergenceAngle = Math.atan(this.gunSpread / (distanceToEarth - this.convergenceDistance));
        
        let gunOffset = new THREE.Vector3();
        if (this.isLeftGun) {
            gunOffset = satelliteRight.clone().multiplyScalar(-this.gunSpread);
            // 収束角度を適用
            directionToEarth.add(satelliteRight.clone().multiplyScalar(convergenceAngle));
        } else {
            gunOffset = satelliteRight.clone().multiplyScalar(this.gunSpread);
            // 収束角度を適用
            directionToEarth.add(satelliteRight.clone().multiplyScalar(-convergenceAngle));
        }
        
        gunPosition.add(gunOffset);
        
        // 弾丸の初期設定（振動システム）
        bullet.userData.basePosition.copy(gunPosition);
        bullet.userData.baseVelocity = directionToEarth.clone().multiplyScalar(this.bulletSpeed);
        bullet.userData.lifetime = 0;
        bullet.userData.active = true;
        
        // 各弾で個別の振動パラメータをよりランダム化（周期を3倍に）
        bullet.userData.vibrationPhaseX = Math.random() * Math.PI * 2;
        bullet.userData.vibrationPhaseY = Math.random() * Math.PI * 2;
        bullet.userData.vibrationPhaseZ = Math.random() * Math.PI * 2;
        bullet.userData.vibrationFreqX = 3.33 + Math.random() * 5.0; // 3.33-8.33の範囲（周期3倍）
        bullet.userData.vibrationFreqY = 2.67 + Math.random() * 6.67;  // 2.67-9.34の範囲（周期3倍）
        bullet.userData.vibrationFreqZ = 4.0 + Math.random() * 6.0; // 4-10の範囲（周期3倍）
        
        // 各弾で異なる振動スタイル
        bullet.userData.vibrationStyleX = Math.random() > 0.5 ? 1 : -1; // 正弦または余弦
        bullet.userData.vibrationStyleY = Math.random() > 0.5 ? 1 : -1;
        bullet.userData.vibrationStyleZ = Math.random() > 0.5 ? 1 : -1;
        bullet.userData.vibrationAmpMultiplier = 0.5 + Math.random() * 1.0; // 0.5-1.5倍の振幅
        
        bullet.visible = true;
        
        // 初期位置設定
        bullet.position.copy(gunPosition);
        
        this.bullets.push(bullet);
        
        // 左右交互切り替え
        this.isLeftGun = !this.isLeftGun;
        
        return true;
    }
    
    getBulletFromPool() {
        for (let bullet of this.bulletPool) {
            if (!bullet.userData.active) {
                return bullet;
            }
        }
        return null;
    }
    
    getFlashLightFromPool() {
        for (let flashLight of this.flashLightPool) {
            if (!flashLight.userData.active) {
                return flashLight;
            }
        }
        return null;
    }
    
    createExplosion(position) {
        // パーティクルエフェクトを作成
        if (this.particleSystem) {
            // 地上より少し浮かせた位置で爆発
            const explosionPosition = position.clone();
            const surfaceNormal = position.clone().normalize();
            explosionPosition.add(surfaceNormal.multiplyScalar(0.01)); // 地表により近づける
            
            this.particleSystem.createExplosion(explosionPosition, 1.0, 0xffaa00);
        }
        
        // 点灯エフェクトを作成（重複チェック付き）
        const lightPosition = position.clone();
        const surfaceNormal = position.clone().normalize();
        lightPosition.add(surfaceNormal.multiplyScalar(0.01)); // 地表により近づける
        
        // 既存のライトとの重複チェック
        this.checkAndRemoveOverlappingLights(lightPosition);
        
        // 最大数チェック
        if (this.flashLights.length >= this.maxActiveFlashLights) {
            // 最も古いライトを削除
            const oldestLight = this.flashLights.shift();
            this.removeFlashLightFromActive(oldestLight);
        }
        
        const flashLight = this.getFlashLightFromPool();
        if (flashLight) {
            flashLight.position.copy(lightPosition);
            flashLight.userData.lifetime = 0;
            flashLight.userData.active = true;
            flashLight.visible = true;
            
            this.flashLights.push(flashLight);
            
        }
        
        // 攻撃判定球を表示（すべての着弾位置に）
        if (this.showWireframes) {
            this.addWireframeSphere(lightPosition, this.attackRange);
        }
    }
    
    update(deltaTime) {
        // 弾丸の更新
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            // 基本位置の更新（直線移動）
            bullet.userData.basePosition.add(bullet.userData.baseVelocity.clone().multiplyScalar(deltaTime));
            bullet.userData.lifetime += deltaTime;
            
            // 各軸で個別の振動計算（よりランダム化）
            const timeX = bullet.userData.lifetime * bullet.userData.vibrationFreqX + bullet.userData.vibrationPhaseX;
            const timeY = bullet.userData.lifetime * bullet.userData.vibrationFreqY + bullet.userData.vibrationPhaseY;
            const timeZ = bullet.userData.lifetime * bullet.userData.vibrationFreqZ + bullet.userData.vibrationPhaseZ;
            
            // 各弾で異なる振動スタイルと振幅
            const ampX = this.vibrationAmplitude * bullet.userData.vibrationAmpMultiplier;
            const ampY = this.vibrationAmplitude * bullet.userData.vibrationAmpMultiplier;
            const ampZ = this.vibrationAmplitude * bullet.userData.vibrationAmpMultiplier;
            
            const vibrationX = (bullet.userData.vibrationStyleX > 0 ? Math.sin(timeX) : Math.cos(timeX)) * ampX;
            const vibrationY = (bullet.userData.vibrationStyleY > 0 ? Math.sin(timeY) : Math.cos(timeY)) * ampY;
            const vibrationZ = (bullet.userData.vibrationStyleZ > 0 ? Math.sin(timeZ) : Math.cos(timeZ)) * ampZ;
            
            // 最終位置 = 基本位置 + 振動
            bullet.position.copy(bullet.userData.basePosition);
            bullet.position.add(new THREE.Vector3(vibrationX, vibrationY, vibrationZ));
            
            // 地球との衝突判定（基本位置で判定）
            const distanceToEarth = bullet.userData.basePosition.distanceTo(new THREE.Vector3(0, 0, 0));
            if (distanceToEarth <= 1.0) { // 地球半径
                // 地表に衝突（爆発位置は振動ありの位置）
                this.createExplosion(bullet.position.clone());
                this.removeBullet(i);
                continue;
            }
            
            // 弾丸の寿命チェック
            if (bullet.userData.lifetime > this.bulletLifetime) {
                this.removeBullet(i);
            }
        }
        
        // パーティクルシステムの更新
        if (this.particleSystem) {
            this.particleSystem.update(deltaTime);
        }
        
        // 点灯エフェクトの更新
        for (let i = this.flashLights.length - 1; i >= 0; i--) {
            const flashLight = this.flashLights[i];
            flashLight.userData.lifetime += deltaTime;
            
            // 滑らかな減衰（イージング関数使用）
            const progress = flashLight.userData.lifetime / flashLight.userData.maxLifetime;
            const easeOut = 1 - Math.pow(progress, 2); // 二次関数で滑らかな減衰
            flashLight.intensity = 100.0 * easeOut; // 明るさ100に復帰
            
            // 点灯の削除
            if (flashLight.userData.lifetime > flashLight.userData.maxLifetime) {
                this.removeFlashLight(i);
            }
        }
        
        // ワイヤーフレーム球体の更新
        if (this.showWireframes) {
            this.updateWireframeSpheres(deltaTime);
        }
    }
    
    removeBullet(index) {
        const bullet = this.bullets[index];
        bullet.visible = false;
        bullet.userData.active = false;
        this.bullets.splice(index, 1);
    }
    
    removeFlashLight(index) {
        const flashLight = this.flashLights[index];
        this.removeFlashLightFromActive(flashLight);
        this.flashLights.splice(index, 1);
    }
    
    removeFlashLightFromActive(flashLight) {
        flashLight.visible = false;
        flashLight.userData.active = false;
    }
    
    checkAndRemoveOverlappingLights(newPosition) {
        // 重複する既存ライトをチェックして削除
        for (let i = this.flashLights.length - 1; i >= 0; i--) {
            const existingLight = this.flashLights[i];
            const distance = newPosition.distanceTo(existingLight.position);
            
            if (distance < this.flashLightOverlapDistance) {
                // 重複する場合は既存のライトを削除
                this.removeFlashLightFromActive(existingLight);
                this.flashLights.splice(i, 1);
            }
        }
    }
    
    // 弾丸速度の設定
    setBulletSpeed(speed) {
        this.bulletSpeed = speed;
    }
    
    // 発射レートの設定
    setFireRate(rate) {
        this.fireRate = rate;
    }
    
    // デバッグ情報の取得
    getDebugInfo() {
        return {
            activeBullets: this.bullets.length,
            activeFlashLights: this.flashLights.length,
            activeWireframes: this.wireframeSpheres.length,
            bulletSpeed: this.bulletSpeed,
            fireRate: this.fireRate,
            isLeftGun: this.isLeftGun,
            showWireframes: this.showWireframes,
            attackRange: this.attackRange,
            centerDamage: this.centerDamage,
            borderDamage: this.borderDamage
        };
    }
    
    // リソースの解放
    dispose() {
        // 弾丸の削除
        for (let bullet of this.bulletPool) {
            this.scene.remove(bullet);
            bullet.geometry.dispose();
            bullet.material.dispose();
        }
        
        // パーティクルシステムの削除
        if (this.particleSystem) {
            this.particleSystem.dispose();
        }
        
        // 点灯エフェクトの削除
        for (let flashLight of this.flashLightPool) {
            this.scene.remove(flashLight);
        }
        
        // ワイヤーフレーム球体の削除
        for (let wireframeSphere of this.wireframeSpherePool) {
            this.scene.remove(wireframeSphere);
            wireframeSphere.geometry.dispose();
            wireframeSphere.material.dispose();
        }
        
        this.bullets = [];
        this.bulletPool = [];
        this.flashLights = [];
        this.flashLightPool = [];
        this.wireframeSpheres = [];
        this.wireframeSpherePool = [];
    }
    
    // ワイヤーフレーム球体プール初期化
    initWireframePool() {
        for (let i = 0; i < this.maxFlashLights; i++) {
            const wireframeGeometry = new THREE.SphereGeometry(1, 8, 6); // 低ポリゴン
            const wireframeMaterial = new THREE.MeshBasicMaterial({
                color: 0xff0000,
                wireframe: true,
                transparent: true,
                opacity: 0.3
            });
            
            const wireframeSphere = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
            wireframeSphere.visible = false;
            wireframeSphere.userData = {
                lifetime: 0,
                maxLifetime: 0.3,
                active: false
            };
            
            this.scene.add(wireframeSphere);
            this.wireframeSpherePool.push(wireframeSphere);
        }
    }
    
    // 攻撃判定球表示（すべての着弾位置に）
    addWireframeSphere(position, radius) {
        const wireframeSphere = this.getWireframeSphereFromPool();
        if (wireframeSphere) {
            wireframeSphere.position.copy(position);
            wireframeSphere.scale.setScalar(radius);
            wireframeSphere.userData.lifetime = 0;
            wireframeSphere.userData.active = true;
            wireframeSphere.visible = true;
            
            this.wireframeSpheres.push(wireframeSphere);
        }
    }
    
    // 攻撃範囲の設定（ポイントライトと連動）
    setAttackRange(range) {
        this.attackRange = range;
        // 既存のポイントライトの範囲を更新
        for (let flashLight of this.flashLightPool) {
            flashLight.distance = this.attackRange;
        }
        console.log(`攻撃範囲を${this.attackRange}に設定`);
    }
    
    // 攻撃判定（距離ベースのダメージ計算）
    calculateDamage(distance) {
        if (distance > this.attackRange) {
            return 0; // 範囲外はダメージなし
        }
        
        // 中心からの距離比率でダメージを線形補間
        const damageRatio = 1.0 - (distance / this.attackRange);
        return this.borderDamage + (this.centerDamage - this.borderDamage) * damageRatio;
    }
    
    // ワイヤーフレーム球体プールから取得
    getWireframeSphereFromPool() {
        for (let wireframeSphere of this.wireframeSpherePool) {
            if (!wireframeSphere.userData.active) {
                return wireframeSphere;
            }
        }
        return null;
    }
    
    // ワイヤーフレーム球体更新
    updateWireframeSpheres(deltaTime) {
        for (let i = this.wireframeSpheres.length - 1; i >= 0; i--) {
            const wireframeSphere = this.wireframeSpheres[i];
            wireframeSphere.userData.lifetime += deltaTime;
            
            // フェードアウト
            const progress = wireframeSphere.userData.lifetime / wireframeSphere.userData.maxLifetime;
            wireframeSphere.material.opacity = 0.3 * (1 - progress);
            
            // 寿命チェック
            if (wireframeSphere.userData.lifetime > wireframeSphere.userData.maxLifetime) {
                wireframeSphere.visible = false;
                wireframeSphere.userData.active = false;
                this.wireframeSpheres.splice(i, 1);
            }
        }
    }
    
    // ワイヤーフレーム表示の切り替え
    toggleWireframes() {
        this.showWireframes = !this.showWireframes;
        console.log('ワイヤーフレーム表示:', this.showWireframes ? 'ON' : 'OFF');
        
        // 非表示時は全て削除
        if (!this.showWireframes) {
            for (let wireframeSphere of this.wireframeSpheres) {
                wireframeSphere.visible = false;
                wireframeSphere.userData.active = false;
            }
            this.wireframeSpheres = [];
        }
    }
}