class GameLogic {
    constructor(scene, sceneManager, costManager) {
        this.scene = scene;
        this.sceneManager = sceneManager;
        this.costManager = costManager;
        this.notes = [];
        this.money = 30000;
        this.timer = 30;
        this.stage = 1;
        this.lives = 4;
        this.gameRunning = false;
        this.isGameOver = false;
        this.isStage3MusicPlaying = false;
        this.noteSpeed = 0.1;
        this.lanePositions = [-2.4, -0.8, 0.8, 2.4];
        this.judgmentAreaZ = 1;
        this.judgmentTolerance = 1.5;
        this.lastNoteTime = 0;
        this.noteInterval = 1000;
        this.stageTransitioning = false; // ステージ遷移中フラグ
        this.lastMistapTime = 0; // 最後のミスタップ時刻
        this.mistapCooldown = 300; // ミスタップクールダウン時間（0.3秒）
    }

    init() {
        this.updateUI();
    }

    startGame() {
        this.gameRunning = true;
        this.money = this.costManager ? this.costManager.getInitialMoney() : 30000;
        this.timer = 30;
        this.lives = 4;
        // ステージ3の音楽が再生中でなければステージ1にリセット
        if (!this.isStage3MusicPlaying) {
            this.stage = 1;
        }
        this.isGameOver = false;
        
        // ゲームパラメータをリセット（ゲームオーバー後のリスタート用）
        this.noteSpeed = 0.1;
        this.noteInterval = 1000;
        
        // 既存のノートをすべて削除
        this.clearAllNotes();
        
        // ステージ3の音楽が再生中でなければ音楽と字幕を停止
        if (!this.isStage3MusicPlaying) {
            // 音楽を停止
            if (window.soundManager && typeof window.soundManager.stopMusic === 'function') {
                window.soundManager.stopMusic();
            }
            // フォールバック音楽も停止
            if (window.currentAudio) {
                window.currentAudio.pause();
                window.currentAudio.currentTime = 0;
                window.currentAudio = null;
            }
            
            // 字幕を停止
            if (window.subtitleManager) {
                window.subtitleManager.stop();
            }
        }
        
        // ゲーム開始時に確実に背景を通常状態に戻す
        this.resetBackgroundToNormal();
        
        this.updateUI();
        this.startTimer();
    }

    clearAllNotes() {
        // シーン上の既存ノートをすべて削除
        for (let i = this.notes.length - 1; i >= 0; i--) {
            const note = this.notes[i];
            this.scene.remove(note);
            if (note.geometry) note.geometry.dispose();
            if (note.material) note.material.dispose();
        }
        
        // ノート配列をクリア
        this.notes = [];
    }

    startTimer() {
        const timerInterval = setInterval(() => {
            if (!this.gameRunning) {
                clearInterval(timerInterval);
                return;
            }
            
            this.timer--;
            this.updateUI();
            
            if (this.timer <= 0) {
                this.endGame();
                clearInterval(timerInterval);
            }
        }, 1000);
    }

    endGame() {
        this.gameRunning = false;
        this.stageTransitioning = true; // ステージ遷移開始
        
        // 次のステージ（難易度上昇）
        this.stage++;
        
        // ステージ3でAI歌唱開始
        if (this.stage === 3) {
            this.showAISingingMessage();
            return;
        }
        
        // 通常のステージ遷移（ステージ4以降も含む）
        this.lives = 4; // ライフ全回復
        this.noteSpeed += 0.02;
        if (this.noteInterval > 500) {
            this.noteInterval -= 50;
        }
        
        // ステージ表示
        this.showStageTransition();
        
        setTimeout(() => {
            this.timer = 30;
            this.gameRunning = true;
            this.stageTransitioning = false; // ステージ遷移終了
            this.updateUI();
            this.startTimer();
        }, 3000);
    }

