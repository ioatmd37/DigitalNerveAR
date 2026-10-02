import { Vector3 } from 'three';
import { DORSOLATERAL_DEG, FINGER, pathDistance, SIDES, type Digit, type Side } from '../three/anatomy/layout';

/**
 * Virtual needle practice on the SIMPLIFIED MANNEQUIN MODEL.
 *
 * All feedback describes the needle's position relative to this model's
 * schematic structures (for the selected digit's layout: finger, little
 * finger or thumb; every function takes the `Digit`, default = finger).
 * It is not a judgement about real anatomy or real
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

export function defaultNeedleState(side: NeedleSide = 'radial', d: Digit = FINGER): NeedleState {
  return {
    side,
    entryY: d.entryY,
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
export function entryFromPoint(p: Vector3, d: Digit = FINGER): { entryY: number; entryThetaDeg: number } {
  return { entryY: Math.min(maxEntryY(d), Math.max(-0.8, p.y)), entryThetaDeg: Math.round(d.thetaOf(p)) };
}

/** Most distal entry level allowed for a digit. */
export function maxEntryY(d: Digit = FINGER): number {
  return d.tipY - 1.0;
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

export function needleGeometry(
  n: Pick<NeedleState, 'entryY' | 'entryThetaDeg' | 'aimDeg' | 'tiltDeg' | 'depthCm'>,
  d: Digit = FINGER,
): NeedleGeometry {
  const entry = d.surfacePoint(n.entryY, n.entryThetaDeg, 1);
  const inward = d.surfaceNormal(n.entryThetaDeg).negate();
  // Pick the rotation sense that swings the needle toward the palm (−Z) for positive aim.
  const towardPalm = rotateXZ(inward, 1).z < inward.z ? 1 : -1;
  const dir = rotateXZ(inward, towardPalm * n.aimDeg);
  dir.y = Math.tan((n.tiltDeg * Math.PI) / 180) * Math.hypot(dir.x, dir.z);
  dir.normalize();
  const tip = entry.clone().addScaledVector(dir, n.depthCm);
  return { entry, dir, tip };
}

/** Smallest distance from p to any evaluated path of a kind (negative = inside). */
function nearest(p: Vector3, kind: 'nerve' | 'artery' | 'tendon', d: Digit): number {
  let best = Infinity;
  for (const path of d.paths()) {
    if (path.kind !== kind || !path.evaluate) continue;
    best = Math.min(best, pathDistance(p, path));
  }
  return best;
}

/** Classify one point (anatomy frame) against the model. Highest-priority finding wins. */
export function classifyPoint(p: Vector3, d: Digit = FINGER): NeedleStatus {
  if (d.skinFraction(p) > 1.0) return 'outside';
  const artery = nearest(p, 'artery', d);
  const nerve = nearest(p, 'nerve', d);
  if (artery < 0.03) return 'artery';
  if (nerve < 0.03) return 'nerve';
  if (nearest(p, 'tendon', d) < 0.02 || d.insideExtensor(p)) return 'tendon';
  if (d.insideBone(p)) return 'bone';
  const zone = d.safeZone;
  for (const side of SIDES) {
    const t = d.needleTarget(side);
    if (p.y >= zone.y0 && p.y <= zone.y1 + 0.2 && Math.hypot(p.x - t.x, p.z - t.z) <= 0.3 * d.k) return 'target';
  }
  if (nerve < 0.25 || artery < 0.25) return 'nearBundle';
  const th = d.thetaOf(p);
  const avoid = d.avoidZone;
  if (p.y >= avoid.y0 && p.y <= avoid.y1 && th >= avoid.theta0 && th <= avoid.theta1 && d.skinFraction(p) > 0.45) {
    return 'avoidZone';
  }
  return 'tissue';
}

export function entryInLearningZone(n: Pick<NeedleState, 'entryY' | 'entryThetaDeg'>, d: Digit = FINGER): boolean {
  const side = sideOfTheta(n.entryThetaDeg);
  const diff = Math.abs(((n.entryThetaDeg - DORSOLATERAL_DEG[side] + 540) % 360) - 180);
  const zone = d.safeZone;
  return n.entryY >= zone.y0 && n.entryY <= zone.y1 && diff <= zone.halfWidthDeg;
}

export interface NeedleEvaluation extends NeedleGeometry {
  inserted: boolean;
  tipStatus: NeedleStatus;
  /** Red/bone findings anywhere along the shaft inside the finger. */
  pathEvents: NeedleStatus[];
  entryOk: boolean;
  side: NeedleSide;
}

export function evaluateNeedle(n: NeedleState, d: Digit = FINGER): NeedleEvaluation {
  const g = needleGeometry(n, d);
  const inserted = n.depthCm > 0.02;
  const tipRaw = inserted ? classifyPoint(g.tip, d) : 'outside';
  const tipStatus: NeedleStatus = inserted && tipRaw === 'outside' ? 'exited' : tipRaw;
  const pathEvents = new Set<NeedleStatus>();
  if (tipStatus === 'exited') pathEvents.add('exited');
  if (inserted) {
    const steps = Math.max(4, Math.ceil(n.depthCm / 0.04));
    for (let i = 1; i <= steps; i++) {
      const s = classifyPoint(g.entry.clone().addScaledVector(g.dir, (n.depthCm * i) / steps), d);
      if (RED_STATUSES.includes(s) || s === 'bone') pathEvents.add(s);
    }
  }
  return {
    ...g,
    inserted,
    tipStatus,
    pathEvents: [...pathEvents],
    entryOk: entryInLearningZone(n, d),
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

/** Learning modes that show and use the virtual needle. */
export function usesNeedle(mode: string): boolean {
  return mode === 'needle' || mode === 'osce';
}
