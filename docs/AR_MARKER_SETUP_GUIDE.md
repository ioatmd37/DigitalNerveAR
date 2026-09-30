# AR Marker Setup Guide

> ⚠️ Educational simulation only. Not for use as guidance on real patients.

The app uses **image-target tracking** ([MindAR](https://github.com/hiukim/mind-ar-js)). It needs no GPS, plane
detection, ARKit/ARCore or cloud service. All processing runs locally in the browser, and camera frames are never
uploaded.

## Files

| File | Purpose |
| --- | --- |
| `public/marker/marker.png` | The printable marker image (1024 × 1024 px, high contrast, dense detail, asymmetric) |
| `public/marker/targets.mind` | The compiled MindAR target for `marker.png` (**must match the image**) |
| `public/marker/print.html` | A print page that sizes the marker to exactly 120 mm |
| `scripts/build-marker.mjs` | Generates and/or compiles the marker (`npm run marker:build`) |

## 1. Print the marker

1. Open the app → **Print marker** (or `https://<host>:5173/marker/print.html`).
2. Print at **100 % / Actual size**, with "Fit to page" **disabled**, on **matte** paper.
3. **Recommended size: start with 12 cm × 12 cm.** Measure the printed square with a ruler. It must be 120 mm; if not,
   fix the printer scaling. **Print without distortion**: both sides must be equal.
4. Using another size (e.g. 15 cm for more stable tracking at longer distances)? Set `VITE_MARKER_SIZE_CM` in
   `.env.local` to the real printed width and restart. Calibration offsets are in cm, so this keeps them correct.

## 2. Mount and place it

- **Use a high-contrast, detailed image marker.** The supplied marker is designed for this. Plain, symmetric or
  repetitive images track poorly.
- **Place it on a flat, stable base.** Glue or tape it to rigid card, foam board or acrylic, then fix it to the
  mannequin base beside or under the right hand. Curled or bent paper causes drift.
- Point the yellow **TOP** arrow toward the mannequin's fingertips.
- Once calibrated, **do not move the marker relative to the mannequin**.

## 3. Environment

- **Ensure adequate lighting.** Use even, diffuse light (room light plus a desk lamp). Avoid strong shadows across the
  marker.
- **Avoid glossy reflections.** Use matte paper and no glossy lamination. If you must laminate, use matte laminate and
  tilt the lamp away from the camera's view.
- **Keep the marker continuously visible where possible.** The whole marker should be in the camera view. Hands and
  instruments covering it cause "Marker not detected". Use **❄ Hold overlay** to freeze the last pose during brief
  occlusions.
- Hold the device 25–45 cm from the marker, at up to about 60° from perpendicular. Very steep angles reduce accuracy.

## 4. Start AR

1. Serve over HTTPS on the local network: `npm run dev:https` (see README).
2. Tap **Start AR Session** → allow the camera.
3. The first load downloads the tracker (~1 MB gzip) and warms up TensorFlow.js, which takes a few seconds.
4. The badge shows **✕ Marker not detected** (red) until the marker is found, then **✓ Marker detected** (green), and
   the finger model appears.

## 5. Using a different marker image

`targets.mind` must be compiled **from the exact image you print**.

**Option A — in the app (no install):** *Instructor Mode → Marker tools → Choose marker image → Compile target*. Then:

- *Use on this device* stores the target in IndexedDB on that device only. AR shows "Using a custom marker compiled on
  this device".
- *Download targets.mind* lets you replace `public/marker/targets.mind` (and `marker.png`) so every device gets it.
- *Use built-in marker* switches back.

**Option B — command line (exact command):**

```bash
# Compile a custom image (copied to public/marker/marker.png) → public/marker/targets.mind
npm run marker:build -- --image ./my-marker.png

# Or generate a new random high-contrast marker and compile it
npm run marker:build -- --generate --seed 12345

# Just recompile the current public/marker/marker.png
npm run marker:build
```

This runs MindAR's own browser compiler in headless Chromium through `playwright-core`. Chromium is looked up in
`$CHROMIUM_PATH`, Playwright's browser cache, `/opt/pw-browsers`, and common Chrome/Chromium install paths. If none is
found, run `npx playwright install chromium` or use Option A or C.

**Option C — MindAR's official online compiler:** <https://hiukim.github.io/mind-ar-js-doc/tools/compile>. Upload the
image, click *Start*, download `targets.mind`, and place it in `public/marker/`. The compiler runs in your browser.

Good marker images have many sharp corners and high-contrast features spread across the whole image, no large empty
areas, no repeating patterns, and an asymmetric layout.

## 6. Troubleshooting unstable tracking

| Symptom | Likely cause → fix |
| --- | --- |
| Never detected | Wrong or mismatched `targets.mind` (recompile from the printed image); marker too small in view (move closer); poor light; glare |
| "Marker target file could not be loaded" | `public/marker/targets.mind` is missing, or `VITE_MARKER_TARGET_URL` is wrong |
| "Camera access requires HTTPS" | Open the `https://` URL (`npm run dev:https`), not `http://` |
| Camera permission denied | Allow camera for the site in browser settings (Chrome: lock icon → Permissions; iOS: Settings → Safari → Camera) |
| Overlay jitters | Improve light, use a larger marker (15 cm), hold the device steadier or closer, keep the whole marker in view, and avoid steep angles. Tracking smoothing lives in `appConfig.tracking` (`filterMinCF`, `filterBeta`: lower = smoother but more lag) |
| Overlay drifts or is offset | Marker not flat, marker moved after calibration, wrong `VITE_MARKER_SIZE_CM` (the cyan outline in the Calibration tab should match the printed square) → recalibrate |
| Detected, then lost when hands move in | The marker is occluded. Reposition it or use **Hold overlay** |
| Very slow on old devices | Close other apps/tabs and use a newer tablet. The tracker is GPU-accelerated (WebGL) |
| No AR at all | Use **Explore 3D Model**, which works without a camera or marker |

## Acceptance checklist

- [ ] `npm install` and `npm run dev` run without errors
- [ ] App opens in **Thai** by default; ไทย / English toggle works
- [ ] **Explore 3D Model** works with no camera
- [ ] **Start AR Session** asks for camera permission
- [ ] Red "Marker not detected" → green "Marker detected" when the marker is in view
- [ ] Right index finger model appears on the marker
- [ ] All layers toggle; Show all / Hide all work
- [ ] Label cards show Thai and English names
- [ ] Guided Simulation steps 1–7 work
- [ ] Assessment Mode hides internal anatomy; reveal works after "Learner finished"
- [ ] Calibration changes are visible live, persist after **Save** and reload
- [ ] Calibration JSON export/import works
- [ ] Quiz gives feedback and a score; history persists after reload
- [ ] Safety disclaimer is visible on every screen
