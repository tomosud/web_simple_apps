// 傾き視差キューブデモ - メインアプリケーション

class ParallaxCube {
    constructor() {
        // 設定パラメータ
        this.MAX_DEG = 20;    // 傾き角の最大値（度）
        this.RANGE = 0.05;    // カメラ移動の最大幅（ワールド座標）
        this.BASE_Z = 3;      // カメラの基準Z距離
        
        // 現在のオフセット値
        this.offsetX = 0;
        this.offsetY = 0;
        
        // Three.js オブジェクト
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.cube = null;
        
        // DOM要素
        this.canvas = document.getElementById('scene');
        this.permissionBtn = document.getElementById('permissionBtn');
        this.infoElements = {
            beta: document.getElementById('beta'),
            gamma: document.getElementById('gamma'),
            offsetX: document.getElementById('offsetX'),
            offsetY: document.getElementById('offsetY')
        };
        
        // デバイス対応チェック
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        this.deviceOrientationPermission = false;
        
        this.init();
    }
    
    init() {
        this.initThreeJS();
        this.setupDeviceOrientation();
        this.setupMouseFallback();
        this.animate();
        
        // リサイズ対応
        window.addEventListener('resize', () => this.onWindowResize());
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
        
        // キューブ作成
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({
            color: 0x00ff88,
            metalness: 0.3,
            roughness: 0.4
        });
        
        this.cube = new THREE.Mesh(geometry, material);
        this.scene.add(this.cube);
        
        // キューブにワイヤーフレームを追加
        const wireframe = new THREE.WireframeGeometry(geometry);
        const wireframeMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.3, transparent: true });
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
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // キューブを少し回転させる
        this.cube.rotation.x += 0.005;
        this.cube.rotation.y += 0.01;
        
        // カメラ位置を更新（視差効果）
        this.camera.position.x = this.offsetX;
        this.camera.position.y = this.offsetY;
        this.camera.position.z = this.BASE_Z;
        
        // 常に原点を見る
        this.camera.lookAt(0, 0, 0);
        
        // レンダリング
        this.renderer.render(this.scene, this.camera);
    }
}

// アプリケーション開始
document.addEventListener('DOMContentLoaded', () => {
    new ParallaxCube();
});