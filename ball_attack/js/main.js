/**
 * Ball Attack - Three.js地球シューティングゲーム
 */

class BallAttackGame {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.earth = null;
        this.satellite = null;
        this.controls = null;
        this.performanceMonitor = null;
        
        // ゲーム状態
        this.isGameRunning = false;
        this.score = 0;
        this.enemyCount = 0;
        this.level = 1;
        
        // モード切り替え
        this.debugMode = false;
        
        // カメラマウント
        this.cameraMount = null;
        
        // アニメーション
        this.lastTime = 0;
        this.animationId = null;
        
        // 地球の設定
        this.earthRadius = 1;
        this.earthTexture = null;
        
        // 人工衛星の設定（画面にフィットする固定距離）
        this.satelliteOrbitRadius = this.calculateOptimalDistance();
        this.satellitePosition = new THREE.Vector3(0, 0, this.satelliteOrbitRadius);
        
        // 軌道球（見えない制御用オブジェクト）
        this.orbitSphere = null;
        
        // 武器システム
        this.weaponSystem = null;
        
        // サウンドシステム
        this.soundSystem = null;
        
        // 敵システム
        this.enemySystem = null;
        
        // 敵砲撃システム
        this.enemyAttackSystem = null;
        
        this.init();
    }
    
    async init() {
        try {
            this.setupScene();
            this.setupEarth();
            this.setupSatellite();
            this.setupSound();
            this.setupControls();
            this.setupWeapons();
            this.setupEnemies();
            this.setupEnemyAttack();
            this.setupEventListeners();
            this.setupPerformanceMonitor();
            this.hideLoading();
            this.startGame();
        } catch (error) {
            console.error('初期化エラー:', error);
            this.showError('ゲームの初期化に失敗しました。');
        }
    }
    
    setupScene() {
        // シーン作成
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000a0a);
        
        // カメラ作成（固定位置）
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.01, // ニアクリップを0.1から0.01に変更
            1000
        );
        this.camera.position.set(0, 0, 3.5);
        // lookAtは使わない（親子付けシステムで制御）
        
        // レンダラー作成
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = false; // シャドウマップ無効
        
        // キャンバスを追加
        const container = document.getElementById('gameCanvas');
        container.appendChild(this.renderer.domElement);
        
        // ライト設定
        this.setupLights();
    }
    
    setupLights() {
        // 環境光
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        
        // 指向性ライト（cast shadow無効）
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = false; // シャドウ無効
        this.scene.add(directionalLight);
        
        // ポイントライト（地球の裏側を照らす）
        const pointLight = new THREE.PointLight(0x4444ff, 0.3, 100);
        pointLight.position.set(-5, 0, 0);
        this.scene.add(pointLight);
    }
    
    setupEarth() {
        // 地球のジオメトリ
        const earthGeometry = new THREE.SphereGeometry(this.earthRadius, 64, 64);
        
        // 地球のテクスチャを読み込み
        const textureLoader = new THREE.TextureLoader();
        this.earthTexture = textureLoader.load(
            'assets/world.topo.bathy.200412.3x5400x2700.jpg',
            (texture) => {
                debugLog('地球テクスチャが読み込まれました');
            },
            (progress) => {
                debugLog('地球テクスチャ読み込み中...', progress);
            },
            (error) => {
                handleError(error, '地球テクスチャの読み込み');
            }
        );
        
        // 地球のマテリアル（ピクセルライティング対応）
        const earthMaterial = new THREE.MeshPhongMaterial({
            map: this.earthTexture,
            shininess: 0  // 反射を抑制して自然な見た目に
        });
        
        // 地球メッシュ作成
        this.earth = new THREE.Mesh(earthGeometry, earthMaterial);
        this.earth.receiveShadow = false; // シャドウ受信無効
        this.scene.add(this.earth);
        
        debugLog('地球オブジェクトが作成されました');
    }
    
    setupSatellite() {
        // 軌道球（見えない制御用オブジェクト）を作成
        this.orbitSphere = new THREE.Object3D();
        this.orbitSphere.position.set(0, 0, 0); // 地球の中心に配置
        this.scene.add(this.orbitSphere);
        
        // 人工衛星のジオメトリ（円錐）
        const satelliteGeometry = new THREE.ConeGeometry(0.05, 0.15, 8);
        
        // 人工衛星のマテリアル
        const satelliteMaterial = new THREE.MeshLambertMaterial({
            color: 0x00ff00
        });
        
        // 人工衛星メッシュ作成
        this.satellite = new THREE.Mesh(satelliteGeometry, satelliteMaterial);
        this.satellite.castShadow = false; // シャドウ投影無効
        
        // 人工衛星を軌道半径の位置に配置（Z軸上）
        this.satellite.position.set(0, 0, this.satelliteOrbitRadius);
        
        // 人工衛星の初期姿勢（円錐の先端が地球を向く）
        // 円錐の初期向きはY軸正方向なので、Z軸負方向（地球側）を向くように回転
        this.satellite.rotation.x = Math.PI / 2; // 90度回転で先端が地球を向く
        
        // 人工衛星を軌道球の子として追加
        this.orbitSphere.add(this.satellite);
        
        // カメラの親子付けセットアップ
        this.setupCameraAttachment();
        
        debugLog('人工衛星オブジェクトが作成されました');
    }
    
    setupCameraAttachment() {
        // カメラ用のオブジェクトを作成（人工衛星の地球側に配置）
        this.cameraMount = new THREE.Object3D();
        
        // カメラマウントを軌道位置に配置（人工衛星より少し地球側）
        this.cameraMount.position.set(0, 0, this.satelliteOrbitRadius - 0.2);
        
        // カメラマウントを軌道球の子にする（人工衛星と同じ親）
        this.orbitSphere.add(this.cameraMount);
        
        debugLog('カメラマウントが作成されました');
    }
    
    setupControls() {
        // 軌道球の回転制御（カメラ座標系ベース、モード別入力切り替え）
        this.controls = new SatelliteOrbitControls(this.orbitSphere, this.renderer.domElement, {
            orbitRadius: this.satelliteOrbitRadius,
            dragScale: 0.005,
            camera: this.camera,
            gameInstance: this,
            soundSystem: this.soundSystem
        });
        debugLog('SatelliteOrbitControlsが初期化されました');
    }
    
    setupSound() {
        // サウンドシステムの初期化
        this.soundSystem = new SoundSystem();
        debugLog('サウンドシステムが初期化されました');
    }
    
    setupWeapons() {
        // 武器システムの初期化
        this.weaponSystem = new WeaponSystem(this.scene, this.camera, this.earth, this.satellite, this.soundSystem);
        debugLog('武器システムが初期化されました');
    }
    
    setupEnemies() {
        // 敵システムの初期化
        this.enemySystem = new EnemySystem(this.scene, this.earthRadius, this.soundSystem);
        
        // 敵を配置
        this.enemySystem.generateEnemies(300);
        debugLog('敵システムが初期化されました');
    }
    
    setupEnemyAttack() {
        // 敵砲撃システムの初期化
        this.enemyAttackSystem = new EnemyAttackSystem(this.scene, this.satellite, this.soundSystem);
        debugLog('敵砲撃システムが初期化されました');
    }
    
    setupEventListeners() {
        // ウィンドウリサイズ
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // キーボードイベント
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        
        // マウスイベント（射撃）
        this.isMouseDown = false;
        document.addEventListener('mousedown', this.onMouseDown.bind(this));
        document.addEventListener('mouseup', this.onMouseUp.bind(this));
        document.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
        document.addEventListener('touchend', this.onTouchEnd.bind(this));
        
        // 発射ボタンのイベント
        const fireButton = document.getElementById('fireButton');
        if (fireButton) {
            fireButton.addEventListener('click', this.onFireButtonClick.bind(this));
            fireButton.addEventListener('touchstart', this.onFireButtonClick.bind(this), { passive: false });
        }
        
        // 物理パラメータのUI制御
        this.setupPhysicsControls();
        
        // 武器パラメータのUI制御
        this.setupWeaponControls();
        
        // タッチ操作のUI制御
        this.setupTouchControls();
    }
    
    setupPhysicsControls() {
        const frictionStrengthSlider = document.getElementById('frictionStrength');
        const frictionValue = document.getElementById('frictionValue');
        const massSlider = document.getElementById('mass');
        const massValue = document.getElementById('massValue');
        const baseFrictionSlider = document.getElementById('baseFriction');
        const baseFrictionValue = document.getElementById('baseFrictionValue');
        
        if (frictionStrengthSlider) {
            frictionStrengthSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.controls.frictionStrength = value;
                frictionValue.textContent = value.toFixed(2);
            });
        }
        
        if (massSlider) {
            massSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.controls.mass = value;
                massValue.textContent = value;
            });
        }
        
        if (baseFrictionSlider) {
            baseFrictionSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.controls.baseFriction = value;
                baseFrictionValue.textContent = value.toFixed(2);
            });
        }
    }
    
    setupWeaponControls() {
        const attackRangeSlider = document.getElementById('attackRange');
        const attackRangeValue = document.getElementById('attackRangeValue');
        const spreadFactorSlider = document.getElementById('spreadFactor');
        const spreadFactorValue = document.getElementById('spreadFactorValue');
        
        if (attackRangeSlider) {
            attackRangeSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (this.weaponSystem) {
                    this.weaponSystem.setAttackRange(value);
                }
                attackRangeValue.textContent = value.toFixed(3);
            });
        }
        
        if (spreadFactorSlider) {
            spreadFactorSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (this.weaponSystem) {
                    this.weaponSystem.spreadFactor = value;
                }
                spreadFactorValue.textContent = value.toFixed(3);
            });
        }
    }
    
    setupTouchControls() {
        const touchSensitivitySlider = document.getElementById('touchSensitivity');
        const touchSensitivityValue = document.getElementById('touchSensitivityValue');
        
        if (touchSensitivitySlider) {
            touchSensitivitySlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (this.controls) {
                    this.controls.touchSensitivity = value;
                }
                touchSensitivityValue.textContent = value;
            });
        }
    }
    
    setupPerformanceMonitor() {
        this.performanceMonitor = new PerformanceMonitor();
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    onKeyDown(event) {
        switch(event.code) {
            case 'KeyF':
                // 人工衛星位置リセット
                this.controls.reset();
                break;
            case 'KeyD':
                // デバッグモード切り替え
                this.toggleDebugMode();
                break;
            case 'KeyR':
                // ゲームリセット
                this.resetGame();
                break;
            case 'KeyW':
                // ワイヤーフレーム表示切り替え
                if (this.weaponSystem) {
                    this.weaponSystem.toggleWireframes();
                }
                break;
        }
    }
    
    onMouseDown(event) {
        // UI要素への操作の場合は射撃しない
        if (this.isUIElement(event.target)) {
            return;
        }
        
        event.preventDefault();
        this.isMouseDown = true;
        this.fire();
    }
    
    onMouseUp(event) {
        // UI要素への操作の場合は何もしない
        if (this.isUIElement(event.target)) {
            return;
        }
        
        event.preventDefault();
        this.isMouseDown = false;
    }
    
    onTouchStart(event) {
        // UI要素への操作の場合は射撃しない
        if (this.isUIElement(event.target)) {
            return;
        }
        
        event.preventDefault();
        this.isMouseDown = true;
        this.fire();
    }
    
    onTouchEnd(event) {
        // UI要素への操作の場合は何もしない
        if (this.isUIElement(event.target)) {
            return;
        }
        
        event.preventDefault();
        this.isMouseDown = false;
    }
    
    isUIElement(element) {
        // UI要素かどうかを判定
        while (element && element !== document.body) {
            // input要素、button要素、または特定のクラスを持つ要素はUI要素
            if (element.tagName === 'INPUT' || 
                element.tagName === 'BUTTON' ||
                element.tagName === 'SELECT' ||
                element.classList.contains('touch-controls') ||
                element.classList.contains('weapon-controls') ||
                element.classList.contains('physics-controls') ||
                element.classList.contains('mode-indicator') ||
                element.classList.contains('fire-button') ||
                element.classList.contains('game-ui')) {
                return true;
            }
            element = element.parentElement;
        }
        return false;
    }
    
    onFireButtonClick(event) {
        event.preventDefault();
        this.fire();
    }
    
    fire() {
        if (this.weaponSystem && this.isGameRunning) {
            const currentTime = performance.now() / 1000;
            this.weaponSystem.fire(currentTime);
        }
    }
    
    startGame() {
        this.isGameRunning = true;
        this.showUI();
        this.animate();
        debugLog('ゲームが開始されました');
    }
    
    resetGame() {
        this.score = 0;
        this.enemyCount = 0;
        this.level = 1;
        this.updateUI();
        this.controls.reset();
        
        // 敵システムをリセット
        if (this.enemySystem) {
            this.enemySystem.reset();
            this.enemySystem.generateEnemies(300);
        }
        
        // 敵砲撃システムをリセット
        if (this.enemyAttackSystem) {
            this.enemyAttackSystem.reset();
        }
        
        // カメラモードの場合、カメラ位置も更新
        if (!this.debugMode) {
            this.updateCameraPosition();
        }
        debugLog('ゲームがリセットされました');
    }
    
    updateUI() {
        // 敵システムからリアルタイムで情報を取得
        const enemyCount = this.enemySystem ? this.enemySystem.getActiveEnemyCount() : 0;
        
        document.getElementById('score').textContent = this.score;
        document.getElementById('enemyCount').textContent = enemyCount;
        document.getElementById('level').textContent = this.level;
    }
    
    showUI() {
        const ui = document.getElementById('ui');
        ui.style.display = 'block';
        this.updateUI();
    }
    
    hideLoading() {
        const loading = document.getElementById('loading');
        loading.style.display = 'none';
    }
    
    showError(message) {
        const loading = document.getElementById('loading');
        loading.textContent = `エラー: ${message}`;
        loading.style.color = '#ff6666';
    }
    
    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        debugLog('デバッグモード:', this.debugMode);
        
        // モードに応じて表示を切り替え
        if (this.debugMode) {
            // デバッグモード: 人工衛星を表示、カメラは固定位置
            this.satellite.visible = true;
            this.camera.position.set(0, 0, 3.5);
            // デバッグモード時のカメラ姿勢をリセット
            this.camera.quaternion.set(0, 0, 0, 1);
        } else {
            // カメラモード: 人工衛星を非表示、カメラは人工衛星位置
            this.satellite.visible = false;
            // 初期カメラ位置も人工衛星と同じに設定
            this.updateCameraPosition();
        }
        
        this.updateModeUI();
    }
    
    updateCameraPosition() {
        if (!this.debugMode && this.cameraMount) {
            // カメラをカメラマウントの位置・姿勢に設定
            this.cameraMount.getWorldPosition(this.camera.position);
            this.cameraMount.getWorldQuaternion(this.camera.quaternion);
        }
    }
    
    updateModeUI() {
        const modeIndicator = document.getElementById('modeIndicator');
        if (modeIndicator) {
            modeIndicator.textContent = this.debugMode ? 'デバッグモード' : 'カメラモード';
        }
    }
    
    calculateOptimalDistance() {
        // 短い方の辺に地球2個分が収まるように距離を計算
        const fov = 75 * (Math.PI / 180); // カメラのFOVをラジアンに変換
        const aspectRatio = window.innerWidth / window.innerHeight;
        
        // 短い方の辺に地球2個分（直径4）が収まるように計算
        // 地球の直径 = 2 * earthRadius = 2
        // 目標サイズ = 地球2個分 = 4
        const targetDiameter = this.earthRadius * 4; // 地球2個分の直径
        
        // カメラのFOVから必要な距離を計算
        let distance;
        if (aspectRatio >= 1) {
            // 横長画面：縦方向（短い方）にフィット
            distance = targetDiameter / (2 * Math.tan(fov / 2));
        } else {
            // 縦長画面：横方向（短い方）にフィット
            const horizontalFov = 2 * Math.atan(Math.tan(fov / 2) * aspectRatio);
            distance = targetDiameter / (2 * Math.tan(horizontalFov / 2));
        }
        
        // 弾丸が届く範囲内に制限（最小2.0、最大2.8）
        return Math.max(2.0, Math.min(2.8, distance));
    }
    
    onWindowResize() {
        // 画面サイズに応じてレンダラーサイズを更新
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        
        // 最適な距離を再計算して軌道半径を更新
        const newDistance = this.calculateOptimalDistance();
        this.satelliteOrbitRadius = newDistance;
        this.satellitePosition.set(0, 0, this.satelliteOrbitRadius);
        
        // 軌道球システムの半径も更新
        if (this.controls) {
            this.controls.orbitRadius = this.satelliteOrbitRadius;
        }
        
        // 軌道球の位置を更新
        if (this.orbitSphere) {
            this.orbitSphere.position.set(0, 0, 0);
        }
        
        // 人工衛星の位置を更新
        if (this.satellite) {
            this.satellite.position.copy(this.satellitePosition);
        }
        
        // カメラマウントの位置も更新
        if (this.cameraMount) {
            this.cameraMount.position.copy(this.satellitePosition);
        }
    }
    
    checkCollisions() {
        if (!this.weaponSystem || !this.enemySystem) {
            return;
        }
        
        // 武器システムから攻撃判定球を取得
        const attackSpheres = this.weaponSystem.getAttackSpheres();
        if (attackSpheres.length === 0) {
            return;
        }
        
        // 敵システムで衝突判定
        const hits = this.enemySystem.checkCollisions(attackSpheres);
        
        // 衝突があった場合の処理
        for (let hit of hits) {
            if (this.enemySystem.destroyEnemy(hit.enemy, hit.damage)) {
                // 撃破成功時のスコア加算
                this.score += 100;
                
                // 全敵撃破チェック
                if (this.enemySystem.isAllEnemiesDestroyed()) {
                    this.onGameClear();
                }
            }
        }
        
        // UIを更新
        this.updateUI();
    }
    
    checkPlayerHit(playerPosition) {
        if (!this.enemyAttackSystem) {
            return;
        }
        
        // 敵弾丸とプレイヤーの衝突チェック
        const hits = this.enemyAttackSystem.checkPlayerHit(playerPosition, 0.05);
        
        if (hits.length > 0) {
            // 被弾時の処理
            this.onPlayerHit(hits[0]);
        }
    }
    
    onPlayerHit(hitInfo) {
        debugLog('プレイヤー被弾！', hitInfo);
        
        // 被弾した弾丸を削除
        const projectileIndex = this.enemyAttackSystem.enemyProjectiles.indexOf(hitInfo.projectile);
        if (projectileIndex !== -1) {
            this.enemyAttackSystem.removeProjectile(hitInfo.projectile, projectileIndex);
        }
        
        // 画面全体赤フラッシュエフェクト
        this.triggerDamageFlash();
        
        // 被弾エフェクト（将来実装）
        // - カメラシェイク
        // - ダメージ音
        // - ライフ減少
    }
    
    // 画面全体の赤フラッシュエフェクト
    triggerDamageFlash() {
        const flashElement = document.getElementById('damageFlash');
        if (flashElement) {
            // フラッシュを表示
            flashElement.classList.add('active');
            
            // 0.3秒後にフラッシュを消去
            setTimeout(() => {
                flashElement.classList.remove('active');
            }, 300);
        }
    }
    
    onGameClear() {
        debugLog('ゲームクリア！');
        // クリア時の処理（将来実装）
    }
    
    update(deltaTime) {
        // 人工衛星の軌道制御の更新
        if (this.controls) {
            this.controls.update();
        }
        
        // カメラモードの場合、カメラ位置を更新
        if (!this.debugMode) {
            this.updateCameraPosition();
        }
        
        // 連続射撃処理
        if (this.isMouseDown && this.isGameRunning) {
            this.fire();
        }
        
        // 武器システムの更新
        if (this.weaponSystem) {
            this.weaponSystem.update(deltaTime);
        }
        
        // 敵システムの更新
        if (this.enemySystem) {
            this.enemySystem.update(deltaTime);
        }
        
        // 敵砲撃システムの更新
        if (this.enemyAttackSystem && this.enemySystem) {
            // 人工衛星の現在位置を取得
            const satelliteWorldPosition = new THREE.Vector3();
            this.satellite.getWorldPosition(satelliteWorldPosition);
            
            // 敵砲撃システムを更新
            this.enemyAttackSystem.update(deltaTime, this.enemySystem.enemies, satelliteWorldPosition);
            
            // プレイヤーへの被弾チェック
            this.checkPlayerHit(satelliteWorldPosition);
        }
        
        // 衝突判定とスコア更新
        this.checkCollisions();
        
        // パフォーマンス監視
        if (this.performanceMonitor) {
            this.performanceMonitor.update();
        }
    }
    
    render() {
        this.renderer.render(this.scene, this.camera);
    }
    
    animate(currentTime = 0) {
        if (!this.isGameRunning) return;
        
        // 初回実行時はdeltaTimeを0にする
        let deltaTime = 0;
        if (this.lastTime !== 0) {
            deltaTime = (currentTime - this.lastTime) / 1000; // ミリ秒→秒に変換
        }
        this.lastTime = currentTime;
        
        // deltaTimeが異常に大きい場合は制限（1/60秒でキャップ）
        deltaTime = Math.min(deltaTime, 1/60);
        
        this.update(deltaTime);
        this.render();
        
        this.animationId = requestAnimationFrame(this.animate.bind(this));
    }
    
    // ゲーム終了処理
    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        if (this.controls) {
            this.controls.dispose();
        }
        
        if (this.weaponSystem) {
            this.weaponSystem.dispose();
        }
        
        if (this.enemySystem) {
            this.enemySystem.dispose();
        }
        
        if (this.enemyAttackSystem) {
            this.enemyAttackSystem.dispose();
        }
        
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        // リソースの解放
        resourceManager.dispose();
        
        debugLog('ゲームが終了されました');
    }
}

// ゲーム開始
let game = null;

window.addEventListener('load', () => {
    game = new BallAttackGame();
});

// ページ終了時の処理
window.addEventListener('beforeunload', () => {
    if (game) {
        game.dispose();
    }
});