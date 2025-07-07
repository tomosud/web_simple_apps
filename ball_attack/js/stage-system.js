/**
 * Ball Attack - ステージシステム
 * ステージ進行とクリア条件の管理
 */

class StageSystem {
    constructor(gameInstance) {
        this.gameInstance = gameInstance;
        
        // ステージ設定
        this.currentStage = 1;
        this.maxStage = 10; // 最大ステージ数
        this.isStageCleared = false;
        this.stageClearAnimationDuration = 3.0; // 3秒間のクリアアニメーション
        this.stageClearTimer = 0;
        
        // ステージクリア画面
        this.stageClearScreen = null;
        
        this.init();
    }
    
    init() {
        this.createStageClearScreen();
    }
    
    createStageClearScreen() {
        // ステージクリア画面を作成
        this.stageClearScreen = document.createElement('div');
        this.stageClearScreen.id = 'stageClearScreen';
        this.stageClearScreen.className = 'stage-clear-screen';
        this.stageClearScreen.style.display = 'none';
        
        this.stageClearScreen.innerHTML = `
            <div class="stage-clear-content">
                <h1 class="stage-clear-title">STAGE CLEAR!</h1>
                <div class="stage-clear-info">
                    <div>ステージ <span id="clearedStage">1</span> クリア</div>
                    <div>次のステージに進みます...</div>
                </div>
                <div class="stage-clear-progress">
                    <div class="progress-bar">
                        <div id="stageProgressBar" class="progress-fill"></div>
                    </div>
                </div>
                <button id="stageContinueButton" class="restart-button">次のステージへ</button>
            </div>
        `;
        
        // ボディに追加
        document.body.appendChild(this.stageClearScreen);
        
        // 次のステージボタンのイベント
        const continueButton = document.getElementById('stageContinueButton');
        if (continueButton) {
            continueButton.addEventListener('click', () => {
                this.onContinueButtonClick();
            });
        }
    }
    
    // 現在のステージに応じた親敵数を計算
    getParentEnemyCount(stage) {
        return Math.min(stage, 5); // 最大5体まで
    }
    
    // ステージクリア処理
    onStageCleared() {
        if (this.isStageCleared) return; // 重複処理防止
        
        this.isStageCleared = true;
        this.stageClearTimer = this.stageClearAnimationDuration;
        
        // ゲームを一時停止
        if (this.gameInstance) {
            this.gameInstance.isGameRunning = false;
            
            // 弾丸はそのまま飛ばせて自然に消える
            // 敵攻撃システムはリセットしない
            
            // ハートを回復（1個回復）
            if (this.gameInstance.playerLifeSystem) {
                this.gameInstance.playerLifeSystem.healLife(1);
            }
        }
        
        // ステージクリア画面を表示
        this.showStageClearScreen();
        
        console.log(`ステージ ${this.currentStage} クリア！ハート回復`);
    }
    
    showStageClearScreen() {
        const clearedStageElement = document.getElementById('clearedStage');
        if (clearedStageElement) {
            clearedStageElement.textContent = this.currentStage;
        }
        
        // プログレスバーの更新
        const progressBar = document.getElementById('stageProgressBar');
        if (progressBar) {
            const progress = (this.currentStage / this.maxStage) * 100;
            progressBar.style.width = `${progress}%`;
        }
        
        if (this.stageClearScreen) {
            this.stageClearScreen.style.display = 'flex';
        }
    }
    
    onContinueButtonClick() {
        // 手動で次のステージに進む
        this.stageClearTimer = 0; // タイマーをリセット
        this.advanceToNextStage();
    }
    
    hideStageClearScreen() {
        if (this.stageClearScreen) {
            this.stageClearScreen.style.display = 'none';
        }
    }
    
