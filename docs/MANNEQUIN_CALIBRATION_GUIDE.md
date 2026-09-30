# Mannequin Calibration Guide

> ⚠️ Educational simulation only. Not for use as guidance on real patients. The overlay is a **simplified teaching
> model** aligned to a **mannequin**. Calibration improves visual alignment only; it does not make the model
> anatomically exact.

Mannequins differ in size, pose and how they sit on their base. Calibration tells the app where the virtual right index
finger sits relative to the printed marker. It is saved per device (browser `localStorage`) and can be exported and
imported as JSON.

---

## 1. What you need

- The printed marker (12 cm × 12 cm, see [AR_MARKER_SETUP_GUIDE.md](AR_MARKER_SETUP_GUIDE.md))
- A right-hand mannequin on a flat, stable base
- A ruler or tape measure (cm) and a flexible tape if available
- The tablet/phone running the app over HTTPS
- The instructor passcode (`VITE_INSTRUCTOR_PASSCODE`, default `2468`)

## 2. Where to attach the image marker

1. Attach the marker to a **flat base beside or under the right-hand mannequin**. The best position is just **proximal
   to the hand**, e.g. under the wrist on the base, so the camera can see the marker and the index finger in one view.
   Beside the hand, on the thumb (radial) side, is the next best.
2. Mount the marker on rigid card or foam board so it stays perfectly flat. Tape all four edges.
3. Point the yellow **TOP** arrow toward the **fingertips** (distal). The app assumes the finger runs roughly along the
   marker's TOP direction. Other placements are handled with *Rotate Z*.
4. The mannequin and the marker must **not move relative to each other** once calibrated. Fix the hand to the base
   (Velcro, screws or tape) or mark its outline on the base.

## 3. Measure the mannequin's right index finger

| Measurement | How | Calibration field |
| --- | --- | --- |
| **Finger length** | On the **volar** side, from the proximal finger crease (at the web space) to the fingertip, in cm | *Index finger length (cm)* |
| **Finger width** | Radial-to-ulnar width at the **middle of the proximal phalanx**, in cm | *Index finger width (cm)* |

The procedural model is built at 8.5 cm × 2.0 cm and is scaled non-uniformly to your measurements, so the internal
structures stay in proportion to the finger.

Also note roughly:

- The height of the dorsal surface of the proximal phalanx above the marker plane (→ **Z offset**).
- The distance from the marker centre to the index finger's MCP knuckle along and across the marker (→ **Y** and **X
  offsets**).

## 4. Calibrate

1. Landing page → **Instructor Mode** → enter the passcode.
2. Tap **Open AR to calibrate live**. The **Calibration** tab opens.
3. Point the camera at the marker until the badge shows **✓ Marker detected**. A **cyan outline** appears on the
   marker. If it doesn't match the printed square, the marker size setting is wrong (see the marker guide).
4. Tap **❄ Hold overlay** to freeze the pose if your hands get in the way, then release it to re-check.
5. Enter the measured **finger length** and **width**.
6. Adjust in this order, using the **−/+** buttons for fine steps:

   | Control | Meaning (marker space) | Typical use |
   | --- | --- | --- |
   | **Rotate Z** | Turn on the table (around the marker normal) | Align the finger's long axis with the mannequin finger |
   | **X offset** | Toward marker right (+) / left (−), cm | Slide sideways onto the index finger |
   | **Y offset** | Toward the marker TOP (+) / bottom (−), cm | Slide the finger base onto the proximal phalanx |
   | **Z offset (vertical height)** | Up from the marker plane, cm | Lift the model to the height of the mannequin finger |
   | **Rotate X** | Tilt (fingertip up or down) | Mannequin finger resting at an angle to the table |
   | **Rotate Y** | Roll around the finger axis | Mannequin hand slightly pronated or supinated |
   | **Scale** | Uniform size multiplier | Final touch after entering length and width |

### Align the virtual finger base with the proximal phalanx

- Switch to **Surface Landmarks** (the calibration tab stays available) and turn on **3D labels**.
- Match the virtual **MCP knuckle** dot to the mannequin's index MCP knuckle (dorsal), using **X/Y** and then **Z**.
- Match the **PIP crease** and **nail fold** labels to the mannequin's PIP joint and nail. If the tip overshoots or falls
  short, correct **finger length** rather than scale.
- The green **dorsolateral learning zones** should sit on both sides of the dorsal base of the proximal phalanx.

### Verify right-hand orientation

On a right hand viewed from the dorsal side with the fingers pointing away from you:

- The **nail** is on top (dorsal), and the **thumb** is on the **left**, which is the **radial** side.
- The app's orientation gizmo must show **Radial** toward the mannequin's thumb and **Distal** toward the fingertip.
- The **web space** landmark must be on the thumb side, and the yellow **radial digital nerve** label must be on the
  thumb side.
- If radial and ulnar look swapped, you are probably using a left-hand mannequin or viewing from the palm. This MVP
  supports the **right** hand only, so do not mirror it with negative scale.

7. Tap **Save calibration**. The badge changes to **Calibration: Saved**.
8. Optional: **Export JSON** and keep the file with the mannequin (e.g. `mannequin-A-calibration.json`), so other devices
   can **Import JSON** and then **Save**.

## 5. Test from several viewing angles

Check each view, holding the device 25–45 cm from the marker. The badge must stay **✓ Marker detected**, and the
overlay should stay on the mannequin within a few millimetres.

| View | What to check |
| --- | --- |
| **Dorsal** (from above) | Nail, MCP knuckle, learning zones and the finger's long axis line up |
| **Radial** (thumb side) | Web space landmark, radial learning zone and the radial nerve/artery run along the radial side |
| **Ulnar** (middle-finger side) | Ulnar learning zone and ulnar bundle on the correct side; finger height (Z) is right |
| **Oblique** (≈45° dorsoradial, then dorsoulnar) | Depth relationships: nerve volar to artery, both volar-lateral to the bone |

If one view is right but another is off, the error is usually in **Z** (height) or **Rotate X/Y** (tilt/roll). A
single view cannot resolve depth. The **3D Explorer** has the same Dorsal/Volar/Radial/Ulnar/Oblique presets and shows
the virtual marker, so you can sanity-check a calibration without the camera.

## 6. Recalibrate after moving the marker or mannequin

Recalibrate whenever:

- the marker is re-printed, re-mounted, peeled or bent;
- the mannequin moves on its base, or you swap mannequins;
- you move to a new device (import the JSON, then verify), or the browser data was cleared.

Quick recalibration: Instructor Mode → *Open AR to calibrate live* → check the MCP knuckle and nail landmarks → adjust
**X/Y/Rotate Z** first, then **Z** → **Save**. Use **Revert to saved** to undo unsaved changes, or **Reset to
defaults** to start over.

## 7. Calibration JSON format

```json
{
  "kind": "dnb-ar-trainer.calibration",
  "exportedAt": "2026-01-01T09:00:00.000Z",
  "note": "Mannequin overlay calibration. Educational simulation only.",
  "calibration": {
    "version": 1,
    "position": { "x": 0, "y": 7.5, "z": 2.5 },
    "rotationDeg": { "x": 0, "y": 0, "z": 0 },
    "scale": 1,
    "fingerLengthCm": 8.5,
    "fingerWidthCm": 2
  }
}
```

Units: position in cm from the marker centre; rotation in degrees (XYZ Euler). Imports are validated, and
out-of-range values are clamped to the slider limits.
