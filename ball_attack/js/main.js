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
        
        // 人工衛星の設定
        this.satelliteOrbitRadius = 1.3;
        this.satellitePosition = new THREE.Vector3(0, 0, this.satelliteOrbitRadius);
        
        // 軌道球（見えない制御用オブジェクト）
        this.orbitSphere = null;
        
        // 武器システム
        this.weaponSystem = null;
        
        this.init();
    }
    
    async init() {
        try {
            this.setupScene();
            this.setupEarth();
            this.setupSatellite();
            this.setupControls();
            this.setupWeapons();
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
            0.1,
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
        
        // 地球のマテリアル
        const earthMaterial = new THREE.MeshLambertMaterial({
            map: this.earthTexture
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
            gameInstance: this
        });
        debugLog('SatelliteOrbitControlsが初期化されました');
    }
    
    setupWeapons() {
        // 武器システムの初期化
        this.weaponSystem = new WeaponSystem(this.scene, this.camera, this.earth, this.satellite);
        debugLog('武器システムが初期化されました');
    }
    
    setupEventListeners() {
        // ウィンドウリサイズ
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // キーボードイベント
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        
        // 発射ボタンのイベント
        const fireButton = document.getElementById('fireButton');
        if (fireButton) {
            fireButton.addEventListener('click', this.onFireButtonClick.bind(this));
            fireButton.addEventListener('touchstart', this.onFireButtonClick.bind(this), { passive: false });
        }
        
        // 物理パラメータのUI制御
        this.setupPhysicsControls();
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
            case 'Space':
                // 発射
                event.preventDefault();
                this.fire();
                break;
            case 'KeyW':
                // ワイヤーフレーム表示切り替え
                if (this.weaponSystem) {
                    this.weaponSystem.toggleWireframes();
                }
                break;
        }
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
        // カメラモードの場合、カメラ位置も更新
        if (!this.debugMode) {
            this.updateCameraPosition();
        }
        debugLog('ゲームがリセットされました');
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('enemyCount').textContent = this.enemyCount;
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
    
    update(deltaTime) {
        // 人工衛星の軌道制御の更新
        if (this.controls) {
            this.controls.update();
        }
        
        // カメラモードの場合、カメラ位置を更新
        if (!this.debugMode) {
            this.updateCameraPosition();
        }
        
        // 武器システムの更新
        if (this.weaponSystem) {
            this.weaponSystem.update(deltaTime);
        }
        
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