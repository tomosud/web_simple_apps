# 地球回転制御の問題分析と改善案（更新版）

## 現在の問題（修正後も残存）

### 1. 縦回転が逆方向になる問題（二重符号反転）
**原因**: 
- 186行目: `this.rotationVelocity.y -= this.accumulatedForce.y * this.inertiaFactor;` で符号反転
- 212行目: `this.sphericalCoords.phi -= this.rotationVelocity.y * 0.01;` でさらに符号反転
- **結果**: 二重に符号反転されて元の逆方向に戻ってしまっている

**現象**:
- マウスを上にドラッグ → カメラが下に移動（期待: 上に移動）
- マウスを下にドラッグ → カメラが上に移動（期待: 下に移動）

### 2. ジンバルロック問題（極地での回転停止）
**原因**:
- 球面座標系の根本的制約: `sinPhi` が 0 に近づくと theta の変化が効かなくなる
- 北極・南極付近で `Math.abs(sinPhi) < 0.0001` の特別処理が位置設定のみで回転が継続できない
- phi制限（0.01 〜 π-0.01）により極地付近で回転が制限される

**現象**:
- 極地付近で回転操作が完全に停止する
- 連続回転ができなくなる
- 慣性回転も極地で停止してしまう

### 3. 球面座標系の数学的限界
**原因**:
- 球面座標系 (theta, phi, radius) は本質的にジンバルロックを持つ
- 極地付近では theta の変化が視覚的に無効になる
- 連続回転に適していない座標系

## 推奨改善案：クォータニオンベース回転システム

### 1. クォータニオンによる安定した回転制御

```javascript
class ImprovedEarthControls {
    constructor(earth, camera, renderer) {
        // 既存のプロパティ...
        
        // クォータニオンベースの回転制御
        this.cameraQuaternion = new THREE.Quaternion();
        this.targetQuaternion = new THREE.Quaternion();
        this.rotationAxis = new THREE.Vector3();
        
        // シンプルな慣性システム
        this.angularVelocity = new THREE.Vector3(0, 0, 0);
        this.damping = 0.95;
        this.sensitivity = 0.005;
        
        // カメラ距離制御
        this.distance = 2.5;
        this.targetDistance = 2.5;
        this.minDistance = 1.5;
        this.maxDistance = 8.0;
        
        this.setupInitialPosition();
    }
    
    setupInitialPosition() {
        // 初期カメラ位置（Z軸正方向）
        this.camera.position.set(0, 0, this.distance);
        this.camera.lookAt(0, 0, 0);
        this.cameraQuaternion.copy(this.camera.quaternion);
        this.targetQuaternion.copy(this.camera.quaternion);
    }
    
    rotateCamera(deltaX, deltaY) {
        // 直感的なドラッグ方向の実装
        // 横ドラッグ = Y軸回転（左右）
        // 縦ドラッグ = X軸回転（上下）
        
        // スクリーン座標系でのドラッグを3D回転軸に変換
        const rotationY = -deltaX * this.sensitivity; // 横ドラッグ：左→右で地球が左回転
        const rotationX = -deltaY * this.sensitivity; // 縦ドラッグ：上→下で地球が前回転
        
        // 現在のカメラの右ベクトルと上ベクトルを取得
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.cameraQuaternion);
        const up = new THREE.Vector3(0, 1, 0);
        
        // 回転軸を計算
        const horizontalRotation = new THREE.Quaternion().setFromAxisAngle(up, rotationY);
        const verticalRotation = new THREE.Quaternion().setFromAxisAngle(right, rotationX);
        
        // 回転を適用（順序重要：水平→垂直）
        this.targetQuaternion.multiplyQuaternions(horizontalRotation, this.targetQuaternion);
        this.targetQuaternion.multiplyQuaternions(verticalRotation, this.targetQuaternion);
        
        // 角速度を更新（慣性用）
        this.angularVelocity.set(rotationX, rotationY, 0);
    }
    
    update() {
        // 慣性回転の適用
        if (!this.isPointerDown && this.angularVelocity.length() > 0.0001) {
            const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.cameraQuaternion);
            const up = new THREE.Vector3(0, 1, 0);
            
            const horizontalRotation = new THREE.Quaternion().setFromAxisAngle(up, this.angularVelocity.y);
            const verticalRotation = new THREE.Quaternion().setFromAxisAngle(right, this.angularVelocity.x);
            
            this.targetQuaternion.multiplyQuaternions(horizontalRotation, this.targetQuaternion);
            this.targetQuaternion.multiplyQuaternions(verticalRotation, this.targetQuaternion);
            
            // 角速度の減衰
            this.angularVelocity.multiplyScalar(this.damping);
        }
        
        // クォータニオンの補間でスムーズな回転
        this.cameraQuaternion.slerp(this.targetQuaternion, 0.1);
        
        // 距離の補間
        this.distance = THREE.MathUtils.lerp(this.distance, this.targetDistance, 0.1);
        
        // カメラ位置の更新
        this.updateCameraPosition();
    }
    
    updateCameraPosition() {
        // クォータニオンからカメラ位置を計算
        const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(this.cameraQuaternion);
        this.camera.position.copy(direction.multiplyScalar(this.distance));
        
        // カメラを地球の中心に向ける
        this.camera.lookAt(0, 0, 0);
    }
}
```

