class ArcballControls {
    constructor(earth, camera, renderer) {
        this.earth = earth;
        this.camera = camera;
        this.renderer = renderer;
        this.domElement = renderer.domElement;
        
        // アークボール状態
        this.isRotating = false;
        this.startVector = new THREE.Vector3();
        this.endVector = new THREE.Vector3();
        this.currentQuaternion = new THREE.Quaternion();
        
        // カメラ軌道
        this.distance = 2.5;
        this.minDistance = 1.5;
        this.maxDistance = 8.0;
        this.center = new THREE.Vector3(0, 0, 0);
        
        // 慣性システム（重い球を転がしている感覚）
        this.velocity = new THREE.Quaternion();
        this.damping = 0.985;  // 重い慣性（より長く回転継続）
        this.sensitivity = 1.2;  // 感度（適度な反応）
        
        // 画面サイズ
        this.screen = { width: 0, height: 0 };
        this.updateScreenSize();
        
        this.setupEventListeners();
        this.updateCamera();
    }
    
    updateScreenSize() {
        const rect = this.domElement.getBoundingClientRect();
        this.screen.width = rect.width;
        this.screen.height = rect.height;
    }
    
    // 2D画面座標を3D球面座標に変換（Ken Shoemakeアルゴリズム）
    screenToSphere(screenX, screenY) {
        // 画面座標を[-1, 1]の範囲に正規化
        const x = (2.0 * screenX - this.screen.width) / this.screen.width;
        const y = (this.screen.height - 2.0 * screenY) / this.screen.height;
        
        // 球面半径
        const radius = 1.0;
        const lengthSquared = x * x + y * y;
        
        let z;
        if (lengthSquared <= radius * radius * 0.5) {
            // 球の内側：実際の球面上の点
            z = Math.sqrt(radius * radius - lengthSquared);
        } else {
            // 球の外側：円盤平面に投影
            z = (radius * radius * 0.5) / Math.sqrt(lengthSquared);
        }
        
        // 正規化された3Dベクトルを返す
        const vector = new THREE.Vector3(x, y, z);
        return vector.normalize();
    }
    
    setupEventListeners() {
        this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
        
        // タッチ対応
        this.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
        this.domElement.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
        this.domElement.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });
        
        // ズーム
        this.domElement.addEventListener('wheel', this.onWheel.bind(this));
        
        // スクロール無効化
        this.domElement.style.touchAction = 'none';
    }
    
    onMouseDown(event) {
        event.preventDefault();
        
        this.isRotating = true;
        this.updateScreenSize();
        
        // ドラッグ開始点を球面上の点に変換
        this.startVector = this.screenToSphere(
            event.clientX - this.domElement.getBoundingClientRect().left,
            event.clientY - this.domElement.getBoundingClientRect().top
        );
    }
    
    onMouseMove(event) {
        if (!this.isRotating) return;
        event.preventDefault();
        
        // 現在の点を球面上の点に変換
        this.endVector = this.screenToSphere(
            event.clientX - this.domElement.getBoundingClientRect().left,
            event.clientY - this.domElement.getBoundingClientRect().top
        );
        
        // 回転を計算して適用
        this.rotate();
    }
    
    onMouseUp(event) {
        event.preventDefault();
        this.isRotating = false;
    }
    
    // タッチイベント（マウスイベントと同じロジック）
    onTouchStart(event) {
        event.preventDefault();
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            this.isRotating = true;
            this.updateScreenSize();
            
            this.startVector = this.screenToSphere(
                touch.clientX - this.domElement.getBoundingClientRect().left,
                touch.clientY - this.domElement.getBoundingClientRect().top
            );
        }
    }
    
    onTouchMove(event) {
        event.preventDefault();
        if (event.touches.length === 1 && this.isRotating) {
            const touch = event.touches[0];
            
            this.endVector = this.screenToSphere(
                touch.clientX - this.domElement.getBoundingClientRect().left,
                touch.clientY - this.domElement.getBoundingClientRect().top
            );
            
            this.rotate();
        }
    }
    
    onTouchEnd(event) {
        event.preventDefault();
        this.isRotating = false;
    }
    
    onWheel(event) {
        event.preventDefault();
        
        const delta = event.deltaY * 0.002;  // より滑らかなズーム
        this.distance += delta;
        this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance));
        
        this.updateCamera();
    }
    
    // アークボール回転の核心（Ken Shoemakeアルゴリズム）
    rotate() {
        // 開始点と終了点の内積（回転角のcos）
        const dot = this.startVector.dot(this.endVector);
        
        // 回転が必要かチェック
        if (Math.abs(dot - 1.0) < 0.000001) {
            return; // 回転なし
        }
        
        // 回転軸（外積）
        const axis = new THREE.Vector3();
        axis.crossVectors(this.startVector, this.endVector).normalize();
        
        // 回転角度
        const angle = Math.acos(Math.max(-1, Math.min(1, dot))) * this.sensitivity;
        
        // クォータニオンで回転を表現
        const quaternion = new THREE.Quaternion();
        quaternion.setFromAxisAngle(axis, angle);
        
        // 慣性用の速度を記録（重い球の感覚）
        this.velocity.slerp(quaternion, 0.1);
        
        // 既存の回転に追加
        this.currentQuaternion.multiplyQuaternions(quaternion, this.currentQuaternion);
        this.currentQuaternion.normalize();
        
        // カメラ更新
        this.updateCamera();
        
        // 次の回転のために開始点を更新
        this.startVector.copy(this.endVector);
    }
    
    updateCamera() {
        // 初期カメラ位置（Z軸正方向）
        const position = new THREE.Vector3(0, 0, this.distance);
        
        // クォータニオン回転を適用
        position.applyQuaternion(this.currentQuaternion);
        
        // カメラ位置とターゲットを設定
        this.camera.position.copy(position);
        this.camera.lookAt(this.center);
    }
    
    update() {
        // 慣性による回転（重い球の感覚）
        if (!this.isRotating && this.velocity.length() > 0.0001) {
            // クォータニオンで慣性回転
            this.currentQuaternion.multiplyQuaternions(this.velocity, this.currentQuaternion);
            this.currentQuaternion.normalize();
            
            // 速度減衰（重い球のようにゆっくり停止）
            this.velocity.slerp(new THREE.Quaternion(), 1 - this.damping);
            
            this.updateCamera();
        }
    }
    
    reset() {
        this.currentQuaternion.set(0, 0, 0, 1); // 単位クォータニオン
        this.distance = 2.5;
        this.velocity.set(0, 0, 0, 1);
        this.updateCamera();
    }
    
    dispose() {
        this.domElement.removeEventListener('mousedown', this.onMouseDown);
        this.domElement.removeEventListener('mousemove', this.onMouseMove);
        this.domElement.removeEventListener('mouseup', this.onMouseUp);
        this.domElement.removeEventListener('touchstart', this.onTouchStart);
        this.domElement.removeEventListener('touchmove', this.onTouchMove);
        this.domElement.removeEventListener('touchend', this.onTouchEnd);
        this.domElement.removeEventListener('wheel', this.onWheel);
    }
    
    dispose() {
        this.domElement.removeEventListener('mousedown', this.onPointerDown);
        this.domElement.removeEventListener('mousemove', this.onPointerMove);
        this.domElement.removeEventListener('mouseup', this.onPointerUp);
        this.domElement.removeEventListener('touchstart', this.onPointerDown);
        this.domElement.removeEventListener('touchmove', this.onPointerMove);
        this.domElement.removeEventListener('touchend', this.onPointerUp);
        this.domElement.removeEventListener('wheel', this.onWheel);
    }
}