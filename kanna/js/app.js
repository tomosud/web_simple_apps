// 傾き視差 写真立体化アプリ - メインアプリケーション

import { CameraManager } from './camera.js';
import { DepthEstimator } from './depth-ai.js';
import { LayerGenerator } from './layer-generator.js';

class ParallaxPhotoApp {
    constructor() {
        // 設定パラメータ
        this.MAX_DEG = 30;    // 傾き角の最大値（度）
        this.RANGE = 0.8;     // カメラ移動の最大幅（ワールド座標）
        this.BASE_Z = 3;      // カメラの基準Z距離
        this.MAX_ANGLE = 15;  // カメラ角度の最大値（度）
        
        // 現在のオフセット値
        this.offsetX = 0;
        this.offsetY = 0;
        this.angleX = 0;      // カメラのX軸回転角度
        this.angleY = 0;      // カメラのY軸回転角度
        
        // アプリケーション状態
        this.currentMode = 'cube'; // 'cube' or 'photo'
        this.parallaxEnabled = true;
        
        // Three.js オブジェクト
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.cube = null;
        
        // 機能モジュール
        this.cameraManager = null;
        this.depthEstimator = null;
        this.layerGenerator = null;
        
        // DOM要素
        this.canvas = document.getElementById('scene');
        this.permissionBtn = document.getElementById('permissionBtn');
        this.processingDiv = document.getElementById('processing');
        this.progressFill = document.getElementById('progress-fill');
        this.processText = document.getElementById('process-text');
        
        this.infoElements = {
            currentMode: document.getElementById('current-mode'),
            beta: document.getElementById('beta'),
            gamma: document.getElementById('gamma'),
            offsetX: document.getElementById('offsetX'),
            offsetY: document.getElementById('offsetY'),
            angleX: document.getElementById('angleX'),
            angleY: document.getElementById('angleY'),
            parallaxToggle: document.getElementById('parallax-toggle')
        };
        
        // デバイス対応チェック
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        this.deviceOrientationPermission = false;
        
        this.init();
    }
    
    async init() {
        this.initThreeJS();
        this.setupDeviceOrientation();
        this.setupMouseFallback();
        this.setupModeControls();
        this.setupParallaxToggle();
        
        // 機能モジュール初期化
        await this.initModules();
        
        this.animate();
        
        // リサイズ対応
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    async initModules() {
        try {
            // カメラマネージャー初期化
            this.cameraManager = new CameraManager();
            
            // 深度推定器初期化
            this.depthEstimator = new DepthEstimator();
            this.depthEstimator.setProgressCallback((progress, message) => {
                this.updateProgress(progress, message);
            });
            
            // レイヤー生成器初期化
            this.layerGenerator = new LayerGenerator(this.scene);
            
            console.log('全モジュール初期化完了');
            
        } catch (error) {
            console.error('モジュール初期化エラー:', error);
        }
    }
    
    setupModeControls() {
        const cubeBtn = document.getElementById('cube-mode');
        const photoBtn = document.getElementById('photo-mode');
        const captureBtn = document.getElementById('capture-btn');
        const retakeBtn = document.getElementById('retake-btn');
        
        // モード切り替え
        cubeBtn.addEventListener('click', () => this.switchMode('cube'));
        photoBtn.addEventListener('click', () => this.switchMode('photo'));
        
        // 撮影処理
        captureBtn.addEventListener('click', () => this.handleCapture());
        retakeBtn.addEventListener('click', () => this.handleRetake());
    }
    
    setupParallaxToggle() {
        const parallaxBtn = document.getElementById('parallax-btn');
        parallaxBtn.addEventListener('click', () => this.toggleParallax());
    }
    
    async switchMode(mode) {
        if (this.currentMode === mode) return;
        
        const cubeBtn = document.getElementById('cube-mode');
        const photoBtn = document.getElementById('photo-mode');
        const cameraUI = document.getElementById('camera-ui');
        
        // UI更新
        cubeBtn.classList.toggle('active', mode === 'cube');
        photoBtn.classList.toggle('active', mode === 'photo');
        
        this.currentMode = mode;
        this.infoElements.currentMode.textContent = mode === 'cube' ? 'キューブ' : '写真';
        
        if (mode === 'cube') {
            // キューブモード
            cameraUI.classList.add('hidden');
            this.cameraManager.hideCamera();
            this.layerGenerator.setLayersVisible(false);
            this.showCube();
            
        } else if (mode === 'photo') {
            // 写真モード
            this.hideCube();
            this.layerGenerator.setLayersVisible(true);
            
            // カメラ起動
            const success = await this.cameraManager.startCamera();
            if (!success) {
                // カメラ起動失敗時はキューブモードに戻る
                this.switchMode('cube');
            }
        }
    }
    
    toggleParallax() {
        this.parallaxEnabled = !this.parallaxEnabled;
        const parallaxBtn = document.getElementById('parallax-btn');
        
        if (this.parallaxEnabled) {
            parallaxBtn.textContent = '視差オフ';
            this.infoElements.parallaxToggle.textContent = 'オン';
        } else {
            parallaxBtn.textContent = '視差オン';
            this.infoElements.parallaxToggle.textContent = 'オフ';
            
            // 視差をリセット
            this.resetParallax();
        }
    }
    
    async handleCapture() {
        try {
            // 撮影実行
            this.cameraManager.capturePhoto();
            
            // 少し待ってからAI処理開始
            setTimeout(() => this.processPhoto(), 500);
            
        } catch (error) {
            console.error('撮影エラー:', error);
            alert('撮影に失敗しました: ' + error.message);
        }
    }
    
    handleRetake() {
        // レイヤーをクリア
        this.layerGenerator.clearLayers();
        
        // カメラ再開
        this.cameraManager.retakePhoto();
    }
    
    async processPhoto() {
        if (!this.cameraManager.capturedImage) {
            console.error('撮影画像がありません');
            return;
        }
        
        try {
            this.showProcessing(true);
            
            // AI初期化（初回のみ）
            if (!this.depthEstimator.isLoaded) {
                await this.depthEstimator.initialize();
            }
            
            // 画像をAI処理用サイズにリサイズ
            const imageData = await this.cameraManager.resizeImageForAI(256);
            
            // 深度推定実行
            const depthMap = await this.depthEstimator.estimateDepth(imageData);
            
            // 複数レイヤーに分割
            const depthLayers = this.depthEstimator.generateLayers(depthMap, 4);
            
            // 3Dレイヤー生成
            await this.layerGenerator.generateLayers(imageData, depthLayers, {
                layerWidth: 2,
                layerHeight: 2,
                baseZ: 0,
                layerSpacing: 0.3
            });
            
            this.showProcessing(false);
            
            // デバッグ用：深度マップ表示
            if (window.location.search.includes('debug')) {
                const depthCanvas = this.layerGenerator.createDepthVisualization(depthMap);
                document.body.appendChild(depthCanvas);
            }
            
            console.log('写真立体化完了');
            
        } catch (error) {
            console.error('写真処理エラー:', error);
            this.showProcessing(false);
            alert('写真の処理に失敗しました: ' + error.message);
        }
    }
    
    showProcessing(show) {
        this.processingDiv.classList.toggle('hidden', !show);
    }
    
    updateProgress(progress, message) {
        this.progressFill.style.width = progress + '%';
        this.processText.textContent = message;
    }
    
    initThreeJS() {
        // シーン作成
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);
        
        // カメラ作成
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        this.camera.position.set(0, 0, this.BASE_Z);
        
        // レンダラー作成
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        // ライト設定
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);
        
