import { Euler, MathUtils, Vector3, type Object3D } from 'three';
import { MODEL_REFERENCE } from '../config/appConfig';
import { getFinger } from '../config/hand';
import type { CalibrationSettings, FingerId } from '../types';
import { JOINTS, surfacePoint } from './anatomy/geometry';

/**
 * Scene chain shared by AR and the 3D Explorer:
 *
 *   marker (MindAR: 1 unit = marker width)
 *    └ markerSpace   scale 1/markerSizeCm   → centimetres
 *       └ hand       whole-hand calibration → hand frame (origin = middle-finger MCP knuckle)
 *          └ finger  default knuckle + fine offset, flexion (X) and splay (Z) about the knuckle
 *             └ model.root  shifted so the model's MCP knuckle landmark sits at the finger origin
 */

/** The model's dorsal MCP knuckle landmark in the unscaled anatomy frame. */
export const MODEL_KNUCKLE = surfacePoint(JOINTS.mcp, 90, 1.03);

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
  /** Rotation about the knuckle: −flexion around X, splay around Z. */
  rotation: Euler;
  /** Position for model.root inside the finger group. */
  modelOffset: Vector3;
  /** Anatomy-frame scale the model must use (see AnatomyModel.setDimensions). */
  dims: Vector3;
}

export function fingerDims(lengthCm: number, widthCm: number): Vector3 {
  const w = widthCm / MODEL_REFERENCE.fingerWidthCm;
  return new Vector3(w, lengthCm / MODEL_REFERENCE.fingerLengthCm, w);
}

export function fingerPlacement(finger: FingerId, c: CalibrationSettings): FingerPlacement {
  const preset = getFinger(finger);
  const f = c.fingers[finger];
  const dims = fingerDims(f.lengthCm, f.widthCm);
  return {
    position: new Vector3(
      preset.knuckle.x + f.offset.x,
      preset.knuckle.y + f.offset.y,
      preset.knuckle.z + f.offset.z,
    ),
    // Flexion bends the fingertip toward the palm (−Z): a negative rotation about +X.
    rotation: new Euler(-MathUtils.degToRad(f.flexionDeg), 0, MathUtils.degToRad(f.splayDeg), 'ZXY'),
    modelOffset: MODEL_KNUCKLE.clone().multiply(dims).negate(),
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
