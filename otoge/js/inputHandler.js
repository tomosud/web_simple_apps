class InputHandler {
    constructor(gameLogic, camera, renderer) {
        this.gameLogic = gameLogic;
        this.camera = camera;
        this.renderer = renderer;
        this.canvas = renderer.domElement;
        this.init();
    }

    init() {
        this.setupMouseEvents();
        this.setupTouchEvents();
        this.setupKeyboardEvents();
    }

    setupMouseEvents() {
        this.canvas.addEventListener('click', (event) => {
            this.handleClick(event.clientX, event.clientY);
        });
    }

    setupTouchEvents() {
        this.canvas.addEventListener('touchstart', (event) => {
            event.preventDefault();
            
            for (let i = 0; i < event.touches.length; i++) {
                const touch = event.touches[i];
                this.handleClick(touch.clientX, touch.clientY);
            }
        });

        this.canvas.addEventListener('touchmove', (event) => {
            event.preventDefault();
        });

        this.canvas.addEventListener('touchend', (event) => {
            event.preventDefault();
        });
    }

    setupKeyboardEvents() {
        document.addEventListener('keydown', (event) => {
            // スペースキーのみゲーム開始用として保持
            if (event.key === ' ') {
                event.preventDefault();
                if (!this.gameLogic.gameRunning && !this.gameLogic.stageTransitioning && !this.gameLogic.isGameOver) {
                    this.gameLogic.startGame();
                }
            }
        });
    }

    handleClick(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        // デバッグ情報を出力
        console.log('Click detected:', {
            gameRunning: this.gameLogic.gameRunning,
            stageTransitioning: this.gameLogic.stageTransitioning,
            isGameOver: this.gameLogic.isGameOver,
            stage: this.gameLogic.stage
        });
        
        // ゲーム開始前の処理
        if (!this.gameLogic.gameRunning && !this.gameLogic.stageTransitioning && !this.gameLogic.isGameOver) {
            console.log('Starting game due to click');
            this.gameLogic.startGame();
            return;
        }
        
        // ゲーム中以外は無視
        if (!this.gameLogic.gameRunning || this.gameLogic.stageTransitioning) {
            console.log('Click ignored due to game state');
            return;
        }
        
        // ゲーム中：まずレーン判定を行う
        const laneIndex = this.getLaneFromPosition(x, y);
        
        if (laneIndex >= 0) {
            // レーン内クリック：ヒット判定またはミスタップ判定をGameLogicに委譲
            this.gameLogic.handleInput(laneIndex);
        } else {
            // レーン外クリック：直接ミスタップ
            this.gameLogic.handleMistap();
        }
    }

    getNearestLane(x) {
        const canvasWidth = this.canvas.clientWidth;
        const laneWidth = canvasWidth / 4;
        const laneCenter = laneWidth / 2;
        
        let nearestLane = -1;
        let minDistance = Infinity;
        
        for (let i = 0; i < 4; i++) {
            const laneCenterX = i * laneWidth + laneCenter;
            const distance = Math.abs(x - laneCenterX);
            
            if (distance < minDistance && distance < laneWidth) {
                minDistance = distance;
                nearestLane = i;
            }
        }
        
        return nearestLane;
    }

    getLaneFromPosition(x, y) {
        // 3D空間の実際のレーン位置を2D画面座標に投影
        const lanePositions3D = [-2.4, -0.8, 0.8, 2.4]; // gameLogic.jsと同じ値
        const screenLanePositions = [];
        
        // 各レーンの3D位置を画面座標に変換
        for (let i = 0; i < 4; i++) {
            const vector = new THREE.Vector3(lanePositions3D[i], 0, 1); // 判定エリアのz位置
            vector.project(this.camera);
            
            // 正規化座標(-1~1)を画面座標に変換
            const screenX = (vector.x + 1) * this.canvas.clientWidth / 2;
            screenLanePositions.push(screenX);
        }
        
        // 最も近いレーンを見つける
        let closestLane = -1;
        let minDistance = Infinity;
        
        for (let i = 0; i < 4; i++) {
            const distance = Math.abs(x - screenLanePositions[i]);
            const tolerance = this.canvas.clientWidth * 0.08; // 画面幅の8%を許容範囲
            
            if (distance < minDistance && distance < tolerance) {
                minDistance = distance;
                closestLane = i;
            }
        }
        
        return closestLane;
    }

    // より正確な3D座標でのレーン判定（将来的に使用）
    getLaneFromScreen3D(x, y) {
        return this.gameLogic.getLaneFromScreenPosition(x, y, this.camera, this.renderer);
    }
}