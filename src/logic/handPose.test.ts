import { describe, expect, it } from 'vitest';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { FINGER, THUMB } from '../three/anatomy/layout';
import {
  borderDigitsInView,
  estimateHandPose,
  focalFromFov,
  LM,
  lateralViewAngle,
  LateralViewEstimator,
  ViewAngleGate,
  type CameraIntrinsics,
  type HandObservation,
} from './handPose';

const cam: CameraIntrinsics = { width: 1280, height: 720, focal: focalFromFov(1280, 720, 64) };

/** A flat right hand in its own frame (cm): +X ulnar, +Y distal, +Z dorsal; origin at the middle MCP joint. */
function handPoints(): Vector3[] {
  const p: Vector3[] = Array.from({ length: 21 }, () => new Vector3());
  p[LM.wrist].set(0.6, -8.5, -0.3);
  const ray = (mcp: Vector3, dir: Vector3, lens: number[], ids: number[]) => {
    let cur = mcp.clone();
    p[ids[0]].copy(cur);
    lens.forEach((l, k) => {
      cur = cur.clone().addScaledVector(dir, l);
      p[ids[k + 1]].copy(cur);
    });
  };
  ray(new Vector3(-2, -0.3, 0), new Vector3(-0.1, 1, 0).normalize(), [4.2, 2.4, 2.0], [5, 6, 7, 8]);
  ray(new Vector3(0, 0, 0), new Vector3(0, 1, 0), [4.6, 2.8, 2.2], [9, 10, 11, 12]);
  ray(new Vector3(1.8, -0.4, 0), new Vector3(0.08, 1, 0).normalize(), [4.3, 2.6, 2.1], [13, 14, 15, 16]);
  ray(new Vector3(3.4, -1.3, 0), new Vector3(0.2, 1, 0).normalize(), [3.4, 2.0, 1.8], [17, 18, 19, 20]);
  p[1].set(-2.6, -6.5, -0.8);
  ray(new Vector3(-4.5, -4.5, -0.8), new Vector3(-0.5, 1, 0).normalize(), [3.0, 2.6], [2, 3, 4]);
  return p;
}

/** Project a hand posed in camera space into a MediaPipe-like observation. */
function observe(pose: Matrix4): HandObservation {
  const cps = handPoints().map((v) => v.clone().applyMatrix4(pose));
  const centre = cps.reduce((s, v) => s.add(v), new Vector3()).divideScalar(cps.length);
  return {
    image: cps.map((v) => ({
      x: (cam.focal * (v.x / -v.z) + cam.width / 2) / cam.width,
      y: (cam.height / 2 - cam.focal * (v.y / -v.z)) / cam.height,
      z: 0,
    })),
    // MediaPipe world axes: x right, y down, z away from the camera; metres.
    world: cps.map((v) => ({ x: (v.x - centre.x) / 100, y: -(v.y - centre.y) / 100, z: -(v.z - centre.z) / 100 })),
  };
}

const fit = { widthCm: 1.9, rollDeg: 0, offset: { x: 0, y: 0, z: 0 } };

