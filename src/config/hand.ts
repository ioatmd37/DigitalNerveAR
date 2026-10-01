import type { FingerCalibration, FingerId, Vec3 } from '../types';

/**
 * Default layout of a RIGHT mannequin hand in the hand frame:
 * origin = dorsal skin over the middle-finger MCP knuckle,
 * +X ulnar, +Y distal, +Z dorsal; centimetres.
 *
 * Typical adult proportions; calibration fine-tunes each finger.
 */
export interface FingerPreset {
  id: FingerId;
  nameTh: string;
  nameEn: string;
  /** Short label for compact selectors. */
  shortTh: string;
  shortEn: string;
  /** Dorsal MCP knuckle position (hand frame, cm). */
  knuckle: Vec3;
  /** Default sideways angle, degrees (+ = toward the thumb). */
  splayDeg: number;
  lengthCm: number;
  widthCm: number;
}

export const FINGERS: FingerPreset[] = [
  {
    id: 'index',
    nameTh: 'นิ้วชี้',
    nameEn: 'Index finger',
    shortTh: 'ชี้',
    shortEn: 'Index',
    knuckle: { x: -2.0, y: -0.3, z: -0.25 },
    splayDeg: 6,
    lengthCm: 8.0,
    widthCm: 1.9,
  },
  {
    id: 'middle',
    nameTh: 'นิ้วกลาง',
    nameEn: 'Middle finger',
    shortTh: 'กลาง',
    shortEn: 'Middle',
    knuckle: { x: 0, y: 0, z: 0 },
    splayDeg: 0,
    lengthCm: 8.8,
    widthCm: 1.9,
  },
  {
    id: 'ring',
    nameTh: 'นิ้วนาง',
    nameEn: 'Ring finger',
    shortTh: 'นาง',
    shortEn: 'Ring',
    knuckle: { x: 1.8, y: -0.4, z: -0.3 },
    splayDeg: -5,
    lengthCm: 8.3,
    widthCm: 1.8,
  },
  {
    id: 'little',
    nameTh: 'นิ้วก้อย',
    nameEn: 'Little finger',
    shortTh: 'ก้อย',
    shortEn: 'Little',
    knuckle: { x: 3.4, y: -1.3, z: -0.8 },
    splayDeg: -12,
    lengthCm: 6.6,
    widthCm: 1.6,
  },
];

export const FINGER_IDS: FingerId[] = FINGERS.map((f) => f.id);

export function getFinger(id: FingerId): FingerPreset {
  return FINGERS.find((f) => f.id === id) ?? FINGERS[0];
}

export function defaultFingerCalibration(id: FingerId): FingerCalibration {
  const f = getFinger(id);
  return {
    offset: { x: 0, y: 0, z: 0 },
    flexionDeg: 0,
    splayDeg: f.splayDeg,
    lengthCm: f.lengthCm,
    widthCm: f.widthCm,
  };
}

export const DEFAULT_FINGER: FingerId = 'index';
