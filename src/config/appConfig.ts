import type { CalibrationSettings, Language } from '../types';

/**
 * Runtime configuration. Values come from Vite env variables (see
 * `.env.example`) with safe defaults so the app runs with zero setup.
 */
const env = import.meta.env ?? {};

function num(value: unknown, fallback: number): number {
  const n = typeof value === 'string' ? Number.parseFloat(value) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const appConfig = {
  defaultLanguage: 'th' as Language,
  /**
   * Instructor passcode. Convenience lock only: it is embedded in the client
   * bundle and must not be treated as a security control.
   */
  instructorPasscode: (env.VITE_INSTRUCTOR_PASSCODE as string | undefined)?.trim() || '2468',
  markerTargetUrl: (env.VITE_MARKER_TARGET_URL as string | undefined) || 'marker/targets.mind',
  markerImageUrl: 'marker/marker.png',
  markerPrintUrl: 'marker/print.html',
  /** Physical printed marker width (cm). MindAR measures in marker widths. */
  markerSizeCm: num(env.VITE_MARKER_SIZE_CM, 12),
  modelSource: ((env.VITE_MODEL_SOURCE as string | undefined) === 'gltf' ? 'gltf' : 'procedural') as
    | 'procedural'
    | 'gltf',
  modelGltfUrl: (env.VITE_MODEL_GLTF_URL as string | undefined) || 'models/right-index-finger.glb',
  /** MindAR one-euro filter tuning: lower minCF / beta = smoother but laggier. */
  tracking: {
    filterMinCF: 0.0001,
    filterBeta: 10,
    warmupTolerance: 5,
    missTolerance: 10,
  },
  storageKeys: {
    app: 'dnb-ar-trainer:v1',
  },
} as const;

/** Reference dimensions of the procedural model (cm). */
export const MODEL_REFERENCE = {
  fingerLengthCm: 8.5,
  fingerWidthCm: 2.0,
} as const;

export const DEFAULT_CALIBRATION: CalibrationSettings = {
  version: 1,
  // Finger base 1.5 cm beyond the top edge of a 12 cm marker, 2.5 cm above it.
  position: { x: 0, y: 7.5, z: 2.5 },
  rotationDeg: { x: 0, y: 0, z: 0 },
  scale: 1,
  fingerLengthCm: MODEL_REFERENCE.fingerLengthCm,
  fingerWidthCm: MODEL_REFERENCE.fingerWidthCm,
};

export const CALIBRATION_LIMITS = {
  position: { min: -30, max: 30, step: 0.1 },
  positionZ: { min: -10, max: 20, step: 0.1 },
  rotation: { min: -180, max: 180, step: 1 },
  scale: { min: 0.5, max: 2, step: 0.01 },
  fingerLengthCm: { min: 5, max: 12, step: 0.1 },
  fingerWidthCm: { min: 1.2, max: 3, step: 0.05 },
} as const;
