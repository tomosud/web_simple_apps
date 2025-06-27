class Game {
    constructor() {
        this.sceneManager = null;
        this.gameLogic = null;
        this.inputHandler = null;
        this.soundManager = null;
        this.lastTime = 0;
        this.animationId = null;
        this.init();
    }

    async init() {
        try {
            // 3Dシーンの初期化
            this.sceneManager = new SceneManager();
            
            // サウンドマネージャーの初期化
            this.soundManager = new SoundManager();
            window.soundManager = this.soundManager;
            
            // ゲームロジックの初期化
            this.gameLogic = new GameLogic(this.sceneManager.getScene());
            this.gameLogic.init();
            
            // 入力ハンドラーの初期化
            this.inputHandler = new InputHandler(
                this.gameLogic,
                this.sceneManager.getCamera(),
                this.sceneManager.getRenderer()
            );
            
            // ゲームループの開始
            this.startGameLoop();
            
            // 初期化完了の表示
            this.showStartMessage();
            
            // モバイル用のオーディオ初期化
            this.setupMobileAudio();
            
        } catch (error) {
            console.error('Game initialization failed:', error);
            this.showError('ゲームの初期化に失敗しました。ブラウザをリロードしてください。');
        }
    }

    startGameLoop() {
        const gameLoop = (currentTime) => {
            const deltaTime = currentTime - this.lastTime;
            this.lastTime = currentTime;
            
            // ゲームロジックの更新
            this.gameLogic.update(deltaTime);
            
            // 3Dシーンの描画
            this.sceneManager.render();
            
            // 次のフレームを要求
            this.animationId = requestAnimationFrame(gameLoop);
        };
        
        this.animationId = requestAnimationFrame(gameLoop);
    }

    showStartMessage() {
        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            font-family: Arial, sans-serif;
            z-index: 1000;
            font-size: 18px;
            line-height: 1.5;
        `;
        
        message.innerHTML = `
            <h2>音ゲー (otoge)</h2>
            <p>上から降ってくるノートを<br>タイミングよくタップしよう！</p>
            <p><strong>操作方法:</strong></p>
            <p>判定エリアをタップ: ノートを叩く</p>
            <p>スペースキー: ゲーム開始</p>
            <br>
            <p><strong>画面をタップしてゲーム開始</strong></p>
        `;
        
        document.body.appendChild(message);
        
        const startGame = () => {
            document.body.removeChild(message);
            this.gameLogic.startGame();
            this.soundManager.startBGM();
            document.removeEventListener('click', startGame);
            document.removeEventListener('touchstart', startGame);
        };
        
        document.addEventListener('click', startGame);
        document.addEventListener('touchstart', startGame);
    }

    showError(errorMessage) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            font-family: Arial, sans-serif;
            z-index: 1000;
        `;
        errorDiv.textContent = errorMessage;
        document.body.appendChild(errorDiv);
    }

    setupMobileAudio() {
        // モバイルでのオーディオ再生のための初期化
        const resumeAudio = async () => {
            await this.soundManager.resumeAudioContext();
            document.removeEventListener('touchstart', resumeAudio);
            document.removeEventListener('click', resumeAudio);
        };
        
        document.addEventListener('touchstart', resumeAudio);
        document.addEventListener('click', resumeAudio);
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        if (this.soundManager) {
            this.soundManager.stopBGM();
        }
    }
}

// ページ読み込み完了後にゲームを開始
document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});

// ページ離脱時の処理
window.addEventListener('beforeunload', () => {
    if (window.game) {
        window.game.destroy();
    }
});