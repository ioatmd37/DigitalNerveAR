import { Matrix4, Quaternion, Vector3 } from 'three';
import type { Digit } from '../three/anatomy/layout';
import type { FingerId, HandSide } from '../types';

/**
 * Markerless hand pose from MediaPipe Hand Landmarker output.
 *
 * MediaPipe gives 21 landmarks per hand: normalised image coordinates and
 * "world" coordinates (metres, origin near the hand centre, axes aligned
 * with the camera: x right, y down, z away from the camera). We convert to
 * three.js camera space in centimetres (x right, y up, z toward the viewer;
 * the camera looks down −z) and recover:
 *   - the hand frame used by the overlay (origin = dorsal skin over the
 *     middle-finger MCP, +X ulnar, +Y distal, +Z dorsal; right hand — a left
 *     hand gets the mirror image, see `estimateHandPose`),
 *   - the selected digit's pose and length from its own landmarks,
 *   - the lateral viewing angle used to switch the overlay off when the
 *     hand is turned too far onto its side.
 * Pure functions; no camera or DOM needed.
 */

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface HandObservation {
  /** Normalised image landmarks (x, y in 0..1 of the video frame). */
  image: Landmark[];
  /** Metric landmarks in metres (MediaPipe world coordinates). */
  world: Landmark[];
}

/** Pinhole model of the camera video (pixels). */
export interface CameraIntrinsics {
  width: number;
  height: number;
  /** Focal length in pixels (square pixels, principal point at the centre). */
  focal: number;
}

/** MediaPipe landmark indices. */
export const LM = {
  wrist: 0,
  thumb: { mcp: 2, pip: 3, tip: 4 },
  index: { mcp: 5, pip: 6, tip: 8 },
  middle: { mcp: 9, pip: 10, tip: 12 },
  ring: { mcp: 13, pip: 14, tip: 16 },
  little: { mcp: 17, pip: 18, tip: 20 },
} as const satisfies Record<FingerId | 'wrist', unknown>;

/** Focal length (px) for a camera whose LONG image side spans `fovLongDeg`. */
export function focalFromFov(width: number, height: number, fovLongDeg: number): number {
  return Math.max(width, height) / 2 / Math.tan(((fovLongDeg / 2) * Math.PI) / 180);
}

/** MediaPipe world landmark (m) → three.js camera axes (cm). */
export function toCamera(l: Landmark, out = new Vector3()): Vector3 {
  return out.set(l.x * 100, -l.y * 100, -l.z * 100);
}

/**
 * Lateral viewing angle, degrees: the angle between the camera's line of
 * sight and the knuckle line (index MCP → little MCP). 90° = the back (or
 * palm) of the hand faces the camera squarely; 45° or 135° = the hand is
 * turned 45° onto its side.
 *
 * Two estimates are combined and the larger tilt wins: the metric
 * landmarks' depth, and the image foreshortening of the knuckle line
 * relative to the palm length (MediaPipe tends to underestimate depth, so
 * the image cue catches strong rolls). The sign comes from the depth.
 */
export function lateralViewAngle(world: Landmark[], image?: Landmark[], cam?: Pick<CameraIntrinsics, 'width' | 'height'>): number {
  const W = (i: number) => toCamera(world[i]);
  const a = W(LM.little.mcp).sub(W(LM.index.mcp));
  const len = a.length() || 1;
  const worldAngle = (Math.acos(Math.min(1, Math.max(-1, a.z / len))) * 180) / Math.PI;
  if (!image || !cam) return worldAngle;

  const P = (i: number) => new Vector3(image[i].x * cam.width, image[i].y * cam.height, 0);
  const knucklesPx = P(LM.little.mcp).distanceTo(P(LM.index.mcp));
  const palmPx = P(LM.middle.mcp).distanceTo(P(LM.wrist));
  const palmCm = W(LM.middle.mcp).distanceTo(W(LM.wrist));
  if (palmPx < 1 || palmCm < 1e-3) return worldAngle;
  const cos = Math.min(1, knucklesPx / palmPx / (len / palmCm));
  const tiltImage = (Math.acos(cos) * 180) / Math.PI;
  const tilt = Math.max(Math.abs(worldAngle - 90), tiltImage);
  return 90 + (worldAngle >= 90 ? tilt : -tilt);
}

/** Image length of the knuckle line (index → little MCP) over the palm length (wrist → middle MCP). */
export function knuckleSpanRatio(image: Landmark[], cam: Pick<CameraIntrinsics, 'width' | 'height'>): number {
  const d = (i: number, j: number) => Math.hypot((image[i].x - image[j].x) * cam.width, (image[i].y - image[j].y) * cam.height);
  const palm = d(LM.middle.mcp, LM.wrist);
  return palm > 1 ? d(LM.little.mcp, LM.index.mcp) / palm : 0;
}

