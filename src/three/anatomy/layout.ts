import { Vector3 } from 'three';
import type { StructureId } from '../../types';

/**
 * Single source of truth for the SIMPLIFIED finger layout (anatomy frame:
 * +X ulnar, +Y distal, +Z dorsal, cm, unscaled). Used both to build the
 * procedural model and to evaluate the virtual needle, so feedback always
 * matches what is drawn.
 */

export type Side = 'radial' | 'ulnar';

/** X sign for each side (radial is toward the thumb = −X on a right hand). */
export const SIDE_SIGN: Record<Side, number> = { radial: -1, ulnar: 1 };

/** Dorsolateral angle for each side, measured from +X toward +Z (90° = dorsal, 270° = volar). */
export const DORSOLATERAL_DEG: Record<Side, number> = { radial: 130, ulnar: 50 };

/** Longitudinal tube: centre (x, z) at the finger base, tapered with the finger. */
export interface TubeSpec {
  x: number;
  z: number;
  r: number;
  y0: number;
  y1: number;
}

/** In the digit the nerve lies volar to the artery (simplified). x is for the ulnar side; mirror for radial. */
export const NERVE: TubeSpec = { x: 0.6, z: -0.5, r: 0.08, y0: -3.6, y1: 8.0 };
export const ARTERY: TubeSpec = { x: 0.68, z: -0.29, r: 0.065, y0: -3.6, y1: 7.9 };
export const TENDON: TubeSpec = { x: 0, z: -0.5, r: 0.16, y0: -3.6, y1: 6.55 };

export interface BoneSpec {
  id: StructureId;
  y0: number;
  y1: number;
  r: number;
}

/** Bone capsules: centred at z = BONE_Z, flattened by BONE_Z_SCALE. */
export const BONE_Z = 0.08;
export const BONE_Z_SCALE = 0.9;
export const BONES: BoneSpec[] = [
  { id: 'metacarpal_head', y0: -3.8, y1: 0.05, r: 0.5 },
  { id: 'phalanx_proximal', y0: 0.25, y1: 3.95, r: 0.42 },
  { id: 'phalanx_middle', y0: 4.18, y1: 6.15, r: 0.35 },
  { id: 'phalanx_distal', y0: 6.36, y1: 7.95, r: 0.28 },
];

/** Dorsolateral learning zones: y range and half-width (°) around DORSOLATERAL_DEG. */
export const SAFE_ZONE = { y0: 0.3, y1: 2.2, halfWidthDeg: 25 };

/** Volar avoid zone: y range and angle range (°). */
export const AVOID_ZONE = { y0: 0.1, y1: 7.3, theta0: 203, theta1: 337 };

/** Level of the model entry markers. */
export const ENTRY_Y = 1.0;

/** Where the model needle arrow ends: beside the bone, near (not in) the bundle. */
export function needleTarget(side: Side): Vector3 {
  return new Vector3(0.74 * SIDE_SIGN[side], ENTRY_Y, -0.16);
}
