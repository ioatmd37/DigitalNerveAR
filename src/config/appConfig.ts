import type { CalibrationSettings, FingerId, Language } from '../types';
import { defaultFingerCalibration, FINGER_IDS } from './hand';

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
  /** Default printed marker width (cm); instructors can change it in Calibration. */
  markerSizeCm: num(env.VITE_MARKER_SIZE_CM, 5),
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

/**
 * Default: the marker sticker is centred on the dorsal skin over the
 * middle-finger MCP knuckle, TOP arrow toward the fingertips, mounted on a
 * thin (~2 mm) rigid tile, so the knuckle skin is 0.2 cm below the marker.
 */
export const DEFAULT_CALIBRATION: CalibrationSettings = {
  version: 2,
  markerSizeCm: appConfig.markerSizeCm,
  position: { x: 0, y: 0, z: -0.2 },
  rotationDeg: { x: 0, y: 0, z: 0 },
  scale: 1,
  fingers: Object.fromEntries(FINGER_IDS.map((id) => [id, defaultFingerCalibration(id)])) as Record<
    FingerId,
    ReturnType<typeof defaultFingerCalibration>
  >,
};

export const CALIBRATION_LIMITS = {
  markerSizeCm: { min: 3, max: 20, step: 0.1 },
  position: { min: -30, max: 30, step: 0.1 },
  positionZ: { min: -15, max: 15, step: 0.1 },
  rotation: { min: -180, max: 180, step: 1 },
  scale: { min: 0.5, max: 2, step: 0.01 },
  fingerOffset: { min: -5, max: 5, step: 0.05 },
  flexionDeg: { min: -45, max: 60, step: 1 },
  splayDeg: { min: -40, max: 40, step: 1 },
  fingerLengthCm: { min: 4, max: 12, step: 0.1 },
  fingerWidthCm: { min: 1, max: 3, step: 0.05 },
} as const;
