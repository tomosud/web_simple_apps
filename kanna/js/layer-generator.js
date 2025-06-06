// 3Dレイヤー生成機能

export class LayerGenerator {
    constructor(scene) {
        this.scene = scene;
        this.layers = [];
        this.originalImage = null;
    }
    
    // 深度マップから3Dレイヤーを生成
    async generateLayers(originalImageData, depthLayers, options = {}) {
        const {
            layerWidth = 2,
            layerHeight = 2,
            baseZ = 0,
            layerSpacing = 0.3
        } = options;
        
        this.clearLayers();
        
        try {
            // 元画像をテクスチャに変換
            const originalTexture = this.createTextureFromImageData(originalImageData);
            
            // 各深度レイヤーを3Dプレーンとして作成
            for (let i = 0; i < depthLayers.length; i++) {
                const layer = depthLayers[i];
                
                // レイヤーマスクからテクスチャを作成
                const layerTexture = this.createLayerTexture(
                    originalImageData, 
                    layer.mask, 
                    originalTexture
                );
                
                // 3Dプレーンを作成
                const mesh = this.createLayerMesh(
                    layerTexture, 
                    layerWidth, 
                    layerHeight,
                    baseZ + layer.zPosition
                );
                
                // シーンに追加
                this.scene.add(mesh);
                
                this.layers.push({
                    mesh: mesh,
                    depth: layer.depth,
                    zPosition: layer.zPosition
                });
            }
            
            console.log(`${this.layers.length}個のレイヤーを生成しました`);
            
        } catch (error) {
            console.error('レイヤー生成エラー:', error);
            throw error;
        }
    }
    
    // ImageDataからThree.jsテクスチャを作成
    createTextureFromImageData(imageData) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        
        ctx.putImageData(imageData, 0, 0);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.generateMipmaps = false;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.format = THREE.RGBAFormat;
        
