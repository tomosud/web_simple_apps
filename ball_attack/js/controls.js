// controls.js - クォータニオンベースのカメラコントロール
// 地球固定・カメラ自由回転（ジンバルロック回避）

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

        this.radius = radius + camOffset; // カメラ距離
        
        this.dragScale = dragScale;
        this.zoomMin = (radius + camOffset) * zoomMin;
        this.zoomMax = (radius + camOffset) * zoomMax;

        // 慣性システム
        this.velocity = { x: 0, y: 0 };
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
        this.velocity.x += forceX / this.mass;
        this.velocity.y += forceY / this.mass;

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
        // 初期位置（Z軸上）
        const position = new THREE.Vector3(0, 0, this.radius);
        
        // カメラの位置をクォータニオンで回転
        position.applyQuaternion(this.camera.quaternion);
        
        this.camera.position.copy(position);
        this.camera.lookAt(0, 0, 0);
    }

    reset() {
        this.radius = (this.zoomMax + this.zoomMin) * 0.5;
        
        // クォータニオンをリセット
        this.camera.quaternion.set(0, 0, 0, 1);
        
        // 物理状態もリセット
        this.velocity.x = 0;
        this.velocity.y = 0;
        
        this.updateCamera();
    }

    update() {
        // 慣性による減速
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;
        
        // 速度がある場合のみ回転を適用
        if (Math.abs(this.velocity.x) > 0.001 || Math.abs(this.velocity.y) > 0.001) {
            // シンプルなトラックボール：マウスの動きを3D回転軸に変換
            // 垂直ドラッグ → X軸回転（上下）
            // 水平ドラッグ → Y軸回転（左右）
            // 回転軸は画面に対して垂直
            const rotationAxis = new THREE.Vector3(-this.velocity.y, this.velocity.x, 0).normalize();
            const rotationAngle = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
            
            if (rotationAngle > 0) {
                const rotation = new THREE.Quaternion().setFromAxisAngle(rotationAxis, rotationAngle);
                this.camera.quaternion.multiplyQuaternions(rotation, this.camera.quaternion);
                
                // カメラ位置を更新
                this.updateCamera();
            }
        }
        
        // 微小な速度は停止
        if (Math.abs(this.velocity.x) < 0.001) this.velocity.x = 0;
        if (Math.abs(this.velocity.y) < 0.001) this.velocity.y = 0;
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

// 人工衛星の軌道制御クラス
class SatelliteOrbitControls {
    constructor(satellite, domElement, {
        orbitRadius = 1.3,
        dragScale = 0.005
    } = {}) {
        
        this.satellite = satellite;
        this.domElement = domElement;
        this.orbitRadius = orbitRadius;
        this.dragScale = dragScale;
        
        // 慣性システム（重い物理挙動）
        this.velocity = { x: 0, y: 0 };
        this.friction = 0.98;  // 摩擦を低く（長く滑る）
        this.mass = 100.0;     // 質量を適度に重く
        
        // 内部状態
        this._isDown = false;
        this._lastX = 0;
        this._lastY = 0;
        
        // 軌道の回転状態（クォータニオン）
        this.orbitRotation = new THREE.Quaternion();
        
        // イベント登録
        this._addEventListeners();
    }
    
    _addEventListeners() {
        this._onDown = e => this._pointerDown(e);
        this._onMove = e => this._pointerMove(e);
        this._onUp = () => this._pointerUp();
        
        this.domElement.addEventListener('mousedown', this._onDown);
        window.addEventListener('mousemove', this._onMove);
        window.addEventListener('mouseup', this._onUp);
        
        // タッチ対応
        this.domElement.addEventListener('touchstart', this._onDown, {passive: false});
        window.addEventListener('touchmove', this._onMove, {passive: false});
        window.addEventListener('touchend', this._onUp);
    }
    
    _pointerDown(e) {
        const {clientX, clientY} = (e.touches?.[0]) ?? e;
        this._isDown = true;
        this._lastX = clientX;
        this._lastY = clientY;
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
        this.velocity.x += forceX / this.mass;
        this.velocity.y += forceY / this.mass;
        
        this._lastX = clientX;
        this._lastY = clientY;
    }
    
    _pointerUp() {
        this._isDown = false;
    }
    
    update() {
        // 慣性による減速（重い物理挙動）
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;
        
        // より小さな閾値で動き続ける（重いものは微小な動きも継続）
        const threshold = 0.0001;
        
        // 速度がある場合のみ回転を適用
        if (Math.abs(this.velocity.x) > threshold || Math.abs(this.velocity.y) > threshold) {
            // 軌道回転をクォータニオンで実装
            // 水平ドラッグ → Y軸回転
            const rotationY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.velocity.x);
            // 垂直ドラッグ → X軸回転
            const rotationX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.velocity.y);
            
            // 軌道回転を適用
            this.orbitRotation.multiplyQuaternions(rotationY, this.orbitRotation);
            this.orbitRotation.multiplyQuaternions(rotationX, this.orbitRotation);
            
            // 人工衛星の位置を更新
            this.updateSatellitePosition();
        }
        
        // 微小な速度は停止（より小さな閾値）
        if (Math.abs(this.velocity.x) < threshold) this.velocity.x = 0;
        if (Math.abs(this.velocity.y) < threshold) this.velocity.y = 0;
    }
    
    updateSatellitePosition() {
        // 初期位置（Z軸上）
        const position = new THREE.Vector3(0, 0, this.orbitRadius);
        
        // 軌道回転を適用
        position.applyQuaternion(this.orbitRotation);
        
        // 人工衛星の位置を更新
        this.satellite.position.copy(position);
        
        // 人工衛星が地球の中心を向く（クォータニオンベース）
        // 初期向き（円錐の先端がZ軸負方向）
        const initialDirection = new THREE.Vector3(0, 0, -1);
        // 現在位置から原点への方向
        const targetDirection = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), position).normalize();
        
        // 初期向きから目標向きへの回転クォータニオンを計算
        const rotationQuaternion = new THREE.Quaternion().setFromUnitVectors(initialDirection, targetDirection);
        
        // 人工衛星の姿勢を更新
        this.satellite.quaternion.copy(rotationQuaternion);
    }
    
    reset() {
        // 軌道回転をリセット
        this.orbitRotation.set(0, 0, 0, 1);
        
        // 速度もリセット
        this.velocity.x = 0;
        this.velocity.y = 0;
        
        // 位置を更新
        this.updateSatellitePosition();
    }
    
    dispose() {
        this.domElement.removeEventListener('mousedown', this._onDown);
        window.removeEventListener('mousemove', this._onMove);
        window.removeEventListener('mouseup', this._onUp);
        
        this.domElement.removeEventListener('touchstart', this._onDown);
        window.removeEventListener('touchmove', this._onMove);
        window.removeEventListener('touchend', this._onUp);
    }
}