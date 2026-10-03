import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';
import type { FingerId, StructureId } from '../../types';
import { smoothstep } from './geometry';

/**
 * Single source of truth for the SIMPLIFIED digit layouts (anatomy frame:
 * +X ulnar, +Y distal, +Z dorsal, cm, unscaled; y = 0 at the proximal
 * digital crease / web). Used both to build the procedural model and to
 * evaluate the virtual needle, so feedback always matches what is drawn.
 *
 * Three layouts:
 *  - `finger`  middle and ring (three phalanges, FDS + FDP, extensor hood)
 *  - `index`   the finger layout; its radial artery (radialis indicis) is a
 *              single vessel with no web bifurcation
 *  - `little`  the finger layout with little-finger nerve patterns
 *              (no web on the ulnar side, ulnar dorsal nerves reaching the DIP)
 *  - `thumb`   two phalanges and one IP joint, FPL only, EPL/EPB, sesamoids,
 *              superficial-radial dorsal nerves reaching the nail fold
 * Each digit is scaled to the measured mannequin digit at run time.
 */

export type Side = 'radial' | 'ulnar';
export const SIDES: Side[] = ['radial', 'ulnar'];

/** X sign for each side (radial is toward the thumb = −X on a right hand). */
export const SIDE_SIGN: Record<Side, number> = { radial: -1, ulnar: 1 };

/** Dorsolateral angle for each side, measured from +X toward +Z (90° = dorsal, 270° = volar). */
export const DORSOLATERAL_DEG: Record<Side, number> = { radial: 130, ulnar: 50 };

/** Course of the dorsal digital nerves: a little dorsal to the learning zones, in the subcutaneous layer. */
const DORSAL_NERVE_DEG: Record<Side, number> = { radial: 112, ulnar: 68 };

const DEG = Math.PI / 180;

export type DigitId = 'finger' | 'index' | 'little' | 'thumb';

export interface BoneSpec {
  id: StructureId;
  y0: number;
  y1: number;
  /** Largest radius (used for labels); the shape comes from `profile`. */
  r: number;
  /** Radius along the bone: [t (0 = proximal end, 1 = distal end), radius cm]. */
  profile: ReadonlyArray<readonly [number, number]>;
}

/** Longitudinal tube: centre (x, z) at the digit base. x is for the ulnar side; mirror for radial. */
export interface TubeSpec {
  x: number;
  z: number;
  r: number;
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

interface DigitSpec {
  id: DigitId;
  /** Model size the measured length/width are compared with (see setDimensions). */
  reference: { lengthCm: number; widthCm: number };
  /** Skin radius profile along the digit: [y, radius]. */
  skinProfile: ReadonlyArray<readonly [number, number]>;
  /** Dorso-volar flattening of the cross-section. */
  flatten: number;
  /** MCP knuckle, interphalangeal joints (PIP, DIP / IP) and nail fold levels. */
  joints: { mcp: number; ip: number[]; nailFold: number };
  /** Distal end of the nail plate. */
  nailEndY: number;
  /** Dorsal knuckle swellings [y, width, amount]. */
  knuckles: ReadonlyArray<readonly [number, number, number]>;
  /** Fullness of the volar pulp: rises over pad[0]→pad[1], falls over pad[2]→pad[3]. */
  pad: readonly [number, number, number, number];
  /** Scale of internal x/z positions relative to the finger template (wider digit → larger). */
  k: number;
  bones: BoneSpec[];
  /** Which sides have a web space (where the common digital vessels and nerves divide). */
  webs: Record<Side, boolean>;
  /**
   * Sides whose palmar digital ARTERY comes from a common palmar digital
   * artery dividing at the web (default: same as `webs`). The index radial
   * artery (radialis indicis) and the thumb arteries (princeps pollicis) are
   * single vessels that do not divide at the first web.
   */
  arteryForks?: Record<Side, boolean>;
  /**
   * Sides whose palmar digital NERVE comes from a common palmar digital nerve
   * dividing at the web (default: same as `webs`). The radial proper palmar
   * digital nerve of the index leaves the median nerve in the palm and runs
   * as one nerve along the radial border of the 2nd metacarpal and the index
   * (also giving the 1st lumbrical branch); it does not divide at the first
   * web. The thumb's palmar nerves likewise do not divide at a web.
   */
  nerveForks?: Record<Side, boolean>;
  /** Sides whose DORSAL digital nerve heads into the web proximally (default: same as `webs`). */
  dorsalNerveWebs?: Record<Side, boolean>;
  /** Distal reach of the dorsal digital nerves (radial/ulnar nerve origin). */
  dorsalNerveEndY: number;
  /** Dorsal branch of the palmar digital nerve: [leaves the trunk at, ends at]. */
  palmarDorsalBranch: readonly [number, number] | null;
  /** Levels of the transverse (condylar) arterial arches. */
  archYs: number[];
  /** Levels of the dorsal arterial branches. */
  arteryDorsalYs: number[];
  /** Levels of the dorsal vein cross-connections. */
  veinLadderYs: number[];
  flexor: 'fds-fdp' | 'fpl';
  /** Flexor sheath extent and annular/oblique pulleys [name, y, length]. */
  sheath: readonly [number, number];
  pulleys: ReadonlyArray<readonly [string, number, number]>;
  extensor: 'hood' | 'epl-epb';
  safeZone: { y0: number; y1: number; halfWidthDeg: number };
  avoidZone: { y0: number; y1: number; theta0: number; theta1: number };
  entryY: number;
  /** Volar interphalangeal creases shown as landmarks. */
  creases: ReadonlyArray<readonly [StructureId, number]>;
  /** Side of the web-space landmark. */
  webLandmark: Side;
  /** Structures this digit does not have. */
  absent: StructureId[];
}

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
const METACARPAL: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [0.02, 0.34],
  [0.25, 0.36],
  [0.62, 0.37],
  [0.82, 0.46],
  [0.93, 0.5],
  [0.985, 0.36],
  [1, 0],
];
/** Distal phalanx: base, slim shaft, flared ungual tuft. */
const DISTAL_PHALANX: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [0.02, 0.27],
  [0.08, 0.33],
  [0.25, 0.25],
  [0.55, 0.2],
  [0.8, 0.24],
  [0.92, 0.26],
  [0.98, 0.17],
  [1, 0],
];
const scaleProfile = (p: ReadonlyArray<readonly [number, number]>, k: number) => p.map(([t, r]) => [t, r * k] as const);
const maxR = (p: ReadonlyArray<readonly [number, number]>) => Math.max(...p.map(([, r]) => r));

