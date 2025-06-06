// AI深度推定機能

export class DepthEstimator {
    constructor() {
        this.model = null;
        this.isLoaded = false;
        this.isProcessing = false;
        
        this.progressCallback = null;
        this.targetSize = 256; // MiDaSの推奨サイズ
    }
    
    // 進捗コールバック設定
    setProgressCallback(callback) {
        this.progressCallback = callback;
    }
    
    updateProgress(progress, message) {
        if (this.progressCallback) {
            this.progressCallback(progress, message);
        }
    }
    
    // TensorFlow.jsとモデルの初期化
    async initialize() {
        try {
            this.updateProgress(10, 'TensorFlow.js 初期化中...');
            
            // TensorFlow.js動的ロード
            if (!window.tf) {
                await this.loadTensorFlow();
            }
            
            this.updateProgress(30, 'バックエンド設定中...');
            
            // バックエンド設定（WebGPU → WebGL フォールバック）
            await this.setupBackend();
            
            this.updateProgress(50, '深度推定モデル読み込み中...');
            
            // 深度推定モデルの読み込み
            await this.loadDepthModel();
            
            this.updateProgress(90, '初期化完了...');
            
            this.isLoaded = true;
            this.updateProgress(100, '準備完了');
            
            return true;
            
        } catch (error) {
            console.error('AI初期化エラー:', error);
            this.updateProgress(0, 'エラー: ' + error.message);
            return false;
        }
    }
    
