class CameraManager {
    constructor() {
        this.videoElement = null;
        this.stream = null;
        this.isActive = false;
        this.constraints = {
            video: {
                width: { ideal: 1280, max: 1920 },
                height: { ideal: 720, max: 1080 },
                facingMode: 'user', // 前面カメラを優先
                frameRate: { ideal: 30, max: 60 }
            },
            audio: false
        };
    }

    async start() {
        try {
            if (this.isActive) {
                throw new Error('カメラは既に起動中です');
            }

            this.videoElement = document.getElementById('videoElement');
            if (!this.videoElement) {
                throw new Error('video要素が見つかりません');
            }

            // MediaDevices APIの利用可能性をチェック
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('このブラウザはカメラアクセスに対応していません');
            }

            // カメラストリームを取得
            this.stream = await navigator.mediaDevices.getUserMedia(this.constraints);
            
            // video要素にストリームを設定
            this.videoElement.srcObject = this.stream;
            this.videoElement.onloadedmetadata = () => {
                this.videoElement.play();
                this.setupCanvas();
            };

            this.isActive = true;
            console.log('カメラが正常に起動しました');
            
            // カメラ情報をコンソールに出力
            const track = this.stream.getVideoTracks()[0];
            if (track) {
                const settings = track.getSettings();
                console.log('カメラ設定:', settings);
            }

        } catch (error) {
            console.error('カメラ起動エラー:', error);
            
            // エラーの種類に応じて適切なメッセージを表示
            if (error.name === 'NotAllowedError') {
                throw new Error('カメラのアクセス許可が拒否されました。ブラウザの設定を確認してください。');
            } else if (error.name === 'NotFoundError') {
                throw new Error('カメラが見つかりません。デバイスにカメラが接続されているか確認してください。');
            } else if (error.name === 'NotReadableError') {
                throw new Error('カメラが他のアプリケーションで使用されています。');
            } else if (error.name === 'OverconstrainedError') {
                throw new Error('指定されたカメラ設定がサポートされていません。');
            } else {
                throw error;
            }
        }
    }

    setupCanvas() {
        const canvas = document.getElementById('overlayCanvas');
        const video = this.videoElement;
        
        if (canvas && video) {
            // キャンバスサイズをビデオサイズに合わせる
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // CSS表示サイズも調整
            const aspectRatio = video.videoWidth / video.videoHeight;
            const containerWidth = video.offsetWidth;
            const containerHeight = containerWidth / aspectRatio;
            
            canvas.style.width = containerWidth + 'px';
            canvas.style.height = containerHeight + 'px';
            
            console.log(`キャンバス設定: ${canvas.width}x${canvas.height} (表示: ${containerWidth}x${containerHeight})`);
        }
    }

    stop() {
        try {
            if (this.stream) {
                // すべてのトラックを停止
                this.stream.getTracks().forEach(track => {
                    track.stop();
                });
                this.stream = null;
            }

            if (this.videoElement) {
                this.videoElement.srcObject = null;
            }

            // キャンバスをクリア
            const canvas = document.getElementById('overlayCanvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }

            this.isActive = false;
            console.log('カメラを停止しました');

        } catch (error) {
            console.error('カメラ停止エラー:', error);
        }
    }

    getVideoElement() {
        return this.videoElement;
    }

    getStream() {
        return this.stream;
    }

    isReady() {
        return this.isActive && this.videoElement && this.videoElement.readyState >= 2;
    }

    getVideoSettings() {
        if (this.stream) {
            const track = this.stream.getVideoTracks()[0];
            return track ? track.getSettings() : null;
        }
        return null;
    }

    // カメラ切り替え（前面/背面）
    async switchCamera() {
        if (!this.isActive) {
            throw new Error('カメラが起動していません');
        }

        try {
            // 現在のカメラ設定を取得
            const currentFacingMode = this.constraints.video.facingMode;
            
            // カメラを切り替え
            this.constraints.video.facingMode = 
                currentFacingMode === 'user' ? 'environment' : 'user';

            // 現在のストリームを停止
            this.stop();
            
            // 新しい設定でカメラを再起動
            await this.start();
            
            console.log('カメラを切り替えました:', this.constraints.video.facingMode);

        } catch (error) {
            console.error('カメラ切り替えエラー:', error);
            // 元の設定に戻す
            this.constraints.video.facingMode = 
                this.constraints.video.facingMode === 'user' ? 'environment' : 'user';
            throw error;
        }
    }

    // 利用可能なカメラデバイスを取得
    async getAvailableCameras() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter(device => device.kind === 'videoinput');
        } catch (error) {
            console.error('カメラデバイス取得エラー:', error);
            return [];
        }
    }

    // 解像度を動的に調整
    async adjustResolution(width, height) {
        if (!this.isActive) {
            throw new Error('カメラが起動していません');
        }

        try {
            this.constraints.video.width = { ideal: width };
            this.constraints.video.height = { ideal: height };
            
            // カメラを再起動
            this.stop();
            await this.start();
            
            console.log(`解像度を調整しました: ${width}x${height}`);

        } catch (error) {
            console.error('解像度調整エラー:', error);
            throw error;
        }
    }
}