### 2. より簡単な代替案：改良された球面座標システム

クォータニオンが複雑すぎる場合の改良版：

```javascript
// controls.js の applyCameraOrbit() を修正
applyCameraOrbit() {
    // 直感的なドラッグ方向の修正
    this.sphericalCoords.theta -= this.rotationVelocity.x * 0.01; // 横方向を反転
    this.sphericalCoords.phi -= this.rotationVelocity.y * 0.01;   // 縦方向を反転
    
    // ジンバルロック回避のためのphi制限を緩和
    const minPhi = 0.01;  // ほぼ0だがゼロ除算回避
    const maxPhi = Math.PI - 0.01;  // ほぼπだがゼロ除算回避
    
    this.sphericalCoords.phi = Math.max(minPhi, Math.min(maxPhi, this.sphericalCoords.phi));
    
    // カメラ位置を更新
    this.updateCameraFromSpherical();
}

// さらに安定性を向上させる場合
updateCameraFromSpherical() {
    // より安定した球面座標変換
    const sinPhi = Math.sin(this.sphericalCoords.phi);
    const cosPhi = Math.cos(this.sphericalCoords.phi);
    const sinTheta = Math.sin(this.sphericalCoords.theta);
    const cosTheta = Math.cos(this.sphericalCoords.theta);
    
    const x = this.sphericalCoords.radius * sinPhi * cosTheta;
    const y = this.sphericalCoords.radius * cosPhi;
    const z = this.sphericalCoords.radius * sinPhi * sinTheta;
    
    // 数値精度の問題を回避
    if (Math.abs(sinPhi) < 0.0001) {
        // 極地付近では特別処理
        this.camera.position.set(0, this.sphericalCoords.radius * Math.sign(cosPhi), 0);
    } else {
        this.camera.position.set(x, y, z);
    }
    
    this.camera.lookAt(0, 0, 0);
}
```

### 3. 慣性システムの簡素化

```javascript
// 複雑な物理パラメータを削除し、シンプルな慣性に
update() {
    // シンプルな慣性適用
    if (!this.isPointerDown && (Math.abs(this.rotationVelocity.x) > 0.001 || Math.abs(this.rotationVelocity.y) > 0.001)) {
        this.applyCameraOrbit();
        
        // シンプルな減衰
        this.rotationVelocity.multiplyScalar(0.98);
    } else if (!this.isPointerDown) {
        // 完全停止
        this.rotationVelocity.set(0, 0);
        this.isRotating = false;
    }
    
    this.updateCameraZoom();
}

// rotateCamera も簡素化
rotateCamera(deltaX, deltaY) {
    // 直接速度に加算（蓄積システム削除）
    this.rotationVelocity.x = deltaY * this.rotationSensitivity;  // 縦ドラッグ
    this.rotationVelocity.y = deltaX * this.rotationSensitivity;  // 横ドラッグ
    
    this.applyCameraOrbit();
}
```

## 実装の優先順位

### 1. 最小限の修正（即座に適用可能）
- `applyCameraOrbit()` の符号を反転
- 慣性システムの簡素化
- phi制限の緩和

### 2. 中程度の修正
- 球面座標の極地付近特別処理
- より安定した数値計算

### 3. 根本的な解決（時間がある場合）
- クォータニオンベースシステムへの移行

## 推奨する即効性のある修正

現在のコードで最小限の変更で問題を解決：

```javascript
// controls.js の以下の行を修正

// 186行目付近 - rotateCamera関数内
this.rotationVelocity.x += this.accumulatedForce.x * this.inertiaFactor;
this.rotationVelocity.y -= this.accumulatedForce.y * this.inertiaFactor; // 符号反転

// 208行目付近 - applyCameraOrbit関数内  
this.sphericalCoords.theta += this.rotationVelocity.x * 0.01;
this.sphericalCoords.phi -= this.rotationVelocity.y * 0.01; // 符号反転

// 211行目付近 - phi制限の緩和
this.sphericalCoords.phi = Math.max(0.01, Math.min(Math.PI - 0.01, this.sphericalCoords.phi));
```

この修正だけで、縦回転の逆方向問題とジンバルロックの大部分が解決されるはずです。
