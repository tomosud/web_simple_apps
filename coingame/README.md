# Box3D WebAssembly Coin Benchmark

A static browser benchmark for measuring large stacks of thin 3D rigid-body coins. Physics runs in the official Box3D C17 library compiled to WebAssembly; Three.js renders the coins with a single `InstancedMesh`.

The vendored engine is **Box3D v0.1.0** from <https://github.com/erincatto/box3d> (MIT). The browser renderer is **Three.js r180** (MIT). The benchmark itself is intentionally dependency-free at runtime beyond the checked-in static files.

## Run

Double-click `run.bat`, then open <http://localhost:8000>. Do not open `index.html` with `file://`; browsers restrict WebAssembly loading from local files.

Use **Apply & rebuild world** after changing physics settings. `Start`, `Pause`, and `Reset` control the current case. `Auto Benchmark` runs 500–10,000 coins with a 5-second warmup and 10-second measurement per case, then enables CSV download.

For comparable results, keep the tab visible, close other heavy tabs, keep power/thermal conditions consistent, and record pixel ratio, render mode, spawn mode, and hull sides alongside the CSV.

## Rebuild WebAssembly

Prerequisites:

- Git (only required if replacing the vendored Box3D source)
- CMake 3.21+
- Emscripten SDK, activated with `emsdk_env.bat`
- Python 3 for the local server

From an Emscripten-enabled command prompt:

```bat
scripts\build_wasm.bat
```

This follows Box3D's official web build flow (`emcmake cmake ...`, then `cmake --build`) and writes `wasm/box3d_bridge.js` plus `wasm/box3d_bridge.wasm`. SIMD behavior is left to Box3D's CMake configuration; this project does not force custom SIMD flags.

## Design notes

- A seeded xorshift generator makes initial positions repeatable.
- The coin convex hull is computed once per world and reused as the source of all coin shapes.
- JavaScript makes one transform-buffer bridge call per rendered physics frame, then reads packed transforms directly from WASM memory.
- Physics uses a 60 Hz accumulator capped at four steps per display frame.
- Rendering uses one `THREE.InstancedMesh`; per-instance transforms reuse temporary objects.
- The safety cap is 10,000 dynamic coins.

Box3D is young and its API may change. The bridge targets the checked-in v0.1.0 headers, which are the source of truth for this repository.