const FINGER_SPEC: DigitSpec = {
  id: 'finger',
  reference: { lengthCm: 8.5, widthCm: 2.0 },
  skinProfile: [
    [-1.2, 1.08],
    [0.0, 1.02],
    [1.0, 0.98],
    [2.5, 0.94],
    [3.7, 0.95],
    [4.1, 0.97],
    [4.6, 0.9],
    [5.8, 0.86],
    [6.35, 0.87],
    [6.8, 0.82],
    [7.6, 0.78],
    [8.0, 0.68],
    [8.3, 0.5],
    [8.45, 0.3],
    [8.5, 0.0],
  ],
  flatten: 0.85,
  joints: { mcp: -0.5, ip: [4.1, 6.35], nailFold: 6.9 },
  nailEndY: 8.18,
  knuckles: [
    [4.1, 0.28, 0.045],
    [6.35, 0.22, 0.03],
  ],
  pad: [7.0, 7.7, 8.15, 8.45],
  k: 1,
  bones: [
    { id: 'metacarpal_head', y0: -3.8, y1: 0.05, r: 0.5, profile: METACARPAL },
    { id: 'phalanx_proximal', y0: 0.25, y1: 3.95, r: 0.43, profile: PHALANX },
    { id: 'phalanx_middle', y0: 4.18, y1: 6.15, r: 0.36, profile: scaleProfile(PHALANX, 0.84) },
    { id: 'phalanx_distal', y0: 6.36, y1: 7.95, r: 0.33, profile: DISTAL_PHALANX },
  ],
  webs: { radial: true, ulnar: true },
  dorsalNerveEndY: 4.3,
  palmarDorsalBranch: [1.6, 6.8],
  archYs: [3.55, 5.85],
  arteryDorsalYs: [2.0, 4.4],
  veinLadderYs: [1.4, 2.9, 4.5, 6.2],
  flexor: 'fds-fdp',
  sheath: [-0.9, 6.4],
  pulleys: [
    ['A1', -0.55, 0.45],
    ['A2', 1.25, 1.3],
    ['A3', 4.1, 0.28],
    ['A4', 5.15, 0.7],
    ['A5', 6.35, 0.22],
  ],
  extensor: 'hood',
  safeZone: { y0: 0.3, y1: 2.2, halfWidthDeg: 25 },
  avoidZone: { y0: 0.1, y1: 7.3, theta0: 203, theta1: 337 },
  entryY: 1.0,
  creases: [
    ['landmark_pip_crease', 4.1],
    ['landmark_dip_crease', 6.35],
  ],
  webLandmark: 'radial',
  absent: ['landmark_ip_crease'],
};

