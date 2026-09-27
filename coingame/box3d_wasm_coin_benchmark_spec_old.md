# Box3D WebAssembly + Three.js コイン大量物理ベンチ 実装指示書

## 目的

Box3DをEmscriptenでWebAssembly化し、Three.jsで大量の薄いコインを描画する最小Webベンチマークを作成する。

目的はゲーム完成ではなく、**iPhone Safari / PCブラウザ上で、Box3Dが大量の薄い円盤状RigidBodyを何枚まで実用速度で処理できるか測定すること**である。

Box3Dは公式にWeb/Emscriptenビルドをサポートしている。READMEの現行手順を必ず確認し、それに従うこと。

Box3DはMITライセンス。Three.jsは描画専用に使用する。

Git操作については、**git add / git commit / git push は絶対に実行しないこと。** コミットは人間が行う。

---

## 1. 最終成果物

GitHub Pagesでそのまま公開できる静的Webアプリにする。

```text
/
├─ index.html
├─ src/
│  ├─ main.js
│  ├─ renderer.js
│  ├─ benchmark.js
│  └─ ui.js
│
├─ wasm/
│  ├─ box3d_bridge.js
│  └─ box3d_bridge.wasm
│
├─ native/
│  ├─ box3d_bridge.c
│  └─ CMakeLists.txt
│
├─ extern/
│  └─ box3d/
│
├─ scripts/
│  └─ build_wasm.bat
│
├─ run.bat
├─ README.md
└─ .gitignore
```

構造は必要に応じて多少変更してよいが、Web側、WASM bridge、Box3D本体、build script、local server は明確に分けること。

---

## 2. Box3D

使用対象:

```text
https://github.com/erincatto/box3d
```

Box3DはC17ライブラリ。

GitHubのmainを無条件に前提にせず、実装開始時点の公式README、docs、headerを確認すること。API名を推測して書かないこと。

特に以下を確認する。

```text
include/box3d/box3d.h
include/box3d/collision.h
include/box3d/types.h
docs/
samples/
```

Box3D公式READMEのEmscriptenビルド手順をベースにする。

```bash
emcmake cmake -B build -DBOX3D_SAMPLES=OFF
cmake --build build
```

WebAssembly SIMDについてもBox3D公式設定を優先する。独自のコンパイルフラグを追加する前に、現在のCMake設定を確認すること。

---

## 3. コイン形状

### ネイティブCylinderは使わない

現行Box3Dでは、ネイティブCylinder shapeを前提にしない。

コインは**薄い正多角柱のconvex hull**として作る。

初期値:

```text
radius = 0.5
thickness = 0.10
segments = 16
```

高さ方向は `-thickness / 2` と `+thickness / 2` の2面。

頂点数は `segments * 2`。例: 16角柱 → 32頂点。

形状生成は起動時に一度だけ行う。全コインは完全に同じ形状とする。

---

## 4. 最重要：Hullを毎回別生成しない

1000〜10000枚のコインについて、毎回新しい頂点配列からhullを計算する実装は禁止。

**1種類のcoin hullを生成し、それを全コインのshape生成元として再利用する。**

同一形状を大量生成する際に無駄な形状生成を避けること。

---

## 5. Physics Scene

最初はコインプッシャーそのものを作らない。ベンチマークの再現性を優先する。

static:

```text
floor
left wall
right wall
back wall
front wall
```

dynamic:

```text
coins
```

床サイズ例:

```text
width  = 16
depth  = 16
wall height = 10
```

---

## 6. コイン配置

ランダムだけにするとベンチ結果が比較しにくいため、**seed付き疑似乱数**を使用する。

毎回同一seedなら同じ初期配置になること。

初期配置はグリッド＋小さいjitterを推奨。

```text
x = gridX * 1.1 + jitter
z = gridZ * 1.1 + jitter
y = layer * 0.15 + initialHeight
```

座標系についてはBox3DとThree.jsで統一する。必要なら変換層を1か所だけ設ける。

---

## 7. コイン数

UIから以下を選択可能にする。

```text
100
250
500
1000
2000
3000
5000
7500
10000
```

Custom入力欄を設けてもよい。

Maximum bodies safety limitを設け、初期値は10000程度とする。

---

## 8. ベンチ開始方法

ページロード直後に10000枚作らない。初期状態は1000 coins。

UI例:

```text
[Reset]
[Start]
[Pause]

Coin Count:
[100]
[500]
[1000]
[2000]
[5000]
[10000]

[Apply]
```

ApplyするとWorldを作り直す。ベンチ用途ではWorld再生成でよい。

---

## 9. Physics timestep

可変deltaをそのままBox3Dへ渡さない。fixed timestepを使う。

```text
physicsHz = 60
dt = 1 / 60
```

accumulator方式を用いる。