describe('markerless hand pose', () => {
  it('recovers the hand frame, its distance and the selected finger from landmarks', () => {
    // Back of the hand facing the camera, 18 cm away, fingers pointing up the image.
    const pose = new Matrix4().makeTranslation(1, -2, -18);
    const r = estimateHandPose(observe(pose), cam, 'index', FINGER, fit);
    const p = new Vector3();
    const q = new Quaternion();
    r.hand.decompose(p, q, new Vector3());
    expect(p.z).toBeGreaterThan(-18.5);
    expect(p.z).toBeLessThan(-15.5); // dorsal skin, ~1 cm in front of the joint centre
    const x = new Vector3(1, 0, 0).applyQuaternion(q);
    const z = new Vector3(0, 0, 1).applyQuaternion(q);
    expect(x.x).toBeGreaterThan(0.95); // ulnar = little-finger side = image right
    expect(z.z).toBeGreaterThan(0.95); // dorsal faces the camera
    expect(r.viewAngle).toBeCloseTo(90, 0);
    // Index length from its own landmarks (MCP→tip 8.6 cm ≈ 8.1 cm model length).
    expect(r.lengthCm).toBeGreaterThan(7.5);
    expect(r.lengthCm).toBeLessThan(8.8);
    const fp = new Vector3().setFromMatrixPosition(r.fingerLocal);
    expect(fp.x).toBeLessThan(-1.5); // index knuckle radial to the middle knuckle
  });

  it('measures the lateral viewing angle and gates the overlay at 45–135°', () => {
    const tilted = (deg: number) =>
      new Matrix4().makeRotationY((deg * Math.PI) / 180).setPosition(0, 0, -18);
    // The knuckle line slopes slightly in the hand, so allow ~2°.
    expect(Math.abs(lateralViewAngle(observe(tilted(30)).world) - 120)).toBeLessThan(2);
    expect(Math.abs(lateralViewAngle(observe(tilted(-30)).world) - 60)).toBeLessThan(2);
    expect(Math.abs(lateralViewAngle(observe(tilted(60)).world) - 150)).toBeLessThan(2);
    // MediaPipe often underestimates depth: a world estimate that looks flat must not hide a strong roll
    // that is obvious in the image (knuckle line foreshortened against the palm length).
    const rolled = observe(tilted(60));
    const flatWorld = observe(tilted(0)).world;
    const combined = lateralViewAngle(flatWorld, rolled.image, cam);
    expect(Math.abs(Math.abs(combined - 90) - 60)).toBeLessThan(4);
    expect(Math.abs(lateralViewAngle(observe(tilted(0)).world, observe(tilted(0)).image, cam) - 90)).toBeLessThan(3);

    const gate = new ViewAngleGate(45, 135, 3);
    expect(gate.update(90)).toBe(true);
    expect(gate.update(130)).toBe(true);
    expect(gate.update(136)).toBe(false); // turned more than 45° onto its side
    expect(gate.update(134)).toBe(false); // needs to come back past the hysteresis
    expect(gate.update(131)).toBe(true);
    expect(gate.update(44)).toBe(false);
  });

  it('requires the thumb, index and little finger edges to be in view', () => {
    // Whole hand in a 1280×720 frame needs ~30 cm.
    const obs = observe(new Matrix4().makeTranslation(0, 0, -32));
    expect(borderDigitsInView(obs.image)).toBe(true);
    const cut = observe(new Matrix4().makeTranslation(16, 0, -32)); // little finger off the right edge
    expect(borderDigitsInView(cut.image)).toBe(false);
  });

  it('fits the thumb with its own landmarks and calibrated roll', () => {
    const r = estimateHandPose(observe(new Matrix4().makeTranslation(0, 0, -18)), cam, 'thumb', THUMB, {
      ...fit,
      widthCm: 2.3,
      rollDeg: -55,
    });
    const q = new Quaternion();
    r.fingerLocal.decompose(new Vector3(), q, new Vector3());
    const nail = new Vector3(0, 0, 1).applyQuaternion(q);
    expect(nail.x).toBeLessThan(-0.5); // pronated: nail turned toward the radial side
    expect(r.lengthCm).toBeGreaterThan(4);
    expect(r.lengthCm).toBeLessThan(7);
  });

  it('poses a left hand as the mirror image (dorsum toward the camera, ulnar toward its little finger)', () => {
    // A left hand is the right hand mirrored in X: dorsum facing the camera, thumb on the right of the image.
    const pose = new Matrix4().makeTranslation(-1, -2, -30).multiply(new Matrix4().makeScale(-1, 1, 1));
    const obs = observe(pose);
    const r = estimateHandPose(obs, cam, 'index', FINGER, fit, 'left');
    expect(r.hand.determinant()).toBeLessThan(0);
    const e = r.hand.elements;
    const x = new Vector3(e[0], e[1], e[2]).normalize();
    const z = new Vector3(e[8], e[9], e[10]).normalize();
    expect(x.x).toBeLessThan(-0.95); // ulnar = little finger = image left
    expect(z.z).toBeGreaterThan(0.95); // dorsal toward the camera
    expect(r.fingerLocal.determinant()).toBeGreaterThan(0);
    // The index knuckle sits on the radial side (−X in the hand frame) like a right hand.
    const knuckle = new Vector3().setFromMatrixPosition(r.fingerLocal);
    expect(knuckle.x).toBeLessThan(-1);
    expect(r.lengthCm).toBeGreaterThan(7.5);
    expect(r.lengthCm).toBeLessThan(8.8);
    // Solving the same picture as a right hand puts the dorsum on the far side.
    const wrong = estimateHandPose(obs, cam, 'index', FINGER, fit, 'right').hand.elements;
    expect(wrong[10]).toBeLessThan(-0.9);
  });

  it('estimates the roll from the image when the metric depth is biased', () => {
    const tilted = (deg: number) =>
      new Matrix4().makeTranslation(0, 0, -32).multiply(new Matrix4().makeRotationY((deg * Math.PI) / 180));
    // Metric depth that claims a 25° roll on a flat hand (as MediaPipe does on the mannequin).
    const biased = (deg: number) => ({ ...observe(tilted(deg)), world: observe(tilted(deg + 25)).world });
    const est = new LateralViewEstimator();
    expect(Math.abs(est.update(biased(0), cam) - 90)).toBeLessThan(4);
    expect(Math.abs(Math.abs(est.update(biased(50), cam) - 90) - 50)).toBeLessThan(5);
    expect(Math.abs(est.update(biased(-60), cam) - 90)).toBeGreaterThan(50);
    // A hand first seen rolled is not taken as flat.
    const fresh = new LateralViewEstimator();
    expect(Math.abs(fresh.update(observe(tilted(50)), cam) - 90)).toBeGreaterThan(35);
  });
});