/**
 * Lateral view angle for a live session. MediaPipe's metric depth is biased by
 * 20–30° on flat hands (more on mannequins), which would switch the overlay
 * off far too early, so the size of the roll comes from the image instead:
 * turning the hand onto its side foreshortens the knuckle line against the
 * palm length by cos(roll). The flat-hand ratio is the largest seen so far
 * (it starts at `flatRatio`, a little below a typical flat hand, so a hand
 * first seen rolled is not mistaken for flat). The metric depth only gives
 * the direction (toward 45° or 135°).
 */
export class LateralViewEstimator {
  private flat: number;

  constructor(readonly flatRatio = 0.6) {
    this.flat = flatRatio;
  }

  update(obs: HandObservation, cam: Pick<CameraIntrinsics, 'width' | 'height'>): number {
    const r = knuckleSpanRatio(obs.image, cam);
    if (!(r > 0)) return lateralViewAngle(obs.world);
    this.flat = Math.max(this.flat, r);
    const tilt = (Math.acos(Math.min(1, r / this.flat)) * 180) / Math.PI;
    return 90 + (lateralViewAngle(obs.world) >= 90 ? tilt : -tilt);
  }

  reset(): void {
    this.flat = this.flatRatio;
  }
}

/**
 * True when the edges of the hand that frame the overlay are in the image:
 * the thumb, index and little fingers (MCP joints and tips).
 */
export function borderDigitsInView(image: Landmark[], margin = 0.01): boolean {
  const ids = [LM.thumb.mcp, LM.thumb.tip, LM.index.mcp, LM.index.tip, LM.little.mcp, LM.little.tip];
  return ids.every((i) => {
    const p = image[i];
    return !!p && p.x >= margin && p.x <= 1 - margin && p.y >= margin && p.y <= 1 - margin;
  });
}

/** Show/hide with a little hysteresis so the overlay does not flicker at the limits. */
export class ViewAngleGate {
  private open = false;

  constructor(
    readonly min = 45,
    readonly max = 135,
    readonly hysteresis = 3,
  ) {}

  update(angle: number): boolean {
    if (this.open) {
      if (angle < this.min || angle > this.max) this.open = false;
    } else if (angle >= this.min + this.hysteresis && angle <= this.max - this.hysteresis) {
      this.open = true;
    }
    return this.open;
  }

  reset(): void {
    this.open = false;
  }
}

export interface FingerFit {
  /** Width of the measured mannequin digit, cm (from calibration; not observable in the image). */
  widthCm: number;
  /** Extra roll about the digit's own axis, degrees (calibration; the thumb is pronated). */
  rollDeg: number;
  /** Fine offset of the digit's knuckle in the hand frame, cm (calibration). */
  offset: { x: number; y: number; z: number };
}

export interface HandPose {
  /** Hand frame in camera space (cm). */
  hand: Matrix4;
  /** Selected digit's frame relative to the hand frame (knuckle origin, +Y along the digit). */
  fingerLocal: Matrix4;
  /** Digit length to give the model (proximal crease → tip, cm). */
  lengthCm: number;
  /** All landmarks in camera space (cm), for debugging and tests. */
  points: Vector3[];
  viewAngle: number;
}

/** Distance from the hand-frame origin (dorsal skin) to the middle MCP joint centre, cm. */
export const DORSAL_SKIN_OFFSET_CM = 1.0;

/**
 * Recover the hand and digit pose. Depth comes from matching the spread of
 * the palm landmarks in the image to their metric spread (weak perspective);
 * each landmark is then back-projected through its image position, so the
 * overlay stays on the hand in the picture even if the assumed camera field
 * of view is not exact.
 */