    // 次のステージに進む
    advanceToNextStage() {
        this.currentStage++;
        this.isStageCleared = false;
        this.stageClearTimer = 0;
        
        // 最大ステージチェック
        if (this.currentStage > this.maxStage) {
            this.onGameComplete();
            return;
        }
        
        // ステージクリア画面を非表示
        this.hideStageClearScreen();
        
        // 新しいステージをセットアップ
        this.setupStage(this.currentStage);
        
        // ゲームを確実に再開
        if (this.gameInstance) {
            this.gameInstance.isGameRunning = true;
            this.gameInstance.level = this.currentStage;
            this.gameInstance.updateUI();
        }
        
        console.log(`ステージ ${this.currentStage} 開始 - 親敵数: ${this.getParentEnemyCount(this.currentStage)}`);
    }
    
    // ステージをセットアップ
    setupStage(stageNumber) {
        if (!this.gameInstance) return;
        
        const parentEnemyCount = this.getParentEnemyCount(stageNumber);
        
        // 敵システムをリセット
        if (this.gameInstance.enemySystem) {
            this.gameInstance.enemySystem.reset();
            this.gameInstance.enemySystem.generateEnemies(0); // 子敵は0個で開始
        }
        
        // 親敵システムをリセットして新しい数の親敵を配置
        if (this.gameInstance.parentEnemySystem) {
            this.gameInstance.parentEnemySystem.reset();
            this.gameInstance.parentEnemySystem.createParentEnemies(parentEnemyCount);
        }
        
        // 弾丸はそのまま飛ばせて自然に消える
        // 敵攻撃システムはリセットしない
    }
    
    // ゲーム完了処理
    onGameComplete() {
        console.log('全ステージクリア！ゲーム完了！');
        
        // ゲーム完了画面を表示
        this.showGameCompleteScreen();
        
        // ゲームを停止
        if (this.gameInstance) {
            this.gameInstance.isGameRunning = false;
        }
    }
    
    showGameCompleteScreen() {
        if (!this.stageClearScreen) return;
        
        // 画面を変更してゲーム完了表示
        this.stageClearScreen.innerHTML = `
            <div class="stage-clear-content">
                <h1 class="stage-clear-title" style="color: #ffdd44;">GAME COMPLETE!</h1>
                <div class="stage-clear-info">
                    <div>全 ${this.maxStage} ステージクリア！</div>
                    <div>おめでとうございます！</div>
                    <div>最終スコア: ${this.gameInstance ? this.gameInstance.score : 0}</div>
                </div>
                <button id="gameCompleteRestart" class="restart-button">新しいゲーム</button>
            </div>
        `;
        
        // 再スタートボタンのイベント
        const restartButton = document.getElementById('gameCompleteRestart');
        if (restartButton) {
            restartButton.addEventListener('click', () => {
                this.onGameCompleteRestart();
            });
        }
        
        this.stageClearScreen.style.display = 'flex';
    }
    
    onGameCompleteRestart() {
        // 完全なページリロードを実行（最も確実な初期化）
        location.reload();
    }
    
    // 全ての親敵が撃破されたかチェック
    checkStageCleared() {
        if (this.isStageCleared) return false;
        
        if (this.gameInstance && this.gameInstance.parentEnemySystem) {
            const allDestroyed = this.gameInstance.parentEnemySystem.allParentEnemiesDestroyed();
            if (allDestroyed) {
                this.onStageCleared();
                return true;
            }
        }
        
        return false;
    }
    
    update(deltaTime) {
        // ステージクリア中はタイマー更新のみ行い、自動進行はボタンクリックに委ねる
        if (this.isStageCleared && this.stageClearTimer > 0) {
            this.stageClearTimer -= deltaTime;
            // 自動進行は削除 - ボタンクリックでのみ進行
        }
    }
    
    // 現在のステージ数を取得
    getCurrentStage() {
        return this.currentStage;
    }
    
    // ステージクリア状態かどうか
    isStageClearing() {
        return this.isStageCleared;
    }
    
    // リセット
    reset() {
        this.currentStage = 1;
        this.isStageCleared = false;
        this.stageClearTimer = 0;
        this.hideStageClearScreen();
        
        // 最初のステージをセットアップ
        this.setupStage(this.currentStage);
    }
    
    // クリーンアップ
    dispose() {
        if (this.stageClearScreen && this.stageClearScreen.parentNode) {
            this.stageClearScreen.parentNode.removeChild(this.stageClearScreen);
        }
    }
}