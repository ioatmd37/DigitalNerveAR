import { describe, expect, it } from 'vitest';
import { DEFAULT_CALIBRATION } from '../config/appConfig';
import { DEFAULT_LAYER_VISIBILITY, INTERNAL_LAYERS } from '../config/anatomy';
import { GUIDED_STEPS } from '../config/guidedSteps';
import { QUIZ_QUESTIONS } from '../config/quiz';
import { calibrationEquals, clampCalibration, exportCalibration, parseCalibration } from './calibration';
import { appendAttempt, createAttempt, MAX_STORED_ATTEMPTS, scoreAnswers } from './quiz';
import { elapsedMs, formatDuration } from './timer';
import { computeViewState, showsInternalAnatomy, type VisibilityInput } from './visibility';

const base: VisibilityInput = {
  mode: 'anatomy',
  userLayers: DEFAULT_LAYER_VISIBILITY,
  showLabels: true,
  guidedStep: 0,
  assessment: { revealed: false },
};

describe('computeViewState', () => {
  it('surface mode hides internal anatomy but shows safe learning zones', () => {
    const v = computeViewState({ ...base, mode: 'surface' });
    expect(showsInternalAnatomy(v)).toBe(false);
    expect(v.layers.skin).toBe(true);
    expect(v.layers.safeZones).toBe(true);
    expect(v.layers.landmarks).toBe(true);
    expect(v.skinOpacity).toBeGreaterThan(0.6);
  });

  it('anatomy mode shows bone, tendon, nerves, arteries with translucent skin; veins optional', () => {
    const v = computeViewState(base);
    for (const l of ['bone', 'tendon', 'nerves', 'arteries'] as const) expect(v.layers[l]).toBe(true);
    expect(v.skinOpacity).toBeLessThan(0.5);
    expect(v.layers.veins).toBe(false);
    const withVeins = computeViewState({ ...base, userLayers: { ...base.userLayers, veins: true } });
    expect(withVeins.layers.veins).toBe(true);
    expect(v.interactive).toBe(true);
  });

  it('layer mode mirrors the user toggles', () => {
    const userLayers = { ...DEFAULT_LAYER_VISIBILITY, bone: false, needlePath: true };
    const v = computeViewState({ ...base, mode: 'layers', userLayers });
    expect(v.layers).toEqual(userLayers);
  });

  it('assessment mode hides internals, needle paths, safe zones and labels until revealed', () => {
    const hidden = computeViewState({ ...base, mode: 'assessment' });
    expect(INTERNAL_LAYERS.every((l) => !hidden.layers[l])).toBe(true);
    expect(hidden.layers.needlePath).toBe(false);
    expect(hidden.layers.safeZones).toBe(false);
    expect(hidden.layers.entryPoints).toBe(false);
    expect(hidden.labels).toBe(false);
    expect(hidden.interactive).toBe(false);
    expect(hidden.layers.skin).toBe(true);

    const revealed = computeViewState({ ...base, mode: 'assessment', assessment: { revealed: true } });
    expect(revealed.layers.nerves).toBe(true);
    expect(revealed.layers.needlePath).toBe(true);
    expect(revealed.labels).toBe(true);
  });

  it('guided mode follows the step configuration; needle paths only from step 5', () => {
    GUIDED_STEPS.forEach((step, i) => {
      const v = computeViewState({ ...base, mode: 'guided', guidedStep: i });
      for (const l of step.layers) expect(v.layers[l]).toBe(true);
      expect(v.highlight).toEqual(step.highlight);
    });
    expect(computeViewState({ ...base, mode: 'guided', guidedStep: 3 }).layers.needlePath).toBe(false);
    expect(computeViewState({ ...base, mode: 'guided', guidedStep: 4 }).layers.needlePath).toBe(true);
    const spread = computeViewState({ ...base, mode: 'guided', guidedStep: 5 });
    expect(spread.animateInjectate).toBe(true);
    // Out-of-range steps are clamped.
    expect(computeViewState({ ...base, mode: 'guided', guidedStep: 99 }).highlight).toEqual(GUIDED_STEPS[6].highlight);
  });

  it('quiz mode hides labels so they do not reveal answers', () => {
    const v = computeViewState({ ...base, mode: 'quiz', feedbackHighlight: ['nerve_radial'] });
    expect(v.labels).toBe(false);
    expect(v.highlight).toEqual(['nerve_radial']);
  });

  it('a selected structure is highlighted', () => {
    expect(computeViewState({ ...base, selectedStructure: 'artery_ulnar' }).highlight).toEqual(['artery_ulnar']);
  });
});