        return texture;
    }
    
    // マスクを適用したレイヤーテクスチャを作成
    createLayerTexture(originalImageData, mask, originalTexture) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const { width, height, data } = originalImageData;
        
        canvas.width = width;
        canvas.height = height;
        
        // 新しいImageDataを作成（RGBA）
        const layerImageData = ctx.createImageData(width, height);
        const layerData = layerImageData.data;
        
        // マスクを適用して元画像からピクセルをコピー
        for (let i = 0; i < data.length; i += 4) {
            const pixelIndex = Math.floor(i / 4);
            const maskValue = mask[pixelIndex];
            const alpha = maskValue / 255.0;
            
            // RGB値をコピー
            layerData[i] = data[i];         // R
            layerData[i + 1] = data[i + 1]; // G
            layerData[i + 2] = data[i + 2]; // B
            layerData[i + 3] = Math.floor(alpha * 255); // A (マスクによる透明度)
        }
        
        // Canvasに描画
        ctx.putImageData(layerImageData, 0, 0);
        
        // Three.jsテクスチャを作成
        const texture = new THREE.CanvasTexture(canvas);
        texture.generateMipmaps = false;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.format = THREE.RGBAFormat;
        
        return texture;
    }
    
    // 3Dプレーンメッシュを作成
    createLayerMesh(texture, width, height, zPosition) {
        const geometry = new THREE.PlaneGeometry(width, height);
        
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.01, // 完全透明ピクセルを除外
            side: THREE.DoubleSide
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.z = zPosition;
        
        return mesh;
    }
    
    // 視差効果を適用
    applyParallax(offsetX, offsetY, parallaxStrength = 1.0) {
        this.layers.forEach((layer, index) => {
            const { mesh, depth } = layer;
            
            // 深度に応じて視差の強さを調整
            // 手前のレイヤー（depth = 1）ほど大きく動く
            const depthMultiplier = depth * parallaxStrength;
            
            mesh.position.x = offsetX * depthMultiplier;
            mesh.position.y = offsetY * depthMultiplier;
        });
    }
    
    // レイヤーの表示/非表示
    setLayersVisible(visible) {
        this.layers.forEach(layer => {
            layer.mesh.visible = visible;
        });
    }
    
    // レイヤーのクリア
    clearLayers() {
        this.layers.forEach(layer => {
            this.scene.remove(layer.mesh);
            
            // メモリ解放
            if (layer.mesh.material.map) {
                layer.mesh.material.map.dispose();
            }
            layer.mesh.material.dispose();
            layer.mesh.geometry.dispose();
        });
        
        this.layers = [];
    }
    
    // デバッグ表示：深度マップの可視化
    createDepthVisualization(depthMap) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const { data, width, height } = depthMap;
        
        canvas.width = width;
        canvas.height = height;
        
        const imageData = ctx.createImageData(width, height);
        const pixelData = imageData.data;
        
        // 深度値をグレースケール画像として可視化
        for (let i = 0; i < data.length; i++) {
            const depth = data[i];
            const pixelIndex = i * 4;
            
            pixelData[pixelIndex] = depth;     // R
            pixelData[pixelIndex + 1] = depth; // G
            pixelData[pixelIndex + 2] = depth; // B
            pixelData[pixelIndex + 3] = 255;   // A
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        // デバッグ用：Canvasを画面に表示
        canvas.style.position = 'absolute';
        canvas.style.top = '10px';
        canvas.style.right = '200px';
        canvas.style.width = '150px';
        canvas.style.height = '150px';
        canvas.style.border = '2px solid white';
        canvas.style.zIndex = '999';
        canvas.title = '深度マップ';
        
        return canvas;
    }
    
    // パフォーマンス最適化：LOD制御
    updateLOD(cameraDistance) {
        this.layers.forEach(layer => {
            const mesh = layer.mesh;
            
            // カメラとの距離に応じてテクスチャ解像度を調整
            if (cameraDistance > 5) {
                // 遠い場合は低解像度
                if (mesh.material.map) {
                    mesh.material.map.minFilter = THREE.NearestFilter;
                }
            } else {
                // 近い場合は高解像度
                if (mesh.material.map) {
                    mesh.material.map.minFilter = THREE.LinearFilter;
                }
            }
        });
    }
    
    // アニメーション効果：浮遊感
    animateFloating(time) {
        this.layers.forEach((layer, index) => {
            const { mesh, depth } = layer;
            
            // 深度に応じて浮遊の振幅と速度を変更
            const amplitude = 0.02 * depth;
            const frequency = 1 + index * 0.2;
            
            mesh.position.y += Math.sin(time * frequency) * amplitude;
        });
    }
    
    // 統計情報の取得
    getLayerStats() {
        return {
            layerCount: this.layers.length,
            totalVertices: this.layers.reduce((sum, layer) => {
                return sum + layer.mesh.geometry.attributes.position.count;
            }, 0),
            totalTriangles: this.layers.length * 2, // 各プレーンは2つの三角形
            memoryUsage: this.estimateMemoryUsage()
        };
    }
    
    estimateMemoryUsage() {
        let totalBytes = 0;
        
        this.layers.forEach(layer => {
            const mesh = layer.mesh;
            const texture = mesh.material.map;
            
            if (texture && texture.image) {
                // テクスチャサイズを推定（RGBA = 4バイト/ピクセル）
                const width = texture.image.width;
                const height = texture.image.height;
                totalBytes += width * height * 4;
            }
            
            // ジオメトリサイズ（頂点、UV、インデックス）
            totalBytes += mesh.geometry.attributes.position.count * 3 * 4; // position
            totalBytes += mesh.geometry.attributes.uv.count * 2 * 4; // UV
            totalBytes += mesh.geometry.index.count * 2; // index
        });
        
        return {
            bytes: totalBytes,
            megabytes: (totalBytes / (1024 * 1024)).toFixed(2)
        };
    }
}