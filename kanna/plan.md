# 📱 端末傾きでキューブに視差を与える Three.js 実装ガイド

*(GitHub Pages / iPhone Safari 動作想定・DeviceOrientation API 使用)*

---

## 1. ゴール
- スマホを傾けると **画面中央のキューブ** が奥行きを持って僅かに位置シフトし、擬似的な立体視 (“パララックス”) を感じられるデモを作る。  
- 視差量は端末の **β (前後チルト)** と **γ (左右チルト)** を入力に、カメラ位置を数 px 移動するだけの軽量処理で実現する。  
- 元コード（`DeviceOrientationControls.js` + Three.js）を流用し、**パノラマビューア**部分をキューブ表示に置き換える。

---

## 2. 仕組みの全体像
```
┌────────────┐       β,γ       ┌──────────────┐
│ Device      │ ───────────► │ ParallaxMapper│
│ Orientation │               └──────────────┘
└────────────┘                      │
                                     ▼ (x,y平行移動)
                                ┌──────────────┐
                                │  Camera      │
                                └──────────────┘
                                     │(向きは固定)
                                     ▼
                                ┌──────────────┐
                                │  Cube Mesh   │
                                └──────────────┘
```
1. **傾き角取得**: `window.addEventListener('deviceorientation', …)` で αβγ を毎フレーム取得。  
2. **角度→オフセット変換**: β, γ を *[-max, +max]* → *[-range, +range]* px にマッピング。  
3. **カメラ移動**: `camera.position.set(ox, oy, baseZ)` を更新。視線 (`lookAt`) は常に原点へ。  
4. キューブは原点に固定。結果として **近景 (キューブ) と背景 (canvas 背景色)** の相対座標が変化し、疑似パララックスが生じる。

---

## 3. フォルダ構成（最小）
```
/docs
 ├ index.html          ← HTML 雛形
 ├ js/
 │  ├ three.min.js
 │  ├ DeviceOrientationControls.js
 │  └ app.js           ← 実装ロジック
 └ css/
    └ style.css        ← 既存で OK
```

---

## 4. 実装ステップ概要

| 手順 | ポイント |
|------|----------|
| 1. **HTML 変更** | panoramaViewer 呼び出しを削除し、`<canvas id="scene">` のみ残す。`type="module"` で `app.js` を読み込み。 |
| 2. **シーン初期化** | Three.js で `Scene`, `PerspectiveCamera`, `WebGLRenderer` を生成。カメラ基準 Z は 3〜4 (任意)。 |
| 3. **キューブ追加** | `BoxGeometry(1,1,1)` + 単色 or テクスチャ `MeshStandardMaterial`。ライトは `AmbientLight` + `DirectionalLight`。 |
| 4. **DeviceOrientation 許可** | iOS 13+ はボタンタップ内で `DeviceOrientationEvent.requestPermission()`。許可後 `deviceorientation` を購読。 |
| 5. **パララックス計算** | ```js
const MAX_DEG = 20;          // 傾き角何度で最大視差にするか
const RANGE = 0.05;          // カメラをどれだけ動かすか (ワールド単位)
function map(v, maxDeg) {
  return THREE.MathUtils.clamp(v / maxDeg, -1, 1) * RANGE;
}
``` |
| 6. **毎フレーム更新** | ```js
function onOrient(e){
  offsetX = map(e.gamma, MAX_DEG);
  offsetY = map(e.beta,  MAX_DEG);
}
function animate(){
  camera.position.x = offsetX;
  camera.position.y = offsetY;
  camera.lookAt(0,0,0);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
``` |
| 7. **デスクトップ Fallback** | マウス移動で同様のオフセットを与える (`mousemove` → 比率変換)。 |
| 8. **パフォーマンス** | - `renderer.setPixelRatio(window.devicePixelRatio)`<br>- `requestAnimationFrame` 内で resize チェック。 |
| 9. **ビルド & デプロイ** | `/docs` を GitHub に push → Pages で公開。HTTPS 環境必須。 |

---

## 5. 調整パラメータ
| 名前 | 役目 | 目安 |
|------|------|------|
| `MAX_DEG` | これ以上傾けても視差が増えない上限角 | 15°〜25° |
| `RANGE`   | カメラを原点からどれだけ動かすか (ワールド座標) | 0.03〜0.10 |
| `baseZ`   | カメラ基準距離 | 3 (キューブサイズ 1 基準) |

---

## 6. 発展アイデア
1. **視差二段階化**：キューブの前面に透明プレーンを追加し、奥行きの異なる 2 オブジェクトへ別々の `RANGE` を適用。  
2. **深度フェード**：`camera.position.z` も小さく可変させると、傾きに応じてズームイン/アウトする演出が可能。  
3. **物理連携**：端末を急激に振った場合は `gsap.to` 等でシェイクアニメを追加。  

---

## 7. よくある落とし穴
- `alpha` はコンパス回転なので視差には使わない。  
- iOS は Safari **プライベートモード**だと `deviceorientation` が無効。通常モードでテスト。  
- デバイス毎に β, γ の符号が逆転する場合があるため、デバッグ用にリアルタイム数値を HUD 表示すると調整が楽。

---

以上が角度取得→キューブへの擬似視差付与の実装指針。コード詳細は `app.js` 内に 100 行前後で収まる想定。必要に応じてパラメータを調整し、リポジトリ README に適用方法を追記して運用してください。