class SoundManager {
    constructor() {
        this.audioContext = null;
        this.sounds = {};
        this.brandSounds = {};
        this.bgmGainNode = null;
        this.effectGainNode = null;
        this.musicGainNode = null;
        this.currentMusic = null;
        this.init();
    }

    async init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // ゲイン制御
            this.bgmGainNode = this.audioContext.createGain();
            this.effectGainNode = this.audioContext.createGain();
            this.musicGainNode = this.audioContext.createGain();
            
            this.bgmGainNode.connect(this.audioContext.destination);
            this.effectGainNode.connect(this.audioContext.destination);
            this.musicGainNode.connect(this.audioContext.destination);
            
            this.bgmGainNode.gain.value = 0.3;
            this.effectGainNode.gain.value = 0.5;
            this.musicGainNode.gain.value = 0.7;
            
            this.createSounds();
            this.loadBrandSounds();
        } catch (error) {
            console.warn('Web Audio API not supported:', error);
        }
    }

    createSounds() {
        // 成功音の周波数（各レーンごと）- 4ライン対応
        this.hitFrequencies = [220, 262, 330, 392]; // A3, C4, E4, G4の音階
        
        // 失敗音の周波数
        this.missFrequency = 150;
        
        // BGMのビート音
        this.bgmFrequency = 80;
    }

    loadBrandSounds() {
        const brandSoundPaths = {
            0: 'assets/sounds/paypay.wav',    // PayPay
            1: 'assets/sounds/suica.wav',     // Suica
            2: 'assets/sounds/famima.wav',    // ファミリーマート
            3: 'assets/sounds/line.wav'       // LINE
        };

        for (const [laneIndex, soundPath] of Object.entries(brandSoundPaths)) {
            fetch(soundPath)
                .then(response => {
                    if (response.ok) {
                        return response.arrayBuffer();
                    }
                    throw new Error(`Failed to load ${soundPath}`);
                })
                .then(arrayBuffer => {
                    return this.audioContext.decodeAudioData(arrayBuffer);
                })
                .then(audioBuffer => {
                    this.brandSounds[laneIndex] = audioBuffer;
                    console.log(`Loaded brand sound for lane ${laneIndex}: ${soundPath}`);
                })
                .catch(error => {
                    console.warn(`Failed to load brand sound ${soundPath}:`, error);
                    this.brandSounds[laneIndex] = null;
                });
        }
    }

    playBrandSound(laneIndex, brandName) {
        const audioBuffer = this.brandSounds[laneIndex];
        
        if (audioBuffer && this.audioContext) {
            // ブランドサウンドを再生
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.effectGainNode);
            source.start(this.audioContext.currentTime);
            
            // console.log(`Playing ${brandName} sound for lane ${laneIndex}`);
        } else {
            // フォールバック: 従来のヒット音
            this.playHitSound(laneIndex);
        }
    }

    playHitSound(laneIndex) {
        if (!this.audioContext) return;
        
        const frequency = this.hitFrequencies[laneIndex] || 440;
        this.playTone(frequency, 0.2, 'triangle', this.effectGainNode);
    }

    playMissSound() {
        if (!this.audioContext) return;
        
        this.playNoise(0.1, this.effectGainNode);
    }

    playMistapSound() {
        
        // AudioContextが停止している場合は再開を試行
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                this.createMistapSound();
            }).catch(err => {
                this.fallbackMistapSound();
            });
        } else if (this.audioContext) {
            this.createMistapSound();
        } else {
            this.fallbackMistapSound();
        }
    }

    createMistapSound() {
        try {
            
            // より低く、大きく、嫌な音にする
            const oscillator = this.audioContext.createOscillator();
            const envelope = this.audioContext.createGain();
            
            // 低い周波数の不協和音
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(80, this.audioContext.currentTime);
            oscillator.frequency.linearRampToValueAtTime(60, this.audioContext.currentTime + 0.3);
            
            // より大きな音量で長めの持続
            envelope.gain.setValueAtTime(0, this.audioContext.currentTime);
            envelope.gain.linearRampToValueAtTime(1.0, this.audioContext.currentTime + 0.02); // 最大音量
            envelope.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.4);
            
            oscillator.connect(envelope);
            envelope.connect(this.effectGainNode);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.4);
        } catch (error) {
            this.fallbackMistapSound();
        }
    }

    fallbackMistapSound() {
        // HTMLAudioElementを使ったフォールバック
        try {
            // データURIを使って音を生成
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const sampleRate = audioContext.sampleRate;
            const duration = 0.4;
            const samples = sampleRate * duration;
            
            const buffer = audioContext.createBuffer(1, samples, sampleRate);
            const data = buffer.getChannelData(0);
            
            // ノイズとトーンの組み合わせ
            for (let i = 0; i < samples; i++) {
                const t = i / sampleRate;
                const noise = (Math.random() - 0.5) * 0.3;
                const tone = Math.sin(2 * Math.PI * (80 - t * 20) * t) * 0.7;
                data[i] = (noise + tone) * Math.max(0, 1 - t * 2.5);
            }
            
            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);
            source.start();
        } catch (error) {
            // 無視
        }
    }

    playTone(frequency, duration, waveType = 'sine', gainNode = null) {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const envelope = this.audioContext.createGain();
        
        oscillator.type = waveType;
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        
        envelope.gain.setValueAtTime(0, this.audioContext.currentTime);
        envelope.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
        envelope.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
        
        oscillator.connect(envelope);
        envelope.connect(gainNode || this.audioContext.destination);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    playNoise(duration, gainNode = null) {
        if (!this.audioContext) return;
        
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.audioContext.createBufferSource();
        const envelope = this.audioContext.createGain();
        
        noise.buffer = buffer;
        
        envelope.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        envelope.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
        
        noise.connect(envelope);
        envelope.connect(gainNode || this.audioContext.destination);
        
        noise.start(this.audioContext.currentTime);
    }

    startBGM() {
        if (!this.audioContext || this.bgmInterval) return;
        
        this.bgmInterval = setInterval(() => {
            this.playTone(this.bgmFrequency, 0.1, 'square', this.bgmGainNode);
        }, 500);
    }

    stopBGM() {
        if (this.bgmInterval) {
            clearInterval(this.bgmInterval);
            this.bgmInterval = null;
        }
    }

    // オーディオコンテキストの再開（モバイル対応）
    async resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    async playMusic(musicPath) {
        if (!this.audioContext) return;
        
        // 既存の音楽を停止
        this.stopMusic();
        
        try {
            const response = await fetch(musicPath);
            if (!response.ok) throw new Error(`Failed to load ${musicPath}`);
            
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            
            this.currentMusic = this.audioContext.createBufferSource();
            this.currentMusic.buffer = audioBuffer;
            this.currentMusic.loop = true; // リピート再生
            this.currentMusic.connect(this.musicGainNode);
            
            // 音楽が予期せず終了した場合の再開機能
            this.currentMusic.onended = () => {
                console.log('Music ended unexpectedly, restarting...');
                if (this.currentMusic) {
                    this.playMusic(musicPath);
                }
            };
            
            this.currentMusic.start(this.audioContext.currentTime);
            
            console.log(`Playing music: ${musicPath}`);
        } catch (error) {
            console.error(`Failed to play music ${musicPath}:`, error);
        }
    }
    
    stopMusic() {
        if (this.currentMusic) {
            this.currentMusic.onended = null; // イベントハンドラを削除
            this.currentMusic.stop();
            this.currentMusic = null;
        }
    }

    setVolume(bgmVolume = 0.3, effectVolume = 0.5, musicVolume = 0.7) {
        if (this.bgmGainNode) {
            this.bgmGainNode.gain.value = bgmVolume;
        }
        
        if (this.effectGainNode) {
            this.effectGainNode.gain.value = effectVolume;
        }
        
        if (this.musicGainNode) {
            this.musicGainNode.gain.value = musicVolume;
        }
    }
}