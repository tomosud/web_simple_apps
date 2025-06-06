// カメラ撮影機能

export class CameraManager {
    constructor() {
        this.stream = null;
        this.video = document.getElementById('camera-preview');
        this.canvas = document.getElementById('capture-canvas');
        this.captureBtn = document.getElementById('capture-btn');
        this.retakeBtn = document.getElementById('retake-btn');
        this.cameraUI = document.getElementById('camera-ui');
        
        this.capturedImage = null;
        this.isCapturing = false;
        
        this.initEventListeners();
    }
    
    initEventListeners() {
        this.captureBtn.addEventListener('click', () => this.capturePhoto());
        this.retakeBtn.addEventListener('click', () => this.retakePhoto());
    }
    
    async startCamera() {
        try {
            // カメラの制約設定（背面カメラ優先、解像度制限）
            const constraints = {
                video: {
                    width: { ideal: 640, max: 1280 },
                    height: { ideal: 640, max: 1280 },
                    facingMode: { ideal: 'environment' }, // 背面カメラ
                    aspectRatio: { ideal: 1.0 } // 正方形
                }
            };
            
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
            
            // ビデオが読み込まれたら表示
            this.video.addEventListener('loadedmetadata', () => {
                this.cameraUI.classList.remove('hidden');
                this.updateCaptureCanvas();
            });
            
            return true;
        } catch (error) {
            console.error('カメラアクセスエラー:', error);
            this.showCameraError(error);
            return false;
        }
    }
    
    updateCaptureCanvas() {
        // キャプチャ用canvasをビデオサイズに合わせる
        const videoWidth = this.video.videoWidth;
        const videoHeight = this.video.videoHeight;
        
        if (videoWidth && videoHeight) {
            // 正方形にクロップするためのサイズ計算
            const size = Math.min(videoWidth, videoHeight);
            this.canvas.width = size;
            this.canvas.height = size;
        }
    }
    
    capturePhoto() {
        if (this.isCapturing) return;
        
        this.isCapturing = true;
        
        try {
            const ctx = this.canvas.getContext('2d');
            const videoWidth = this.video.videoWidth;
            const videoHeight = this.video.videoHeight;
            
            if (!videoWidth || !videoHeight) {
                throw new Error('ビデオが読み込まれていません');
            }
            
            // 正方形クロップの計算
            const size = Math.min(videoWidth, videoHeight);
            const offsetX = (videoWidth - size) / 2;
            const offsetY = (videoHeight - size) / 2;
            
            // EXIF向き補正を考慮してキャプチャ
            ctx.save();
            this.applyOrientationCorrection(ctx, size);
            
            // ビデオから画像をキャプチャ（正方形クロップ）
            ctx.drawImage(
                this.video,
                offsetX, offsetY, size, size,  // ソース領域
                0, 0, size, size               // 描画領域
            );
            
            ctx.restore();
            
            // 画像データを取得
            this.capturedImage = this.canvas.toDataURL('image/jpeg', 0.8);
            
            // UI更新
            this.showCapturedImage();
            
        } catch (error) {
            console.error('撮影エラー:', error);
            alert('撮影に失敗しました: ' + error.message);
        } finally {
            this.isCapturing = false;
        }
    }
    
    applyOrientationCorrection(ctx, size) {
        // デバイスの向きに応じた補正（基本的な実装）
        const orientation = screen.orientation?.angle || 0;
        
        switch (orientation) {
            case 90:
                ctx.rotate(Math.PI / 2);
                ctx.translate(0, -size);
                break;
            case 180:
                ctx.rotate(Math.PI);
                ctx.translate(-size, -size);
                break;
            case 270:
                ctx.rotate(-Math.PI / 2);
                ctx.translate(-size, 0);
                break;
            // 0度の場合は何もしない
        }
    }
    
    showCapturedImage() {
        // キャプチャした画像をビデオの代わりに表示
        this.video.style.display = 'none';
        
        // キャプチャ画像をプレビューに表示
        const img = new Image();
        img.onload = () => {
            const ctx = this.video.nextElementSibling?.getContext?.('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0);
            }
        };
        img.src = this.capturedImage;
        
        // ボタン切り替え
        this.captureBtn.classList.add('hidden');
        this.retakeBtn.classList.remove('hidden');
        
        // カメラストリーム停止
        this.stopCamera();
    }
    
    retakePhoto() {
        this.capturedImage = null;
        this.video.style.display = 'block';
        this.captureBtn.classList.remove('hidden');
        this.retakeBtn.classList.add('hidden');
        
        // カメラ再開
        this.startCamera();
    }
    
    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }
    
    hideCamera() {
        this.cameraUI.classList.add('hidden');
        this.stopCamera();
    }
    
    showCameraError(error) {
        let message = 'カメラにアクセスできません。';
        
        if (error.name === 'NotAllowedError') {
            message = 'カメラの使用が許可されていません。ブラウザの設定を確認してください。';
        } else if (error.name === 'NotFoundError') {
            message = 'カメラが見つかりません。';
        } else if (error.name === 'NotSupportedError') {
            message = 'このブラウザではカメラがサポートされていません。';
        }
        
        alert(message + '\n\n代替手段として画像ファイルの選択機能を追加予定です。');
    }
    
    // 画像データを小さいサイズにリサイズ（AI処理用）
    resizeImageForAI(targetSize = 384) {
        if (!this.capturedImage) return null;
        
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                canvas.width = targetSize;
                canvas.height = targetSize;
                
                // 画像をリサイズして描画
                ctx.drawImage(img, 0, 0, targetSize, targetSize);
                
                // AI処理用のImageDataを返す
                const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
                resolve(imageData);
            };
            img.src = this.capturedImage;
        });
    }
}