    showStageTransition() {
        const stageDisplay = document.createElement('div');
        stageDisplay.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 48px;
            font-weight: bold;
            color: #ffff00;
            text-shadow: 3px 3px 6px rgba(0,0,0,0.8);
            z-index: 1000;
            text-align: center;
            animation: stageAnimation 3s ease-in-out;
            pointer-events: none;
        `;
        stageDisplay.innerHTML = `ステージ${this.stage}日目!`;
        
        // CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes stageAnimation {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(stageDisplay);
        
        setTimeout(() => {
            document.body.removeChild(stageDisplay);
            document.head.removeChild(style);
        }, 3000);
    }

    gameOver() {
        this.gameRunning = false;
        this.isGameOver = true;
        
        const gameOverUI = document.createElement('div');
        gameOverUI.id = 'game-over-ui';
        gameOverUI.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            color: white;
            font-family: Arial, sans-serif;
        `;
        
        gameOverUI.innerHTML = `
            <h1 style="font-size: 48px; margin-bottom: 20px; color: #ff4444;">GAME OVER</h1>
            <p style="font-size: 24px; margin-bottom: 10px;">ステージ: ${this.stage}</p>
            <p style="font-size: 32px; margin-bottom: 40px; color: #ffff00;">今月の生活費: ${this.money.toLocaleString()}円</p>
            <button id="retry-button" style="
                font-size: 24px;
                padding: 15px 30px;
                background: #4CAF50;
                color: white;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            ">もう一度人生をプレイ</button>
        `;
        
        document.body.appendChild(gameOverUI);
        
        document.getElementById('retry-button').addEventListener('click', () => {
            document.body.removeChild(gameOverUI);
            this.startGame(); // ゲームオーバー後は常にステージ1からリスタート
        });
    }

    missedNote(laneIndex) {
        
        this.lives--;
        
        // Miss!表示
        this.showMissText();
        
        // 背景の赤フラッシュ
        this.flashRedBackground();
        
        // ライフ点滅アニメーション
        this.animateLifeBlink();
        
        // ミスタップサウンド再生（従来のミスサウンドではなく、新しいミスタップサウンドを使用）
        if (window.soundManager) {
            window.soundManager.playMistapSound();
        }
        
        this.updateUI();
        
        
        if (this.lives <= 0) {
            this.gameOver();
        }
    }

    update(deltaTime) {
        if (!this.gameRunning) return;
        
        this.generateNotes(deltaTime);
        this.updateNotes();
        this.removeOffscreenNotes();
    }

    generateNotes(deltaTime) {
        this.lastNoteTime += deltaTime;
        
        if (this.lastNoteTime >= this.noteInterval) {
            this.createRandomNote();
            this.lastNoteTime = 0;
        }
    }

    createRandomNote() {
        const laneIndex = Math.floor(Math.random() * 4);
        this.createNote(laneIndex);
    }

    createNote(laneIndex) {
        // 板状のノートに変更（幅1.32、高さ0.1、奥行き1.32）
        const noteGeometry = new THREE.BoxGeometry(1.32, 0.1, 1.32);
        
        // ブランドテクスチャを取得
        const brandTexture = this.sceneManager.getBrandTexture(laneIndex);
        
        let noteMaterial;
        if (brandTexture) {
            // テクスチャが利用可能な場合
            noteMaterial = new THREE.MeshPhongMaterial({
                map: brandTexture,
                transparent: true
            });
        } else {
            // フォールバック: 従来の色ベース
            noteMaterial = new THREE.MeshPhongMaterial({
                color: this.getNoteColor(laneIndex)
            });
        }
        
        const note = new THREE.Mesh(noteGeometry, noteMaterial);
        note.position.x = this.lanePositions[laneIndex];
        note.position.y = 0.15; // 板状なので少し上げる
        note.position.z = -15;
        note.castShadow = true;
        
        note.userData = {
            laneIndex: laneIndex,
            speed: this.noteSpeed,
            brand: this.getBrandName(laneIndex)
        };
        
        this.scene.add(note);
        this.notes.push(note);
    }

    getBrandName(laneIndex) {
        const brandNames = ['PayPay', 'Suica', 'ファミリーマート', 'LINE'];
        return brandNames[laneIndex] || 'Unknown';
    }

