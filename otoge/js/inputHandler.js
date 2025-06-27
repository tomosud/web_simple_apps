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
                if (!this.gameLogic.gameRunning) {
                    this.gameLogic.startGame();
                }
            }
        });
    }

    handleClick(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        const laneIndex = this.getLaneFromPosition(x, y);
        
        if (laneIndex >= 0) {
            if (!this.gameLogic.gameRunning) {
                this.gameLogic.startGame();
            } else {
                // レーン全体でのタップを有効にする
                this.gameLogic.handleInput(laneIndex);
            }
        } else if (this.gameLogic.gameRunning) {
            // レーン外でもタップした場合、最も近いレーンを判定
            const nearestLane = this.getNearestLane(x);
            if (nearestLane >= 0) {
                this.gameLogic.handleInput(nearestLane);
            }
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
        const canvasWidth = this.canvas.clientWidth;
        const laneWidth = canvasWidth / 4;
        
        const laneIndex = Math.floor(x / laneWidth);
        
        if (laneIndex >= 0 && laneIndex < 4) {
            return laneIndex;
        }
        
        return -1;
    }

    // より正確な3D座標でのレーン判定（将来的に使用）
    getLaneFromScreen3D(x, y) {
        return this.gameLogic.getLaneFromScreenPosition(x, y, this.camera, this.renderer);
    }
}