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
            swipe: 0.2      // UI音
        };
        
        this.loadSounds();
    }
    
    /**
     * サウンドファイルの読み込み
     */
    loadSounds() {
        const soundFiles = {
            cannon01: 'assets/sound/Canon01.wav',
            cannon02: 'assets/sound/Canon02.wav',
            impact: 'assets/sound/impact01.wav',
            swipe: 'assets/sound/Swipe.wav'
        };
        
        // 各サウンドファイルを読み込み
        for (const [key, path] of Object.entries(soundFiles)) {
            this.sounds[key] = new Audio(path);
            this.sounds[key].preload = 'auto';
            
            // エラーハンドリング
            this.sounds[key].onerror = () => {
                console.warn(`サウンドファイルの読み込みに失敗: ${path}`);
            };
        }
    }
    
    /**
     * 発射音を再生（ランダム選択）
     */
    playCannonSound() {
        const cannonSounds = ['cannon01', 'cannon02'];
        const randomSound = cannonSounds[Math.floor(Math.random() * cannonSounds.length)];
        this.playSound(randomSound, this.volumes.cannon);
    }
    
    /**
     * 爆発音を再生
     */
    playImpactSound() {
        this.playSound('impact', this.volumes.impact);
    }
    
    /**
     * スワイプ音を再生
     */
    playSwipeSound() {
        this.playSound('swipe', this.volumes.swipe);
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
        
        // 同時再生数制限
        if (this.activeSounds.size >= this.maxConcurrentSounds) {
            return;
        }
        
        try {
            // 新しいAudioインスタンスを作成（重複再生対応）
            const audioClone = sound.cloneNode();
            audioClone.volume = volume * this.volumeMultiplier;
            
            // 再生終了時の処理
            audioClone.addEventListener('ended', () => {
                this.activeSounds.delete(audioClone);
            });
            
            this.activeSounds.add(audioClone);
            audioClone.play().catch(error => {
                console.warn(`サウンド再生エラー: ${soundKey}`, error);
                this.activeSounds.delete(audioClone);
            });
            
        } catch (error) {
            console.warn(`サウンド再生エラー: ${soundKey}`, error);
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