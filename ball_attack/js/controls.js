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
        this.minDistance = 1.5;
        this.maxDistance = 8;
        this.currentDistance = 2.5;
        this.targetDistance = 2.5;
        
        // 感度設定（シンプルな重い挙動）
        this.rotationSensitivity = 0.1;  // 基本感度
        this.zoomSensitivity = 0.3;
        this.inertiaFactor = 0.05;  // 重い感触
        this.damping = 0.98;  // シンプルな減衰
        this.startThreshold = 0.5;  // 動き始めの閾値を緩和
        
        // カメラ軌道制御（球面座標系）
        this.sphericalCoords = {
            theta: 0,      // 水平角度（経度）
            phi: Math.PI / 2,  // 垂直角度（緯度、π/2 = 赤道）
            radius: this.currentDistance
        };
        
        this.rotationVelocity = new THREE.Vector2(0, 0);
        this.accumulatedForce = new THREE.Vector2(0, 0);  // 蓄積された力
        
        // イベントリスナーを設定
        this.setupEventListeners();
        
        // カメラの初期位置を設定
        this.updateCameraFromSpherical();
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
        // 重い石：既存の慣性は維持（急に止まらない）
        
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
        
        // カメラを軌道移動（重い操作感）
        this.rotateCamera(deltaX, deltaY);
        
        this.lastPointer.copy(pointer);
    }
    
    onPointerUp(event) {
        if (!this.isPointerDown) return;
        
        event.preventDefault();
        this.isPointerDown = false;
        this.isRotating = Math.abs(this.rotationVelocity.x) > 0.01 || Math.abs(this.rotationVelocity.y) > 0.01;
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
    
    rotateCamera(deltaX, deltaY) {
        // スクリーンスペースの直感的な操作
        // 横ドラッグ = カメラの水平移動（theta）
        // 縦ドラッグ = カメラの垂直移動（phi）- ドラッグ方向に合わせる
        
        // 力を蓄積（超重い石は力が必要）
        this.accumulatedForce.x += Math.abs(deltaX) > this.startThreshold ? deltaX * this.rotationSensitivity : 0;
        this.accumulatedForce.y += Math.abs(deltaY) > this.startThreshold ? deltaY * this.rotationSensitivity : 0;
        
        // 蓄積された力を速度に変換（重い石の効果）
        this.rotationVelocity.x += this.accumulatedForce.x * this.inertiaFactor;
        this.rotationVelocity.y -= this.accumulatedForce.y * this.inertiaFactor; // 符号反転で直感的な縦操作
        
        // シンプルな重い挙動（複雑なモーメンタム蓄積を削除）
        
        // 速度制限
        const maxVelocity = 2.0;
        this.rotationVelocity.x = Math.max(-maxVelocity, Math.min(maxVelocity, this.rotationVelocity.x));
        this.rotationVelocity.y = Math.max(-maxVelocity, Math.min(maxVelocity, this.rotationVelocity.y));
        
        // 蓄積された力をリセット
        this.accumulatedForce.set(0, 0);
        
        // カメラの軌道移動を適用
        this.applyCameraOrbit();
    }
    
    applyCameraOrbit() {
        // スクリーンスペースの直感的な操作を球面座標に変換
        // 横ドラッグ = theta（水平角度）の変更
        // 縦ドラッグ = phi（垂直角度）の変更 - 直感的な方向
        
        this.sphericalCoords.theta += this.rotationVelocity.x * 0.01;
        this.sphericalCoords.phi -= this.rotationVelocity.y * 0.01;  // 符号反転で直感的な縦操作
        
        // phi（垂直角度）の制限を緩和（ジンバルロック軽減）
        this.sphericalCoords.phi = Math.max(0.01, Math.min(Math.PI - 0.01, this.sphericalCoords.phi));
        
        // カメラ位置を球面座標から計算
        this.updateCameraFromSpherical();
    }
    
    updateCameraFromSpherical() {
        // より安定した球面座標変換
        const sinPhi = Math.sin(this.sphericalCoords.phi);
        const cosPhi = Math.cos(this.sphericalCoords.phi);
        const sinTheta = Math.sin(this.sphericalCoords.theta);
        const cosTheta = Math.cos(this.sphericalCoords.theta);
        
        const x = this.sphericalCoords.radius * sinPhi * cosTheta;
        const y = this.sphericalCoords.radius * cosPhi;
        const z = this.sphericalCoords.radius * sinPhi * sinTheta;
        
        // 数値精度の問題を回避（極地付近の特別処理）
        if (Math.abs(sinPhi) < 0.0001) {
            // 極地付近では特別処理
            this.camera.position.set(0, this.sphericalCoords.radius * Math.sign(cosPhi), 0);
        } else {
            this.camera.position.set(x, y, z);
        }
        
        // カメラを地球の中心に向ける
        this.camera.lookAt(0, 0, 0);
        
        // 距離を同期
        this.currentDistance = this.sphericalCoords.radius;
    }
    
    zoomCamera(delta) {
        this.targetDistance += delta * this.zoomSensitivity;
        this.targetDistance = Math.max(
            this.minDistance,
            Math.min(this.maxDistance, this.targetDistance)
        );
    }
    
    updateCameraZoom() {
        // ズーム距離を滑らかに更新
        this.sphericalCoords.radius = lerp(this.sphericalCoords.radius, this.targetDistance, 0.1);
        
        // カメラ位置を更新
        this.updateCameraFromSpherical();
    }
    
    update() {
        // 常に回転速度を適用（超重い石の継続的な動き）
        if (Math.abs(this.rotationVelocity.x) > 0.0001 || Math.abs(this.rotationVelocity.y) > 0.0001) {
            this.applyCameraOrbit();
        }
        
        // ドラッグ中でない場合のみ、シンプルな減衰
        if (!this.isPointerDown) {
            this.rotationVelocity.multiplyScalar(this.damping);
            
            // 小さくなったら完全停止
            if (Math.abs(this.rotationVelocity.x) < 0.001 && Math.abs(this.rotationVelocity.y) < 0.001) {
                this.isRotating = false;
                this.rotationVelocity.set(0, 0);
            } else {
                this.isRotating = true;
            }
        }
        
        // ズーム変更をカメラ軌道に反映
        this.updateCameraZoom();
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
        // 地球は固定（リセット不要）
        // カメラを初期位置に戻す
        this.sphericalCoords.theta = 0;
        this.sphericalCoords.phi = Math.PI / 2;
        this.sphericalCoords.radius = 2.5;
        this.targetDistance = 2.5;
        this.rotationVelocity.set(0, 0);
        this.accumulatedForce.set(0, 0);
        this.isRotating = false;
        
        // カメラ位置を更新
        this.updateCameraFromSpherical();
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