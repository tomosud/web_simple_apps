class SubtitleManager {
    constructor() {
        this.subtitles = [];
        this.currentSubtitleIndex = -1;
        this.isPlaying = false;
        this.startTime = 0;
        this.subtitleElement = null;
        this.animationFrameId = null;
        this.init();
    }

    init() {
        this.createSubtitleContainer();
    }

    createSubtitleContainer() {
        // 字幕表示用のコンテナを作成
        this.subtitleElement = document.createElement('div');
        this.subtitleElement.id = 'subtitle-container';
        this.subtitleElement.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            width: 90%;
            max-width: 800px;
            text-align: center;
            font-family: Arial, sans-serif;
            font-size: 36px;
            font-weight: bold;
            color: #FFD700;
            background: rgba(0, 0, 0, 0.2);
            padding: 20px 30px;
            border-radius: 15px;
            z-index: 2000;
            pointer-events: none;
            display: none;
            line-height: 1.5;
            text-shadow: 3px 3px 6px rgba(0, 0, 0, 1);
        `;
        
        document.body.appendChild(this.subtitleElement);
    }

    async loadVTTFile(vttPath) {
        try {
            const response = await fetch(vttPath, {
                headers: {
                    'Accept': 'text/plain; charset=utf-8'
                }
            });
            if (!response.ok) {
                throw new Error(`Failed to load VTT file: ${vttPath}`);
            }
            
            // UTF-8として明示的にデコード
            const arrayBuffer = await response.arrayBuffer();
            const decoder = new TextDecoder('utf-8');
            const vttText = decoder.decode(arrayBuffer);
            
            
            this.parseVTT(vttText);
            console.log(`Loaded ${this.subtitles.length} subtitle entries from ${vttPath}`);
            return true;
        } catch (error) {
            console.error('Error loading VTT file:', error);
            return false;
        }
    }

    parseVTT(vttText) {
        this.subtitles = [];
        const lines = vttText.split('\n');
        let currentSubtitle = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // タイムコード行を検出
            if (line.includes('-->')) {
                // 前の字幕があれば完了させる
                if (currentSubtitle && currentSubtitle.text) {
                    this.subtitles.push(currentSubtitle);
                }
                
                const timeMatch = line.match(/(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2})\.(\d{3})/);
                if (timeMatch) {
                    const startTime = this.parseTimeToMs(timeMatch[1], timeMatch[2], timeMatch[3]);
                    const endTime = this.parseTimeToMs(timeMatch[4], timeMatch[5], timeMatch[6]);
                    
                    currentSubtitle = {
                        startTime: startTime,
                        endTime: endTime,
                        text: ''
                    };
                }
            }
            // テキスト行を検出
            else if (line && currentSubtitle && !line.startsWith('WEBVTT')) {
                if (currentSubtitle.text) {
                    currentSubtitle.text += '\n' + line;
                } else {
                    currentSubtitle.text = line;
                }
            }
        }
        
        // ファイル終端で最後の字幕を完了
        if (currentSubtitle && currentSubtitle.text) {
            this.subtitles.push(currentSubtitle);
        }
    }

    parseTimeToMs(minutes, seconds, milliseconds) {
        return parseInt(minutes) * 60000 + parseInt(seconds) * 1000 + parseInt(milliseconds);
    }

    start() {
        if (this.subtitles.length === 0) {
            console.warn('No subtitles loaded');
            return;
        }
        
        this.isPlaying = true;
        this.startTime = Date.now();
        this.currentSubtitleIndex = -1;
        this.updateSubtitles();
        console.log('Subtitle playback started');
    }

    stop() {
        this.isPlaying = false;
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        this.hideSubtitle();
        console.log('Subtitle playback stopped');
    }

    restart() {
        this.stop();
        setTimeout(() => {
            this.start();
        }, 100);
    }

    updateSubtitles() {
        if (!this.isPlaying) return;
        
        const currentTime = Date.now() - this.startTime - 500; // 0.5秒遅らせる
        let foundActiveSubtitle = false;
        
        
        // VTTで設定された時間通りに表示する
        for (let i = 0; i < this.subtitles.length; i++) {
            const subtitle = this.subtitles[i];
            
            // 設定された時間範囲内かチェック
            if (currentTime >= subtitle.startTime && currentTime <= subtitle.endTime) {
                // アクティブな字幕が見つかった
                if (this.currentSubtitleIndex !== i) {
                    this.currentSubtitleIndex = i;
                    this.showSubtitle('♪～ ' + subtitle.text);
                }
                foundActiveSubtitle = true;
                break;
            }
        }
        
        // アクティブな字幕がない場合は非表示
        if (!foundActiveSubtitle && this.subtitleElement.style.display !== 'none') {
            this.hideSubtitle();
        }
        
        // 次のフレームで再度更新
        this.animationFrameId = requestAnimationFrame(() => this.updateSubtitles());
    }

    showSubtitle(text) {
        if (!this.subtitleElement) return;
        
        console.log(`>>> DISPLAYING SUBTITLE: "${text}"`); // デバッグ
        
        this.subtitleElement.textContent = text;
        this.subtitleElement.style.display = 'block';
        
        // 短いアニメーションで即座に表示
        this.subtitleElement.style.transition = 'opacity 0.1s ease-out, transform 0.1s ease-out';
        this.subtitleElement.style.opacity = '1';
        this.subtitleElement.style.transform = 'translateX(-50%) translateY(0)';
    }

    hideSubtitle() {
        if (!this.subtitleElement) return;
        
        this.subtitleElement.style.transition = 'opacity 0.1s ease-out';
        this.subtitleElement.style.opacity = '0';
        
        setTimeout(() => {
            this.subtitleElement.style.display = 'none';
            this.subtitleElement.style.transition = '';
        }, 100);
    }

    // 音楽の再生時間に同期する場合用（将来的な拡張）
    syncWithAudioTime(audioCurrentTime) {
        if (!this.isPlaying) return;
        
        const currentTimeMs = audioCurrentTime * 1000;
        let foundActiveSubtitle = false;
        
        for (let i = 0; i < this.subtitles.length; i++) {
            const subtitle = this.subtitles[i];
            
            if (currentTimeMs >= subtitle.startTime && currentTimeMs <= subtitle.endTime) {
                if (this.currentSubtitleIndex !== i) {
                    this.currentSubtitleIndex = i;
                    this.showSubtitle('♪～ ' + subtitle.text);
                }
                foundActiveSubtitle = true;
                break;
            }
        }
        
        if (!foundActiveSubtitle && this.subtitleElement.style.display !== 'none') {
            this.hideSubtitle();
        }
    }

    // デバッグ用: 字幕リストを表示
    logSubtitles() {
        console.log('Loaded subtitles:', this.subtitles);
    }

    // テスト表示（開発者ツールで実行可能）
    testDisplay() {
        console.log('Testing subtitle display...');
        this.showSubtitle('テスト字幕 - Test Subtitle');
        setTimeout(() => {
            this.hideSubtitle();
        }, 3000);
    }

    // クリーンアップ
    destroy() {
        this.stop();
        
        if (this.subtitleElement) {
            document.body.removeChild(this.subtitleElement);
            this.subtitleElement = null;
        }
    }
}