class SceneManager {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.lanes = [];
        this.judgmentAreas = [];
        this.init();
    }

    init() {
        this.createScene();
        this.createCamera();
        this.createRenderer();
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
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        
        // 斜め上から見下ろす視点（上部空白を減らす）
        this.camera.position.set(0, 6, 4);
        this.camera.lookAt(0, 0, -2);
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
        const laneWidth = 1.5;
        const laneLength = 20;
        const laneSpacing = 2;
        
        // 4つのラインを作成
        for (let i = 0; i < 4; i++) {
            const laneGeometry = new THREE.PlaneGeometry(laneWidth, laneLength);
            const laneMaterial = new THREE.MeshPhongMaterial({
                color: 0x333333,
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
        const areaWidth = 2.2;
        const areaHeight = 1.5;
        const laneSpacing = 2;
        
        // 各ラインの下部に判定エリアを作成
        for (let i = 0; i < 4; i++) {
            const areaGeometry = new THREE.PlaneGeometry(areaWidth, areaHeight);
            const areaMaterial = new THREE.MeshPhongMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: 0.6
            });
            
            const judgmentArea = new THREE.Mesh(areaGeometry, areaMaterial);
            judgmentArea.rotation.x = -Math.PI / 2;
            judgmentArea.position.x = (i - 1.5) * laneSpacing;
            judgmentArea.position.y = 0.01;
            judgmentArea.position.z = 1;
            
            // 境界線用のエッジ
            const edges = new THREE.EdgesGeometry(areaGeometry);
            const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
            const wireframe = new THREE.LineSegments(edges, lineMaterial);
            wireframe.rotation.x = -Math.PI / 2;
            wireframe.position.x = (i - 1.5) * laneSpacing;
            wireframe.position.y = 0.02;
            wireframe.position.z = 1;
            
            this.scene.add(judgmentArea);
            this.scene.add(wireframe);
            this.judgmentAreas.push(judgmentArea);
        }
        
        // 赤い判定ラインを全レーンにわたって表示
        this.createJudgmentLine();
    }

    createJudgmentLine() {
        const lineGeometry = new THREE.PlaneGeometry(10, 0.1);
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