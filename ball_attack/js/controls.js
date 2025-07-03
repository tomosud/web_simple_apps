class EarthControls {
    constructor(earth, camera, renderer) {
        this.earth = earth;
        this.camera = camera;
        this.renderer = renderer;
        this.domElement = renderer.domElement;
        
        // 回転状態
        this.isRotating = false;
        this.velocity = new THREE.Vector2(0, 0);
        this.damping = 0.95;
        
        // マウス/タッチ状態
        this.lastPointer = new THREE.Vector2();
        this.currentPointer = new THREE.Vector2();
        this.isPointerDown = false;
        
        // カメラの位置とズーム
        this.minDistance = 2;
        this.maxDistance = 10;
        this.currentDistance = 5;
        this.targetDistance = 5;
        
        // 感度設定
        this.rotationSensitivity = 2.0;
        this.zoomSensitivity = 0.5;
        
        // イベントリスナーを設定
        this.setupEventListeners();
        
        // カメラの初期位置を設定
        this.updateCameraPosition();
    }
    
    setupEventListeners() {
        // バインドされたハンドラーを保存
        this.boundHandlers = {
            onPointerDown: this.onPointerDown.bind(this),
            onPointerMove: this.onPointerMove.bind(this),
            onPointerUp: this.onPointerUp.bind(this),
            onWheel: this.onWheel.bind(this),
            onTouchStart: this.onTouchStart.bind(this),
            onTouchMove: this.onTouchMove.bind(this),
            onTouchEnd: this.onTouchEnd.bind(this)
        };
        
        // マウスイベント
        this.domElement.addEventListener('mousedown', this.boundHandlers.onPointerDown);
        document.addEventListener('mousemove', this.boundHandlers.onPointerMove);
        document.addEventListener('mouseup', this.boundHandlers.onPointerUp);
        this.domElement.addEventListener('wheel', this.boundHandlers.onWheel);
        
        // タッチイベント
        this.domElement.addEventListener('touchstart', this.boundHandlers.onTouchStart);
        document.addEventListener('touchmove', this.boundHandlers.onTouchMove);
        document.addEventListener('touchend', this.boundHandlers.onTouchEnd);
        
        // コンテキストメニューを無効化
        this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    onPointerDown(event) {
        event.preventDefault();
        this.isPointerDown = true;
        this.isRotating = false;
        this.velocity.set(0, 0);
        
        const pointer = this.getPointerPosition(event);
        this.lastPointer.copy(pointer);
        this.currentPointer.copy(pointer);
    }
    
    onPointerMove(event) {
        if (!this.isPointerDown) return;
        
        event.preventDefault();
        const pointer = this.getPointerPosition(event);
        
        const deltaX = pointer.x - this.lastPointer.x;
        const deltaY = pointer.y - this.lastPointer.y;
        
        // 地球を回転
        this.rotateEarth(deltaX, deltaY);
        
        // 速度を更新（慣性用）
        this.velocity.set(deltaX, deltaY);
        
        this.lastPointer.copy(pointer);
    }
    
    onPointerUp(event) {
        if (!this.isPointerDown) return;
        
        event.preventDefault();
        this.isPointerDown = false;
        this.isRotating = Math.abs(this.velocity.x) > 0.01 || Math.abs(this.velocity.y) > 0.01;
    }
    
    onTouchStart(event) {
        event.preventDefault();
        
        if (event.touches.length === 1) {
            // 単一タッチ - 回転
            this.onPointerDown(event.touches[0]);
        } else if (event.touches.length === 2) {
            // マルチタッチ - ズーム
            this.isPointerDown = false;
            this.isRotating = false;
            this.velocity.set(0, 0);
            
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            this.lastTouchDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
        }
    }
    
    onTouchMove(event) {
        event.preventDefault();
        
        if (event.touches.length === 1) {
            // 単一タッチ - 回転
            this.onPointerMove(event.touches[0]);
        } else if (event.touches.length === 2) {
            // マルチタッチ - ズーム
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            const currentDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
            
            if (this.lastTouchDistance) {
                const delta = (this.lastTouchDistance - currentDistance) * 0.01;
                this.zoomCamera(delta);
            }
            
            this.lastTouchDistance = currentDistance;
        }
    }
    
    onTouchEnd(event) {
        event.preventDefault();
        
        if (event.touches.length === 0) {
            this.onPointerUp(event);
        } else if (event.touches.length === 1) {
            // マルチタッチから単一タッチに変更
            this.onPointerDown(event.touches[0]);
        }
    }
    
    onWheel(event) {
        event.preventDefault();
        const delta = event.deltaY * 0.001;
        this.zoomCamera(delta);
    }
    
    getPointerPosition(event) {
        const rect = this.domElement.getBoundingClientRect();
        return new THREE.Vector2(
            event.clientX - rect.left,
            event.clientY - rect.top
        );
    }
    
    rotateEarth(deltaX, deltaY) {
        // Y軸周りの回転（水平方向）
        this.earth.rotation.y += deltaX * this.rotationSensitivity * 0.01;
        
        // X軸周りの回転（垂直方向）- 制限付き
        this.earth.rotation.x += deltaY * this.rotationSensitivity * 0.01;
        this.earth.rotation.x = Math.max(
            -Math.PI / 2,
            Math.min(Math.PI / 2, this.earth.rotation.x)
        );
    }
    
    zoomCamera(delta) {
        this.targetDistance += delta * this.zoomSensitivity;
        this.targetDistance = Math.max(
            this.minDistance,
            Math.min(this.maxDistance, this.targetDistance)
        );
    }
    
    updateCameraPosition() {
        // カメラの距離を滑らかに更新
        this.currentDistance = lerp(this.currentDistance, this.targetDistance, 0.1);
        
        // カメラを地球から一定距離に配置
        this.camera.position.set(0, 0, this.currentDistance);
        this.camera.lookAt(0, 0, 0);
    }
    
    update() {
        // 慣性による回転
        if (this.isRotating && !this.isPointerDown) {
            this.rotateEarth(this.velocity.x, this.velocity.y);
            this.velocity.multiplyScalar(this.damping);
            
            // 慣性が十分小さくなったら停止
            if (Math.abs(this.velocity.x) < 0.001 && Math.abs(this.velocity.y) < 0.001) {
                this.isRotating = false;
                this.velocity.set(0, 0);
            }
        }
        
        // カメラ位置の更新
        this.updateCameraPosition();
    }
    
    // 地球を指定した位置に向ける
    focusOnPoint(lat, lng, duration = 2000) {
        const targetRotationY = -lng * Math.PI / 180;
        const targetRotationX = lat * Math.PI / 180;
        
        // アニメーションの実装は後で追加
        this.earth.rotation.y = targetRotationY;
        this.earth.rotation.x = targetRotationX;
    }
    
    // リセット
    reset() {
        this.earth.rotation.set(0, 0, 0);
        this.targetDistance = 5;
        this.velocity.set(0, 0);
        this.isRotating = false;
    }
    
    // 破棄
    dispose() {
        if (this.boundHandlers) {
            this.domElement.removeEventListener('mousedown', this.boundHandlers.onPointerDown);
            document.removeEventListener('mousemove', this.boundHandlers.onPointerMove);
            document.removeEventListener('mouseup', this.boundHandlers.onPointerUp);
            this.domElement.removeEventListener('wheel', this.boundHandlers.onWheel);
            this.domElement.removeEventListener('touchstart', this.boundHandlers.onTouchStart);
            document.removeEventListener('touchmove', this.boundHandlers.onTouchMove);
            document.removeEventListener('touchend', this.boundHandlers.onTouchEnd);
        }
    }
}