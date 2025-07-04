// controls.js - シンプルなトラックボール風カメラコントロール
// 地球固定・カメラ自由回転（制限なし）

class GlobeDragCameraControls {

    constructor(camera, domElement, {
        radius      = 1.0,    // 地球半径
        camOffset   = 0.5,    // 地表からの高さ
        dragScale   = 0.005,  // ドラッグ感度
        zoomMin     = 0.2,    // 最小ズーム (radius 倍)
        zoomMax     = 3.0     // 最大ズーム
    } = {}) {

        this.camera      = camera;
        this.domElement  = domElement;

        this.theta = 0;     // 水平角度 (経度)
        this.phi   = 0;     // 垂直角度 (緯度)
        this.radius = radius + camOffset; // カメラ距離
        
        this.dragScale = dragScale;
        this.zoomMin = (radius + camOffset) * zoomMin;
        this.zoomMax = (radius + camOffset) * zoomMax;

        // 慣性システム
        this.velocity = { theta: 0, phi: 0 };
        this.friction = 0.95;
        this.mass = 3.0;

        // 内部状態
        this._isDown = false;
        this._lastX  = 0;
        this._lastY  = 0;

        // イベント登録
        this._addEventListeners();

        // 初期位置を計算
        this.updateCamera();
    }

    _addEventListeners() {
        this._onDown  = e => this._pointerDown(e);
        this._onMove  = e => this._pointerMove(e);
        this._onUp    = () => this._pointerUp();
        this._onWheel = e => this._wheel(e);

        this.domElement.addEventListener('mousedown', this._onDown);
        window.addEventListener('mousemove', this._onMove);
        window.addEventListener('mouseup',   this._onUp);

        // タッチ対応
        this.domElement.addEventListener('touchstart', this._onDown, {passive:false});
        window.addEventListener('touchmove',  this._onMove, {passive:false});
        window.addEventListener('touchend',   this._onUp);

        // ホイール対応
        this.domElement.addEventListener('wheel', this._onWheel);
    }

    _pointerDown(e) {
        const {clientX, clientY} = (e.touches?.[0]) ?? e;
        this._isDown = true;
        this._lastX  = clientX;
        this._lastY  = clientY;
    }

    _pointerMove(e) {
        if (!this._isDown) return;
        e.preventDefault();

        const {clientX, clientY} = (e.touches?.[0]) ?? e;
        const dX = clientX - this._lastX;
        const dY = clientY - this._lastY;

        // ドラッグ力を速度に変換
        const forceX = -dX * this.dragScale;
        const forceY = dY * this.dragScale;

        // 速度に加算
        this.velocity.theta += forceX / this.mass;
        this.velocity.phi += forceY / this.mass;

        this._lastX = clientX;
        this._lastY = clientY;
    }

    _pointerUp() {
        this._isDown = false;
    }

    _wheel(e) {
        e.preventDefault();
        this.radius += e.deltaY * 0.002;
        this.radius = THREE.MathUtils.clamp(this.radius, this.zoomMin, this.zoomMax);
        this.updateCamera();
    }

    updateCamera() {
        // 球面座標系でカメラ位置を計算
        const r = this.radius;
        const x = r * Math.cos(this.phi) * Math.cos(this.theta);
        const y = r * Math.sin(this.phi);
        const z = r * Math.cos(this.phi) * Math.sin(this.theta);

        this.camera.position.set(x, y, z);
        this.camera.lookAt(0, 0, 0);
    }

    reset() {
        this.theta = 0;
        this.phi = 0;
        this.radius = (this.zoomMax + this.zoomMin) * 0.5;
        
        // 物理状態もリセット
        this.velocity.theta = 0;
        this.velocity.phi = 0;
        
        this.updateCamera();
    }

    update() {
        // 慣性による減速
        this.velocity.theta *= this.friction;
        this.velocity.phi *= this.friction;
        
        // 位置を更新
        this.theta += this.velocity.theta;
        this.phi += this.velocity.phi;
        
        // phiを制限して極付近での反転を防ぐ
        const epsilon = 0.01;
        this.phi = THREE.MathUtils.clamp(this.phi, -Math.PI/2 + epsilon, Math.PI/2 - epsilon);
        
        // カメラ位置を更新
        this.updateCamera();
        
        // 微小な速度は停止
        if (Math.abs(this.velocity.theta) < 0.001) this.velocity.theta = 0;
        if (Math.abs(this.velocity.phi) < 0.001) this.velocity.phi = 0;
    }

    dispose() {
        this.domElement.removeEventListener('mousedown', this._onDown);
        window.removeEventListener('mousemove', this._onMove);
        window.removeEventListener('mouseup',   this._onUp);

        this.domElement.removeEventListener('touchstart', this._onDown);
        window.removeEventListener('touchmove',  this._onMove);
        window.removeEventListener('touchend',   this._onUp);
        
        this.domElement.removeEventListener('wheel', this._onWheel);
    }
}