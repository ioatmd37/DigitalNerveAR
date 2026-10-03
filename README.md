# SimPlastic - DNBAR

**Digital Nerve Block AR Trainer** — developed by
[Phachara Longmeewong, MD FRCST (ThPRS)](https://www.linkedin.com/in/longpcr).

**Right-Hand Finger Anatomy on a Mannequin** — a mobile-first, marker-based WebAR teaching aid for medical students
practising a digital nerve block **on a whole right-hand training mannequin** (index, middle, ring or little finger).

> ⚠️ **Educational simulation only. Not for use as guidance on real patients.**
>
> สื่อการเรียนรู้นี้ใช้สำหรับการฝึกกับหุ่นจำลองเท่านั้น ไม่ใช่เครื่องมือแนะนำตำแหน่งฉีดยาหรือการรักษาผู้ป่วยจริง
> ผู้เรียนต้องปฏิบัติตามแนวทางของสถาบันและอยู่ภายใต้การกำกับของอาจารย์ผู้สอน
>
> This educational tool is for mannequin-based simulation only. It is not intended to guide injection placement or
> treatment in real patients. Learners must follow institutional protocols and faculty supervision.
>
> **No clinical validation has been performed.** All anatomy is **simplified for teaching purposes**. See
> [docs/EDUCATIONAL_SAFETY_NOTICE.md](docs/EDUCATIONAL_SAFETY_NOTICE.md).

---

## Contents

- [Project overview](#project-overview)
- [Features](#features)
- [Technology stack](#technology-stack)
- [Local installation](#local-installation)
- [Running the development server](#running-the-development-server)
- [Using a tablet or phone on the local network](#using-a-tablet-or-phone-on-the-local-network)
- [Deploying to GitHub Pages](#deploying-to-github-pages)
- [Needle Practice (virtual needle)](#needle-practice-virtual-needle)
- [OSCE Station (virtual, faculty rubric)](#osce-station-virtual-faculty-rubric)
- [Printing and using the image marker](#printing-and-using-the-image-marker)
- [Calibrating the mannequin](#calibrating-the-mannequin)
- [Architecture and developer notes](#architecture-and-developer-notes)
- [Replacing the procedural model with GLB/GLTF](#replacing-the-procedural-model-with-glbgltf)
- [Testing and quality checks](#testing-and-quality-checks)
- [Educational and safety limitations](#educational-and-safety-limitations)
- [Future roadmap](#future-roadmap)

## Project overview

A small marker sticker is fixed in the **centre of the back of a right-hand mannequin** (digits abducted). The learner
chooses a digit (**thumb, index, middle, ring or little**) and points a tablet or phone camera at the hand. When the marker is recognised, a 3D, layered, **simplified** digital anatomy model is overlaid on the
selected digit. The model shows skin, subcutaneous tissue, phalanges, the flexor and extensor tendons, the radial and
ulnar palmar digital nerves and arteries, the dorsal digital nerves, optional dorsal veins, dorsolateral learning zones, a volar avoid zone, model needle entry markers,
direction arrows, and an animated conceptual "spread" visualisation.

**Digit layouts** (`src/three/anatomy/layout.ts`, shared by the 3D model and the needle evaluator):

| Digit | What differs |
| --- | --- |
| Index, middle, ring | Three phalanges; FDS + FDP with A1–A5 pulleys; extensor hood; webs on both sides; dorsal digital nerves (superficial radial; ulnar side of the ring finger from the dorsal branch of the ulnar nerve) reach about the PIP |
| Little | Same skeleton; **no web on the ulnar side** (that bundle comes straight from the hypothenar region); dorsal digital nerves (dorsal branch of the ulnar nerve) reach about the **DIP**; palmar dorsal branches only to the distal phalanx |
| Thumb | **Two phalanges, one IP joint**; first metacarpal with two sesamoids; **FPL only** (no FDS) with A1, oblique and A2 pulleys; **EPL and EPB** instead of a hood; first web on its **ulnar** side only; dorsal digital nerves (superficial radial) reach the **nail fold**; pronated about its long axis (calibration **Roll**) |

The structure card shows each nerve's and artery's usual origin for the selected digit (median / ulnar / radial
nerve; superficial arch, radialis indicis, princeps pollicis), and the Anatomy panel lists key points per digit.
Variations are common; this is a teaching model.

A **3D Explorer** provides the same content without a camera. Calibration can be previewed there too, because a faint
virtual hand with the marker sticker is drawn around the selected finger.

The UI defaults to **Thai**, with an in-app ไทย / English toggle.

## Features

| Area | What it does |
| --- | --- |
| Landing screen | Title, subtitle, persistent safety notice, **Start AR Session**, **Explore 3D Model**, **Instructor Mode**, marker instruction, print-marker link |
| AR camera | Requests camera permission, tracks the printed marker (MindAR, fully on-device), shows a red "Marker not detected" / green "Marker detected" badge, anchors the model to the marker through the saved calibration, **Hold overlay** button to freeze the pose while the marker is occluded, clear error screens (HTTPS, permission, missing target) with a fallback to the 3D Explorer |
| 3D Explorer | Works without a camera; orbit/zoom; one-tap **Dorsal / Volar / Radial / Ulnar / Oblique** views; virtual marker on a table |
| Surface Landmark Mode | Surface only: MCP knuckle, radial web space, PIP/DIP creases, nail fold, and the two dorsolateral learning zones. Internal anatomy hidden |
| Anatomy Overlay Mode | Translucent skin, bone, tendon, nerves, arteries, optional veins. **Tap-to-label** in 3D or from the legend |
| Layer-by-Layer Mode | 14 toggleable layers (skin, subcutaneous, bone, tendon, nerves, arteries, veins, safe zones, avoid zone, entry markers, needle path, simulated spread, landmarks, orientation), **Show all / Hide all**, labels toggle |
| Guided Simulation | 7-step, non-clinical sequence (orientation → bundles → learning zones → entry markers → direction arrows → simulated spread → safety concepts) with highlighted structures |
| Needle Practice | Virtual needle on the mannequin model (AR or 3D): tap the finger to choose an entry point, set the angle and tilt, advance the depth. Live model feedback (tissue / target beside the bone / near the bundle / bone contact / nerve, artery, tendon, volar avoid zone, through-and-through), aspiration check, simulated injection spread at the needle tip, and a 4-point checklist per side for the current session only. A "blind practice" switch hides internal anatomy |
| Knowledge Check | 5 multiple-choice questions with immediate feedback, highlighted structures, a final score, and history in **local storage only** |
| Instructor Mode | Passcode from `.env`, calibration panel (X/Y/Z, rotation X/Y/Z, scale, measured finger length/width), save/reset/revert, export/import JSON, show/hide all structures, start assessment, **in-browser marker compiler** |
| Assessment Mode | Surface-only overlay, no labels or tap-to-label, timer (start/pause/finish), **Reveal anatomy for feedback** after the learner finishes; no auto-grading |
| Realistic procedural anatomy | Textured skin (flexion creases, knuckle wrinkles, fingerprint, colour variation) with sheen; a nail with lunula; phalanx-shaped bones; FDP and FDS (Camper's chiasm) in a translucent sheath with A1–A5 pulleys; a dorsal extensor mechanism; tapering, slightly tortuous digital arteries and nerves that join their common digital trunks toward the web, with condylar arches, a pulp arcade, dorsal branches and terminal nerve branches; a dorsal vein network; an anatomical context hand (palm, eminences, thumb, nails); locally generated studio lighting. Still **simplified**: see limitations |
| Accessibility | Large (≥48 px) touch targets, and every structure has a **symbol** (N, A, V, T, B, ✓, ⚠, ◎, ➜, ◍) in addition to its colour. The avoid zone is **hatched** and the learning zones are **dotted** |
| Orientation | 3D axis gizmo (Dorsal/Volar/Radial/Ulnar/Proximal/Distal) attached to the model plus a 2D right-hand orientation key |
| Privacy | No accounts, no analytics, no uploads. Camera frames are processed locally in the browser |

Colour key: nerves **yellow**, arteries **red**, veins **blue**, tendon **white/light grey**, bone **ivory**, skin
**semi-transparent skin tone**, learning zones **transparent green (dotted)**, avoid zone **transparent red (hatched)**,
needle path **cyan arrows**, entry points **green circles**.

## Technology stack

- **React 19 + TypeScript + Vite 8**
- **Three.js**, **React Three Fiber** and **drei** for the 3D Explorer
- **MindAR** (`mind-ar`) image tracking. The app uses MindAR's `Controller` and `Compiler` directly (see
  `src/ar/MarkerTracker.ts`) because MindAR's bundled `MindARThree` helper is incompatible with current three.js
- **Tailwind CSS v4**
- **Zustand** (with `persist` → `localStorage`) for app state
- **Vitest** unit tests, **ESLint** (typescript-eslint)
- `playwright-core` (dev only) to compile the marker target in headless Chromium

No paid APIs, cloud services or external 3D assets. The anatomy is procedural geometry generated in code.

## Local installation

Requirements: **Node.js 20+** (tested with Node 22) and npm.

```bash
npm install
cp .env.example .env.local   # optional: change the instructor passcode etc.
```

> **Why `overrides` in package.json?** `mind-ar` declares `canvas` (node-canvas, a native Cairo module) as a
> dependency, but only for its Node.js offline compiler. The browser build never uses it. The override aliases it to
> `empty-npm-package`, so `npm install` needs no native build tools. It also pins mind-ar's nested
> `@vitejs/plugin-basic-ssl` to the Vite-8-compatible v2.

## Running the development server

```bash
npm run dev          # http://localhost:5173 (camera works on localhost)
```

Open **Explore 3D Model** first. It needs no camera or marker.

Other scripts:

| Script | Purpose |
| --- | --- |
| `npm run dev:host` | Dev server exposed on the LAN over **HTTP** (3D Explorer only; mobile browsers block the camera over HTTP) |
| `npm run dev:https` | Dev server exposed on the LAN over **HTTPS** (self-signed), required for AR on a tablet/phone |
| `npm run build` | Type-check and build the static site into `dist/` |
| `npm run preview` | Serve the production build on the LAN over HTTPS |
| `npm run lint` / `npm run typecheck` / `npm test` | Quality checks |
| `npm run check` | All of the above plus the build |
| `npm run marker:build` | Re-compile `public/marker/targets.mind` from `public/marker/marker.png` (see below) |

## Using a tablet or phone on the local network

Mobile browsers only allow camera access in a **secure context** (HTTPS or `localhost`).

1. Connect the computer and the tablet/phone to the **same Wi-Fi network**.
2. Run:
   ```bash
   npm run dev:https
   ```
   Vite prints something like:
   ```
   ➜  Local:   https://localhost:5173/
   ➜  Network: https://192.168.1.23:5173/
   ```
3. On the tablet, open the **Network** URL.
4. The certificate is self-signed, so accept the warning once:
   - **Android Chrome**: *Advanced → Proceed to 192.168.x.x (unsafe)*.
   - **iPad/iPhone Safari**: *Show Details → visit this website → Visit Website*.
5. Tap **Start AR Session** and allow camera access.

Tips:

- If the page does not load, allow Node.js through the computer's firewall on port 5173, or check whether the Wi-Fi
  uses "client isolation" (common on guest networks).
- For a trusted certificate (no warning), create one with [mkcert](https://github.com/FiloSottile/mkcert), install
  its root CA on the tablet, and configure `server.https` in `vite.config.ts`.
- **Static deployment:** `npm run build` produces `dist/`, a fully static site (relative paths via `base: './'`). Host it
  on any HTTPS static host or an institutional web server.

## Deploying to GitHub Pages

`.github/workflows/deploy-pages.yml` lints, tests, builds and publishes the site on every push to `main` (or the
current development branch), and it can also be run manually from the **Actions** tab.

One-time setup:

1. Repository **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Optional: **Settings → Secrets and variables → Actions → New repository secret** named `INSTRUCTOR_PASSCODE`.
   Without it, the default passcode `2468` is used.
3. Push, or re-run the workflow. The site appears at `https://<user>.github.io/<repo>/`, for example
   `https://ioatmd37.github.io/DigitalNerveAR/`.

GitHub Pages is HTTPS, so the AR camera works on tablets and phones. Pages on a **private** repository requires a paid
GitHub plan. The published site is public. It collects no data, and the instructor passcode only prevents accidental
changes.

## Needle Practice (virtual needle)

The **💉 Needle Practice** tab lets learners rehearse the **dorsolateral** approach on the selected finger:

1. Choose **Radial** or **Ulnar**, or tap the finger to set the entry point.
2. Set the **angle toward the palm** and **tilt**, then increase **Depth**. The tip marker and the status card turn:
   - **green** at the model target beside the bone;
   - **amber** for bone contact or near the bundle;
   - **red** in the model nerve, artery, tendon or volar avoid zone, or when the needle passes through the far side.
3. **Aspirate:** the syringe fills red if the tip is in the model artery. Any needle movement invalidates the previous
   aspiration.
4. **Inject (simulated)** shows a conceptual spread at the tip and scores the side out of 4. Each point is one check:
   entry in the learning zone, no red events during the attempt, aspirated with no blood before injecting, and injected
   at the model target.

Turn off **Show anatomy** for blind practice. Results are kept for the current session only. The feedback comes from
the simplified layout in `src/three/anatomy/layout.ts`, evaluated by `src/logic/needle.ts` (unit-tested). It describes
**this teaching model only**: it is not a judgement of real anatomy or real technique, and not guidance for patients.
With a GLB model, the feedback still uses the procedural layout.

## OSCE Station (virtual, faculty rubric)

The **📋 OSCE Station** tab runs the Digital nerve block OSCE station as a virtual exercise on the mannequin model. It is
scored with the faculty rubric in **`src/config/osceRubric.ts`**, where faculty can edit the item text, the
10/6/0-style points, accepted equipment and drugs, volume limits, the time limit and the 60/100 pass mark.

Steps the learner performs (the order and the time are recorded):

1. Choose the syringe and needle size. 2. Choose the drug. 3. Draw up a volume. 4. For each side, choose the side,
   tap the finger to place the needle, advance it, aspirate, set the volume and inject. 5. Test fingertip numbness.
   Then finish.

| Rubric item | How the app scores it |
| --- | --- |
| 1.1 Equipment, 1.2 Drug, 1.3 Draw ≤ 5 ml | From the choices made |
| 1.4 Landmark, 1.5 Needle to near the palmar side | Virtual needle: entry in the landmark zone; tip at the model target with no red events, on both sides |
| 1.6 Aspirate before injecting | Aspirated (no blood) at the injection position before injecting; "remembered after" counts as incomplete |
| 1.7 1–2 ml per site | Injected volume per side (limited by what was drawn) |
| 1.8 Fingertip numbness test | Done after both sides were injected |
| 2.1 Sequence and time | Order equipment → drug → draw → inject → test, within the time limit; gentleness is left to the instructor |
| 2.2 Both ulnar and radial | Both sides injected |
| 1.9 Aseptic, 1.10 Re-capping, 2.3 Needle safety, contamination deductions | **Not observable by the app.** Shown as "assessed by the instructor" (15 points) |

The result screen shows each item with its level (complete / incomplete / not done / instructor), the reason, the
automatic score out of 85, and the time used. Attempts are stored on this device only. This is a **practice aid**: the
automatic score is not an official OSCE result, and the real station is judged by the examiner on the physical
mannequin.

## SIMPLE technique scene (teacher only)

A 3D walkthrough of Lalonde's **SIMPLE** block (*Single subcutaneous Injection in the Middle of the Proximal phalanx
with Lidocaine and Epinephrine*) is available **only after unlocking Instructor Mode** (*Instructor Mode → Open the
SIMPLE technique scene*, or the **Instructor** group of the mode picker). Learners never see it; locking Instructor
Mode closes it.

Six steps on the selected digit (the explorer switches to the volar view and hides the palm-down table, because the
hand is turned palm-up for this injection): the volar-midline site halfway along the proximal phalanx, the anatomy
under it (palmar nerves volar-lateral, flexor sheath deep: the injection stays subcutaneous, not transthecal), a fine
needle into the subcutaneous fat, the slow volar injection whose bleb spreads to both palmar digital nerves, the
optional dorsal top-up over the proximal phalanx, and teaching points. The overlay lives in
`src/three/teaching/SimpleOverlay.ts`, the steps in `src/config/simpleSteps.ts`, the text under `simple.*` in the
locale files. It is a teaching summary on a simplified model; present it with the original literature and the
institutional protocol. Because the marker is on the back of the hand, this scene is meant for the 3D model rather
than live AR.

## Printing and using the image marker

- The marker image is `public/marker/marker.png` and its compiled MindAR target is `public/marker/targets.mind`. Both are
  included and ready to use.
- Open **Print marker** on the landing page (`/marker/print.html`), choose a size (**2 cm recommended**; 2.5–3 cm tracks more steadily), and print at
  **100 % / Actual size** on matte sticker paper. Measure the printed square and enter it in *Calibration → Printed
  marker width*.
- Mount the sticker on a thin rigid tile and fix it in the **centre of the back of the right mannequin hand** (over
  the middle-finger metacarpal, about 4.5 cm proximal to the knuckle), with the yellow **TOP** arrow pointing toward
  the fingertips. Set the digits in abduction.

Full instructions, lighting tips and troubleshooting: **[docs/AR_MARKER_SETUP_GUIDE.md](docs/AR_MARKER_SETUP_GUIDE.md)**.

### Using your own marker image

MindAR needs a compiled `.mind` target file. Three options, all local and free:

1. **In-app:** *Instructor Mode → Marker tools → Choose marker image → Compile target*, then *Download targets.mind*
   (to ship it) and/or *Use on this device* (stored in IndexedDB).
2. **Command line** (headless Chromium via `playwright-core`):
   ```bash
   npm run marker:build -- --image path/to/your-marker.png   # copies to public/marker/marker.png and compiles
   npm run marker:build -- --generate --seed 42              # generate a new random marker, then compile
   ```
   Set `CHROMIUM_PATH=/path/to/chrome` if Chromium is not found automatically.
3. **MindAR's official online compiler** (runs in your browser):
   <https://hiukim.github.io/mind-ar-js-doc/tools/compile>. Save the result as `public/marker/targets.mind`.

## Calibrating the mannequin

Hands differ, so calibration has three parts:

1. *Instructor Mode* → enter the passcode (default `2468`, set with `VITE_INSTRUCTOR_PASSCODE` or the
   `INSTRUCTOR_PASSCODE` GitHub secret) → *Open AR to calibrate live*. A cyan outline appears on the detected sticker.
2. **Marker sticker:** the printed width.
3. **Whole hand:** where the middle-finger knuckle is relative to the marker (X/Y/Z, tilt/roll/turn, scale).
4. **Selected finger:** length, width, knuckle shift, splay and flexion for each finger you teach on.
5. **Save calibration** (stored in `localStorage`). Use **Export JSON** / **Import JSON** to move calibrations between
   devices.

Step-by-step guide: **[docs/MANNEQUIN_CALIBRATION_GUIDE.md](docs/MANNEQUIN_CALIBRATION_GUIDE.md)**.

## Architecture and developer notes

```
src/
├─ config/                 ← configuration-first content (review without reading 3D code)
│  ├─ anatomy.ts           ← layers + structures: ids, Thai/English names, colours, symbols, notes, warnings
│  ├─ guidedSteps.ts       ← the 7 guided steps (layers + highlighted structures per step)
│  ├─ quiz.ts              ← knowledge-check questions (text in locales)
│  ├─ appConfig.ts         ← env-driven settings, default calibration, slider limits
│  ├─ hand.ts              ← finger presets (default knuckle positions, splay, size) on a right hand
│  └─ locales/{th,en}.ts   ← every UI string; `th` must match `en` keys (typed + tested)
├─ types/index.ts          ← AnatomyLayer, AnatomyStructure, LearningMode, CalibrationSettings, QuizQuestion,
│                             QuizAttempt, SessionState, InstructorSettings, ViewState …
├─ logic/                  ← pure, unit-tested functions
│  ├─ visibility.ts        ← computeViewState(mode, toggles, step, assessment) → what the 3D model shows
│  ├─ calibration.ts       ← clamp / export / parse+validate calibration JSON
│  ├─ quiz.ts, timer.ts
├─ store/useAppStore.ts    ← Zustand store (persisted: language, saved calibration, quiz attempts, labels)
├─ three/
│  ├─ anatomy/AnatomyModel.ts          ← AnatomyModel interface + shared base (layers, labels, highlight, picking)
│  ├─ anatomy/ProceduralFingerModel.ts ← procedural right-hand finger (named hierarchy)
│  ├─ anatomy/GltfAnatomyModel.ts      ← GLB adapter (replaces structures by node name)
│  ├─ anatomy/createAnatomyModel.ts    ← factory (procedural or GLB with fallback)
│  ├─ anatomy/geometry.ts, textures.ts
│  ├─ HandRig.ts, handPlacement.ts    ← marker → hand → selected finger → model
├─ explorer/ExplorerView.tsx           ← React Three Fiber scene (no camera)
├─ ar/MarkerTracker.ts, ARView.tsx     ← MindAR tracking + three.js rendering (lazy-loaded chunk)
├─ ar/targetStore.ts                   ← bundled or instructor-compiled (IndexedDB) target loading
├─ hooks/                              ← useAnatomyModel (create/sync/dispose), useViewState
├─ components/ + components/panels/    ← UI (tray/side panel, badges, cards, mode panels)
└─ screens/                            ← Landing, Viewer (AR/Explorer shell), Instructor, Marker compiler
```

Key design points:

- **One model, two renderers.** The anatomy is a plain `THREE.Object3D` behind the `AnatomyModel` interface. The
  Explorer mounts it with `<primitive>` in React Three Fiber. AR mounts the same object under the MindAR anchor.
  Visibility, labels, highlighting, picking and animation live in the model, so both views behave the same.
- **Anatomical frame:** `+X` ulnar, `−X` radial, `+Y` distal, `+Z` dorsal, in centimetres. The finger base (web crease)
  is at `y = 0`.
- **Marker space:** origin at the marker centre, `+X` right, `+Y` towards the marker's TOP arrow, `+Z` out of the
  paper. MindAR measures in marker widths, so the rig scales by `1 / markerSizeCm` and calibration is always in cm.
- **Hand rig** (`src/three/HandRig.ts`, `handPlacement.ts`), shared by AR and the Explorer:
  `anchor → markerSpace (cm) → hand (whole-hand calibration; origin = middle-finger knuckle) → finger (default
  knuckle from src/config/hand.ts + knuckle shift, flexion, splay) → model`. One generic digit model is reused for
  every finger and scaled to that finger's length and width.
- **Localisation:** add a language by copying `src/config/locales/en.ts`, adding it to `MESSAGES`/`LANGUAGES`, and
  extending `Language` and the `LocalizedText` fields in `anatomy.ts`. The config test catches missing keys.
- **Bundle:** the 3D Explorer and AR (MindAR + TensorFlow.js, ~1 MB) are separate lazy chunks. The landing page stays
  light.

## Replacing the procedural model with GLB/GLTF

1. Model **one** right-hand finger in **centimetres** (it is reused and scaled for every finger) in the anatomical frame above (`+X` ulnar, `+Y` distal, `+Z`
   dorsal), with the finger base (web crease) at the origin. In Blender (Z-up), export with *+Y Up* and check the axes.
2. Name each mesh or node with a **structure id** from `src/config/anatomy.ts`, e.g. `skin`, `nail`, `subcutaneous`,
   `phalanx_proximal`, `phalanx_middle`, `phalanx_distal`, `metacarpal_head`, `flexor_tendon`, `nerve_radial`,
   `nerve_ulnar`, `artery_radial`, `artery_ulnar`, `vein_radial`, `vein_ulnar`. Alternatively, set a glTF extras property
   `structureId`.
3. Save it as `public/models/right-index-finger.glb` and set:
   ```ini
   VITE_MODEL_SOURCE=gltf
   VITE_MODEL_GLTF_URL=models/right-index-finger.glb
   ```
4. Restart the dev server. `GltfAnatomyModel` starts from the procedural model and **replaces only the structures found
   in the GLB**. The teaching overlays (zones, entry markers, arrows, spread, orientation gizmo) remain, and any
   structure missing from the GLB keeps its procedural placeholder. If the GLB fails to load, the app logs a warning and
   uses the procedural model.
5. If the GLB anatomy differs, adjust the overlay coordinates in `ProceduralFingerModel.ts` (`buildZones`,
   `buildEntryAndNeedle`, `buildInjectate`) and have faculty review them.

To write a completely different model, implement the `AnatomyModel` interface (or extend `BaseAnatomyModel`) and return
it from `createAnatomyModel()`.

## Testing and quality checks

```bash
npm run lint && npm run typecheck && npm test && npm run build   # or: npm run check
```

The unit tests (`src/**/*.test.ts`) cover:

- Locale key parity between Thai and English, and the exact required disclaimers.
- Anatomy config completeness and the colour scheme.
- Guided/quiz config validity.
- View-state rules for each mode (e.g. assessment hides internal anatomy).
- Calibration export → import round-trip, validation and clamping.
- Quiz scoring and storage cap; the timer.
- Store flows: passcode, calibration save/revert, persistence, assessment reveal-after-finish.
- The procedural model: named hierarchy for every structure, right-hand radial/ulnar sides, volar/dorsal
  relationships, a needle tip that stays outside the nerve, layer visibility, and picking that prefers inner structures
  over the skin.

Manual acceptance checks (camera/marker) are listed in [docs/AR_MARKER_SETUP_GUIDE.md](docs/AR_MARKER_SETUP_GUIDE.md#acceptance-checklist).

## Educational and safety limitations

- **Mannequin simulation only.** Not a medical device, not clinical decision support, and not for real patients.
- **No clinical validation has been performed.**
- **All anatomy is simplified** and schematic. It is plausible and internally consistent, not patient-specific or
  clinically exact. Real anatomy varies.
- "Safe learning zones", "avoid zone", entry markers, arrows and "spread" are **teaching illustrations for this
  mannequin model**. They do not determine safe injection sites, and the spread animation does not model volume,
  pressure or pharmacology.
- AR alignment depends on the marker, lighting, calibration and device. The overlay can drift or jitter and never "sees"
  the mannequin itself.
- Learners must follow **institutional protocols** and **faculty supervision**.
- **Privacy:** no personal data is collected. Camera frames stay on the device. Only calibration, language, label
  preference and quiz scores are stored, in this browser's local storage (plus an optional custom marker in IndexedDB).
  *Instructor Mode → Clear all local data* removes them.
- The instructor passcode is a convenience lock embedded in the client bundle, **not** a security control.

## Future roadmap

- Faculty-reviewed high-fidelity GLB hand model (with anatomical variants).
- Left-hand mode and other blocks (e.g. web-space and transthecal techniques as separate modules).
- Multi-marker or object tracking for more robust alignment, and WebXR hit-testing where supported.
- Occlusion (depth) so the physical finger can hide virtual structures behind it.
- Tracked physical needle (fiducial on a practice syringe) with **mannequin-only** proximity feedback.
- Instructor dashboard with export of anonymised, local-only session summaries (CSV).
- More quiz banks, spaced repetition, and additional languages.
- PWA/offline install for classrooms without internet.
- Formal usability study and faculty content validation.
