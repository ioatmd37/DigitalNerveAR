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
| `public/marker/print.html` | A print page with a size picker (4–12 cm, 5 cm recommended) and several copies per sheet |
| `scripts/build-marker.mjs` | Generates and/or compiles the marker (`npm run marker:build`) |

## 1. Print the marker sticker

1. Open the app → **Print marker** (or `https://<host>/marker/print.html`).
2. Choose the size. **5 cm is recommended** for the back of an adult mannequin hand. Use 6 cm if detection is
   unreliable and the hand is large enough, or 4 cm for a small hand.
3. Print at **100 % / Actual size**, with "Fit to page" **disabled**, on **matte** sticker paper. **Print without
   distortion**: both sides must be equal.
4. Measure the printed square with a ruler and enter it in **Instructor Mode → Calibration → Printed marker width**.
   Everything is measured in cm from this value, so an incorrect width makes the overlay too big or too small.

## 2. Mount it on the mannequin hand

- **Use a high-contrast, detailed image marker.** The supplied marker has bold shapes designed to work at sticker
  size. Plain, symmetric or repetitive images track poorly.
- **Keep it flat and stable.** The back of the hand is curved, so stick the marker onto a **thin rigid tile** (1–2 mm
  plastic or thick card) first. A bent sticker causes drift and jitter.
- Fix the tile with double-sided tape on the **back of the right hand, centred over the middle-finger MCP knuckle**.
  If it rocks on the knuckle, move it 1–2 cm toward the wrist and set **Y** in calibration (see the calibration guide).
- Point the yellow **TOP** arrow toward the **fingertips**, in line with the middle finger.
- Once calibrated, **do not move the sticker**. Outline it with a pen so it can be replaced in the same place.

## 3. Environment

- **Ensure adequate lighting.** Use even, diffuse light (room light plus a desk lamp). Avoid strong shadows across the
  marker.
- **Avoid glossy reflections.** Use matte paper and no glossy lamination. If you must laminate, use matte laminate and
  tilt the lamp away from the camera's view.
- **Keep the marker continuously visible where possible.** The whole marker should be in the camera view. Hands and
  instruments covering it cause "Marker not detected". Use **❄ Hold overlay** to freeze the last pose during brief
  occlusions.
- Hold the device **20–35 cm** from the sticker (the marker should fill at least about ⅙ of the screen width), at up to
  about 60° from perpendicular. Very steep angles reduce accuracy.

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
| Never detected | Wrong or mismatched `targets.mind` (recompile from the printed image, or re-print: the marker design changed in this version); sticker too small in view (move closer); poor light; glare |
| "Marker target file could not be loaded" | `public/marker/targets.mind` is missing, or `VITE_MARKER_TARGET_URL` is wrong |
| "Camera access requires HTTPS" | Open the `https://` URL (`npm run dev:https`), not `http://` |
| Camera permission denied | Allow camera for the site in browser settings (Chrome: lock icon → Permissions; iOS: Settings → Safari → Camera) |
| Overlay jitters | Improve light, use a larger sticker (6 cm), make sure it is on a rigid tile, hold the device steadier or closer, keep the whole marker in view, and avoid steep angles. Tracking smoothing lives in `appConfig.tracking` (`filterMinCF`, `filterBeta`: lower = smoother but more lag) |
| Overlay drifts or is offset | Marker not flat, sticker moved after calibration, or wrong *Printed marker width* (the cyan outline in the Calibration tab should match the printed square) → recalibrate |
| Detected, then lost when hands move in | The sticker is covered by the learner's hand or the needle. Approach from the side, or use **Hold overlay** |
| Very slow on old devices | Close other apps/tabs and use a newer tablet. The tracker is GPU-accelerated (WebGL) |
| No AR at all | Use **Explore 3D Model**, which works without a camera or marker |

## Acceptance checklist

- [ ] `npm install` and `npm run dev` run without errors
- [ ] App opens in **Thai** by default; ไทย / English toggle works
- [ ] **Explore 3D Model** works with no camera
- [ ] **Start AR Session** asks for camera permission
- [ ] Red "Marker not detected" → green "Marker detected" when the marker is in view
- [ ] The finger model appears on the selected mannequin finger (index / middle / ring / little)
- [ ] All layers toggle; Show all / Hide all work
- [ ] Label cards show Thai and English names
- [ ] Guided Simulation steps 1–7 work
- [ ] Assessment Mode hides internal anatomy; reveal works after "Learner finished"
- [ ] Calibration changes are visible live, persist after **Save** and reload
- [ ] Calibration JSON export/import works
- [ ] Quiz gives feedback and a score; history persists after reload
- [ ] Safety disclaimer is visible on every screen