describe('calibration (v2: whole hand + per-finger)', () => {
  const custom = {
    ...DEFAULT_CALIBRATION,
    markerSizeCm: 6,
    position: { x: 1.5, y: -0.4, z: -0.3 },
    rotationDeg: { x: 5, y: -10, z: 90 },
    scale: 1.1,
    fingers: {
      ...DEFAULT_CALIBRATION.fingers,
      ring: { offset: { x: 0.2, y: -0.1, z: 0 }, flexionDeg: 10, splayDeg: -7, lengthCm: 7.9, widthCm: 1.7 },
    },
  };

  it('defaults to a 2 cm sticker on the middle-finger knuckle', () => {
    expect(DEFAULT_CALIBRATION.version).toBe(2);
    expect(DEFAULT_CALIBRATION.markerSizeCm).toBe(2);
    expect(Object.keys(DEFAULT_CALIBRATION.fingers).sort()).toEqual(['index', 'little', 'middle', 'ring']);
  });

  it('round-trips through export/import', () => {
    const parsed = parseCalibration(exportCalibration(custom));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(calibrationEquals(parsed.value, custom)).toBe(true);
      expect(parsed.value.fingers.ring.flexionDeg).toBe(10);
    }
  });

  it('accepts a bare object and fills missing fingers and marker size with defaults', () => {
    const parsed = parseCalibration(
      JSON.stringify({ position: { x: 0, y: 0, z: 0 }, rotationDeg: { x: 0, y: 0, z: 0 }, scale: 1 }),
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.markerSizeCm).toBe(DEFAULT_CALIBRATION.markerSizeCm);
      expect(parsed.value.fingers.little).toEqual(DEFAULT_CALIBRATION.fingers.little);
    }
  });

  it('rejects malformed input and old v1 files with a helpful error', () => {
    expect(parseCalibration('not json')).toEqual({ ok: false, error: 'invalid JSON' });
    expect(parseCalibration('{"kind":"other"}').ok).toBe(false);
    const v1 = parseCalibration(
      JSON.stringify({ version: 1, position: { x: 0, y: 0, z: 0 }, rotationDeg: { x: 0, y: 0, z: 0 }, scale: 1 }),
    );
    expect(v1.ok).toBe(false);
    if (!v1.ok) expect(v1.error).toMatch(/version 1/);
    expect(parseCalibration(JSON.stringify({ position: { x: 'a' }, rotationDeg: {}, scale: 1 })).ok).toBe(false);
    const bad = { position: { x: 0, y: 0, z: 0 }, rotationDeg: { x: 0, y: 0, z: 0 }, scale: 1 };
    expect(parseCalibration(JSON.stringify({ ...bad, scale: -1 })).ok).toBe(false);
    expect(parseCalibration(JSON.stringify({ ...bad, markerSizeCm: 0 })).ok).toBe(false);
    expect(parseCalibration(JSON.stringify({ ...bad, fingers: { ring: { offset: { x: 'no' } } } })).ok).toBe(false);
  });

  it('clamps out-of-range values', () => {
    const c = clampCalibration({
      ...custom,
      markerSizeCm: 100,
      position: { x: 999, y: -999, z: 0 },
      scale: 50,
      rotationDeg: { x: 400, y: 0, z: 0 },
      fingers: { ...custom.fingers, index: { ...custom.fingers.index, splayDeg: 99, lengthCm: 1 } },
    });
    expect(c.markerSizeCm).toBe(20);
    expect(c.position.x).toBe(30);
    expect(c.position.y).toBe(-30);
    expect(c.scale).toBe(2);
    expect(c.rotationDeg.x).toBe(180);
    expect(c.fingers.index.splayDeg).toBe(40);
    expect(c.fingers.index.lengthCm).toBe(4);
  });
});

describe('quiz logic', () => {
  it('scores answers and creates an attempt', () => {
    const allCorrect = Object.fromEntries(QUIZ_QUESTIONS.map((q) => [q.id, q.correctIndex]));
    expect(scoreAnswers(QUIZ_QUESTIONS, allCorrect)).toBe(5);
    expect(scoreAnswers(QUIZ_QUESTIONS, {})).toBe(0);
    const a = createAttempt(QUIZ_QUESTIONS, { [QUIZ_QUESTIONS[0].id]: QUIZ_QUESTIONS[0].correctIndex }, new Date(0), 'th');
    expect(a.score).toBe(1);
    expect(a.total).toBe(5);
    expect(a.language).toBe('th');
  });

  it('keeps only the most recent attempts', () => {
    let history = [] as ReturnType<typeof createAttempt>[];
    for (let i = 0; i < MAX_STORED_ATTEMPTS + 5; i++) {
      history = appendAttempt(history, createAttempt(QUIZ_QUESTIONS, {}, new Date(), 'en'));
    }
    expect(history).toHaveLength(MAX_STORED_ATTEMPTS);
  });
});

describe('timer', () => {
  it('computes elapsed time and formats mm:ss', () => {
    expect(elapsedMs({ startedAt: 1000, accumulatedMs: 5000 }, 4000)).toBe(8000);
    expect(elapsedMs({ startedAt: null, accumulatedMs: 5000 }, 99999)).toBe(5000);
    expect(formatDuration(65_400)).toBe('01:05');
  });
});