        // キューブ作成（各面に異なる色）
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const materials = [
            new THREE.MeshStandardMaterial({ color: 0xff4444 }), // 右面 - 赤
            new THREE.MeshStandardMaterial({ color: 0x44ff44 }), // 左面 - 緑
            new THREE.MeshStandardMaterial({ color: 0x4444ff }), // 上面 - 青
            new THREE.MeshStandardMaterial({ color: 0xffff44 }), // 下面 - 黄
            new THREE.MeshStandardMaterial({ color: 0xff44ff }), // 前面 - マゼンタ
            new THREE.MeshStandardMaterial({ color: 0x44ffff })  // 後面 - シアン
        ];
        
        this.cube = new THREE.Mesh(geometry, materials);
        this.scene.add(this.cube);
        
        // キューブにワイヤーフレームを追加
        const wireframe = new THREE.WireframeGeometry(geometry);
        const wireframeMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.2, transparent: true });
        const wireframeMesh = new THREE.LineSegments(wireframe, wireframeMaterial);
        this.cube.add(wireframeMesh);
    }
    
    setupDeviceOrientation() {
        // iOS 13+の場合、許可が必要
        if (this.isIOS && typeof DeviceOrientationEvent.requestPermission === 'function') {
            this.permissionBtn.classList.remove('hidden');
            this.permissionBtn.addEventListener('click', () => this.requestPermission());
        } else {
            // Android等では直接リスナーを設定
            this.addOrientationListener();
        }
    }
    
    async requestPermission() {
        try {
            const permission = await DeviceOrientationEvent.requestPermission();
            if (permission === 'granted') {
                this.deviceOrientationPermission = true;
                this.permissionBtn.classList.add('hidden');
                this.addOrientationListener();
            } else {
                alert('デバイス傾き検出の許可が必要です');
            }
        } catch (error) {
            console.error('Permission request failed:', error);
            // iOS 12以下の場合
            this.addOrientationListener();
        }
    }
    
    addOrientationListener() {
        window.addEventListener('deviceorientation', (event) => this.onDeviceOrientation(event));
    }
    
    onDeviceOrientation(event) {
        const beta = event.beta || 0;   // 前後の傾き（-180〜180）
        const gamma = event.gamma || 0; // 左右の傾き（-90〜90）
        
        // 角度を正規化してオフセットに変換
        this.offsetX = this.mapAngleToOffset(gamma, this.MAX_DEG);
        this.offsetY = this.mapAngleToOffset(beta, this.MAX_DEG);
        
        // カメラの角度も変更（側面を覗けるように）
        this.angleY = -this.mapAngleToOffset(gamma, this.MAX_DEG) * this.MAX_ANGLE;
        this.angleX = -this.mapAngleToOffset(beta, this.MAX_DEG) * this.MAX_ANGLE;
        
        // デバッグ情報更新
        this.updateDebugInfo(beta, gamma);
    }
    
    setupMouseFallback() {
        // デスクトップ用のマウス操作フォールバック
        let isMouseDown = false;
        
        this.canvas.addEventListener('mousedown', () => {
            isMouseDown = true;
        });
        
        this.canvas.addEventListener('mouseup', () => {
            isMouseDown = false;
        });
        
        this.canvas.addEventListener('mousemove', (event) => {
            if (!this.deviceOrientationPermission && !this.isIOS) {
                const rect = this.canvas.getBoundingClientRect();
                const x = (event.clientX - rect.left) / rect.width;
                const y = (event.clientY - rect.top) / rect.height;
                
                // マウス位置を-1〜1の範囲に正規化
                const normalizedX = (x - 0.5) * 2;
                const normalizedY = (y - 0.5) * 2;
                
                this.offsetX = normalizedX * this.RANGE;
                this.offsetY = -normalizedY * this.RANGE; // Y軸を反転
                
                // カメラの角度も変更
                this.angleY = -normalizedX * this.MAX_ANGLE;
                this.angleX = normalizedY * this.MAX_ANGLE;
                
                // デバッグ情報更新（マウス用）
                this.updateDebugInfo(normalizedY * this.MAX_DEG, normalizedX * this.MAX_DEG);
            }
        });
    }
    
    mapAngleToOffset(angle, maxDeg) {
        // 角度を-1〜1の範囲にクランプしてからRANGEを適用
        const normalized = THREE.MathUtils.clamp(angle / maxDeg, -1, 1);
        return normalized * this.RANGE;
    }
    
    updateDebugInfo(beta, gamma) {
        this.infoElements.beta.textContent = beta.toFixed(1);
        this.infoElements.gamma.textContent = gamma.toFixed(1);
        this.infoElements.offsetX.textContent = this.offsetX.toFixed(3);
        this.infoElements.offsetY.textContent = this.offsetY.toFixed(3);
        this.infoElements.angleX.textContent = this.angleX.toFixed(1);
        this.infoElements.angleY.textContent = this.angleY.toFixed(1);
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    showCube() {
        if (this.cube) {
            this.cube.visible = true;
        }
    }
    
    hideCube() {
        if (this.cube) {
            this.cube.visible = false;
        }
    }
    
    resetParallax() {
        // カメラ位置をリセット
        this.camera.position.x = 0;
        this.camera.position.y = 0;
        this.camera.position.z = this.BASE_Z;
        this.camera.rotation.x = 0;
        this.camera.rotation.y = 0;
        this.camera.rotation.z = 0;
        
        // レイヤーの視差もリセット
        if (this.layerGenerator) {
            this.layerGenerator.applyParallax(0, 0, 0);
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // キューブの回転は停止（固定）
        
        if (this.parallaxEnabled) {
            if (this.currentMode === 'cube') {
                // キューブモード：カメラを移動・回転
                this.camera.position.x = this.offsetX;
                this.camera.position.y = this.offsetY;
                this.camera.position.z = this.BASE_Z;
                
                // カメラの角度を更新（側面を覗けるように）
                this.camera.rotation.x = THREE.MathUtils.degToRad(this.angleX);
                this.camera.rotation.y = THREE.MathUtils.degToRad(this.angleY);
                this.camera.rotation.z = 0;
                
            } else if (this.currentMode === 'photo') {
                // 写真モード：レイヤーに視差効果を適用
                this.camera.position.x = this.offsetX * 0.5; // カメラは少しだけ動かす
                this.camera.position.y = this.offsetY * 0.5;
                this.camera.position.z = this.BASE_Z;
                
                // レイヤーに視差効果を適用
                if (this.layerGenerator) {
                    this.layerGenerator.applyParallax(this.offsetX, this.offsetY, 1.0);
                }
                
                // カメラは正面を向く
                this.camera.rotation.x = 0;
                this.camera.rotation.y = 0;
                this.camera.rotation.z = 0;
            }
        }
        
        // レンダリング
        this.renderer.render(this.scene, this.camera);
    }
}

// アプリケーション開始
document.addEventListener('DOMContentLoaded', () => {
    new ParallaxPhotoApp();
});