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
        // lookAtは使わない（クォータニオンで姿勢制御）
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

// 軌道球の回転制御クラス
class SatelliteOrbitControls {
    constructor(orbitSphere, domElement, {
        orbitRadius = 1.3,
        dragScale = 0.005,
        camera = null,
        gameInstance = null,
        soundSystem = null
    } = {}) {
        
        this.orbitSphere = orbitSphere;
        this.domElement = domElement;
        this.camera = camera;
        this.gameInstance = gameInstance;
        this.soundSystem = soundSystem;
        this.orbitRadius = orbitRadius;
        this.dragScale = dragScale;
        
        // 慣性システム（重い物理挙動）
        this.velocity = { x: 0, y: 0 };
        this.baseFriction = 0.98;      // 基本摩擦
        this.mass = 100.0;             // 質量を適度に重く
        
        // 速度依存摩擦システム
        this.frictionStrength = 0.08;  // 追加摩擦の強さ（弱く）
        
        // ズーム（軌道半径）システム
        this.targetRadius = this.orbitRadius;  // 目標半径
        this.radiusVelocity = 0;               // 半径変化の速度
        this.radiusFriction = 0.9;             // 半径変化の摩擦
        this.radiusMass = 20.0;                // 半径変化の質量（慣性）
        this.minRadius = 1.1;                  // 最小半径
        this.maxRadius = 3.0;                  // 最大半径
        
        // 内部状態
        this._isDown = false;
        this._lastX = 0;
        this._lastY = 0;
        this._hasMoved = false;  // ドラッグ判定用
        
        // 軌道の回転状態（クォータニオン）
        this.orbitRotation = new THREE.Quaternion();
        
        // イベント登録
        this._addEventListeners();
    }
    
    _addEventListeners() {
        this._onDown = e => this._pointerDown(e);
        this._onMove = e => this._pointerMove(e);
        this._onUp = () => this._pointerUp();
        this._onClick = e => this._handleClick(e);
        this._onWheel = e => this._handleWheel(e);
        
        this.domElement.addEventListener('mousedown', this._onDown);
        window.addEventListener('mousemove', this._onMove);
        window.addEventListener('mouseup', this._onUp);
        this.domElement.addEventListener('click', this._onClick);
        this.domElement.addEventListener('wheel', this._onWheel, {passive: false});
        
        // タッチ対応（ピンチジェスチャ含む）
        this.domElement.addEventListener('touchstart', this._onDown, {passive: false});
        window.addEventListener('touchmove', this._onMove, {passive: false});
        window.addEventListener('touchend', this._onUp);
        
        // ピンチジェスチャ用
        this._lastTouchDistance = 0;
    }
    
    _pointerDown(e) {
        // ピンチジェスチャの場合
        if (e.touches && e.touches.length === 2) {
            this._isDown = false;  // 通常のドラッグを無効化
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            this._lastTouchDistance = Math.sqrt(
                Math.pow(touch2.clientX - touch1.clientX, 2) +
                Math.pow(touch2.clientY - touch1.clientY, 2)
            );
            return;
        }
        
        const {clientX, clientY} = (e.touches?.[0]) ?? e;
        this._isDown = true;
        this._lastX = clientX;
        this._lastY = clientY;
        this._hasMoved = false;  // ドラッグ開始時はリセット
    }
    
    _pointerMove(e) {
        e.preventDefault();
        
        // ピンチジェスチャの処理
        if (e.touches && e.touches.length === 2) {
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const currentDistance = Math.sqrt(
                Math.pow(touch2.clientX - touch1.clientX, 2) +
                Math.pow(touch2.clientY - touch1.clientY, 2)
            );
            
            if (this._lastTouchDistance > 0) {
                const distanceChange = currentDistance - this._lastTouchDistance;
                // ピンチイン/アウトで半径変更
                const force = -distanceChange * 0.001;  // 感度調整
                this.radiusVelocity += force / this.radiusMass;
            }
            
            this._lastTouchDistance = currentDistance;
            return;
        }
        
        if (!this._isDown) return;
        
        const {clientX, clientY} = (e.touches?.[0]) ?? e;
        const dX = clientX - this._lastX;
        const dY = clientY - this._lastY;
        
        // ドラッグ判定（少しでも動いたらドラッグとみなす）
        if (Math.abs(dX) > 2 || Math.abs(dY) > 2) {
            this._hasMoved = true;
        }
        
        // 現在の速度を計算
        const currentSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
        
        // 速度に応じて乗算値を調整（動いてるときは加算的、止まってるときは弱く）
        const speedFactor = currentSpeed > 0.001 ? 0.2 : 0.1;  // 動いてる時は0.2、止まってる時は0.1（半分）
        
        // ドラッグ力を計算
        const forceX = (-dX * this.dragScale * speedFactor);
        const forceY = (dY * this.dragScale * speedFactor);
        
        // 力を速度に適用
        this.velocity.x += forceX / this.mass;
        this.velocity.y += forceY / this.mass;
        
        this._lastX = clientX;
        this._lastY = clientY;
    }
    
    _pointerUp() {
        this._isDown = false;
    }
    
    _handleClick(e) {
        // ドラッグではなくクリックの場合のみ実行
        if (!this._hasMoved) {
            // 速度を徐々に減衰させて停止
            this.velocity.x *= 0.7;
            this.velocity.y *= 0.7;
            
            // 微小な速度は即座に停止
            if (Math.abs(this.velocity.x) < 0.01) this.velocity.x = 0;
            if (Math.abs(this.velocity.y) < 0.01) this.velocity.y = 0;
        }
    }
    