const LITTLE_SPEC: DigitSpec = {
  ...FINGER_SPEC,
  id: 'little',
  // The proper palmar digital nerve/artery on the ulnar border come straight
  // from the hypothenar region; there is no web on that side.
  webs: { radial: true, ulnar: false },
  // Dorsal digital nerves (dorsal branch of the ulnar nerve) reach about the
  // DIP; the palmar nerves supply only the dorsum of the distal phalanx.
  dorsalNerveEndY: 6.2,
  palmarDorsalBranch: [4.9, 6.9],
};

const INDEX_SPEC: DigitSpec = {
  ...FINGER_SPEC,
  id: 'index',
  // Radial side: the radialis indicis is one vessel from the radial artery
  // system (deep arch / princeps pollicis), not a branch of a common palmar
  // digital artery dividing at the first web. The ulnar side divides at the
  // second web from the 2nd common palmar digital artery as usual.
  arteryForks: { radial: false, ulnar: true },
  // Radial side: the proper palmar digital nerve runs as a single nerve along the radial border
  // (no Y-division at the first web); its dorsal digital nerve (superficial radial) runs along the
  // radial border of the 2nd metacarpal rather than into the web.
  nerveForks: { radial: false, ulnar: true },
  dorsalNerveWebs: { radial: false, ulnar: true },
};

const THUMB_K = 1.16;

const THUMB_SPEC: DigitSpec = {
  id: 'thumb',
  reference: { lengthCm: 5.55, widthCm: 2.36 },
  skinProfile: [
    [-1.4, 1.3],
    [-0.6, 1.24],
    [0.0, 1.18],
    [1.0, 1.12],
    [2.0, 1.08],
    [2.75, 1.1],
    [2.95, 1.11],
    [3.4, 1.05],
    [4.2, 1.0],
    [4.8, 0.93],
    [5.15, 0.74],
    [5.4, 0.44],
    [5.55, 0.0],
  ],
  flatten: 0.85,
  joints: { mcp: -0.6, ip: [2.95], nailFold: 3.55 },
  nailEndY: 5.22,
  knuckles: [[2.95, 0.3, 0.05]],
  pad: [4.1, 4.75, 5.15, 5.45],
  k: THUMB_K,
  bones: [
    { id: 'metacarpal_head', y0: -4.6, y1: -0.05, r: 0.5 * 1.15, profile: scaleProfile(METACARPAL, 1.15) },
    { id: 'phalanx_proximal', y0: 0.15, y1: 2.85, r: 0.43 * 1.18, profile: scaleProfile(PHALANX, 1.18) },
    { id: 'phalanx_distal', y0: 3.05, y1: 5.05, r: 0.33 * 1.3, profile: scaleProfile(DISTAL_PHALANX, 1.3) },
  ],
  // The first web space lies on the thumb's ulnar side; the radial border has no web.
  webs: { radial: false, ulnar: true },
  // Both thumb arteries come from the princeps pollicis, not from a web bifurcation.
  arteryForks: { radial: false, ulnar: false },
  nerveForks: { radial: false, ulnar: false },
  dorsalNerveWebs: { radial: false, ulnar: false },
  // Superficial radial nerve branches reach the nail fold.
  dorsalNerveEndY: 3.6,
  palmarDorsalBranch: null,
  archYs: [2.45],
  arteryDorsalYs: [1.4],
  veinLadderYs: [1.2, 2.5, 3.9],
  flexor: 'fpl',
  sheath: [-0.9, 3.35],
  pulleys: [
    ['A1', -0.6, 0.5],
    ['Oblique', 1.3, 1.0],
    ['A2', 2.75, 0.35],
  ],
  extensor: 'epl-epb',
  safeZone: { y0: 0.3, y1: 1.9, halfWidthDeg: 25 },
  avoidZone: { y0: 0.1, y1: 4.4, theta0: 203, theta1: 337 },
  entryY: 1.0,
  creases: [['landmark_ip_crease', 2.95]],
  webLandmark: 'ulnar',
  absent: ['phalanx_middle', 'landmark_pip_crease', 'landmark_dip_crease'],
};

/** Base finger template positions (k = 1); digits scale them by `k`. */
const NERVE: TubeSpec = { x: 0.6, z: -0.5, r: 0.08 };
const ARTERY: TubeSpec = { x: 0.68, z: -0.29, r: 0.065 };
const TENDON: TubeSpec = { x: 0, z: -0.5, r: 0.16 };
/** Bone capsules: centred at z = BONE_Z, flattened by BONE_Z_SCALE. */
export const BONE_Z = 0.08;
export const BONE_Z_SCALE = 0.9;

