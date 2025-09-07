# Blink Mimic (Blendshape)

This is a minimal web demo that detects eye open/close using MediaPipe Tasks Vision (Face Landmarker) blendshapes and mimics your blink by swapping eye images.

- Page: `blink_mimic.html`
- Tech: MediaPipe Tasks Vision (ES modules), getUserMedia, vanilla JS

## Why blendshapes?
EAR thresholds are noisy and flip rapidly. Blendshape scores (eyeBlinkLeft/Right) are model-learned signals that are more stable. We apply simple temporal logic (hysteresis + minimum hold time) to avoid flicker.

## Run locally
1) Run `run.bat` (Python http.server on port 8008)
2) Open `http://localhost:8008/eye_close/blink_mimic.html`
   - Grant camera permission
   - Add `?debug=true` to show raw scores

Note: On mobile browsers, HTTPS may be required for camera access when hosted (e.g. GitHub Pages).

## Files
```
eye_close/
├─ blink_mimic.html          # Main demo (ES module, no bundler)
├─ assets/eye/               # Eye images (white/open/close)
├─ run.bat                   # Simple local server
├─ PLAN.md                   # Project plan (JP)
└─ README.md                 # This file
```

## Implementation notes
- Import as ES module:
  - `import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'`
- Create with blendshapes: `outputFaceBlendshapes: true`
- Model/CDN paths in use: jsDelivr `@mediapipe/tasks-vision@latest`
- Temporal smoothing:
  - Hysteresis: CLOSE_ON=0.60, OPEN_ON=0.40
  - Minimum hold: 100 ms before switching states

## Known limitations
- Lighting, glasses, head pose can still impact scores.
- We currently aggregate left/right as an average; per-eye UI can be added.
