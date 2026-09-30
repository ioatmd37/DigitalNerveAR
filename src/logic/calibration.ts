import { CALIBRATION_LIMITS, DEFAULT_CALIBRATION } from '../config/appConfig';
import type { CalibrationSettings, Vec3 } from '../types';

export const CALIBRATION_FILE_KIND = 'dnb-ar-trainer.calibration';

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function finite(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export function cloneCalibration(c: CalibrationSettings): CalibrationSettings {
  return {
    ...c,
    position: { ...c.position },
    rotationDeg: { ...c.rotationDeg },
  };
}

/** Clamp every field into its allowed range. */
export function clampCalibration(c: CalibrationSettings): CalibrationSettings {
  const L = CALIBRATION_LIMITS;
  return {
    version: 1,
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
    fingerLengthCm: clamp(c.fingerLengthCm, L.fingerLengthCm.min, L.fingerLengthCm.max),
    fingerWidthCm: clamp(c.fingerWidthCm, L.fingerWidthCm.min, L.fingerWidthCm.max),
    ...(c.savedAt ? { savedAt: c.savedAt } : {}),
  };
}

export function calibrationEquals(a: CalibrationSettings, b: CalibrationSettings | null): boolean {
  if (!b) return false;
  const eq = (u: Vec3, v: Vec3) => u.x === v.x && u.y === v.y && u.z === v.z;
  return (
    eq(a.position, b.position) &&
    eq(a.rotationDeg, b.rotationDeg) &&
    a.scale === b.scale &&
    a.fingerLengthCm === b.fingerLengthCm &&
    a.fingerWidthCm === b.fingerWidthCm
  );
}

/** Serialize for export. Wrapped with a kind tag so imports can be validated. */
export function exportCalibration(c: CalibrationSettings, now: Date = new Date()): string {
  return JSON.stringify(
    {
      kind: CALIBRATION_FILE_KIND,
      exportedAt: now.toISOString(),
      note: 'Mannequin overlay calibration. Educational simulation only.',
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

/**
 * Parse and validate calibration JSON. Accepts either the wrapped export
 * format or a bare CalibrationSettings object. Missing finger dimensions
 * fall back to defaults; out-of-range values are clamped.
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
  if (raw.version !== undefined && raw.version !== 1) {
    return { ok: false, error: `unsupported version ${String(raw.version)}` };
  }
  const position = readVec3(raw.position, 'position');
  if (typeof position === 'string') return { ok: false, error: position };
  const rotationDeg = readVec3(raw.rotationDeg, 'rotationDeg');
  if (typeof rotationDeg === 'string') return { ok: false, error: rotationDeg };
  if (!finite(raw.scale) || raw.scale <= 0) return { ok: false, error: '"scale" must be a positive number' };

  const value = clampCalibration({
    version: 1,
    position,
    rotationDeg,
    scale: raw.scale,
    fingerLengthCm: finite(raw.fingerLengthCm) ? raw.fingerLengthCm : DEFAULT_CALIBRATION.fingerLengthCm,
    fingerWidthCm: finite(raw.fingerWidthCm) ? raw.fingerWidthCm : DEFAULT_CALIBRATION.fingerWidthCm,
  });
  return { ok: true, value };
}