```text
accumulator += frameDelta

while accumulator >= fixedDt:
    StepPhysics(fixedDt)
    accumulator -= fixedDt
```

spiral of death防止のため、1 render frameあたりの最大physics step回数を制限する。

```text
maxSubSteps = 4
```

---

## 10. Benchmark mode

以下のモードを用意する。

```text
Render + Physics
Physics Only
Render Only
```

Three.js描画負荷、Box3D物理負荷、合計負荷を切り分けられるようにする。

---

## 11. Three.js描画

コイン1枚につきMeshを1個作る実装は禁止。

必ず `THREE.InstancedMesh` を使用する。

描画用geometryは `CylinderGeometry` を使用し、見た目のsegmentsは24程度でよい。

Physics colliderとはsegments数を別にしてよい。

```text
Physics: 12 or 16 sides
Rendering: 24 or 32 sides
```

---

## 12. Transform同期

Physics側でbody transformを取得し、Three.js InstancedMeshのinstance matrixに反映する。

毎フレーム大量の不要なJS objectを生成しない。

禁止例:

```javascript
new THREE.Vector3()
new THREE.Quaternion()
new THREE.Matrix4()
```

をコイン数×毎フレーム作成すること。

一時オブジェクトは再利用する。

---

## 13. WASM bridge

Box3DのAPIをJS側から1bodyずつ細かく呼ぶ構成を避ける。JS ↔ WASM boundaryを大量に跨ぐとベンチの意味が薄れる。

C側に高レベルAPIを用意する。

```c
init_world(...)
reset_world(int coin_count)
step_world(float dt)
get_coin_count()
get_transforms(float* output)
set_paused(...)
destroy_world()
```

可能なら、WASM Linear Memory上へtransformを連続配列で書き出す。

```text
px py pz padding qx qy qz qw
```

JS側は `Float32Array` viewとして読む。

---

## 14. C bridgeの設計

JS側から直接Box3D APIを大量に触らせない。Box3DはC bridge内部へ閉じ込める。

```text
JavaScript
     |
     | few API calls
     v
box3d_bridge.c
     |
     | native C calls
     v
Box3D
```

1フレームあたりのWASM function callは極力少なくする。

理想:

```text
step_world()
get_transform_buffer()
```

程度。

---

## 15. Performance overlay

画面左上に常時表示。

```text
Coin count
FPS
Frame ms
Physics ms
Render ms
Physics steps / sec
Bodies
Sleeping bodies
Active bodies
Average FPS
1% low
Average physics ms
Max physics ms
```

Box3Dからsleep情報を簡単に取得できない場合は、初期実装では省略可。

---

## 16. Benchmark automation

`Auto Benchmark` ボタンを付ける。

実行順:

```text
500
1000
2000
3000
5000
7500
10000
```

各ケース:

```text
warmup 5 sec
measure 10 sec
```

結果を保存してHTML table表示する。

---

## 17. CSV出力

Benchmark結果をCSVとしてダウンロード可能にする。

```text
box3d_benchmark_YYYYMMDD_HHMMSS.csv
```

列例:

```text
device
userAgent
coinCount
physicsHz
durationSec
avgFps
minFps
onePercentLow
avgFrameMs
avgPhysicsMs
maxPhysicsMs
```

---

## 18. Device information

表示可能な範囲で以下を表示する。

```text
navigator.userAgent
navigator.platform
screen.width
screen.height
devicePixelRatio
hardwareConcurrency
```

ブラウザで取れない情報は推測しない。userAgentから特定のiPhone機種名を断定しない。

---

## 19. 描画負荷を下げるオプション

```text
Render Coins ON/OFF
Shadows ON/OFF
Wireframe ON/OFF
Pixel Ratio: 0.5 / 1.0 / device
```

初期状態:

```text
Shadows OFF
Pixel Ratio = min(devicePixelRatio, 1.5)
```

---

## 20. Physics parameters

UIから調整可能にする。

```text
friction
restitution
gravity
coin thickness
coin radius
```

radius/thickness変更時はWorld再構築。

初期値:

```text
gravity = -9.8
friction = 0.5
restitution = 0.05
```

---

## 21. Collider complexity比較

Physics hullのsegmentsを切り替え可能にする。

```text
8
12
16
24
```

描画geometryのsegmentsは変えない。Physics colliderだけ変える。

これは今回の重要な比較軸。

---

## 22. Stack stress test

2つのspawn modeを作る。

### Rain
上からばらまく。

### Dense Stack
最初から密に積む。

コインプッシャー用途ではDense Stackが重要。

---

## 23. Coin pusher stress test

第2段階として簡単なkinematic pusherを追加する。

```text
┌─────────────
│ █████████
│       →
│ ○○○○○○
│ ○○○○○○
└─────────────
```

Box3Dのkinematic bodyでforward/backwardを周期運動させる。

速度例:

