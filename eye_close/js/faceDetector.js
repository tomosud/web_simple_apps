class FaceDetector {
    constructor() {
        this.detector = null;
        this.isInitialized = false;
        this.isDetecting = false;
        this.videoElement = null;
        this.canvas = null;
        this.ctx = null;
        this.animationId = null;
        
        // 検出結果コールバック
        this.onDetectionResult = null;
        this.onBlinkDetected = null;
        
        // 指定されたランドマークインデックス（正確なEAR計算用）
        this.eyeLandmarks = {
            left: [33, 160, 158, 133, 153, 144],   // p1, p2, p3, p4, p5, p6
            right: [362, 385, 387, 263, 373, 380]  // p1, p2, p3, p4, p5, p6
        };
        
        // まばたき検出設定
        this.earThreshold = 0.27;
        this.blinkCount = 0;
        this.isEyesClosed = false;
        this.blinkHistory = [];
        
        // 現在の検出状態
        this.currentState = {
            faceDetected: false,
            leftEyeOpen: false,
            rightEyeOpen: false,
            leftEAR: 0,
            rightEAR: 0,
            avgEAR: 0,
            blinkCount: 0,
            timestamp: Date.now()
        };
    }

    async initialize() {
        try {
            if (this.isInitialized) {
                return;
            }

            console.log('TensorFlow.js Face Landmarks Detection を初期化中...');

            // TensorFlow.jsライブラリの確認
            if (typeof faceLandmarksDetection === 'undefined') {
                throw new Error('TensorFlow.js Face Landmarks Detection APIが読み込まれていません');
            }

            // Face Landmarks Detection モデルを作成
            const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
            const detectorConfig = {
                runtime: 'mediapipe',
                solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh'
            };

            this.detector = await faceLandmarksDetection.createDetector(model, detectorConfig);

            this.isInitialized = true;
            console.log('TensorFlow.js Face Landmarks Detection の初期化が完了しました');

        } catch (error) {
            console.error('Face Detection 初期化エラー:', error);
            throw new Error('Face Detection の初期化に失敗しました: ' + error.message);
        }
    }

    async start(videoElement) {
        if (!this.isInitialized) {
            throw new Error('Face Landmarker が初期化されていません');
        }

        if (this.isDetecting) {
            throw new Error('検出は既に開始されています');
        }

        this.videoElement = videoElement;
        this.canvas = document.getElementById('overlayCanvas');
        this.ctx = this.canvas.getContext('2d');

        if (!this.videoElement || !this.canvas) {
            throw new Error('必要な要素が見つかりません');
        }

        this.isDetecting = true;
        this.detectLoop();
        console.log('顔検出を開始しました');
    }

    stop() {
        this.isDetecting = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // キャンバスをクリア
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        console.log('顔検出を停止しました');
    }

    detectLoop() {
        if (!this.isDetecting) {
            return;
        }

        if (this.videoElement.readyState >= 2) {
            this.detectFaces();
        }

        this.animationId = requestAnimationFrame(() => this.detectLoop());
    }

    async detectFaces() {
        try {
            const estimationConfig = { flipHorizontal: false };
            const faces = await this.detector.estimateFaces(this.videoElement, estimationConfig);
            
            // キャンバスをクリア
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            if (faces.length > 0) {
                const face = faces[0];
                const keypoints = face.keypoints;
                
                // Face Meshを描画
                this.drawFaceMesh(keypoints);
                
                // 正確なEARを計算（指定された公式に従う）
                const leftEAR = this.calculateAccurateEAR(keypoints, this.eyeLandmarks.left);
                const rightEAR = this.calculateAccurateEAR(keypoints, this.eyeLandmarks.right);
                const avgEAR = (leftEAR + rightEAR) / 2;
                
                // まばたき検出
                this.detectBlink(avgEAR);
                
                // 目の開閉状態を判定
                const leftEyeOpen = leftEAR > this.earThreshold;
                const rightEyeOpen = rightEAR > this.earThreshold;
                
                // 検出状態を更新
                this.currentState = {
                    faceDetected: true,
                    leftEyeOpen,
                    rightEyeOpen,
                    leftEAR,
                    rightEAR,
                    avgEAR,
                    blinkCount: this.blinkCount,
                    timestamp: Date.now()
                };
                
                // 目の状態を描画
                this.drawEyeStatus(keypoints, leftEyeOpen, rightEyeOpen);
                
            } else {
                // 顔が検出されない場合
                this.currentState = {
                    faceDetected: false,
                    leftEyeOpen: false,
                    rightEyeOpen: false,
                    leftEAR: 0,
                    rightEAR: 0,
                    avgEAR: 0,
                    blinkCount: this.blinkCount,
                    timestamp: Date.now()
                };
            }
            
            // 結果をコールバック
            if (this.onDetectionResult) {
                this.onDetectionResult(this.currentState);
            }
            
        } catch (error) {
            console.error('顔検出エラー:', error);
        }
    }

    // 正確なEAR計算（指定された公式に従う）
    calculateAccurateEAR(landmarks, eyeIndices) {
        // インデックスの順序: [p1, p2, p3, p4, p5, p6]
        const p1 = landmarks[eyeIndices[0]]; // 左端
        const p2 = landmarks[eyeIndices[1]]; // 上側1
        const p3 = landmarks[eyeIndices[2]]; // 上側2  
        const p4 = landmarks[eyeIndices[3]]; // 右端
        const p5 = landmarks[eyeIndices[4]]; // 下側1
        const p6 = landmarks[eyeIndices[5]]; // 下側2
        
        if (!p1 || !p2 || !p3 || !p4 || !p5 || !p6) {
            return 0;
        }
        
        // |p2-p6| の距離を計算
        const dist_p2_p6 = Math.sqrt(
            Math.pow(p2.x - p6.x, 2) + Math.pow(p2.y - p6.y, 2)
        );
        
        // |p3-p5| の距離を計算
        const dist_p3_p5 = Math.sqrt(
            Math.pow(p3.x - p5.x, 2) + Math.pow(p3.y - p5.y, 2)
        );
        
        // |p1-p4| の距離を計算
        const dist_p1_p4 = Math.sqrt(
            Math.pow(p1.x - p4.x, 2) + Math.pow(p1.y - p4.y, 2)
        );
        
        // EAR = (|p2-p6| + |p3-p5|) / (2 × |p1-p4|)
        const ear = (dist_p2_p6 + dist_p3_p5) / (2 * dist_p1_p4);
        
        return ear;
    }

    // まばたき検出処理
    detectBlink(avgEAR) {
        // EARが閾値未満になった瞬間を検出
        if (avgEAR < this.earThreshold && !this.isEyesClosed) {
            // 目を閉じた瞬間
            this.isEyesClosed = true;
            this.blinkCount++;
            
            // 履歴に追加
            const now = new Date();
            const timestamp = now.toLocaleTimeString('ja-JP');
            this.blinkHistory.unshift({
                count: this.blinkCount,
                timestamp: timestamp,
                ear: avgEAR.toFixed(3)
            });
            
            // 履歴を最新20件に制限
            if (this.blinkHistory.length > 20) {
                this.blinkHistory = this.blinkHistory.slice(0, 20);
            }
            
            // まばたき検出コールバック
            if (this.onBlinkDetected) {
                this.onBlinkDetected({
                    count: this.blinkCount,
                    timestamp: timestamp,
                    ear: avgEAR,
                    history: [...this.blinkHistory]
                });
            }
            
            console.log(`まばたき検出! #${this.blinkCount} (EAR: ${avgEAR.toFixed(3)})`);
            
        } else if (avgEAR >= this.earThreshold && this.isEyesClosed) {
            // 目を開いた瞬間
            this.isEyesClosed = false;
        }
    }

    drawFaceMesh(landmarks) {
        this.ctx.save();
        
        // 目の領域を強調表示
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        this.ctx.lineWidth = 1;
        
        // 左目のランドマークを描画
        this.drawEyeContour(landmarks, [
            33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246
        ]);
        
        // 右目のランドマークを描画
        this.drawEyeContour(landmarks, [
            362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398
        ]);
        
        this.ctx.restore();
    }

    drawEyeContour(landmarks, indices) {
        if (indices.length === 0) return;
        
        this.ctx.beginPath();
        const firstPoint = this.normalizePoint(landmarks[indices[0]]);
        this.ctx.moveTo(firstPoint.x, firstPoint.y);
        
        for (let i = 1; i < indices.length; i++) {
            const point = this.normalizePoint(landmarks[indices[i]]);
            this.ctx.lineTo(point.x, point.y);
        }
        
        this.ctx.closePath();
        this.ctx.stroke();
    }

    drawEyeStatus(landmarks, leftEyeOpen, rightEyeOpen) {
        this.ctx.save();
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        
        // 左目の状態表示
        const leftEyeCenter = this.normalizePoint(landmarks[33]);
        this.ctx.fillStyle = leftEyeOpen ? '#00ff00' : '#ff0000';
        this.ctx.fillText(
            leftEyeOpen ? '開' : '閉', 
            leftEyeCenter.x - 30, 
            leftEyeCenter.y - 20
        );
        
        // 右目の状態表示
        const rightEyeCenter = this.normalizePoint(landmarks[362]);
        this.ctx.fillStyle = rightEyeOpen ? '#00ff00' : '#ff0000';
        this.ctx.fillText(
            rightEyeOpen ? '開' : '閉', 
            rightEyeCenter.x + 30, 
            rightEyeCenter.y - 20
        );
        
        this.ctx.restore();
    }

    normalizePoint(point) {
        return {
            x: point.x * this.canvas.width,
            y: point.y * this.canvas.height
        };
    }

    getCurrentState() {
        return { ...this.currentState };
    }

    setEARThreshold(threshold) {
        this.earThreshold = Math.max(0.05, Math.min(0.3, threshold));
        console.log('EAR閾値を設定しました:', this.earThreshold);
    }

    getEARThreshold() {
        return this.earThreshold;
    }

    // 目の状態を文字列で取得
    getEyeStatus() {
        if (!this.currentState.faceDetected) {
            return '顔が検出されていません';
        }
        
        const leftOpen = this.currentState.leftEyeOpen;
        const rightOpen = this.currentState.rightEyeOpen;
        
        if (leftOpen && rightOpen) {
            return '両目を開いています';
        } else if (!leftOpen && !rightOpen) {
            return '両目を閉じています';
        } else if (leftOpen && !rightOpen) {
            return '左目のみ開いています';
        } else {
            return '右目のみ開いています';
        }
    }

    // デバッグ情報を取得
    getDebugInfo() {
        return {
            initialized: this.isInitialized,
            detecting: this.isDetecting,
            earThreshold: this.earThreshold,
            currentState: this.currentState,
            eyeStatus: this.getEyeStatus()
        };
    }
}