export class Digit {
  readonly id: DigitId;
  readonly reference: DigitSpec['reference'];
  readonly flatten: number;
  readonly joints: DigitSpec['joints'];
  readonly tipY: number;
  readonly envelopeY0: number;
  readonly envelopeY1: number;
  readonly nailEndY: number;
  readonly k: number;
  readonly bones: BoneSpec[];
  readonly safeZone: DigitSpec['safeZone'];
  readonly avoidZone: DigitSpec['avoidZone'];
  readonly entryY: number;
  readonly creases: DigitSpec['creases'];
  readonly webLandmark: Side;
  readonly pulleys: DigitSpec['pulleys'];
  readonly sheath: DigitSpec['sheath'];
  readonly tendonZ: number;
  readonly hasExtensorHood: boolean;
  private readonly spec: DigitSpec;
  private readonly absent: Set<StructureId>;
  private cachedPaths: AnatomyPath[] | null = null;

  constructor(spec: DigitSpec) {
    this.spec = spec;
    this.id = spec.id;
    this.reference = spec.reference;
    this.flatten = spec.flatten;
    this.joints = spec.joints;
    this.envelopeY0 = spec.skinProfile[0][0];
    this.envelopeY1 = spec.skinProfile[spec.skinProfile.length - 1][0];
    this.tipY = this.envelopeY1;
    this.nailEndY = spec.nailEndY;
    this.k = spec.k;
    this.bones = spec.bones;
    this.safeZone = spec.safeZone;
    this.avoidZone = spec.avoidZone;
    this.entryY = spec.entryY;
    this.creases = spec.creases;
    this.webLandmark = spec.webLandmark;
    this.pulleys = spec.pulleys;
    this.sheath = spec.sheath;
    this.tendonZ = TENDON.z * spec.k;
    this.hasExtensorHood = spec.extensor === 'hood';
    this.absent = new Set(spec.absent);
  }

  /** Whether the digit has this structure (e.g. the thumb has no middle phalanx). */
  has(id: StructureId): boolean {
    return !this.absent.has(id);
  }

  get isThumb(): boolean {
    return this.id === 'thumb';
  }

  // ------------------------------------------------------------- skin