```text
0.5～1.0 m/s
```

UI:

```text
Pusher ON/OFF
```

---

## 24. 落下処理

床の一部にfront edgeを設けてもよい。

落下して `y < -10` 等になったcoinは、benchmark modeでは削除せず上に再配置してbody数を維持してもよい。

```text
Recycle Fallen Coins ON/OFF
```

---

## 25. GitHub Pages対応

GitHub Pagesのsubdirectory配信でも動くようにする。

絶対パスは禁止。

悪い例:

```text
/wasm/box3d.wasm
```

良い例:

```text
./wasm/box3d.wasm
```

または `new URL(..., import.meta.url)` 等を利用する。

---

## 26. ビルド成果物

GitHub Pages側ではビルド処理を要求しない。

**build済みWASMをrepositoryへ含める。**

GitHub Pagesは単純なstatic hostingとする。

---

## 27. run.bat

Windowsで `run.bat` をダブルクリックするとローカルサーバーが起動する。

Python標準機能のみ。

```bat
@echo off
cd /d "%~dp0"

where python >nul 2>nul
if %errorlevel%==0 (
    echo Starting server at http://localhost:8000
    python -m http.server 8000
    goto end
)

where py >nul 2>nul
if %errorlevel%==0 (
    echo Starting server at http://localhost:8000
    py -m http.server 8000
    goto end
)

echo Python was not found.
pause

:end
```

ブラウザ自動起動は任意。

---

## 28. build_wasm.bat

Emscripten SDKが有効な環境で `scripts/build_wasm.bat` を実行するとWASM bridgeを再ビルドできるようにする。

READMEにPrerequisitesを書く。

```text
Git
CMake
Emscripten SDK
Python for local server
```

---

## 29. Git操作禁止

AIは以下を実行しない。

```text
git add
git commit
git push
git tag
git rebase
git reset --hard
```

repositoryに変更を加えるところまではよい。

最後に以下だけ報告する。

```text
変更したファイル一覧
新規作成ファイル一覧
ビルド方法
動作確認方法
既知の問題
```

コミットは人間が行う。

---

## 30. まず作るMVP

```text
Phase 1
Box3D WASMがbrowserで動く

Phase 2
床＋100個のcoin hull

Phase 3
Three.js InstancedMesh同期

Phase 4
1000 coins

Phase 5
5000 / 10000 coins

Phase 6
benchmark UI

Phase 7
CSV

Phase 8
kinematic pusher
```

各Phaseでブラウザコンソールエラーがないことを確認する。

---

## 31. 最初の性能目標

以下についてPC ChromeとiPhone Safariで比較する。

```text
1000 coins
2000 coins
5000 coins
10000 coins
```

計測:

```text
FPS
Physics ms
Frame ms
```

60fpsを維持できる最大枚数を確認する。

さらに16角柱 vs 8角柱など、Collider complexityの差を見る。

---

## 32. 今回やらないこと

```text
パチンコ部分
ゲームUI
得点
SE
エフェクト
コインテクスチャ
オンライン通信
データ保存
広告
PWA
WebGPU
Nexus
```

これは純粋な**Box3D WASM大量コインベンチ**である。

---

## 33. コード品質

最小アプリだが、physics / render / benchmark / ui を分離する。

巨大な1ファイルに全部書かない。

コメントは「何をしているか」より**なぜその設計にしているか**を中心に書く。

特に以下にはコメントを入れる。

```text
WASM boundary削減
InstancedMesh
fixed timestep
shared coin hull
```

---

## 34. AIが不明点に遭遇した場合

Box3DはAPI変更があり得る。

**存在しないAPIを想像して実装してはいけない。**

必ず現在checkoutされているBox3Dのheaders / docs / samplesを検索してAPIを確認する。

ドキュメントとmain branchに差がある場合、**checkoutされているソースコードを正とする。**

---

## AIへの最後の指示

> このプロジェクトの最優先目的は、「Box3Dで大量の薄いコインをWebAssembly上で動かした際の実測性能を得ること」です。
>
> 見栄えより計測の再現性とコードの単純さを優先してください。
>
> まず1000枚が正しく動く最小構成を完成させ、その後枚数とベンチ機能を増やしてください。
>
> Box3DのAPIは必ず現在のソースコードから確認してください。
>
> Git操作は一切行わず、コミットとpushは人間が行います。

---

## ベンチ結果で特に見たい軸

コイン枚数だけでなく、Physics hull の複雑度も比較する。

| Coins | 8角 | 12角 | 16角 | 24角 |
|---:|---:|---:|---:|---:|
| 1000 | - | - | - | - |
| 2000 | - | - | - | - |
| 5000 | - | - | - | - |

今回の本質は「何枚まで」だけでなく、**円盤らしさをどこまで落とせば急激に軽くなるか**を測ることにある。
