# Mannequin Calibration Guide (whole right hand, marker sticker on the dorsum)

> ⚠️ Educational simulation only. Not for use as guidance on real patients. The overlay is a **simplified teaching
> model** aligned to a **mannequin**. Calibration improves visual alignment only; it does not make the model
> anatomically exact.

The app is designed for a **whole right-hand mannequin** (for example an IV/injection training hand on a foam wrist
block). A small **marker sticker** sits in the **centre of the back of the hand**. The learner picks a
digit (**thumb, index, middle, ring or little**), and the anatomy overlay appears on that digit. The thumb uses its
own two-phalanx model.

Calibration is saved per device (browser `localStorage`) and can be exported and imported as JSON.

---

## 1. What you need

- The marker sticker: print it from **Print marker** on the landing page, 2 × 2 cm by default (2.5–3 cm tracks more steadily) (see
  [AR_MARKER_SETUP_GUIDE.md](AR_MARKER_SETUP_GUIDE.md))
- A thin rigid tile for the sticker (1–2 mm plastic or thick card, the same size as the marker) and double-sided tape
- A ruler or tape measure in cm
- The tablet or phone running the app over HTTPS
- The instructor passcode (`VITE_INSTRUCTOR_PASSCODE` or the `INSTRUCTOR_PASSCODE` GitHub secret; default `2468`)

## 2. Confirm it is a RIGHT hand

Place the hand **palm down** (nails up) with the **fingertips pointing toward you**, the way a patient's hand faces the
doctor during a digital block. On a right hand the **thumb is then on your right**. The app only supports right hands; radial and ulnar would be swapped on a left hand.

## 3. Attach the marker sticker

1. Stick the printed marker onto the rigid tile so it is perfectly flat. The dorsum of the hand is curved, and a bent
   marker tracks badly.
2. Fix the tile with double-sided tape in the **centre of the back of the hand**: over the middle-finger metacarpal,
   midway between the knuckles and the wrist, where the dorsum is flattest. The default calibration assumes the
   middle-finger knuckle is **4.5 cm distal** to the marker centre (**Y = +4.5**).
3. Point the yellow **TOP** arrow **toward the fingertips**, in line with the middle finger.
4. Set the mannequin's digits in **abduction** (spread apart, thumb radially abducted). The default finger angles
   assume this pose; correct each finger's **Splay** if your mannequin differs.
5. Once calibrated, the sticker must **not move**. Mark its outline on the mannequin with a pen so it can be replaced
   in the same spot.

## 4. Measure the fingers you will use

| Measurement | How | Calibration field |
| --- | --- | --- |
| **Finger length** | On the palm side, from the proximal finger crease (web) to the fingertip | *Finger length (cm)* |
| **Finger width** | Side to side at the middle of the proximal phalanx | *Finger width (cm)* |
| **Marker width** | The printed square, measured with a ruler | *Printed marker width (cm)* |

Each finger has adult-size defaults (index 8.0 × 1.9 cm, middle 8.8 × 1.9, ring 8.3 × 1.8, little 6.6 × 1.6), and you
only need to change the fingers you teach on.

## 5. Calibrate

1. Landing page → **Instructor Mode** → enter the passcode → **Open AR to calibrate live**. The **Calibration** tab
   opens.
2. Hold the device 12–20 cm above the hand until the badge shows **✓ Marker detected**. A **cyan outline** is drawn
   around the sticker. If the outline is bigger or smaller than the printed square, correct **Printed marker width**
   first. Everything else depends on it.
3. Use **❄ Hold overlay** to freeze the pose if your hands get in the way, then release it to re-check.

### A. Whole hand (do this first, with the middle finger selected)

Select **Middle**. The whole-hand values say where the **middle-finger knuckle** is relative to the marker centre
(default X 0, Y +4.5, Z −0.15 for a sticker in the centre of the back of the hand).

| Control | Meaning | Typical use |
| --- | --- | --- |
| **X** | Toward ulnar / marker right (+), cm | Sticker not on the middle-finger line (sticker radial → positive X) |
| **Y** | Toward fingertips / marker TOP (+), cm | Measure from the sticker centre to the middle knuckle with a ruler |
| **Z** | Height relative to the marker plane, cm | Default −0.15 (tile on a flat dorsum). More negative if the knuckle sits lower |
| **Tilt hand (X)** | Fingertips up or down | The mannequin's fingers slope toward the table |
| **Roll hand (Y)** | Rotation around the hand's long axis | Hand slightly tilted onto its side |
| **Turn hand (Z)** | Rotation on the table | TOP arrow not exactly in line with the middle finger |
| **Scale** | Uniform size | Small or large mannequin hand (after entering the marker width) |

Adjust until the virtual **middle finger** lies on the mannequin's middle finger. Check that the **MCP knuckle** dot
sits on the knuckle and the **nail fold** sits on the nail.

### B. Each finger you use