export function estimateHandPose(
  obs: HandObservation,
  cam: CameraIntrinsics,
  finger: FingerId,
  digit: Digit,
  fit: FingerFit,
  side: HandSide = 'right',
): HandPose {
  if (side === 'left') {
    // A left hand is the mirror image of a right one: mirror the picture (about the
    // principal point) and the metric landmarks, solve as a right hand, then mirror
    // the hand frame back. Its determinant is then −1, which renders the right-hand
    // anatomy as a left hand; the digit frame relative to the hand is unchanged.
    const mirrored: HandObservation = {
      image: obs.image.map((l) => ({ x: 1 - l.x, y: l.y, z: l.z })),
      world: obs.world.map((l) => ({ x: -l.x, y: l.y, z: l.z })),
    };
    const p = estimateHandPose(mirrored, cam, finger, digit, fit, 'right');
    const mirror = new Matrix4().makeScale(-1, 1, 1);
    p.hand.premultiply(mirror);
    for (const q of p.points) q.x = -q.x;
    return p;
  }
  const W = obs.world.map((l) => toCamera(l));
  const px = obs.image.map((l) => new Vector3(l.x * cam.width - cam.width / 2, -(l.y * cam.height - cam.height / 2), 0));

  // Depth of the palm centroid from the image/metric spread ratio (weak perspective).
  const palm = [LM.wrist, LM.index.mcp, LM.middle.mcp, LM.ring.mcp, LM.little.mcp];
  const mean = (vs: Vector3[]) => vs.reduce((s, v) => s.add(v), new Vector3()).divideScalar(vs.length);
  const pMean = mean(palm.map((i) => px[i].clone()));
  const wMean = mean(palm.map((i) => W[i].clone()));
  let num = 0;
  let den = 0;
  for (const i of palm) {
    num += px[i].clone().sub(pMean).lengthSq();
    const d = W[i].clone().sub(wMean);
    den += d.x * d.x + d.y * d.y;
  }
  const scale = Math.sqrt(num / Math.max(den, 1e-6)); // pixels per cm at the palm depth
  const depth = cam.focal / Math.max(scale, 1e-6);

  // Every landmark back-projected through its own image position, at the palm depth
  // plus its metric depth offset: the overlay then lines up with the hand in the image.
  const points = W.map((w, i) => {
    const z = depth - (w.z - wMean.z);
    return new Vector3((px[i].x * z) / cam.focal, (px[i].y * z) / cam.focal, -z);
  });

  // Orientation of the hand frame from those points.
  const X = points[LM.little.mcp].clone().sub(points[LM.index.mcp]).normalize();
  const yRaw = points[LM.middle.mcp].clone().sub(points[LM.wrist]);
  const Y = yRaw.addScaledVector(X, -yRaw.dot(X)).normalize();
  const Z = new Vector3().crossVectors(X, Y);
  const Pm = points[LM.middle.mcp];

  const hand = new Matrix4().makeBasis(X, Y, Z).setPosition(Pm.clone().addScaledVector(Z, DORSAL_SKIN_OFFSET_CM));

  // Selected digit: axis along the proximal phalanx blended with the whole digit.
  const ids = LM[finger];
  const mcp = points[ids.mcp];
  const Yf = points[ids.pip].clone().sub(mcp).normalize().add(points[ids.tip].clone().sub(mcp).normalize()).normalize();
  const Zf = Z.clone().addScaledVector(Yf, -Z.dot(Yf)).normalize();
  const roll = new Quaternion().setFromAxisAngle(Yf, (fit.rollDeg * Math.PI) / 180);
  Zf.applyQuaternion(roll);
  const Xf = new Vector3().crossVectors(Yf, Zf);

  const reachUnits = digit.tipY - digit.joints.mcp;
  const lengthCm = (points[ids.tip].distanceTo(mcp) * digit.reference.lengthCm) / reachUnits;
  const dimsZ = fit.widthCm / digit.reference.widthCm;
  // The model's knuckle landmark (dorsal skin) is this far from the joint centre.
  const origin = mcp.clone().addScaledVector(Zf, digit.knuckle().z * dimsZ);
  const fingerWorld = new Matrix4().makeBasis(Xf, Yf, Zf).setPosition(origin);
  const fingerLocal = hand.clone().invert().multiply(fingerWorld);
  const off = new Matrix4().makeTranslation(fit.offset.x, fit.offset.y, fit.offset.z);
  fingerLocal.premultiply(off);

  return { hand, fingerLocal, lengthCm, points, viewAngle: lateralViewAngle(obs.world, obs.image, cam) };
}

/** Exponential smoothing of a pose (position lerp, rotation slerp). */
export class PoseSmoother {
  private pos: Vector3 | null = null;
  private rot = new Quaternion();
  private scl = new Vector3(1, 1, 1);

  constructor(readonly alpha = 0.5) {}

  smooth(m: Matrix4): Matrix4 {
    const p = new Vector3();
    const q = new Quaternion();
    const s = new Vector3();
    m.decompose(p, q, s);
    if (!this.pos) {
      this.pos = p;
      this.rot.copy(q);
    } else {
      this.pos.lerp(p, this.alpha);
      this.rot.slerp(q, this.alpha);
    }
    this.scl.copy(s);
    return new Matrix4().compose(this.pos, this.rot, this.scl);
  }

  reset(): void {
    this.pos = null;
  }
}
