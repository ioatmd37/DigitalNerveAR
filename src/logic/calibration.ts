import { CALIBRATION_LIMITS, DEFAULT_CALIBRATION } from '../config/appConfig';
import { defaultFingerCalibration, FINGER_IDS } from '../config/hand';
import type { CalibrationSettings, FingerCalibration, FingerId, Vec3 } from '../types';

export const CALIBRATION_FILE_KIND = 'dnb-ar-trainer.calibration';

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function finite(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function cloneFinger(f: FingerCalibration): FingerCalibration {
  return { ...f, offset: { ...f.offset } };
}

export function cloneCalibration(c: CalibrationSettings): CalibrationSettings {
  return {
    ...c,
    position: { ...c.position },
    rotationDeg: { ...c.rotationDeg },
    fingers: Object.fromEntries(FINGER_IDS.map((id) => [id, cloneFinger(c.fingers[id])])) as Record<
      FingerId,
      FingerCalibration
    >,
  };
}

function clampFinger(f: FingerCalibration): FingerCalibration {
  const L = CALIBRATION_LIMITS;
  const o = L.fingerOffset;
  return {
    offset: { x: clamp(f.offset.x, o.min, o.max), y: clamp(f.offset.y, o.min, o.max), z: clamp(f.offset.z, o.min, o.max) },
    flexionDeg: clamp(f.flexionDeg, L.flexionDeg.min, L.flexionDeg.max),
    splayDeg: clamp(f.splayDeg, L.splayDeg.min, L.splayDeg.max),
    lengthCm: clamp(f.lengthCm, L.fingerLengthCm.min, L.fingerLengthCm.max),
    widthCm: clamp(f.widthCm, L.fingerWidthCm.min, L.fingerWidthCm.max),
  };
}

/** Clamp every field into its allowed range. */
export function clampCalibration(c: CalibrationSettings): CalibrationSettings {
  const L = CALIBRATION_LIMITS;
  return {
    version: 2,
    markerSizeCm: clamp(c.markerSizeCm, L.markerSizeCm.min, L.markerSizeCm.max),
    position: {
      x: clamp(c.position.x, L.position.min, L.position.max),
      y: clamp(c.position.y, L.position.min, L.position.max),
      z: clamp(c.position.z, L.positionZ.min, L.positionZ.max),
    },
    rotationDeg: {
      x: clamp(c.rotationDeg.x, L.rotation.min, L.rotation.max),
      y: clamp(c.rotationDeg.y, L.rotation.min, L.rotation.max),
      z: clamp(c.rotationDeg.z, L.rotation.min, L.rotation.max),
    },
    scale: clamp(c.scale, L.scale.min, L.scale.max),
    fingers: Object.fromEntries(
      FINGER_IDS.map((id) => [id, clampFinger(c.fingers?.[id] ?? defaultFingerCalibration(id))]),
    ) as Record<FingerId, FingerCalibration>,
    ...(c.savedAt ? { savedAt: c.savedAt } : {}),
  };
}

/** Compare calibrations, ignoring `savedAt`. */
export function calibrationEquals(a: CalibrationSettings, b: CalibrationSettings | null): boolean {
  if (!b) return false;
  const strip = (c: CalibrationSettings) => JSON.stringify({ ...clampCalibration(c), savedAt: undefined });
  return strip(a) === strip(b);
}

/** Serialize for export. Wrapped with a kind tag so imports can be validated. */
export function exportCalibration(c: CalibrationSettings, now: Date = new Date()): string {
  return JSON.stringify(
    {
      kind: CALIBRATION_FILE_KIND,
      exportedAt: now.toISOString(),
      note: 'Mannequin hand overlay calibration. Educational simulation only.',
      calibration: clampCalibration(c),
    },
    null,
    2,
  );
}

export type ParseResult = { ok: true; value: CalibrationSettings } | { ok: false; error: string };

function readVec3(v: unknown, name: string): Vec3 | string {
  if (!v || typeof v !== 'object') return `"${name}" must be an object with x, y, z`;
  const o = v as Record<string, unknown>;
  if (!finite(o.x) || !finite(o.y) || !finite(o.z)) return `"${name}" must contain numeric x, y, z`;
  return { x: o.x, y: o.y, z: o.z };
}

function readFinger(id: FingerId, v: unknown): FingerCalibration | string {
  const d = defaultFingerCalibration(id);
  if (v === undefined) return d;
  if (!v || typeof v !== 'object') return `"fingers.${id}" must be an object`;
  const o = v as Record<string, unknown>;
  const offset = o.offset === undefined ? d.offset : readVec3(o.offset, `fingers.${id}.offset`);
  if (typeof offset === 'string') return offset;
  const num = (key: keyof FingerCalibration) => (finite(o[key]) ? (o[key] as number) : (d[key] as number));
  return {
    offset,
    flexionDeg: num('flexionDeg'),
    splayDeg: num('splayDeg'),
    lengthCm: num('lengthCm'),
    widthCm: num('widthCm'),
  };
}

/**
 * Parse and validate calibration JSON (wrapped export format or a bare
 * object). Missing fingers/fields fall back to defaults; out-of-range
 * values are clamped. Version-1 files (single finger, table-mounted marker)
 * are rejected because their geometry differs.
 */
export function parseCalibration(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'invalid JSON' };
  }
  if (!data || typeof data !== 'object') return { ok: false, error: 'expected a JSON object' };
  const root = data as Record<string, unknown>;
  if ('kind' in root && root.kind !== CALIBRATION_FILE_KIND) {
    return { ok: false, error: `unexpected file kind "${String(root.kind)}"` };
  }
  const raw = ('calibration' in root ? root.calibration : root) as Record<string, unknown> | undefined;
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'missing "calibration" object' };
  if (raw.version === 1) {
    return { ok: false, error: 'version 1 file (single finger, table marker) — please recalibrate' };
  }
  if (raw.version !== undefined && raw.version !== 2) {
    return { ok: false, error: `unsupported version ${String(raw.version)}` };
  }
  const position = readVec3(raw.position, 'position');
  if (typeof position === 'string') return { ok: false, error: position };
  const rotationDeg = readVec3(raw.rotationDeg, 'rotationDeg');
  if (typeof rotationDeg === 'string') return { ok: false, error: rotationDeg };
  if (!finite(raw.scale) || raw.scale <= 0) return { ok: false, error: '"scale" must be a positive number' };
  const markerSizeCm = raw.markerSizeCm === undefined ? DEFAULT_CALIBRATION.markerSizeCm : raw.markerSizeCm;
  if (!finite(markerSizeCm) || markerSizeCm <= 0) {
    return { ok: false, error: '"markerSizeCm" must be a positive number' };
  }

  const fingersRaw = (raw.fingers ?? {}) as Record<string, unknown>;
  if (typeof fingersRaw !== 'object') return { ok: false, error: '"fingers" must be an object' };
  const fingers = {} as Record<FingerId, FingerCalibration>;
  for (const id of FINGER_IDS) {
    const f = readFinger(id, fingersRaw[id]);
    if (typeof f === 'string') return { ok: false, error: f };
    fingers[id] = f;
  }

  return {
    ok: true,
    value: clampCalibration({ version: 2, markerSizeCm, position, rotationDeg, scale: raw.scale, fingers }),
  };
}
