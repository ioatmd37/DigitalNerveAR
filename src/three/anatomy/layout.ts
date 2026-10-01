import { Vector3 } from 'three';
import { skinRadiusAt, smoothstep, surfacePoint } from './geometry';
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
  /** Largest radius (used for labels); the shape comes from `profile`. */
  r: number;
  /** Radius along the bone: [t (0 = proximal end, 1 = distal end), radius cm]. */
  profile: ReadonlyArray<readonly [number, number]>;
}

/** Bone capsules: centred at z = BONE_Z, flattened by BONE_Z_SCALE. */
export const BONE_Z = 0.08;
export const BONE_Z_SCALE = 0.9;
/** Phalanx-like profile: broad base, slim shaft, condylar head. */
const PHALANX: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [0.012, 0.3],
  [0.05, 0.41],
  [0.14, 0.43],
  [0.32, 0.31],
  [0.62, 0.29],
  [0.84, 0.33],
  [0.94, 0.355],
  [0.985, 0.25],
  [1, 0],
];
const scaleProfile = (p: ReadonlyArray<readonly [number, number]>, k: number) => p.map(([t, r]) => [t, r * k] as const);

export const BONES: BoneSpec[] = [
  {
    id: 'metacarpal_head',
    y0: -3.8,
    y1: 0.05,
    r: 0.5,
    profile: [
      [0, 0],
      [0.02, 0.34],
      [0.25, 0.36],
      [0.62, 0.37],
      [0.82, 0.46],
      [0.93, 0.5],
      [0.985, 0.36],
      [1, 0],
    ],
  },
  { id: 'phalanx_proximal', y0: 0.25, y1: 3.95, r: 0.43, profile: PHALANX },
  { id: 'phalanx_middle', y0: 4.18, y1: 6.15, r: 0.36, profile: scaleProfile(PHALANX, 0.84) },
  {
    id: 'phalanx_distal',
    y0: 6.36,
    y1: 7.95,
    r: 0.33,
    // Distal phalanx: base, slim shaft, flared ungual tuft.
    profile: [
      [0, 0],
      [0.02, 0.27],
      [0.08, 0.33],
      [0.25, 0.25],
      [0.55, 0.2],
      [0.8, 0.24],
      [0.92, 0.26],
      [0.98, 0.17],
      [1, 0],
    ],
  },
];

/** Bone radius at height y (0 outside the bone). */
export function boneRadiusAt(b: BoneSpec, y: number): number {
  if (y <= b.y0 || y >= b.y1) return 0;
  const t = (y - b.y0) / (b.y1 - b.y0);
  const p = b.profile;
  for (let i = 1; i < p.length; i++) {
    if (t <= p[i][0]) {
      const [t0, r0] = p[i - 1];
      const [t1, r1] = p[i];
      return r0 + ((r1 - r0) * (t - t0)) / (t1 - t0);
    }
  }
  return 0;
}

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

// ------------------------------------------------------------------ paths

/** Ratio of the skin radius at y to the base radius (structures taper with the finger). */
export function taper(y: number): number {
  return Math.max(skinRadiusAt(Math.min(y, 7.8)) / skinRadiusAt(0), 0.55);
}

export type PathKind = 'nerve' | 'artery' | 'vein' | 'tendon';

export interface AnatomyPath {
  /** Structure the path belongs to (for building meshes). */
  structure: StructureId;
  name: string;
  kind: PathKind;
  points: Vector3[];
  /** Radius at the start and end of the path (linear taper). */
  r0: number;
  r1: number;
  /** Cross-section flattening for band-like structures. */
  scaleX?: number;
  scaleZ?: number;
  /** Small branches are drawn but not used by the needle evaluator. */
  evaluate: boolean;
}

/**
 * Centre of a main neurovascular trunk at height y. Gently tortuous; near
 * the web (y < 0) it swings toward the web space where, in the hand, the
 * common palmar digital vessels and nerves bifurcate.
 */
export function trunkCenter(kind: 'nerve' | 'artery', side: Side, y: number, out = new Vector3()): Vector3 {
  const spec = kind === 'nerve' ? NERVE : ARTERY;
  const k = taper(y);
  const phase = side === 'radial' ? 0 : 1.3;
  const amp = kind === 'artery' ? 0.025 : 0.01;
  let x = spec.x * k + amp * Math.sin(y * 2.4 + phase);
  let z = spec.z * k + amp * 0.6 * Math.cos(y * 1.9 + phase);
  const web = smoothstep(0, -1.6, y);
  x += 0.45 * web;
  z -= 0.12 * web;
  return out.set(SIDE_SIGN[side] * x, y, z);
}