    getNoteColor(laneIndex) {
        const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00];
        return colors[laneIndex];
    }

    updateNotes() {
        for (let i = this.notes.length - 1; i >= 0; i--) {
            const note = this.notes[i];
            note.position.z += note.userData.speed;
            
            // 判定エリアを通過した場合（ミス・ライフ減少）
            if (note.position.z > this.judgmentAreaZ + 2) {
                this.missedNote(note.userData.laneIndex);
                this.removeNote(i);
            }
        }
    }

    removeOffscreenNotes() {
        // updateNotes内で処理済み
    }

    handleInput(laneIndex) {
        if (!this.gameRunning || this.stageTransitioning) return; // ステージ遷移中は入力を無視
        
        const hitNote = this.findNoteInJudgmentArea(laneIndex);
        
        if (hitNote !== null) {
            this.hitNote(hitNote, laneIndex);
        } else {
            // ノートが判定エリアにない場合はミスタップとして処理
            this.handleMistap();
        }
    }

    findNoteInJudgmentArea(laneIndex) {
        for (let i = 0; i < this.notes.length; i++) {
            const note = this.notes[i];
            
            if (note.userData.laneIndex === laneIndex) {
                const distance = Math.abs(note.position.z - this.judgmentAreaZ);
                
                if (distance <= this.judgmentTolerance) {
                    return i;
                }
            }
        }
        
        return null;
    }

    hitNote(noteIndex, laneIndex) {
        this.removeNote(noteIndex);
        
        // 支出計算とUI更新
        this.processCosts(laneIndex);
        
        // タッチフィードバックエフェクト
        this.createHitEffect(laneIndex);
        
        // ブランドサウンド再生
        if (window.soundManager) {
            const brandName = this.getBrandName(laneIndex);
            window.soundManager.playBrandSound(laneIndex, brandName);
        }
    }

    processCosts(laneIndex) {
        if (!this.costManager) return;
        
        const brandKey = this.getBrandKey(laneIndex);
        const costs = this.costManager.getCostsForHit(brandKey);
        
        let totalCost = 0;
        let delay = 0;
        let hasPositiveCost = false;
        
        for (const costItem of costs) {
            totalCost += costItem.cost; // CSVの値は負数なので加算
            
            // プラス金額があるかチェック
            if (costItem.cost > 0) {
                hasPositiveCost = true;
            }
            
            // 複数アイテムの場合、少しずつ遅らせて表示
            setTimeout(() => {
                this.showCostItem(costItem);
            }, delay);
            delay += 200; // 200ms間隔
        }
        
        // プラス金額時にハート回復
        if (hasPositiveCost && this.lives < 4) {
            this.lives = 4;
        }
        
        this.money += totalCost;
        this.updateUI();
    }

    showCostItem(costItem) {
        const displayCost = Math.abs(costItem.cost);
        const container = document.getElementById('cost-display-container');
        
        if (!container) return;
        
        // 価格の表示形式を決定
        let priceText, priceColor;
        if (costItem.cost > 0) {
            // プラス価格は青字で表示
            priceText = `+${displayCost.toLocaleString()}円`;
            priceColor = '#4444ff';
        } else if (costItem.cost === 0) {
            // 0円にはマイナスをつけない
            priceText = '0円';
            priceColor = '#888888';
        } else {
            // マイナス価格は赤字で表示
            priceText = `-${displayCost.toLocaleString()}円`;
            priceColor = '#ff4444';
        }
        
        // 支出アイテム要素を作成
        const costElement = document.createElement('div');
        costElement.className = 'cost-item';
        costElement.innerHTML = `
            <div style="font-size: 18px; margin-bottom: 2px; color: #ffffff;">${costItem.name}</div>
            <div style="font-size: 24px; color: ${priceColor}; font-weight: bold;">${priceText}</div>
        `;
        
        // コンテナに追加
        container.appendChild(costElement);
        
        // 2秒後に削除
        setTimeout(() => {
            if (container.contains(costElement)) {
                container.removeChild(costElement);
            }
        }, 2000);
        
        // console.log(`${costItem.name} ${displayCost}円`);
    }

    getBrandKey(laneIndex) {
        const brandKeys = ['peypey', 'suica', 'famima', 'line'];
        return brandKeys[laneIndex] || 'famima';
    }

    missNote(laneIndex) {
        // サウンド再生（後で実装）
        if (window.soundManager) {
            window.soundManager.playMissSound();
        }
    }

    handleMistap() {
        // クールダウン中かチェック
        const currentTime = Date.now();
        if (currentTime - this.lastMistapTime < this.mistapCooldown) {
            // クールダウン中なのでミスタップとして扱わない
            return;
        }
        
        // ミスタップ時刻を記録
        this.lastMistapTime = currentTime;
        
        // ライフ減少
        this.lives--;
        
        // Miss!表示
        this.showMissText();
        
        // ライフ点滅アニメーション
        this.animateLifeBlink();
        
        // 背景の赤フラッシュ
        this.flashRedBackground();
        
        // ミスタップサウンド再生
        if (window.soundManager) {
            window.soundManager.playMistapSound();
        }
        
        // UIを更新
        this.updateUI();
        
        
        // ゲームオーバー判定
        if (this.lives <= 0) {
            this.gameOver();
        }
    }

    showMissText() {
        
        const missElement = document.createElement('div');
        missElement.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 72px;
            font-weight: bold;
            color: #ff0000;
            text-shadow: 4px 4px 8px rgba(0,0,0,0.8);
            z-index: 2000;
            text-align: center;
            font-family: Arial, sans-serif;
            pointer-events: none;
            animation: missAnimation 0.8s ease-out;
        `;
        missElement.textContent = 'Miss!';
        
        // CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes missAnimation {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.5); 
                }
                30% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.2); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(1); 
                }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(missElement);
        
        // 800ms後に削除し、確実に通常状態に戻す
        setTimeout(() => {
            if (document.body.contains(missElement)) {
                document.body.removeChild(missElement);
            }
            if (document.head.contains(style)) {
                document.head.removeChild(style);
            }
            // Miss文字削除後に確実に背景を通常状態に戻す
            this.resetBackgroundToNormal();
        }, 800);
    }

    animateLifeBlink() {
        const livesElement = document.getElementById('lives');
        if (!livesElement) return;
        
        // 点滅アニメーション
        let blinkCount = 0;
        const maxBlinks = 6; // 3回点滅（表示・非表示の組み合わせ）
        
        const blinkInterval = setInterval(() => {
            livesElement.style.opacity = livesElement.style.opacity === '0' ? '1' : '0';
            blinkCount++;
            
            if (blinkCount >= maxBlinks) {
                clearInterval(blinkInterval);
                livesElement.style.opacity = '1'; // 最終的に表示状態に戻す
            }
        }, 150); // 150msごとに点滅
    }

    flashRedBackground() {
        // 背景を赤くフラッシュさせる
        const canvas = document.querySelector('canvas');
        if (!canvas) return;
        
        // 赤いフィルターを適用
        canvas.style.filter = 'sepia(1) saturate(2) hue-rotate(320deg) brightness(0.8)';
        
        // 200ms後に元に戻す（短めに調整）
        setTimeout(() => {
            this.resetBackgroundToNormal();
        }, 200);
    }

    resetBackgroundToNormal() {
        // 確実に背景を通常状態に戻す
        const canvas = document.querySelector('canvas');
        if (canvas) {
            canvas.style.filter = '';
        }
    }

    removeNote(index) {
        const note = this.notes[index];
        this.scene.remove(note);
        note.geometry.dispose();
        note.material.dispose();
        this.notes.splice(index, 1);
    }

    createHitEffect(laneIndex) {
        const effectGeometry = new THREE.RingGeometry(0.5, 2, 16);
        const effectMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8
        });
        
        const effect = new THREE.Mesh(effectGeometry, effectMaterial);
        effect.position.x = this.lanePositions[laneIndex];
        effect.position.y = 0.1;
        effect.position.z = this.judgmentAreaZ;
        effect.rotation.x = -Math.PI / 2;
        
        this.scene.add(effect);
        
        // アニメーション
        const startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / 300; // 300msでアニメーション
            
            if (progress < 1) {
                effect.scale.setScalar(1 + progress * 2);
                effect.material.opacity = 0.8 * (1 - progress);
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(effect);
                effect.geometry.dispose();
                effect.material.dispose();
            }
        };
        
        animate();
    }

    updateUI() {
        const timerElement = document.getElementById('timer');
        const scoreElement = document.getElementById('score');
        const stageElement = document.getElementById('stage');
        const livesElement = document.getElementById('lives');
        
        if (timerElement) {
            timerElement.textContent = `${this.timer}秒`;
        }
        
        if (scoreElement) {
            scoreElement.textContent = `今月の生活費: ${this.money.toLocaleString()}円`;
        }
        
        if (stageElement) {
            stageElement.textContent = `ステージ${this.stage}日目`;
        }
        
        if (livesElement) {
            // ハートマークでライフを表現
            livesElement.textContent = '♥'.repeat(this.lives);
        }
    }

    showAISingingMessage() {
        const aiSingingDisplay = document.createElement('div');
        aiSingingDisplay.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 64px;
            font-weight: bold;
            color: #ff00ff;
            text-shadow: 3px 3px 6px rgba(0,0,0,0.8);
            z-index: 1000;
            text-align: center;
            animation: aiSingingAnimation 3s ease-in-out;
            background: rgba(0,0,0,0.8);
            padding: 40px;
            border-radius: 20px;
        `;
        aiSingingDisplay.innerHTML = `AIが歌います。`;
        
        // CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes aiSingingAnimation {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
                100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(aiSingingDisplay);
        
        // 3秒後に音楽開始とメッセージ削除
        setTimeout(() => {
            document.body.removeChild(aiSingingDisplay);
            document.head.removeChild(style);
            
            // ステージ3音楽再生フラグを設定
            this.isStage3MusicPlaying = true;
            
            // AI歌唱音楽を再生
            console.log('SoundManager:', window.soundManager);
            console.log('SoundManager methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(window.soundManager)));
            
            if (window.soundManager && typeof window.soundManager.playMusic === 'function') {
                console.log('Attempting to play music...');
                window.soundManager.playMusic('assets/music/7_30 through the ticket gateB.mp3')
                    .catch(error => console.error('Music playback failed:', error));
            } else {
                console.error('SoundManager playMusic method not available - please reload page to get updated SoundManager');
                // フォールバック: 単純なオーディオ要素を使用
                const audio = new Audio('assets/music/7_30 through the ticket gateB.mp3');
                audio.volume = 0.7;
                audio.loop = true; // リピート再生
                audio.play().catch(error => console.error('Audio fallback failed:', error));
                
                // オーディオ要素をグローバルに保存して停止できるようにする
                window.currentAudio = audio;
            }
            
            // 字幕表示開始
            if (window.subtitleManager) {
                console.log('Starting subtitle display...');
                window.subtitleManager.start();
            } else {
                console.warn('SubtitleManager not available');
            }
            
            // ゲーム続行
            this.continueToNextStage();
        }, 3000);
    }
    
    continueToNextStage() {
        this.lives = 4; // ライフ全回復
        this.noteSpeed += 0.02;
        if (this.noteInterval > 500) {
            this.noteInterval -= 50;
        }
        
        // ステージ表示（通常のステージ遷移）
        this.showStageTransition();
        
        // UIを更新してステージ番号を正しく表示
        this.updateUI();
        
        setTimeout(() => {
            this.timer = 30;
            this.gameRunning = true;
            this.stageTransitioning = false; // ステージ遷移終了
            this.updateUI();
            this.startTimer();
        }, 3000);
    }

    getLaneFromScreenPosition(x, y, camera, renderer) {
        const mouse = new THREE.Vector2();
        mouse.x = (x / renderer.domElement.clientWidth) * 2 - 1;
        mouse.y = -(y / renderer.domElement.clientHeight) * 2 + 1;
        
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        
        // 判定エリアとの交差を計算
        for (let i = 0; i < this.lanePositions.length; i++) {
            const laneX = this.lanePositions[i];
            const distance = Math.abs(mouse.x * 6 - laneX);
            
            if (distance < 1.8) {
                return i;
            }
        }
        
        return -1;
    }
}