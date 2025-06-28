class Game {
    constructor() {
        this.sceneManager = null;
        this.gameLogic = null;
        this.inputHandler = null;
        this.soundManager = null;
        this.lastTime = 0;
        this.animationId = null;
        this.gameStarted = false; // ゲーム開始フラグ
        this.init();
    }

    async init() {
        try {
            // 3Dシーンの初期化
            this.sceneManager = new SceneManager();
            
            // サウンドマネージャーの初期化
            this.soundManager = new SoundManager();
            window.soundManager = this.soundManager;
            
            // 字幕マネージャーの初期化
            this.subtitleManager = new SubtitleManager();
            window.subtitleManager = this.subtitleManager;
            await this.subtitleManager.loadVTTFile('assets/vtt/7_30 through the ticket gateB.vtt');
            
            // コストマネージャーの初期化
            this.costManager = new CostManager();
            await this.costManager.init();
            
            // ゲームロジックの初期化
            this.gameLogic = new GameLogic(this.sceneManager.getScene(), this.sceneManager, this.costManager);
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
            <h2>お金を使えば使うほど、人間が大きくなる。<br>今月もがんばろう！</h2>
            <br>
            <p><strong>タップでスタート（人生）</strong></p>
        `;
        
        document.body.appendChild(message);
        
        const startGame = () => {
            if (this.gameStarted) return; // 既にゲームが開始されている場合は何もしない
            
            this.gameStarted = true;
            document.body.removeChild(message);
            this.gameLogic.startGame();
            // BGMを開始しない（ビート音を止める）
            // this.soundManager.startBGM();
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
            if (!this.gameStarted) return; // ゲーム開始前は何もしない
            
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