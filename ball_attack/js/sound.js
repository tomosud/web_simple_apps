/**
 * Ball Attack - サウンドシステム
 * 発射音、爆発音、UI音の管理
 */

class SoundSystem {
    constructor() {
        this.sounds = {};
        this.volumeMultiplier = 1.0; // 音量係数
        this.maxConcurrentSounds = 64; // 同時再生可能な音の最大数
        this.activeSounds = new Set(); // アクティブな音の管理
        
        // 音量設定
        this.volumes = {
            cannon: 0.3,    // 発射音
            impact: 0.4,    // 爆発音
            swipe: 0.2,     // UI音
            enemyDestroy: 0.3,  // 敵撃破音
            enemyCannon: 0.35   // 敵攻撃音
        };
        
        this.loadSounds();
    }
    
    /**
     * サウンドファイルの読み込み
     */
    async loadSounds() {
        // 基本サウンドファイル
        const baseSoundFiles = {
            cannon: 'Canon',
            impact: 'impact',
            hit: 'hit',
            swipe: 'Swipe.wav',
            enemyCannon: 'Enemy_Canon.wav'
        };
        
        // 連番サウンドの自動検出とロード
        for (const [category, baseName] of Object.entries(baseSoundFiles)) {
            if (category === 'swipe' || category === 'enemyCannon') {
                // swipeとenemyCannonは単体ファイル
                this.sounds[category] = new Audio(`assets/sound/${baseName}`);
                this.sounds[category].preload = 'auto';
                continue;
            }
            
            // 連番ファイルを検出してロード
            await this.loadSerialSounds(category, baseName);
        }
    }
    
    /**
     * 連番サウンドファイルの自動検出・ロード
     */
    async loadSerialSounds(category, baseName) {
        const soundArray = [];
        let index = 1;
        
        while (index <= 10) { // 最大10個まで検索
            const paddedIndex = index.toString().padStart(2, '0');
            const fileName = `${baseName}${paddedIndex}.wav`;
            const path = `assets/sound/${fileName}`;
            
            try {
                const audio = new Audio(path);
                audio.preload = 'auto';
                
                // ファイルが存在するかチェック
                await new Promise((resolve, reject) => {
                    audio.addEventListener('canplaythrough', resolve, { once: true });
                    audio.addEventListener('error', reject, { once: true });
                    
                    // タイムアウト設定
                    setTimeout(() => reject(new Error('Timeout')), 2000);
                });
                
                soundArray.push(audio);
                debugLog(`サウンド読み込み成功: ${fileName}`);
                index++;
            } catch (error) {
                // ファイルが見つからない場合は終了
                debugLog(`サウンドファイルが見つかりません: ${fileName} (${error.message})`);
                break;
            }
        }
        
        // 配列に格納
        if (soundArray.length > 0) {
            this.sounds[category] = soundArray;
            debugLog(`${category}サウンド: ${soundArray.length}個読み込み`);
        }
    }
    
    /**
     * 発射音を再生（ランダム選択）
     */
    playCannonSound() {
        this.playRandomSound('cannon', this.volumes.cannon);
    }
    
    /**
     * 爆発音を再生（ランダム選択）
     */
    playImpactSound() {
        this.playRandomSound('impact', this.volumes.impact);
    }
    
    /**
     * スワイプ音を再生
     */
    playSwipeSound() {
        this.playSound('swipe', this.volumes.swipe);
    }
    
    /**
     * 敵撃破音を再生（hitサウンドをランダム選択）
     */
    playEnemyDestroySound() {
        this.playRandomSound('hit', this.volumes.enemyDestroy);
    }
    
    /**
     * 連番サウンドからランダム選択して再生
     */
    playRandomSound(category, volume = 1.0) {
        const sounds = this.sounds[category];
        if (!sounds) {
            console.warn(`サウンドカテゴリが見つかりません: ${category}`);
            return;
        }
        
        if (Array.isArray(sounds)) {
            // 配列の場合はランダム選択
            const randomIndex = Math.floor(Math.random() * sounds.length);
            const selectedSound = sounds[randomIndex];
            this.playAudioInstance(selectedSound, volume);
        } else {
            // 単体の場合はそのまま再生
            this.playAudioInstance(sounds, volume);
        }
    }
    
    /**
     * 指定したサウンドを再生
     * @param {string} soundKey - サウンドキー
     * @param {number} volume - 音量（0.0-1.0）
     */
    playSound(soundKey, volume = 1.0) {
        const sound = this.sounds[soundKey];
        if (!sound) {
            console.warn(`サウンドが見つかりません: ${soundKey}`);
            return;
        }
        
        this.playAudioInstance(sound, volume);
    }
    
    /**
     * Audioインスタンスを再生
     * @param {Audio} audioInstance - 再生するAudioインスタンス
     * @param {number} volume - 音量（0.0-1.0）
     */
    playAudioInstance(audioInstance, volume = 1.0) {
        // 同時再生数制限
        if (this.activeSounds.size >= this.maxConcurrentSounds) {
            return;
        }
        
        try {
            // 新しいAudioインスタンスを作成（重複再生対応）
            const audioClone = audioInstance.cloneNode();
            audioClone.volume = volume * this.volumeMultiplier;
            
            // 再生終了時の処理
            audioClone.addEventListener('ended', () => {
                this.activeSounds.delete(audioClone);
            });
            
            this.activeSounds.add(audioClone);
            audioClone.play().catch(error => {
                console.warn(`サウンド再生エラー`, error);
                this.activeSounds.delete(audioClone);
            });
            
        } catch (error) {
            console.warn(`サウンド再生エラー`, error);
        }
    }
    
    /**
     * 音量係数を設定
     * @param {number} multiplier - 音量係数（0.0-1.0）
     */
    setVolumeMultiplier(multiplier) {
        this.volumeMultiplier = Math.max(0.0, Math.min(1.0, multiplier));
    }
    
    /**
     * 全ての音を停止
     */
    /**
     * 敵攻撃音を再生
     */
    playEnemyAttackSound() {
        this.playSound('enemyCannon', this.volumes.enemyCannon);
    }
    
    stopAllSounds() {
        this.activeSounds.forEach(sound => {
            sound.pause();
            sound.currentTime = 0;
        });
        this.activeSounds.clear();
    }
    
    /**
     * リソースの解放
     */
    dispose() {
        this.stopAllSounds();
        this.sounds = {};
    }
}