  /** Linear interpolation of the skin radius at height y. */
  skinRadiusAt(y: number): number {
    const p = this.spec.skinProfile;
    if (y <= p[0][0]) return p[0][1];
    for (let i = 1; i < p.length; i++) {
      const [y1, r1] = p[i];
      const [y0, r0] = p[i - 1];
      if (y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
    }
    return 0;
  }

  /**
   * Point on (or offset from) the skin surface.
   * @param thetaDeg angle in the XZ plane measured from +X (ulnar) toward +Z (dorsal):
   *   0° = ulnar, 90° = dorsal, 180° = radial, 270° = volar.
   * @param s radial multiplier (1 = on the skin, >1 outside, <1 inside).
   */
  surfacePoint(y: number, thetaDeg: number, s = 1, out = new Vector3()): Vector3 {
    const r = this.skinRadiusAt(y) * s;
    const t = thetaDeg * DEG;
    return out.set(r * Math.cos(t), y, r * this.flatten * Math.sin(t));
  }

  /** Outward surface normal (ignores the small longitudinal slope). */
  surfaceNormal(thetaDeg: number, out = new Vector3()): Vector3 {
    const t = thetaDeg * DEG;
    return out.set(Math.cos(t), 0, Math.sin(t) / this.flatten).normalize();
  }

  /** Normalised radial position in the skin cross-section (1 = on the skin). */
  skinFraction(p: Vector3): number {
    const r = this.skinRadiusAt(p.y);
    if (r <= 0) return Infinity;
    return Math.hypot(p.x / r, p.z / (r * this.flatten));
  }

  thetaOf(p: Vector3): number {
    const t = (Math.atan2(p.z / this.flatten, p.x) * 180) / Math.PI;
    return ((t % 360) + 360) % 360;
  }

  /** Ratio of the skin radius at y to the base radius (structures taper with the digit). */
  taper(y: number): number {
    return Math.max(this.skinRadiusAt(Math.min(y, this.tipY - 0.7)) / this.skinRadiusAt(0), 0.55);
  }

  /** Visual refinements on the elliptical cross-section: fuller volar pulp and dorsal knuckles. */
  private envelopeBulge(y: number, thetaDeg: number): number {
    const t = thetaDeg * DEG;
    const volar = Math.max(0, -Math.sin(t));
    const dorsal = Math.max(0, Math.sin(t));
    const [a0, a1, b0, b1] = this.spec.pad;
    let f = 1 + 0.09 * smoothstep(a0, a1, y) * (1 - smoothstep(b0, b1, y)) * volar ** 1.5;
    for (const [yc, w, a] of this.spec.knuckles) f += a * Math.exp(-(((y - yc) / w) ** 2)) * dorsal ** 2;
    return f;
  }

  /**
   * Skin-like envelope with uniform rings and real UVs (u = angle around
   * the digit, v = position along it) so crease/fingerprint textures map
   * predictably. θ uses the same convention as `surfacePoint`.
   */
  createEnvelopeGeometry(radiusScale = 1, segments = 64, rings = 120): BufferGeometry {
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const p = new Vector3();
    for (let i = 0; i <= rings; i++) {
      const y = this.envelopeY0 + ((this.envelopeY1 - this.envelopeY0) * i) / rings;
      for (let j = 0; j <= segments; j++) {
        const th = (360 * j) / segments;
        this.surfacePoint(y, th, radiusScale * this.envelopeBulge(y, th), p);
        positions.push(p.x, p.y, p.z);
        uvs.push(j / segments, i / rings);
      }
    }
    const row = segments + 1;
    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < segments; j++) {
        const a = i * row + j;
        const b = a + 1;
        const c = a + row;
        const d = c + 1;
        // Counter-clockwise seen from outside (θ increases from +X toward +Z, y increases distally).
        indices.push(a, c, b, b, c, d);
      }
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  /**
   * A curved patch hugging the skin between two heights and two angles.
   * UVs are in centimetres of arc/length so repeating textures keep scale.
   */
  createSurfacePatch(y0: number, y1: number, theta0: number, theta1: number, s = 1.03, segY = 24, segT = 24): BufferGeometry {
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const p = new Vector3();
    for (let i = 0; i <= segY; i++) {
      const y = y0 + ((y1 - y0) * i) / segY;
      for (let j = 0; j <= segT; j++) {
        const th = theta0 + ((theta1 - theta0) * j) / segT;
        this.surfacePoint(y, th, s, p);
        positions.push(p.x, p.y, p.z);
        uvs.push((th - theta0) * DEG * this.skinRadiusAt(y) * s, y - y0);
      }
    }
    const row = segT + 1;
    for (let i = 0; i < segY; i++) {
      for (let j = 0; j < segT; j++) {
        const a = i * row + j;
        const b = a + 1;
        const c = a + row;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  /** The digit's dorsal MCP knuckle landmark (unscaled anatomy frame). */
  knuckle(): Vector3 {
    return this.surfacePoint(this.joints.mcp, 90, 1.03);
  }

  // ------------------------------------------------------------- bones / zones

  insideBone(p: Vector3): boolean {
    const dz = (p.z - BONE_Z) / BONE_Z_SCALE;
    return this.bones.some((b) => Math.hypot(p.x, dz) < boneRadiusAt(b, p.y));
  }

  /** Where the model needle arrow ends: beside the bone, near (not in) the bundle. */
  needleTarget(side: Side): Vector3 {
    return new Vector3(0.74 * this.k * SIDE_SIGN[side], this.entryY, -0.16 * this.k);
  }

  /** Centre of the simulated injectate for a side. */
  injectateCenter(side: Side): Vector3 {
    return new Vector3(0.68 * this.k * SIDE_SIGN[side], this.entryY + 0.2, -0.3 * this.k);
  }

  // ------------------------------------------------------------- extensor

  /** Height just dorsal to the bones at y (extensor tendons lie here). */
  extensorZ(y: number): number {
    let top = 0;
    for (const b of this.bones) top = Math.max(top, boneRadiusAt(b, y));
    return BONE_Z + Math.max(top, 0.24 * this.k) * BONE_Z_SCALE + 0.06;
  }

  /** Extensor hood band (fingers): central slip → terminal tendon. */
  get extensorBand(): { y0: number; y1: number; halfWidth: number; halfThickness: number } | null {
    if (!this.hasExtensorHood) return null;
    return { y0: -3.6, y1: this.joints.ip[this.joints.ip.length - 1] + 0.25, halfWidth: 0.34 * this.k, halfThickness: 0.05 };
  }

  extensorHalfWidth(y: number): number {
    const band = this.extensorBand;
    if (!band) return 0;
    const [pip, dip] = this.joints.ip;
    // Narrows over the middle phalanx (lateral bands converge) and to the terminal tendon.
    return band.halfWidth * (1 - 0.35 * smoothstep(pip + 0.1, dip + 0.05, y)) * this.taper(y);
  }

  insideExtensor(p: Vector3): boolean {
    const band = this.extensorBand;
    if (!band || p.y < band.y0 || p.y > band.y1) return false;
    return Math.abs(p.x) <= this.extensorHalfWidth(p.y) && Math.abs(p.z - this.extensorZ(p.y)) <= band.halfThickness + 0.02;
  }

  // ------------------------------------------------------------- paths

  /**
   * Centre of a palmar neurovascular trunk at height y. Gently tortuous;
   * on a side with a web it swings toward the web proximally, where the
   * common palmar digital vessels and nerves bifurcate.
   */
  trunkCenter(kind: 'nerve' | 'artery', side: Side, y: number, out = new Vector3()): Vector3 {
    const spec = kind === 'nerve' ? NERVE : ARTERY;
    const t = this.taper(y);
    const phase = side === 'radial' ? 0 : 1.3;
    const amp = kind === 'artery' ? 0.025 : 0.01;
    let x = spec.x * this.k * t + amp * Math.sin(y * 2.4 + phase);
    let z = spec.z * this.k * t + amp * 0.6 * Math.cos(y * 1.9 + phase);
    if (kind === 'artery' ? this.arteryForks(side) : this.nerveForks(side)) {
      const web = smoothstep(0, -1.6, y);
      x += 0.45 * web;
      z -= 0.12 * web;
    }
    return out.set(SIDE_SIGN[side] * x, y, z);
  }

  /** Whether this side's palmar digital artery divides from a common digital artery at a web. */
  arteryForks(side: Side): boolean {
    return (this.spec.arteryForks ?? this.spec.webs)[side];
  }

  /** Whether this side's palmar digital nerve divides from a common digital nerve at a web. */
  nerveForks(side: Side): boolean {
    return (this.spec.nerveForks ?? this.spec.webs)[side];
  }

  /** All modelled nerve/artery/vein/tendon paths (built once per digit). */
  paths(): AnatomyPath[] {
    this.cachedPaths ??= this.buildPaths();
    return this.cachedPaths;
  }

  private buildPaths(): AnatomyPath[] {
    const s = this.spec;
    const k = this.k;
    const tip = this.tipY;
    const v = (x: number, y: number, z: number) => new Vector3(x * k, y, z * k);
    const paths: AnatomyPath[] = [];

    for (const side of SIDES) {
      const sx = SIDE_SIGN[side];
      const nerve = `nerve_${side}` as StructureId;
      const artery = `artery_${side}` as StructureId;
      const vein = `vein_${side}` as StructureId;
      const dorsalNerve = `dorsal_nerve_${side}` as StructureId;
      const web = s.webs[side];

      // --- Proper palmar digital nerve: trunk, web bifurcation stub, dorsal and terminal branches.
      const nEnd = this.trunkCenter('nerve', side, tip - 1.2);
      paths.push({ structure: nerve, name: `${nerve}_trunk`, kind: 'nerve', points: sample((y) => this.trunkCenter('nerve', side, y), -3.6, tip - 1.2), r0: 0.09 * k, r1: 0.055 * k, evaluate: true });
      if (this.nerveForks(side)) {
        const nFork = this.trunkCenter('nerve', side, -1.4);
        paths.push({ structure: nerve, name: `${nerve}_common_branch`, kind: 'nerve', points: [nFork, v(sx * 1.35, -0.9, -0.58), v(sx * 1.55, -0.4, -0.55)], r0: 0.07, r1: 0.06, evaluate: true });
      }
      if (s.palmarDorsalBranch) {
        const [a, b] = s.palmarDorsalBranch;
        const n = this.trunkCenter('nerve', side, a);
        const span = b - a;
        // Leaves the trunk, winds dorsally round the side of the digit, then runs distally.
        const pts = [n, v(sx * 0.68, a + 0.12 * span, -0.22), v(sx * 0.7, a + 0.25 * span, 0.12), v(sx * 0.64, a + 0.4 * span, 0.34)];
        for (const [f, x, z] of [
          [0.62, 0.55, 0.42],
          [0.82, 0.46, 0.41],
          [1, 0.36, 0.38],
        ] as const) {
          const y = a + f * span;
          const t = this.taper(y) / this.taper(a + 0.4 * span);
          pts.push(v(sx * x * t, y, z * t));
        }
        paths.push({ structure: nerve, name: `${nerve}_dorsal_branch`, kind: 'nerve', points: pts, r0: 0.035, r1: 0.02, evaluate: true });
      }
      for (const [name, end] of [
        ['pulp', v(sx * 0.14, tip - 0.5, -0.4)],
        ['nailbed', v(sx * 0.28, tip - 0.65, 0.18)],
        ['lateral', v(sx * 0.5, tip - 0.55, -0.12)],
      ] as const) {
        paths.push({ structure: nerve, name: `${nerve}_terminal_${name}`, kind: 'nerve', points: [nEnd, nEnd.clone().lerp(end, 0.5).setZ((nEnd.z + end.z) / 2 - 0.03), end], r0: 0.04, r1: 0.018, evaluate: true });
      }

      // --- Dorsal digital nerve (superficial radial / dorsal ulnar origin): subcutaneous, dorsolateral.
      const dTheta = DORSAL_NERVE_DEG[side];
      const dEnd = s.dorsalNerveEndY;
      const dorsalAt = (y: number) => {
        // Drifts slightly toward the dorsal midline distally, and toward the web proximally.
        const th = dTheta + (90 - dTheta) * 0.35 * smoothstep(dEnd - 1.5, dEnd, y) + 3 * Math.sin(y * 1.3);
        const p = this.surfacePoint(y, th, 0.86);
        if ((s.dorsalNerveWebs ?? s.webs)[side]) {
          const w = smoothstep(-0.2, -2.0, y);
          p.x += sx * 0.4 * w;
          p.z -= 0.05 * w;
        }
        return p;
      };
      paths.push({ structure: dorsalNerve, name: `${dorsalNerve}_trunk`, kind: 'nerve', points: sample(dorsalAt, -3.4, dEnd), r0: 0.05 * k, r1: 0.022, evaluate: true });
      for (const y of [dEnd * 0.45, dEnd * 0.8]) {
        // Small twigs toward the dorsal skin.
        const a = dorsalAt(y);
        const b = this.surfacePoint(y + 0.5, (dTheta + 90) / 2, 0.9);
        paths.push({ structure: dorsalNerve, name: `${dorsalNerve}_twig_${y.toFixed(2)}`, kind: 'nerve', points: [a, a.clone().lerp(b, 0.5), b], r0: 0.02, r1: 0.012, evaluate: false });
      }

      // --- Proper palmar digital artery: trunk, bifurcation stub, condylar arches, pulp arcade, dorsal branches.
      const aEnd = this.trunkCenter('artery', side, tip - 1.1);
      paths.push({ structure: artery, name: `${artery}_trunk`, kind: 'artery', points: sample((y) => this.trunkCenter('artery', side, y), -3.6, tip - 1.1), r0: 0.08 * k, r1: 0.045 * k, evaluate: true });
      if (this.arteryForks(side)) {
        const aFork = this.trunkCenter('artery', side, -1.2);
        paths.push({ structure: artery, name: `${artery}_common_branch`, kind: 'artery', points: [aFork, v(sx * 1.3, -0.75, -0.4), v(sx * 1.5, -0.25, -0.38)], r0: 0.065, r1: 0.055, evaluate: true });
      }
      for (const y of s.archYs) {
        const a = this.trunkCenter('artery', side, y);
        const t = this.taper(y);
        // Half of each transverse (condylar) arch, deep to the flexor tendons; the halves meet in the midline.
        paths.push({ structure: artery, name: `${artery}_arch_${y}`, kind: 'artery', points: [a, v(sx * 0.38 * t, y + 0.05, -0.33 * t), v(sx * 0.12 * t, y + 0.08, -0.35 * t), v(0, y + 0.08, -0.35 * t)], r0: 0.035, r1: 0.03, evaluate: true });
      }
      paths.push({ structure: artery, name: `${artery}_pulp_arcade`, kind: 'artery', points: [aEnd, v(sx * 0.35, tip - 0.75, -0.38), v(sx * 0.12, tip - 0.6, -0.4), v(0, tip - 0.58, -0.4)], r0: 0.035, r1: 0.025, evaluate: true });
      for (const y of s.arteryDorsalYs) {
        const a = this.trunkCenter('artery', side, y);
        const t = this.taper(y);
        paths.push({ structure: artery, name: `${artery}_dorsal_branch_${y}`, kind: 'artery', points: [a, v(sx * 0.76 * t, y + 0.35, 0.05 * t), v(sx * 0.62 * t, y + 0.85, 0.36 * t)], r0: 0.028, r1: 0.018, evaluate: true });
      }

      // --- Dorsal digital vein with cross-connections; proximally it heads to the web (intercapitular vein).
      const theta = side === 'radial' ? 118 : 62;
      const veinEnd = tip - 1.5;
      const veinAt = (y: number) => {
        const p = this.surfacePoint(y, theta + 4 * Math.sin(y * 1.7), 0.9);
        if (web) {
          const w = smoothstep(-0.3, -2.0, y);
          p.x += sx * 0.45 * w;
          p.z -= 0.15 * w;
        }
        return p;
      };
      paths.push({ structure: vein, name: `${vein}_main`, kind: 'vein', points: sample(veinAt, -3.4, veinEnd), r0: 0.065, r1: 0.04, evaluate: false });
      for (const y of s.veinLadderYs) {
        const pts = [0, 0.33, 0.66, 1].map((t) => this.surfacePoint(y + 0.25 * Math.sin(t * Math.PI), theta + (90 - theta) * t, 0.9));
        paths.push({ structure: vein, name: `${vein}_ladder_${y}`, kind: 'vein', points: pts, r0: 0.035, r1: 0.03, evaluate: false });
      }
      paths.push({ structure: vein, name: `${vein}_distal_arc`, kind: 'vein', points: [0, 0.5, 1].map((t) => this.surfacePoint(veinEnd + 0.25 * t, theta + (90 - theta) * t, 0.88)), r0: 0.035, r1: 0.025, evaluate: false });
    }

    // --- Flexor tendons (all part of the "flexor_tendon" structure).
    if (s.flexor === 'fds-fdp') {
      const [pip, dip] = s.joints.ip;
      const fdpAt = (y: number) => new Vector3(0, y, TENDON.z * k * this.taper(y));
      paths.push({ structure: 'flexor_tendon', name: 'fdp', kind: 'tendon', points: sample(fdpAt, -3.6, dip + 0.2), r0: TENDON.r, r1: 0.11, scaleX: 1.2, scaleZ: 0.8, evaluate: true });
      const fdsAt = (y: number) => new Vector3(0, y, -0.63 * k * this.taper(y));
      paths.push({ structure: 'flexor_tendon', name: 'fds', kind: 'tendon', points: sample(fdsAt, -3.6, 1.2), r0: 0.17, r1: 0.14, scaleX: 1.5, scaleZ: 0.55, evaluate: true });
      for (const sx of [-1, 1]) {
        // FDS slips part around FDP (Camper's chiasm) to insert on the middle phalanx.
        paths.push({
          structure: 'flexor_tendon',
          name: `fds_slip_${sx < 0 ? 'radial' : 'ulnar'}`,
          kind: 'tendon',
          points: [v(sx * 0.08, 1.1, -0.62), v(sx * 0.26, 2.2, -0.56), v(sx * 0.24, pip - 0.9, -0.4), v(sx * 0.2, pip - 0.1, -0.3), v(sx * 0.2, pip + 0.6, -0.26)],
          r0: 0.09,
          r1: 0.07,
          evaluate: true,
        });
      }
    } else {
      // Flexor pollicis longus: the thumb's only long flexor, inserting on the distal phalanx base.
      const [ip] = s.joints.ip;
      const fplAt = (y: number) => new Vector3(0, y, TENDON.z * k * this.taper(y));
      paths.push({ structure: 'flexor_tendon', name: 'fpl', kind: 'tendon', points: sample(fplAt, -3.6, ip + 0.35), r0: 0.19, r1: 0.13, scaleX: 1.25, scaleZ: 0.8, evaluate: true });
    }

    // --- Thumb extensors: EPL (to the distal phalanx) and EPB (to the proximal phalanx base).
    if (s.extensor === 'epl-epb') {
      const [ip] = s.joints.ip;
      const eplAt = (y: number) => new Vector3(0.28 * k * (1 - smoothstep(-3.6, 0.5, y)), y, this.extensorZ(y) + 0.02);
      paths.push({ structure: 'extensor_tendon', name: 'epl', kind: 'tendon', points: sample(eplAt, -3.6, ip + 0.3), r0: 0.09, r1: 0.07, scaleX: 1.6, scaleZ: 0.6, evaluate: true });
      const epbAt = (y: number) => {
        const t = smoothstep(-3.6, 0.3, y);
        return new Vector3(-k * (0.5 - 0.36 * t), y, this.extensorZ(y) - 0.08 * (1 - t) + 0.02);
      };
      paths.push({ structure: 'extensor_tendon', name: 'epb', kind: 'tendon', points: sample(epbAt, -3.6, 0.3), r0: 0.08, r1: 0.065, scaleX: 1.4, scaleZ: 0.6, evaluate: true });
    }
    return paths;
  }
}

function sample(f: (y: number) => Vector3, y0: number, y1: number, step = 0.18): Vector3[] {
  const n = Math.max(2, Math.ceil(Math.abs(y1 - y0) / step));
  return Array.from({ length: n + 1 }, (_, i) => f(y0 + ((y1 - y0) * i) / n));
}

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

export const FINGER = new Digit(FINGER_SPEC);
export const INDEX = new Digit(INDEX_SPEC);
export const LITTLE = new Digit(LITTLE_SPEC);
export const THUMB = new Digit(THUMB_SPEC);
export const DIGITS: Record<DigitId, Digit> = { finger: FINGER, index: INDEX, little: LITTLE, thumb: THUMB };

/** Digit layout for a hand digit. */
export function digitFor(finger: FingerId): Digit {
  if (finger === 'thumb') return THUMB;
  if (finger === 'little') return LITTLE;
  if (finger === 'index') return INDEX;
  return FINGER;
}

/** Largest bone radius (for labels/tests). */
export function boneMaxRadius(b: BoneSpec): number {
  return maxR(b.profile);
}
