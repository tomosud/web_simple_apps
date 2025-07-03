// 緯度経度を3D座標に変換
function latLngToCartesian(lat, lng, radius = 1) {
    const phi = (90 - lat) * Math.PI / 180;
    const theta = (lng + 180) * Math.PI / 180;
    return new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
    );
}

// 3D座標を緯度経度に変換
function cartesianToLatLng(x, y, z, radius = 1) {
    const r = Math.sqrt(x * x + y * y + z * z);
    const lat = 90 - Math.acos(y / r) * 180 / Math.PI;
    const lng = Math.atan2(z, x) * 180 / Math.PI - 180;
    return { lat, lng };
}

// 球面上の2点間の距離を計算
function sphericalDistance(lat1, lng1, lat2, lng2) {
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lng2 - lng1) * Math.PI / 180;
    
    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return c;
}

// ランダムな範囲の値を生成
function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

// 角度を正規化 (-180 to 180)
function normalizeAngle(angle) {
    while (angle > 180) angle -= 360;
    while (angle < -180) angle += 360;
    return angle;
}

// 線形補間
function lerp(a, b, t) {
    return a + (b - a) * t;
}

// イージング関数
function easeOutQuad(t) {
    return t * (2 - t);
}

function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// 球面上のランダムな位置を生成
function randomSpherePoint() {
    const lat = randomRange(-90, 90);
    const lng = randomRange(-180, 180);
    return { lat, lng };
}

// パフォーマンス監視
class PerformanceMonitor {
    constructor() {
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fps = 0;
        this.frameTimeHistory = [];
        this.maxHistory = 60;
    }
    
    update() {
        const now = performance.now();
        const deltaTime = now - this.lastTime;
        this.lastTime = now;
        
        this.frameCount++;
        this.frameTimeHistory.push(deltaTime);
        
        if (this.frameTimeHistory.length > this.maxHistory) {
            this.frameTimeHistory.shift();
        }
        
        if (this.frameCount % 10 === 0) {
            const averageFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
            this.fps = Math.round(1000 / averageFrameTime);
        }
        
        return deltaTime;
    }
    
    getFPS() {
        return this.fps;
    }
}

// デバッグ用のログ出力
function debugLog(message, data = null) {
    if (window.DEBUG) {
        console.log(`[DEBUG] ${message}`, data);
    }
}

// エラーハンドリング
function handleError(error, context = '') {
    console.error(`[ERROR] ${context}:`, error);
}

// デバイス検出
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// リソース管理
class ResourceManager {
    constructor() {
        this.textures = new Map();
        this.geometries = new Map();
        this.materials = new Map();
    }
    
    loadTexture(url, onLoad = null, onError = null) {
        if (this.textures.has(url)) {
            return this.textures.get(url);
        }
        
        const loader = new THREE.TextureLoader();
        const texture = loader.load(url, onLoad, undefined, onError);
        this.textures.set(url, texture);
        return texture;
    }
    
    getGeometry(key) {
        return this.geometries.get(key);
    }
    
    setGeometry(key, geometry) {
        this.geometries.set(key, geometry);
    }
    
    getMaterial(key) {
        return this.materials.get(key);
    }
    
    setMaterial(key, material) {
        this.materials.set(key, material);
    }
    
    dispose() {
        this.textures.forEach(texture => texture.dispose());
        this.geometries.forEach(geometry => geometry.dispose());
        this.materials.forEach(material => material.dispose());
        
        this.textures.clear();
        this.geometries.clear();
        this.materials.clear();
    }
}

// グローバルなリソースマネージャー
const resourceManager = new ResourceManager();

// アニメーションのユーティリティクラス
class AnimationTween {
    constructor(from, to, duration, easing = easeOutQuad) {
        this.from = from;
        this.to = to;
        this.duration = duration;
        this.easing = easing;
        this.startTime = null;
        this.isComplete = false;
    }
    
    update(currentTime) {
        if (this.startTime === null) {
            this.startTime = currentTime;
        }
        
        const elapsed = currentTime - this.startTime;
        const progress = Math.min(elapsed / this.duration, 1);
        const easedProgress = this.easing(progress);
        
        const currentValue = this.from + (this.to - this.from) * easedProgress;
        
        if (progress >= 1) {
            this.isComplete = true;
        }
        
        return currentValue;
    }
}

window.DEBUG = false;