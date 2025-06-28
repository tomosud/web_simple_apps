class SceneManager {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.lanes = [];
        this.judgmentAreas = [];
        this.textureLoader = null;
        this.brandTextures = {};
        this.init();
    }

    init() {
        this.createScene();
        this.createCamera();
        this.createRenderer();
        this.initTextureLoader();
        this.createLanes();
        this.createJudgmentAreas();
        this.setupLighting();
        this.handleResize();
    }

    createScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111111);
    }

    createCamera() {
        const aspect = window.innerWidth / window.innerHeight;
        // スマートフォン縦画面時は画角を13%狭くして要素を大きく表示
        const fov = aspect < 1.0 ? 65.25 : 75;
        this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
        
        // アスペクト比に応じてカメラ位置を調整（スマートフォン対応）
        if (aspect < 1.0) {
            // スマートフォン縦画面: より引いた視点 + 3度下向きに
            this.camera.position.set(0, 8, 5);
            this.camera.lookAt(0, 1.8, -2);
            this.camera.rotation.x -= Math.PI / 60; // 3度下向き
        } else {
            // PC・タブレット横画面: 従来の視点
            this.camera.position.set(0, 6, 4);
            this.camera.lookAt(0, 0, -2);
        }
    }

    createRenderer() {
        const canvas = document.getElementById('game-canvas');
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: canvas,
            antialias: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    createLanes() {
        const laneWidth = 1.2;
        const laneLength = 20;
        const laneSpacing = 1.6;
        
        // グラデーションテクスチャを読み込み
        const gradTexture = this.textureLoader.load('assets/textures/grad.png');
        gradTexture.wrapS = THREE.RepeatWrapping;
        gradTexture.wrapT = THREE.RepeatWrapping;
        
        // 4つのラインを作成
        for (let i = 0; i < 4; i++) {
            const laneGeometry = new THREE.PlaneGeometry(laneWidth, laneLength);
            const laneMaterial = new THREE.MeshPhongMaterial({
                map: gradTexture,
                transparent: true,
                opacity: 0.8
            });
            
            const lane = new THREE.Mesh(laneGeometry, laneMaterial);
            lane.rotation.x = -Math.PI / 2;
            lane.position.x = (i - 1.5) * laneSpacing;
            lane.position.y = 0;
            lane.position.z = -5;
            
            this.scene.add(lane);
            this.lanes.push(lane);
        }
    }

    createJudgmentAreas() {
        const areaWidth = 1.62; // 1.8の90%（10%縮小）
        const areaHeight = 1.35; // 1.5の90%（10%縮小）
        const laneSpacing = 1.6;
        
        // 各ラインの下部に判定エリアを作成
        for (let i = 0; i < 4; i++) {
            const areaGeometry = new THREE.PlaneGeometry(areaWidth, areaHeight);
            const areaMaterial = new THREE.MeshPhongMaterial({
                color: 0x808080, // グレー色に変更
                transparent: true,
                opacity: 0.6
            });
            
            const judgmentArea = new THREE.Mesh(areaGeometry, areaMaterial);
            judgmentArea.rotation.x = -Math.PI / 2;
            judgmentArea.position.x = (i - 1.5) * laneSpacing;
            judgmentArea.position.y = 0.01;
            judgmentArea.position.z = 1;
            
            this.scene.add(judgmentArea);
            this.judgmentAreas.push(judgmentArea);
        }
        
        // 赤い判定ラインを全レーンにわたって表示
        this.createJudgmentLine();
    }

    createJudgmentLine() {
        const lineGeometry = new THREE.PlaneGeometry(7, 0.1);
        const lineMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.8
        });
        
        const judgmentLine = new THREE.Mesh(lineGeometry, lineMaterial);
        judgmentLine.rotation.x = -Math.PI / 2;
        judgmentLine.position.x = 0;
        judgmentLine.position.y = 0.03;
        judgmentLine.position.z = 1;
        
        this.scene.add(judgmentLine);
    }

    initTextureLoader() {
        this.textureLoader = new THREE.TextureLoader();
        this.loadBrandTextures();
    }

    loadBrandTextures() {
        const brandTexturePaths = {
            0: 'assets/textures/peipei.png',    // PayPay
            1: 'assets/textures/suica.png',     // Suica
            2: 'assets/textures/famima.png',    // ファミリーマート
            3: 'assets/textures/line.png'       // LINE
        };

        for (const [laneIndex, texturePath] of Object.entries(brandTexturePaths)) {
            this.textureLoader.load(
                texturePath,
                (texture) => {
                    // テクスチャが正常に読み込まれた場合
                    this.brandTextures[laneIndex] = texture;
                    console.log(`Loaded texture for lane ${laneIndex}: ${texturePath}`);
                },
                (progress) => {
                    // 読み込み進行状況（オプション）
                },
                (error) => {
                    // テクスチャ読み込みに失敗した場合、フォールバック
                    console.warn(`Failed to load texture ${texturePath}, using fallback`);
                    this.brandTextures[laneIndex] = null;
                }
            );
        }
    }

    getBrandTexture(laneIndex) {
        return this.brandTextures[laneIndex] || null;
    }

    setupLighting() {
        // 環境光
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        
        // 方向光
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
    }

    handleResize() {
        window.addEventListener('resize', () => {
            const aspect = window.innerWidth / window.innerHeight;
            this.camera.aspect = aspect;
            
            // リサイズ時もカメラ位置を調整
            if (aspect < 1.0) {
                // スマートフォン縦画面: より引いた視点 + 3度下向きに
                this.camera.position.set(0, 8, 5);
                this.camera.lookAt(0, 1.8, -2);
                this.camera.rotation.x -= Math.PI / 60; // 3度下向き
            } else {
                // PC・タブレット横画面: 従来の視点
                this.camera.position.set(0, 6, 4);
                this.camera.lookAt(0, 0, -2);
            }
            
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    getScene() {
        return this.scene;
    }

    getCamera() {
        return this.camera;
    }

    getRenderer() {
        return this.renderer;
    }

    getLanes() {
        return this.lanes;
    }

    getJudgmentAreas() {
        return this.judgmentAreas;
    }
}