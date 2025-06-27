class GameLogic {
    constructor(scene) {
        this.scene = scene;
        this.notes = [];
        this.score = 0;
        this.timer = 30;
        this.stage = 1;
        this.gameRunning = false;
        this.noteSpeed = 0.1;
        this.lanePositions = [-3, -1, 1, 3];
        this.judgmentAreaZ = 1;
        this.judgmentTolerance = 1.5;
        this.lastNoteTime = 0;
        this.noteInterval = 1000;
    }

    init() {
        this.updateUI();
    }

    startGame() {
        this.gameRunning = true;
        this.score = 0;
        this.timer = 30;
        
        // 既存のノートをすべて削除
        this.clearAllNotes();
        
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
        alert(`ステージ ${this.stage} クリア！\nスコア: ${this.score}`);
        
        // 次のステージ（難易度上昇）
        this.stage++;
        this.noteSpeed += 0.02;
        if (this.noteInterval > 500) {
            this.noteInterval -= 50;
        }
        
        setTimeout(() => {
            this.startGame();
        }, 2000);
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
        const noteGeometry = new THREE.BoxGeometry(1.5, 0.5, 1.5);
        const noteMaterial = new THREE.MeshPhongMaterial({
            color: this.getNoteColor(laneIndex)
        });
        
        const note = new THREE.Mesh(noteGeometry, noteMaterial);
        note.position.x = this.lanePositions[laneIndex];
        note.position.y = 0.5;
        note.position.z = -15;
        note.castShadow = true;
        
        note.userData = {
            laneIndex: laneIndex,
            speed: this.noteSpeed
        };
        
        this.scene.add(note);
        this.notes.push(note);
    }

    getNoteColor(laneIndex) {
        const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00];
        return colors[laneIndex];
    }

    updateNotes() {
        for (let i = this.notes.length - 1; i >= 0; i--) {
            const note = this.notes[i];
            note.position.z += note.userData.speed;
            
            // 判定エリアを通過した場合（失敗）
            if (note.position.z > this.judgmentAreaZ + 2) {
                this.removeNote(i);
            }
        }
    }

    removeOffscreenNotes() {
        // updateNotes内で処理済み
    }

    handleInput(laneIndex) {
        if (!this.gameRunning) return;
        
        const hitNote = this.findNoteInJudgmentArea(laneIndex);
        
        if (hitNote !== null) {
            this.hitNote(hitNote, laneIndex);
        } else {
            this.missNote(laneIndex);
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
        this.score += 100;
        this.updateUI();
        
        // タッチフィードバックエフェクト
        this.createHitEffect(laneIndex);
        
        // サウンド再生
        if (window.soundManager) {
            window.soundManager.playHitSound(laneIndex);
        }
    }

    missNote(laneIndex) {
        // サウンド再生（後で実装）
        if (window.soundManager) {
            window.soundManager.playMissSound();
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
        
        if (timerElement) {
            timerElement.textContent = this.timer;
        }
        
        if (scoreElement) {
            scoreElement.textContent = `スコア: ${this.score}`;
        }
        
        if (stageElement) {
            stageElement.textContent = `ステージ: ${this.stage}`;
        }
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
            const distance = Math.abs(mouse.x * 8 - laneX);
            
            if (distance < 2.2) {
                return i;
            }
        }
        
        return -1;
    }
}