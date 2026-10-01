# Educational Safety Notice

## Required disclaimer

**ภาษาไทย**

> สื่อการเรียนรู้นี้ใช้สำหรับการฝึกกับหุ่นจำลองเท่านั้น ไม่ใช่เครื่องมือแนะนำตำแหน่งฉีดยาหรือการรักษาผู้ป่วยจริง
> ผู้เรียนต้องปฏิบัติตามแนวทางของสถาบันและอยู่ภายใต้การกำกับของอาจารย์ผู้สอน

**English**

> This educational tool is for mannequin-based simulation only. It is not intended to guide injection placement or
> treatment in real patients. Learners must follow institutional protocols and faculty supervision.

Short in-app notice (shown on every screen): *“Educational simulation only. Not for use as guidance on real patients.”*

## Intended use

- Spatial and anatomical **education** for medical students, on a **physical right-hand training mannequin**, under
  **faculty supervision**.
- Reviewing the relationships between surface landmarks and simplified internal structures of a right-hand finger (index, middle, ring or little),
  as a complement to lectures, cadaveric or clinical teaching, and institutional skills curricula.

## Not intended for

- Use on, or near, real patients, or any clinical decision.
- Determining injection sites, needle angles, depths, volumes, drugs or doses.
- Replacing clinical training, supervision, institutional protocols or professional guidelines.
- Assessment of clinical competence (Assessment Mode only times a mannequin exercise and lets the instructor reveal the
  model; it does not grade needle placement).

## Model limitations

- **No clinical validation has been performed.** Content has not been validated by a formal study.
- **All anatomy is simplified for teaching purposes.** Structures are procedural approximations (tapered tubes,
  lofted shells, idealised branching). The added surface detail (creases, fingerprint, vessel branches, pulleys)
  improves recognisability, but it is not patient-specific or dissection-accurate. Dimensions,
  positions, branching, variations and tissue planes are approximations. Real anatomy varies between individuals.
- "Safe learning zone", "avoid zone", "entry marker", "needle direction" and "simulated spread" are **labels of this
  mannequin teaching model**, not clinical recommendations. The spread animation is conceptual. It does not model
  volume, pressure, diffusion or pharmacology.
- **Needle Practice** feedback (target, near bundle, bone contact, nerve/artery/tendon, aspiration "blood", score)
  is computed against the schematic model geometry only. It does not reflect real tissue, real needle behaviour or
  safe technique on patients, and the score is a teaching aid, not a competence assessment.
- AR alignment can be off by millimetres to centimetres, depending on calibration, marker quality, lighting, device
  and viewing angle. The system does not see the mannequin's anatomy; it only follows the printed marker.

## Wording policy for contributors

- Use "In this mannequin model…", "For educational spatial understanding…", "model", "learning zone".
- Do **not** write patient-directed instructions ("inject here", "insert the needle to X mm", "safe for patients").
- Keep the persistent disclaimer on every screen. Don't remove or shorten the required Thai/English statements. A unit
  test checks their exact text.

## Privacy and data

- No accounts, no personal data, no analytics, and no network calls other than loading the app's own files.
- Camera frames are processed **locally** in the browser (TensorFlow.js/WebGL) and never uploaded or stored.
- Stored locally, on the device only: language, label preference, saved calibration, quiz attempts (time and score),
  and an optional instructor-compiled marker target (IndexedDB). *Instructor Mode → Clear all local data* removes
  calibration, quiz history and settings. Clearing site data in the browser removes everything.
- No external clinical or patient data are used anywhere in the application.

## Instructor passcode

The instructor passcode (`VITE_INSTRUCTOR_PASSCODE`) prevents accidental changes by learners. It is embedded in the
client-side bundle and is **not** an access-control or security mechanism.