    async loadTensorFlow() {
        // TensorFlow.js CDN読み込み
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.15.0/dist/tf.min.js';
        
        return new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    async setupBackend() {
        try {
            // WebGPUバックエンドを試行
            await tf.setBackend('webgpu');
            await tf.ready();
            console.log('WebGPUバックエンドを使用');
        } catch (error) {
            console.log('WebGPU不対応、WebGLを使用:', error);
            try {
                await tf.setBackend('webgl');
                await tf.ready();
                console.log('WebGLバックエンドを使用');
            } catch (webglError) {
                console.warn('WebGL不対応、CPUを使用:', webglError);
                await tf.setBackend('cpu');
                await tf.ready();
            }
        }
    }
    
    async loadDepthModel() {
        try {
            // 軽量なMiDaSモデルを使用（実際のURLは要調整）
            // 本来なら @tensorflow-models/depth-estimation を使うが、
            // ここでは簡易版として直接モデルを読み込む想定
            
            // 仮のモデルURL（実際の運用では適切なMiDaSモデルのURLに変更）
            const modelUrl = 'https://tfhub.dev/intel/midas/v2_1_small/1';
            
            // 実際にはこのような形でモデルを読み込み
            // this.model = await tf.loadGraphModel(modelUrl);
            
            // 開発用：ダミーモデル（実際の深度推定なし）
            this.model = this.createDummyModel();
            
            console.log('深度推定モデル読み込み完了');
            
        } catch (error) {
            console.error('モデル読み込みエラー:', error);
            // フォールバック：ダミーモデル
            this.model = this.createDummyModel();
            console.log('ダミーモデルを使用');
        }
    }
    
    // 開発用ダミーモデル
    createDummyModel() {
        return {
            predict: (input) => {
                // 入力と同じサイズの深度マップを生成（中央が近く、周辺が遠い）
                const [batch, height, width, channels] = input.shape;
                
                const centerX = width / 2;
                const centerY = height / 2;
                const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
                
                const depthData = new Float32Array(height * width);
                
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const dx = x - centerX;
                        const dy = y - centerY;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        const normalizedDistance = distance / maxDistance;
                        
                        // 中央が0（近い）、周辺が1（遠い）
                        depthData[y * width + x] = Math.min(normalizedDistance, 1.0);
                    }
                }
                
                return tf.tensor3d(depthData, [height, width, 1]);
            }
        };
    }
    
    // 画像から深度マップを推定
    async estimateDepth(imageData) {
        if (!this.isLoaded || this.isProcessing) {
            throw new Error('モデルが準備できていません');
        }
        
        this.isProcessing = true;
        
        try {
            this.updateProgress(0, '画像前処理中...');
            
            // ImageDataをTensorに変換
            const inputTensor = this.preprocessImage(imageData);
            
            this.updateProgress(30, '深度推定実行中...');
            
            // 深度推定実行
            const depthTensor = this.model.predict(inputTensor);
            
            this.updateProgress(70, '後処理中...');
            
            // 結果の後処理
            const depthMap = await this.postprocessDepth(depthTensor);
            
            this.updateProgress(90, 'メモリ解放中...');
            
            // メモリ解放
            inputTensor.dispose();
            depthTensor.dispose();
            
            this.updateProgress(100, '深度推定完了');
            
            return depthMap;
            
        } catch (error) {
            console.error('深度推定エラー:', error);
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }
    
    preprocessImage(imageData) {
        // ImageDataをRGB正規化してTensorに変換
        const { width, height, data } = imageData;
        
        // RGB値を0-1に正規化
        const normalizedData = new Float32Array(width * height * 3);
        
        for (let i = 0; i < data.length; i += 4) {
            const pixelIndex = Math.floor(i / 4);
            normalizedData[pixelIndex * 3] = data[i] / 255.0;         // R
            normalizedData[pixelIndex * 3 + 1] = data[i + 1] / 255.0; // G
            normalizedData[pixelIndex * 3 + 2] = data[i + 2] / 255.0; // B
        }
        
        // バッチ次元を追加 [1, height, width, 3]
        return tf.tensor4d(normalizedData, [1, height, width, 3]);
    }
    
    async postprocessDepth(depthTensor) {
        // Tensorを配列に変換
        const depthArray = await depthTensor.data();
        const shape = depthTensor.shape;
        
        const height = shape[0];
        const width = shape[1];
        
        // ヒストグラム均一化（簡易版）
        const sortedDepths = [...depthArray].sort((a, b) => a - b);
        const minDepth = sortedDepths[0];
        const maxDepth = sortedDepths[sortedDepths.length - 1];
        const range = maxDepth - minDepth;
        
        // 0-255の範囲に正規化
        const normalizedDepths = new Uint8Array(depthArray.length);
        
        for (let i = 0; i < depthArray.length; i++) {
            const normalized = range > 0 ? (depthArray[i] - minDepth) / range : 0;
            normalizedDepths[i] = Math.floor(normalized * 255);
        }
        
        return {
            data: normalizedDepths,
            width: width,
            height: height
        };
    }
    
    // 深度マップを複数レイヤーに分割
    generateLayers(depthMap, numLayers = 3) {
        const { data, width, height } = depthMap;
        const layers = [];
        
        // 深度値を等分割
        const depthStep = 255 / numLayers;
        
        for (let layerIndex = 0; layerIndex < numLayers; layerIndex++) {
            const minDepth = layerIndex * depthStep;
            const maxDepth = (layerIndex + 1) * depthStep;
            
            // このレイヤーのマスクを作成
            const mask = new Uint8Array(data.length);
            
            for (let i = 0; i < data.length; i++) {
                const depth = data[i];
                if (depth >= minDepth && depth < maxDepth) {
                    mask[i] = 255; // このピクセルはこのレイヤーに含む
                } else {
                    mask[i] = 0;   // このピクセルは除外
                }
            }
            
            // ガウシアンブラーでエッジをソフトに
            const blurredMask = this.gaussianBlur(mask, width, height, 1);
            
            layers.push({
                mask: blurredMask,
                depth: layerIndex / (numLayers - 1), // 0-1の深度値
                zPosition: -layerIndex * 0.3 // Z座標（後景ほど奥）
            });
        }
        
        return layers;
    }
    
    // 簡易ガウシアンブラー
    gaussianBlur(data, width, height, radius) {
        const blurred = new Uint8Array(data.length);
        const kernel = this.createGaussianKernel(radius);
        const kernelSize = kernel.length;
        const halfKernel = Math.floor(kernelSize / 2);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let sum = 0;
                let weightSum = 0;
                
                for (let ky = -halfKernel; ky <= halfKernel; ky++) {
                    for (let kx = -halfKernel; kx <= halfKernel; kx++) {
                        const px = Math.max(0, Math.min(width - 1, x + kx));
                        const py = Math.max(0, Math.min(height - 1, y + ky));
                        
                        const weight = kernel[ky + halfKernel] * kernel[kx + halfKernel];
                        sum += data[py * width + px] * weight;
                        weightSum += weight;
                    }
                }
                
                blurred[y * width + x] = weightSum > 0 ? sum / weightSum : 0;
            }
        }
        
        return blurred;
    }
    
    createGaussianKernel(radius) {
        const size = radius * 2 + 1;
        const kernel = new Array(size);
        const sigma = radius / 3;
        let sum = 0;
        
        for (let i = 0; i < size; i++) {
            const x = i - radius;
            kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
            sum += kernel[i];
        }
        
        // 正規化
        for (let i = 0; i < size; i++) {
            kernel[i] /= sum;
        }
        
        return kernel;
    }
}