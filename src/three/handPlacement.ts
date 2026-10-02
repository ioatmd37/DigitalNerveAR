import { Euler, MathUtils, Vector3, type Object3D } from 'three';
import { getFinger } from '../config/hand';
import type { CalibrationSettings, FingerId } from '../types';
import { digitFor, FINGER, type Digit } from './anatomy/layout';

/**
 * Scene chain shared by AR and the 3D Explorer:
 *
 *   marker (MindAR: 1 unit = marker width)
 *    └ markerSpace   scale 1/markerSizeCm   → centimetres
 *       └ hand       whole-hand calibration → hand frame (origin = middle-finger MCP knuckle)
 *          └ finger  default knuckle + fine offset; splay (Z), flexion (X) and roll (Y, the
 *                    digit's own long axis — the thumb is pronated) about the knuckle
 *             └ model.root  shifted so the model's MCP knuckle landmark sits at the finger origin
 */

/** The finger model's dorsal MCP knuckle landmark in the unscaled anatomy frame. */
export const MODEL_KNUCKLE = FINGER.knuckle();

export function applyHandCalibration(hand: Object3D, c: CalibrationSettings): void {
  hand.position.set(c.position.x, c.position.y, c.position.z);
  hand.rotation.copy(
    new Euler(
      MathUtils.degToRad(c.rotationDeg.x),
      MathUtils.degToRad(c.rotationDeg.y),
      MathUtils.degToRad(c.rotationDeg.z),
      'XYZ',
    ),
  );
  hand.scale.setScalar(c.scale);
  hand.updateMatrix();
}

export interface FingerPlacement {
  /** Finger group position in the hand frame (its MCP knuckle). */
  position: Vector3;
  /** Rotation about the knuckle: splay around Z, −flexion around X, roll around Y. */
  rotation: Euler;
  /** Position for model.root inside the finger group. */
  modelOffset: Vector3;
  /** Anatomy-frame scale the model must use (see AnatomyModel.setDimensions). */
  dims: Vector3;
}

export function fingerDims(lengthCm: number, widthCm: number, digit: Digit = FINGER): Vector3 {
  const w = widthCm / digit.reference.widthCm;
  return new Vector3(w, lengthCm / digit.reference.lengthCm, w);
}

export function fingerPlacement(finger: FingerId, c: CalibrationSettings): FingerPlacement {
  const preset = getFinger(finger);
  const f = c.fingers[finger];
  const digit = digitFor(finger);
  const dims = fingerDims(f.lengthCm, f.widthCm, digit);
  return {
    position: new Vector3(
      preset.knuckle.x + f.offset.x,
      preset.knuckle.y + f.offset.y,
      preset.knuckle.z + f.offset.z,
    ),
    // Flexion bends the fingertip toward the palm (−Z): a negative rotation about +X.
    // Euler order ZXY: roll about the digit's long axis first, then flexion, then splay.
    rotation: new Euler(-MathUtils.degToRad(f.flexionDeg), MathUtils.degToRad(f.rollDeg ?? 0), MathUtils.degToRad(f.splayDeg), 'ZXY'),
    modelOffset: digit.knuckle().multiply(dims).negate(),
    dims,
  };
}

export function applyFingerPlacement(
  fingerGroup: Object3D,
  modelRoot: Object3D,
  finger: FingerId,
  c: CalibrationSettings,
): FingerPlacement {
  const p = fingerPlacement(finger, c);
  fingerGroup.position.copy(p.position);
  fingerGroup.rotation.copy(p.rotation);
  fingerGroup.updateMatrix();
  modelRoot.position.copy(p.modelOffset);
  modelRoot.updateMatrix();
  return p;
}