function sample(f: (y: number) => Vector3, y0: number, y1: number, step = 0.18): Vector3[] {
  const n = Math.max(2, Math.ceil(Math.abs(y1 - y0) / step));
  return Array.from({ length: n + 1 }, (_, i) => f(y0 + ((y1 - y0) * i) / n));
}

const v = (x: number, y: number, z: number) => new Vector3(x, y, z);

function buildPaths(): AnatomyPath[] {
  const paths: AnatomyPath[] = [];
  for (const side of ['radial', 'ulnar'] as Side[]) {
    const sx = SIDE_SIGN[side];
    const nerve = `nerve_${side}` as StructureId;
    const artery = `artery_${side}` as StructureId;
    const vein = `vein_${side}` as StructureId;

    // --- Proper palmar digital nerve: trunk, web-space bifurcation stub, dorsal and terminal branches.
    const nEnd = trunkCenter('nerve', side, 7.3);
    paths.push({ structure: nerve, name: `${nerve}_trunk`, kind: 'nerve', points: sample((y) => trunkCenter('nerve', side, y), -3.6, 7.3), r0: 0.09, r1: 0.055, evaluate: true });
    const nFork = trunkCenter('nerve', side, -1.4);
    paths.push({ structure: nerve, name: `${nerve}_common_branch`, kind: 'nerve', points: [nFork, v(sx * 1.35, -0.9, -0.58), v(sx * 1.55, -0.4, -0.55)], r0: 0.07, r1: 0.06, evaluate: true });
    const nDors = trunkCenter('nerve', side, 1.6);
    paths.push({
      structure: nerve,
      name: `${nerve}_dorsal_branch`,
      kind: 'nerve',
      points: [nDors, v(sx * 0.68, 2.2, -0.22), v(sx * 0.72, 2.9, 0.12), v(sx * 0.66, 3.6, 0.36), v(sx * 0.55, 4.8, 0.44), v(sx * 0.46, 6.0, 0.42), v(sx * 0.36, 6.8, 0.38)],
      r0: 0.035,
      r1: 0.02,
      evaluate: true,
    });
    for (const [name, end] of [
      ['pulp', v(sx * 0.14, 8.0, -0.4)],
      ['nailbed', v(sx * 0.28, 7.85, 0.18)],
      ['lateral', v(sx * 0.5, 7.95, -0.12)],
    ] as const) {
      paths.push({ structure: nerve, name: `${nerve}_terminal_${name}`, kind: 'nerve', points: [nEnd, nEnd.clone().lerp(end, 0.5).setZ((nEnd.z + end.z) / 2 - 0.03), end], r0: 0.04, r1: 0.018, evaluate: true });
    }

    // --- Proper palmar digital artery: trunk, bifurcation stub, condylar arches, pulp arcade, dorsal branches.
    const aEnd = trunkCenter('artery', side, 7.4);
    paths.push({ structure: artery, name: `${artery}_trunk`, kind: 'artery', points: sample((y) => trunkCenter('artery', side, y), -3.6, 7.4), r0: 0.08, r1: 0.045, evaluate: true });
    const aFork = trunkCenter('artery', side, -1.2);
    paths.push({ structure: artery, name: `${artery}_common_branch`, kind: 'artery', points: [aFork, v(sx * 1.3, -0.75, -0.4), v(sx * 1.5, -0.25, -0.38)], r0: 0.065, r1: 0.055, evaluate: true });
    for (const y of [3.55, 5.85]) {
      const a = trunkCenter('artery', side, y);
      // Half of each transverse (condylar) arch, running deep to the flexor tendons; the halves meet in the midline.
      paths.push({ structure: artery, name: `${artery}_arch_${y}`, kind: 'artery', points: [a, v(sx * 0.38, y + 0.05, -0.33), v(sx * 0.12, y + 0.08, -0.35), v(0, y + 0.08, -0.35)], r0: 0.035, r1: 0.03, evaluate: true });
    }
    paths.push({ structure: artery, name: `${artery}_pulp_arcade`, kind: 'artery', points: [aEnd, v(sx * 0.35, 7.75, -0.38), v(sx * 0.12, 7.9, -0.4), v(0, 7.92, -0.4)], r0: 0.035, r1: 0.025, evaluate: true });
    for (const y of [2.0, 4.4]) {
      const a = trunkCenter('artery', side, y);
      paths.push({ structure: artery, name: `${artery}_dorsal_branch_${y}`, kind: 'artery', points: [a, v(sx * 0.76, y + 0.35, 0.05), v(sx * 0.62, y + 0.85, 0.36)], r0: 0.028, r1: 0.018, evaluate: true });
    }

    // --- Dorsal digital vein with cross-connections; proximally it heads to the web (intercapitular vein).
    const theta = side === 'radial' ? 118 : 62;
    const veinAt = (y: number) => {
      const p = surfacePoint(y, theta + 4 * Math.sin(y * 1.7), 0.9);
      const web = smoothstep(-0.3, -2.0, y);
      p.x += sx * 0.45 * web;
      p.z -= 0.15 * web;
      return p;
    };
    paths.push({ structure: vein, name: `${vein}_main`, kind: 'vein', points: sample(veinAt, -3.4, 7.0), r0: 0.065, r1: 0.04, evaluate: false });
    for (const y of [1.4, 2.9, 4.5, 6.2]) {
      const pts = [0, 0.33, 0.66, 1].map((t) => surfacePoint(y + 0.25 * Math.sin(t * Math.PI), theta + (90 - theta) * t, 0.9));
      paths.push({ structure: vein, name: `${vein}_ladder_${y}`, kind: 'vein', points: pts, r0: 0.035, r1: 0.03, evaluate: false });
    }
    paths.push({ structure: vein, name: `${vein}_distal_arc`, kind: 'vein', points: [0, 0.5, 1].map((t) => surfacePoint(7.0 + 0.25 * t, theta + (90 - theta) * t, 0.88)), r0: 0.035, r1: 0.025, evaluate: false });
  }

  // --- Flexor tendons (all part of the "flexor_tendon" structure).
  const fdpAt = (y: number) => v(0, y, TENDON.z * taper(y));
  paths.push({ structure: 'flexor_tendon', name: 'fdp', kind: 'tendon', points: sample(fdpAt, TENDON.y0, TENDON.y1), r0: TENDON.r, r1: 0.11, scaleX: 1.2, scaleZ: 0.8, evaluate: true });
  const fdsAt = (y: number) => v(0, y, -0.63 * taper(y));
  paths.push({ structure: 'flexor_tendon', name: 'fds', kind: 'tendon', points: sample(fdsAt, -3.6, 1.2), r0: 0.17, r1: 0.14, scaleX: 1.5, scaleZ: 0.55, evaluate: true });
  for (const sx of [-1, 1]) {
    // FDS slips part around FDP (Camper's chiasm) to insert on the middle phalanx.
    paths.push({
      structure: 'flexor_tendon',
      name: `fds_slip_${sx < 0 ? 'radial' : 'ulnar'}`,
      kind: 'tendon',
      points: [v(sx * 0.08, 1.1, -0.62), v(sx * 0.26, 2.2, -0.56), v(sx * 0.24, 3.2, -0.4), v(sx * 0.2, 4.0, -0.3), v(sx * 0.2, 4.7, -0.26)],
      r0: 0.09,
      r1: 0.07,
      evaluate: true,
    });
  }
  return paths;
}

