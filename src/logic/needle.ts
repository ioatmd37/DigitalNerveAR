import { Vector3 } from 'three';
import { FLATTEN, skinRadiusAt, surfaceNormal, surfacePoint } from '../three/anatomy/geometry';
import {
  ARTERY,
  AVOID_ZONE,
  BONE_Z,
  BONE_Z_SCALE,
  BONES,
  DORSOLATERAL_DEG,
  ENTRY_Y,
  NERVE,
  needleTarget,
  SAFE_ZONE,
  TENDON,
  type Side,
  type TubeSpec,
} from '../three/anatomy/layout';

/**
 * Virtual needle practice on the SIMPLIFIED MANNEQUIN MODEL.
 *
 * All feedback describes the needle's position relative to this model's
 * schematic structures. It is not a judgement about real anatomy or real
 * injection technique.
 */

export type NeedleSide = Side;

export interface NeedleState {
  side: NeedleSide;
  /** Entry level along the finger, cm from the finger base (web crease). */
  entryY: number;
  /** Entry position around the finger, degrees (0 ulnar, 90 dorsal, 180 radial, 270 volar). */
  entryThetaDeg: number;
  /** Swing of the needle from "straight in" toward the palm (+) or the back (−), degrees. */
  aimDeg: number;
  /** Tilt toward the fingertip (+) or the hand (−), degrees. */
  tiltDeg: number;
  /** Insertion depth from the skin, cm. */
  depthCm: number;
  aspiration: 'none' | 'clear' | 'blood';
  injected: boolean;
  /** Red/bone events met during this attempt. */
  events: NeedleStatus[];
  /** Show internal anatomy while practising (off = "blind" practice). */
  showAnatomy: boolean;
  results: Partial<Record<NeedleSide, NeedleResult>>;
}

export type NeedleStatus =
  | 'outside'
  | 'tissue'
  | 'target'
  | 'nearBundle'
  | 'bone'
  | 'avoidZone'
  | 'tendon'
  | 'nerve'
  | 'artery'
  /** Inserted, but the tip has come out through the skin again (through-and-through). */
  | 'exited';

/** Statuses that count as a red (unsafe-in-model) event. */
export const RED_STATUSES: NeedleStatus[] = ['nerve', 'artery', 'tendon', 'avoidZone', 'exited'];

export type StatusLevel = 'neutral' | 'good' | 'caution' | 'danger';

export function statusLevel(s: NeedleStatus): StatusLevel {
  if (RED_STATUSES.includes(s)) return 'danger';
  if (s === 'bone' || s === 'nearBundle') return 'caution';
  if (s === 'target') return 'good';
  return 'neutral';
}

export const MAX_DEPTH_CM = 2.5;
export const NEEDLE_LENGTH_CM = 3.8;

export function defaultNeedleState(side: NeedleSide = 'radial'): NeedleState {
  return {
    side,
    entryY: ENTRY_Y,
    entryThetaDeg: DORSOLATERAL_DEG[side],
    aimDeg: 0,
    tiltDeg: 0,
    depthCm: 0,
    aspiration: 'none',
    injected: false,
    events: [],
    showAnatomy: true,
    results: {},
  };
}

/** Side of the finger an entry angle belongs to. */
export function sideOfTheta(thetaDeg: number): NeedleSide {
  const t = ((thetaDeg % 360) + 360) % 360;
  return t > 90 && t < 270 ? 'radial' : 'ulnar';
}

/** Convert a local (anatomy-frame) skin point to entry parameters. */
export function entryFromPoint(p: Vector3): { entryY: number; entryThetaDeg: number } {
  const theta = (Math.atan2(p.z / FLATTEN, p.x) * 180) / Math.PI;
  return { entryY: Math.min(7.5, Math.max(-0.8, p.y)), entryThetaDeg: Math.round(((theta % 360) + 360) % 360) };
}

function rotateXZ(v: Vector3, deg: number): Vector3 {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return new Vector3(v.x * c - v.z * s, v.y, v.x * s + v.z * c);
}

export interface NeedleGeometry {
  entry: Vector3;
  dir: Vector3;
  tip: Vector3;
}

export function needleGeometry(n: Pick<NeedleState, 'entryY' | 'entryThetaDeg' | 'aimDeg' | 'tiltDeg' | 'depthCm'>): NeedleGeometry {
  const entry = surfacePoint(n.entryY, n.entryThetaDeg, 1);
  const inward = surfaceNormal(n.entryThetaDeg).negate();
  // Pick the rotation sense that swings the needle toward the palm (−Z) for positive aim.
  const towardPalm = rotateXZ(inward, 1).z < inward.z ? 1 : -1;
  const d = rotateXZ(inward, towardPalm * n.aimDeg);
  d.y = Math.tan((n.tiltDeg * Math.PI) / 180) * Math.hypot(d.x, d.z);
  d.normalize();
  const tip = entry.clone().addScaledVector(d, n.depthCm);
  return { entry, dir: d, tip };
}

function taper(y: number): number {
  return Math.max(skinRadiusAt(Math.min(y, 7.8)) / skinRadiusAt(0), 0.55);
}

