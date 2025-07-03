class SimpleEarthControls {
    constructor(earth, camera, renderer) {
        this.earth = earth;
        this.camera = camera;
        this.renderer = renderer;
        this.domElement = renderer.domElement;
        
        // シンプルな状態管理
        this.isPointerDown = false;
        this.lastPointer = new THREE.Vector2();
        
        // カメラ位置（球面上の3Dベクトル）
        this.cameraPosition = new THREE.Vector3(0, 0, 2.5);
        this.targetDistance = 2.5;
        this.minDistance = 1.5;
        this.maxDistance = 8.0;
        
        // 慣性
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.damping = 0.95;
        this.sensitivity = 0.005;
        
        this.setupEventListeners();
        this.updateCamera();
    }
    
    setupEventListeners() {
        // マウス/タッチ統合イベント
        this.domElement.addEventListener('mousedown', this.onPointerDown.bind(this));
        this.domElement.addEventListener('mousemove', this.onPointerMove.bind(this));
        this.domElement.addEventListener('mouseup', this.onPointerUp.bind(this));
        
        // タッチイベント（passive: false）
        this.domElement.addEventListener('touchstart', this.onPointerDown.bind(this), { passive: false });
        this.domElement.addEventListener('touchmove', this.onPointerMove.bind(this), { passive: false });
        this.domElement.addEventListener('touchend', this.onPointerUp.bind(this), { passive: false });
        
        // ズーム
        this.domElement.addEventListener('wheel', this.onWheel.bind(this));
        
        // スクロール無効化
        this.domElement.addEventListener('contextmenu', e => e.preventDefault());
        this.domElement.style.touchAction = 'none';
    }
    
    onPointerDown(event) {
        event.preventDefault();
        
        this.isPointerDown = true;
        this.velocity.set(0, 0, 0); // 慣性をリセット
        
        // タッチとマウス両方に対応
        const clientX = event.clientX || (event.touches && event.touches[0].clientX);
        const clientY = event.clientY || (event.touches && event.touches[0].clientY);
        
        const rect = this.domElement.getBoundingClientRect();
        this.lastPointer.set(
            clientX - rect.left,
            clientY - rect.top
        );
    }
    
    onPointerMove(event) {
        if (!this.isPointerDown) return;
        event.preventDefault();
        
        // タッチとマウス両方に対応
        const clientX = event.clientX || (event.touches && event.touches[0].clientX);
        const clientY = event.clientY || (event.touches && event.touches[0].clientY);
        
        const rect = this.domElement.getBoundingClientRect();
        const currentPointer = new THREE.Vector2(
            clientX - rect.left,
            clientY - rect.top
        );
        
        // ドラッグ量を計算
        const deltaX = currentPointer.x - this.lastPointer.x;
        const deltaY = currentPointer.y - this.lastPointer.y;
        
        // 球面上でカメラを移動
        this.rotateCameraOnSphere(deltaX, deltaY);
        
        this.lastPointer.copy(currentPointer);
    }
    
    onPointerUp(event) {
        event.preventDefault();
        this.isPointerDown = false;
    }
    
    onWheel(event) {
        event.preventDefault();
        
        const delta = event.deltaY * 0.001;
        this.targetDistance += delta;
        this.targetDistance = Math.max(
            this.minDistance,
            Math.min(this.maxDistance, this.targetDistance)
        );
    }
    
    rotateCameraOnSphere(deltaX, deltaY) {
        // 現在のカメラ位置での接線ベクトルを計算
        const right = new THREE.Vector3();
        const up = new THREE.Vector3();
        
        // 右ベクトル = カメラ位置 × 上方向（Y軸）
        right.crossVectors(this.cameraPosition, new THREE.Vector3(0, 1, 0)).normalize();
        
        // 上ベクトル = 右ベクトル × カメラ位置
        up.crossVectors(right, this.cameraPosition).normalize();
        
        // ドラッグに応じた移動ベクトル
        const movement = new THREE.Vector3();
        movement.addScaledVector(right, deltaX * this.sensitivity);     // 横移動
        movement.addScaledVector(up, -deltaY * this.sensitivity);       // 縦移動（直感的）
        
        // カメラ位置を移動
        this.cameraPosition.add(movement);
        
        // 球面に投影（距離を保持）
        this.cameraPosition.setLength(this.targetDistance);
        
        // 慣性用の速度を記録
        this.velocity.copy(movement).multiplyScalar(10);
        
        // カメラ更新
        this.updateCamera();
    }
    
    update() {
        // 慣性による回転
        if (!this.isPointerDown && this.velocity.length() > 0.0001) {
            this.cameraPosition.add(this.velocity);
            this.cameraPosition.setLength(this.targetDistance);
            
            // 速度減衰
            this.velocity.multiplyScalar(this.damping);
            
            this.updateCamera();
        }
        
        // ズームの滑らかな変更
        const currentDistance = this.cameraPosition.length();
        if (Math.abs(currentDistance - this.targetDistance) > 0.01) {
            const newDistance = THREE.MathUtils.lerp(currentDistance, this.targetDistance, 0.1);
            this.cameraPosition.setLength(newDistance);
            this.updateCamera();
        }
    }
    
    updateCamera() {
        // カメラ位置を設定
        this.camera.position.copy(this.cameraPosition);
        
        // カメラを地球の中心に向ける
        this.camera.lookAt(0, 0, 0);
    }
    
    reset() {
        this.cameraPosition.set(0, 0, 2.5);
        this.targetDistance = 2.5;
        this.velocity.set(0, 0, 0);
        this.updateCamera();
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