Select the digit (**Thumb / Index / Middle / Ring / Little**) and fine-tune:

| Control | Meaning |
| --- | --- |
| **Finger length / width** | The measured values |
| **Knuckle shift X/Y/Z** | Moves only this finger's knuckle (ulnar+, distal+, dorsal+), cm |
| **Splay** | Sideways angle of this finger (+ toward the thumb) |
| **Flexion** | Bend at the MCP joint (+ toward the palm). Mannequin fingers are often slightly flexed |
| **Roll** | Rotation about the digit's own long axis (− turns the nail toward the thumb side). Mainly for the **thumb**, which is pronated: start at −55° and turn until the virtual nail faces the same way as the mannequin's thumbnail |
| **Reset finger to default** | Restores this finger's defaults only |

Use **Surface Landmarks** mode with **3D labels** on, and match the **MCP knuckle**, **PIP crease**, **DIP crease**
and **nail fold** to the mannequin (thumb: **MCP knuckle**, **IP crease**, **nail fold** and the **first web space** on its
ulnar side). The thumb's knuckle sits well proximal and volar to the finger knuckles, so expect larger knuckle shifts. Correct a wrong fingertip position with **length** or **flexion**, not scale.

4. Tap **Save calibration**. The badge shows **Calibration: Saved**.
5. Optional: **Export JSON** and keep it with the mannequin (e.g. `hand-A-calibration.json`), so other tablets can
   **Import JSON** and then **Save**.

## 6. Verify right-hand orientation in the overlay

- The 3D orientation gizmo must show **Radial** toward the mannequin's **thumb** and **Distal** toward the fingertips.
- The **web space** landmark and the yellow **radial digital nerve** label must be on the thumb side of the selected
  finger.
- On the 2D orientation key, the highlighted finger and the yellow marker square must match your setup.

## 7. Test from several viewing angles

Hold the device 12–20 cm from a 2 cm sticker (up to ~25 cm for 3 cm). The badge must stay **✓ Marker detected**.

| View | What to check |
| --- | --- |
| **Dorsal** (from above) | Nail, MCP knuckle, the dorsolateral learning zones and the finger's long axis line up |
| **Radial** (thumb side) | Radial learning zone and the radial nerve/artery run along the thumb side of the finger |
| **Ulnar** | Ulnar learning zone and bundle on the little-finger side; finger height is right |
| **Oblique** (≈45°) | Depth: nerve volar to artery, both volar-lateral to the bone |

If one view is right but another is off, adjust **Z** or the finger's **knuckle shift Z** and **flexion**. A single
view cannot resolve depth. The **3D Explorer** (Dorsal/Volar/Radial/Ulnar/Oblique, with a faint virtual hand and the
sticker) shows the same calibration without the camera.

## 8. Recalibrate when…

- the sticker is replaced, peeled, bent or moved;
- you change to a different mannequin hand;
- you move to a new device (import the JSON, then check), or browser data was cleared;
- you start using a finger you have not fine-tuned yet.

Use **Revert to saved** to undo unsaved changes, or **Reset to defaults** to start again.

> Calibrations from the first version of the app (single index finger, marker on the table) cannot be imported. The
> geometry is different, so recalibrate.

## 9. Calibration JSON format (version 2)

```json
{
  "kind": "dnb-ar-trainer.calibration",
  "exportedAt": "2026-10-01T09:00:00.000Z",
  "note": "Mannequin hand overlay calibration. Educational simulation only.",
  "calibration": {
    "version": 2,
    "markerSizeCm": 5,
    "position": { "x": 0, "y": 0, "z": -0.2 },
    "rotationDeg": { "x": 0, "y": 0, "z": 0 },
    "scale": 1,
    "fingers": {
      "index":  { "offset": { "x": 0, "y": 0, "z": 0 }, "flexionDeg": 0, "splayDeg": 6,   "lengthCm": 8.0, "widthCm": 1.9 },
      "middle": { "offset": { "x": 0, "y": 0, "z": 0 }, "flexionDeg": 0, "splayDeg": 0,   "lengthCm": 8.8, "widthCm": 1.9 },
      "ring":   { "offset": { "x": 0, "y": 0, "z": 0 }, "flexionDeg": 0, "splayDeg": -5,  "lengthCm": 8.3, "widthCm": 1.8 },
      "little": { "offset": { "x": 0, "y": 0, "z": 0 }, "flexionDeg": 0, "splayDeg": -12, "lengthCm": 6.6, "widthCm": 1.6 }
    }
  }
}
```

Units: cm and degrees. Hand frame: origin = middle-finger MCP knuckle (dorsal skin), +X ulnar, +Y distal, +Z dorsal.
Default knuckle positions (before **knuckle shift**): index (−2.0, −0.3, −0.25), middle (0, 0, 0), ring (1.8, −0.4,
−0.3), little (3.4, −1.3, −0.8), defined in `src/config/hand.ts`. Imports are validated, and out-of-range values are
clamped.