/** Distance from p to a tapered longitudinal tube's surface (negative = inside). */
function tubeDistance(p: Vector3, t: TubeSpec, sign: number): number {
  if (p.y < t.y0 || p.y > t.y1) return Infinity;
  const k = taper(p.y);
  return Math.hypot(p.x - t.x * sign * k, p.z - t.z * k) - t.r;
}

function insideBone(p: Vector3): boolean {
  return BONES.some((b) => {
    const cy = Math.min(Math.max(p.y, b.y0 + b.r), b.y1 - b.r);
    const dz = (p.z - BONE_Z) / BONE_Z_SCALE;
    return Math.hypot(p.x, p.y - cy, dz) < b.r;
  });
}

/** Normalised radial position in the skin cross-section (1 = on the skin). */
function skinFraction(p: Vector3): number {
  const r = skinRadiusAt(p.y);
  if (r <= 0) return Infinity;
  return Math.hypot(p.x / r, p.z / (r * FLATTEN));
}

function thetaOf(p: Vector3): number {
  const t = (Math.atan2(p.z / FLATTEN, p.x) * 180) / Math.PI;
  return ((t % 360) + 360) % 360;
}

/** Classify one point (anatomy frame) against the model. Highest-priority finding wins. */
export function classifyPoint(p: Vector3): NeedleStatus {
  if (skinFraction(p) > 1.0) return 'outside';
  for (const sign of [-1, 1]) {
    if (tubeDistance(p, ARTERY, sign) < 0.03) return 'artery';
    if (tubeDistance(p, NERVE, sign) < 0.03) return 'nerve';
  }
  if (tubeDistance(p, TENDON, 1) < 0.02) return 'tendon';
  if (insideBone(p)) return 'bone';
  for (const side of ['radial', 'ulnar'] as Side[]) {
    const t = needleTarget(side);
    if (p.y >= SAFE_ZONE.y0 && p.y <= SAFE_ZONE.y1 + 0.2 && Math.hypot(p.x - t.x, p.z - t.z) <= 0.3) return 'target';
  }
  for (const sign of [-1, 1]) {
    if (tubeDistance(p, NERVE, sign) < 0.25 || tubeDistance(p, ARTERY, sign) < 0.25) return 'nearBundle';
  }
  const th = thetaOf(p);
  if (p.y >= AVOID_ZONE.y0 && p.y <= AVOID_ZONE.y1 && th >= AVOID_ZONE.theta0 && th <= AVOID_ZONE.theta1 && skinFraction(p) > 0.45) {
    return 'avoidZone';
  }
  return 'tissue';
}

export function entryInLearningZone(n: Pick<NeedleState, 'entryY' | 'entryThetaDeg'>): boolean {
  const side = sideOfTheta(n.entryThetaDeg);
  const diff = Math.abs(((n.entryThetaDeg - DORSOLATERAL_DEG[side] + 540) % 360) - 180);
  return n.entryY >= SAFE_ZONE.y0 && n.entryY <= SAFE_ZONE.y1 && diff <= SAFE_ZONE.halfWidthDeg;
}

export interface NeedleEvaluation extends NeedleGeometry {
  inserted: boolean;
  tipStatus: NeedleStatus;
  /** Red/bone findings anywhere along the shaft inside the finger. */
  pathEvents: NeedleStatus[];
  entryOk: boolean;
  side: NeedleSide;
}

export function evaluateNeedle(n: NeedleState): NeedleEvaluation {
  const g = needleGeometry(n);
  const inserted = n.depthCm > 0.02;
  const tipRaw = inserted ? classifyPoint(g.tip) : 'outside';
  const tipStatus: NeedleStatus = inserted && tipRaw === 'outside' ? 'exited' : tipRaw;
  const pathEvents = new Set<NeedleStatus>();
  if (tipStatus === 'exited') pathEvents.add('exited');
  if (inserted) {
    const steps = Math.max(4, Math.ceil(n.depthCm / 0.04));
    for (let i = 1; i <= steps; i++) {
      const s = classifyPoint(g.entry.clone().addScaledVector(g.dir, (n.depthCm * i) / steps));
      if (RED_STATUSES.includes(s) || s === 'bone') pathEvents.add(s);
    }
  }
  return {
    ...g,
    inserted,
    tipStatus,
    pathEvents: [...pathEvents],
    entryOk: entryInLearningZone(n),
    side: sideOfTheta(n.entryThetaDeg),
  };
}

export interface NeedleResult {
  entryOk: boolean;
  noRedEvents: boolean;
  aspiratedFirst: boolean;
  injectedAtTarget: boolean;
  score: number;
}

/** Score one side when the learner injects. Each check is worth one point (max 4). */
export function scoreAttempt(n: NeedleState, e: NeedleEvaluation): NeedleResult {
  const noRedEvents = !n.events.some((s) => RED_STATUSES.includes(s)) && !e.pathEvents.some((s) => RED_STATUSES.includes(s));
  const r = {
    entryOk: e.entryOk,
    noRedEvents,
    aspiratedFirst: n.aspiration === 'clear',
    injectedAtTarget: e.tipStatus === 'target',
  };
  return { ...r, score: Object.values(r).filter(Boolean).length };
}
