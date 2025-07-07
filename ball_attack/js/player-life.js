/**
 * Ball Attack - プレイヤーライフシステム
 * ハート表示によるライフ管理とダメージ処理
 */

class PlayerLifeSystem {
    constructor(gameInstance) {
        this.gameInstance = gameInstance;
        
        // ライフ設定
        this.maxLives = 4;
        this.currentLives = this.maxLives;
        this.isGameOver = false;
        this.isInvulnerable = false;
        this.invulnerabilityDuration = 2.0; // 2秒間の無敵時間
        this.invulnerabilityTimer = 0;
        
        // UI要素
        this.heartsContainer = null;
        this.gameOverScreen = null;
        
        this.init();
    }
    
    init() {
        this.createHeartsUI();
        this.createGameOverScreen();
        this.updateHeartsDisplay();
    }
    
    createHeartsUI() {
        // ハートコンテナを作成
        this.heartsContainer = document.createElement('div');
        this.heartsContainer.id = 'heartsContainer';
        this.heartsContainer.className = 'hearts-container';
        
        // game-infoコンテナに追加
        const gameInfo = document.querySelector('.game-info');
        if (gameInfo) {
            gameInfo.appendChild(this.heartsContainer);
        }
    }
    
    createGameOverScreen() {
        // ゲームオーバー画面を作成
        this.gameOverScreen = document.createElement('div');
        this.gameOverScreen.id = 'gameOverScreen';
        this.gameOverScreen.className = 'game-over-screen';
        this.gameOverScreen.style.display = 'none';
        
        this.gameOverScreen.innerHTML = `
            <div class="game-over-content">
                <h1 class="game-over-title">GAME OVER</h1>
                <div class="game-over-stats">
                    <div>最終スコア: <span id="finalScore">0</span></div>
                    <div>達成ステージ: <span id="finalStage">1</span></div>
                </div>
                <button id="restartButton" class="restart-button">再スタート</button>
            </div>
        `;
        
        // ボディに追加
        document.body.appendChild(this.gameOverScreen);
        
        // 再スタートボタンのイベント
        const restartButton = document.getElementById('restartButton');
        if (restartButton) {
            restartButton.addEventListener('click', this.onRestart.bind(this));
        }
    }
    
    updateHeartsDisplay() {
        if (!this.heartsContainer) return;
        
        // ハートを全てクリア
        this.heartsContainer.innerHTML = '';
        
        // 現在のライフ数分のハートのみを作成
        for (let i = 0; i < this.currentLives; i++) {
            const heart = document.createElement('div');
            heart.className = 'heart alive';
            heart.innerHTML = '❤️';
            this.heartsContainer.appendChild(heart);
        }
    }
    
    takeDamage(damageAmount = 1) {
        // 無敵時間中またはゲームオーバー時はダメージを受けない
        if (this.isInvulnerable || this.isGameOver) {
            return false;
        }
        
        // ライフを減らす
        this.currentLives = Math.max(0, this.currentLives - damageAmount);
        
        // ダメージアニメーション
        this.playDamageAnimation();
        
        // ハート表示を更新
        this.updateHeartsDisplay();
        
        // 無敵時間を開始
        this.startInvulnerability();
        
        // ゲームオーバーチェック
        if (this.currentLives <= 0) {
            this.triggerGameOver();
            return true; // ゲームオーバーになった
        }
        
        return false; // まだ生きている
    }
    
    playDamageAnimation() {
        if (!this.heartsContainer) return;
        
        // ハートコンテナを点滅させる
        this.heartsContainer.classList.add('damage-flash');
        
        // 0.5秒後に点滅を停止
        setTimeout(() => {
            if (this.heartsContainer) {
                this.heartsContainer.classList.remove('damage-flash');
            }
        }, 500);
        
        // 最後のハートを点滅させる
        const hearts = this.heartsContainer.querySelectorAll('.heart.alive');
        if (hearts.length > 0) {
            const lastHeart = hearts[hearts.length - 1];
            lastHeart.classList.add('losing');
            
            setTimeout(() => {
                lastHeart.classList.remove('losing');
            }, 800);
        }
    }
    
    startInvulnerability() {
        this.isInvulnerable = true;
        this.invulnerabilityTimer = this.invulnerabilityDuration;
        
        // 画面にダメージエフェクトを表示
        if (this.gameInstance && this.gameInstance.triggerDamageFlash) {
            this.gameInstance.triggerDamageFlash();
        }
    }
    
    triggerGameOver() {
        this.isGameOver = true;
        
        // ゲーム停止
        if (this.gameInstance) {
            this.gameInstance.isGameRunning = false;
            
            // 弾丸はそのまま飛ばせて自然に消える
            // 敵攻撃システムはリセットしない
        }
        
        // 最終スコアとステージを表示
        const finalScore = document.getElementById('finalScore');
        const finalStage = document.getElementById('finalStage');
        
        if (finalScore && this.gameInstance) {
            finalScore.textContent = this.gameInstance.score || 0;
        }
        
        if (finalStage && this.gameInstance) {
            finalStage.textContent = this.gameInstance.level || 1;
        }
        
        // ゲームオーバー画面を表示
        if (this.gameOverScreen) {
            this.gameOverScreen.style.display = 'flex';
        }
        
        console.log('GAME OVER - プレイヤーのライフがゼロになりました');
    }
    
    onRestart() {
        // 完全なページリロードを実行（最も確実な初期化）
        location.reload();
    }
    
    update(deltaTime) {
        // 無敵時間の更新
        if (this.isInvulnerable) {
            this.invulnerabilityTimer -= deltaTime;
            
            if (this.invulnerabilityTimer <= 0) {
                this.isInvulnerable = false;
                this.invulnerabilityTimer = 0;
            }
        }
    }
    
    // ライフ回復（将来のパワーアップ用）
    healLife(amount = 1) {
        if (this.isGameOver) return;
        
        this.currentLives = Math.min(this.maxLives, this.currentLives + amount);
        this.updateHeartsDisplay();
    }
    
    // 現在のライフ数を取得
    getCurrentLives() {
        return this.currentLives;
    }
    
    // 無敵状態かどうか
    isInvulnerableState() {
        return this.isInvulnerable;
    }
    
    // ゲームオーバー状態かどうか
    isGameOverState() {
        return this.isGameOver;
    }
    
    // リセット
    reset() {
        this.currentLives = this.maxLives;
        this.isGameOver = false;
        this.isInvulnerable = false;
        this.invulnerabilityTimer = 0;
        
        this.updateHeartsDisplay();
        
        if (this.gameOverScreen) {
            this.gameOverScreen.style.display = 'none';
        }
    }
    
    // クリーンアップ
    dispose() {
        if (this.heartsContainer && this.heartsContainer.parentNode) {
            this.heartsContainer.parentNode.removeChild(this.heartsContainer);
        }
        
        if (this.gameOverScreen && this.gameOverScreen.parentNode) {
            this.gameOverScreen.parentNode.removeChild(this.gameOverScreen);
        }
    }
}