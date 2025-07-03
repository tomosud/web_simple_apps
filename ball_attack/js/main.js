/**
 * Ball Attack - Three.js地球シューティングゲーム
 */

class BallAttackGame {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.earth = null;
        this.controls = null;
        this.performanceMonitor = null;
        
        // ゲーム状態
        this.isGameRunning = false;
        this.score = 0;
        this.enemyCount = 0;
        this.level = 1;
        
        // アニメーション
        this.lastTime = 0;
        this.animationId = null;
        
        // 地球の設定
        this.earthRadius = 1;
        this.earthTexture = null;
        
        this.init();
    }
    
    async init() {
        try {
            this.setupScene();
            this.setupEarth();
            this.setupControls();
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
        
        // カメラ作成
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 2.5);
        
        // レンダラー作成
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
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
        
        // 指向性ライト
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
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
        this.earth.receiveShadow = true;
        this.scene.add(this.earth);
        
        debugLog('地球オブジェクトが作成されました');
    }
    
    setupControls() {
        // 地球の回転制御（シンプルな軌道ベクトル方式）
        this.controls = new SimpleEarthControls(this.earth, this.camera, this.renderer);
        debugLog('地球制御システムが初期化されました');
    }
    
    setupEventListeners() {
        // ウィンドウリサイズ
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // キーボードイベント
        document.addEventListener('keydown', this.onKeyDown.bind(this));
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
                // 視点リセット
                this.controls.reset();
                break;
            case 'KeyD':
                // デバッグ表示切り替え
                window.DEBUG = !window.DEBUG;
                debugLog('デバッグモード:', window.DEBUG);
                break;
            case 'KeyR':
                // ゲームリセット
                this.resetGame();
                break;
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
    
    update(deltaTime) {
        // 地球制御の更新
        if (this.controls) {
            this.controls.update();
        }
        
        // パフォーマンス監視
        if (this.performanceMonitor) {
            this.performanceMonitor.update();
        }
        
        // 地球の自動回転は削除
    }
    
    render() {
        this.renderer.render(this.scene, this.camera);
    }
    
    animate(currentTime = 0) {
        if (!this.isGameRunning) return;
        
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
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