    _handleWheel(e) {
        e.preventDefault();
        
        // ホイールの回転量に応じて半径を変更（速度を3倍に）
        const force = e.deltaY * 0.0003;  // 感度を3倍に変更（0.0001 → 0.0003）
        this.radiusVelocity += force / this.radiusMass;
    }
    
    update() {
        // 軌道半径の慣性システム
        this.radiusVelocity *= this.radiusFriction;
        this.orbitRadius += this.radiusVelocity;
        this.orbitRadius = THREE.MathUtils.clamp(this.orbitRadius, this.minRadius, this.maxRadius);
        
        // 微小な半径変化速度は停止
        if (Math.abs(this.radiusVelocity) < 0.001) this.radiusVelocity = 0;
        
        // 現在の速度を計算
        const currentSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
        
        // 低速域での摩擦（一定速度以下で徐々に止まる）
        const lowSpeedThreshold = 0.0025;  // この速度以下で摩擦が働く（半分に変更）
        if (currentSpeed < lowSpeedThreshold && currentSpeed > 0) {
            const friction = 0.95;  // 低速時の摩擦
            this.velocity.x *= friction;
            this.velocity.y *= friction;
        }
        
        // より小さな閾値で動き続ける
        const threshold = 0.0001;
        
        // 速度がある場合のみ回転を適用
        if (Math.abs(this.velocity.x) > threshold || Math.abs(this.velocity.y) > threshold) {
            // モード別入力切り替えでシンプル解決
            const isDebugMode = this.gameInstance ? this.gameInstance.debugMode : true;
            
            let adjustedVelocityX = this.velocity.x;
            let adjustedVelocityY = this.velocity.y;
            
            if (isDebugMode) {
                // 人工衛星モード：上下のみ反転
                adjustedVelocityY = -this.velocity.y;
            } else {
                // カメラモード：左右のみ反転
                adjustedVelocityX = -this.velocity.x;
            }
            
            // スクリーンスペース固定の直感的操作：カメラ座標系ベース
            if (this.camera) {
                // カメラの左右軸（スクリーンX軸）
                const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
                // カメラの上下軸（スクリーンY軸）
                const cameraUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
                
                // 水平ドラッグ（左右）→ カメラの上下軸回転
                const rotationHorizontal = new THREE.Quaternion().setFromAxisAngle(cameraUp, -adjustedVelocityX);
                // 垂直ドラッグ（上下）→ カメラの左右軸回転
                const rotationVertical = new THREE.Quaternion().setFromAxisAngle(cameraRight, -adjustedVelocityY);
                
                // 軌道回転を適用（カメラ座標系ベース）
                this.orbitRotation.multiplyQuaternions(rotationHorizontal, this.orbitRotation);
                this.orbitRotation.multiplyQuaternions(rotationVertical, this.orbitRotation);
            } else {
                // フォールバック：ワールド座標系ベース
                const rotationY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -adjustedVelocityX);
                const rotationX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -adjustedVelocityY);
                this.orbitRotation.multiplyQuaternions(rotationY, this.orbitRotation);
                this.orbitRotation.multiplyQuaternions(rotationX, this.orbitRotation);
            }
            
            // 軌道球の回転を直接適用
            this.orbitSphere.quaternion.copy(this.orbitRotation);
        }
        
        // 半径が変わった場合、人工衛星の位置を更新
        if (Math.abs(this.radiusVelocity) > 0.001) {
            this.updateOrbitRadius();
        }
        
        // 微小な速度は停止
        if (Math.abs(this.velocity.x) < threshold) this.velocity.x = 0;
        if (Math.abs(this.velocity.y) < threshold) this.velocity.y = 0;
    }
    
    updateOrbitRadius() {
        // 軌道球内の人工衛星の位置を更新（Z軸上の距離を変更）
        const satellite = this.orbitSphere.children.find(child => child.geometry && child.geometry.type === 'ConeGeometry');
        if (satellite) {
            satellite.position.setZ(this.orbitRadius);
        }
        
        // カメラマウントの位置も更新（人工衛星より少し地球側）
        const cameraMount = this.orbitSphere.children.find(child => !child.geometry);
        if (cameraMount) {
            cameraMount.position.setZ(this.orbitRadius - 0.2);
        }
    }
    
    reset() {
        // 軌道回転をリセット
        this.orbitRotation.set(0, 0, 0, 1);
        this.orbitSphere.quaternion.copy(this.orbitRotation);
        
        // 速度もリセット
        this.velocity.x = 0;
        this.velocity.y = 0;
        
        // 半径もリセット
        this.orbitRadius = 1.3;
        this.radiusVelocity = 0;
        
        // 位置を更新
        this.updateOrbitRadius();
    }
    
    dispose() {
        this.domElement.removeEventListener('mousedown', this._onDown);
        window.removeEventListener('mousemove', this._onMove);
        window.removeEventListener('mouseup', this._onUp);
        this.domElement.removeEventListener('click', this._onClick);
        this.domElement.removeEventListener('wheel', this._onWheel);
        
        this.domElement.removeEventListener('touchstart', this._onDown);
        window.removeEventListener('touchmove', this._onMove);
        window.removeEventListener('touchend', this._onUp);
    }
}