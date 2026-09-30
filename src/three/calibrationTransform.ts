import { Euler, MathUtils, type Object3D } from 'three';
import type { CalibrationSettings } from '../types';

/**
 * Apply calibration to the group that sits between the marker and the
 * anatomy model. The group lives in marker space measured in centimetres
 * (+X marker right, +Y marker top, +Z out of the marker).
 */
export function applyCalibration(target: Object3D, c: CalibrationSettings): void {
  target.position.set(c.position.x, c.position.y, c.position.z);
  target.rotation.copy(
    new Euler(
      MathUtils.degToRad(c.rotationDeg.x),
      MathUtils.degToRad(c.rotationDeg.y),
      MathUtils.degToRad(c.rotationDeg.z),
      'XYZ',
    ),
  );
  target.scale.setScalar(c.scale);
  target.updateMatrix();
}