let cachedPaths: AnatomyPath[] | null = null;

/** All modelled nerve/artery/vein/tendon paths (built once). */
export function anatomyPaths(): AnatomyPath[] {
  cachedPaths ??= buildPaths();
  return cachedPaths;
}

/** Distance from p to the surface of a path (negative = inside). */
export function pathDistance(p: Vector3, path: AnatomyPath): number {
  const pts = path.points;
  let best = Infinity;
  const ab = new Vector3();
  const ap = new Vector3();
  for (let i = 0; i < pts.length - 1; i++) {
    ab.subVectors(pts[i + 1], pts[i]);
    ap.subVectors(p, pts[i]);
    const len2 = ab.lengthSq() || 1e-9;
    const t = Math.min(1, Math.max(0, ap.dot(ab) / len2));
    const d = ap.addScaledVector(ab, -t).length();
    const u = (i + t) / (pts.length - 1);
    const r = (path.r0 + (path.r1 - path.r0) * u) * Math.max(path.scaleX ?? 1, path.scaleZ ?? 1);
    best = Math.min(best, d - r);
  }
  return best;
}

/** Extensor mechanism: a thin dorsal band over the phalanges (central slip → terminal tendon). */
export const EXTENSOR = { y0: -3.6, y1: 6.6, halfWidth: 0.34, halfThickness: 0.05 };

/** Height of the extensor band's centre at y (just dorsal to the bone). */
export function extensorZ(y: number): number {
  let top = 0;
  for (const b of BONES) top = Math.max(top, boneRadiusAt(b, y));
  return BONE_Z + Math.max(top, 0.24) * BONE_Z_SCALE + 0.06;
}

export function extensorHalfWidth(y: number): number {
  // Narrows over the middle phalanx (lateral bands converge) and to the terminal tendon.
  return EXTENSOR.halfWidth * (1 - 0.35 * smoothstep(4.2, 6.4, y)) * taper(y);
}

export function insideExtensor(p: Vector3): boolean {
  if (p.y < EXTENSOR.y0 || p.y > EXTENSOR.y1) return false;
  return Math.abs(p.x) <= extensorHalfWidth(p.y) && Math.abs(p.z - extensorZ(p.y)) <= EXTENSOR.halfThickness + 0.02;
}
