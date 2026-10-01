import { describe, expect, it } from 'vitest';
import { Group, Raycaster, Vector3 } from 'three';
import { DEFAULT_CALIBRATION } from '../config/appConfig';
import { FINGER_IDS, getFinger } from '../config/hand';
import { cloneCalibration } from '../logic/calibration';
import { ProceduralFingerModel } from './anatomy/ProceduralFingerModel';
import { HandRig } from './HandRig';
import { fingerPlacement, MODEL_KNUCKLE } from './handPlacement';

/** World position of the model's MCP knuckle landmark, expressed in hand-frame coordinates. */
function knuckleInHand(rig: HandRig, model: ProceduralFingerModel): Vector3 {
  rig.markerSpace.updateMatrixWorld(true);
  const world = model.anatomyFrame.localToWorld(MODEL_KNUCKLE.clone());
  return rig.hand.worldToLocal(world);
}

describe('hand placement (right hand, marker on the middle-finger knuckle)', () => {
  const model = new ProceduralFingerModel('en');
  const rig = new HandRig({ markerUnits: false, showContext: false });
  rig.attach(model);

  it('puts each finger’s MCP knuckle landmark on that finger’s knuckle point', () => {
    for (const id of FINGER_IDS) {
      rig.update(DEFAULT_CALIBRATION, id);
      const k = knuckleInHand(rig, model);
      const preset = getFinger(id).knuckle;
      expect(k.x).toBeCloseTo(preset.x, 5);
      expect(k.y).toBeCloseTo(preset.y, 5);
      expect(k.z).toBeCloseTo(preset.z, 5);
    }
  });

  it('orders fingers radial → ulnar: index, middle, ring, little', () => {
    const xs = FINGER_IDS.map((id) => fingerPlacement(id, DEFAULT_CALIBRATION).position.x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    expect(fingerPlacement('index', DEFAULT_CALIBRATION).position.x).toBeLessThan(0);
  });

  it('fingers point distally (+Y) and the middle knuckle sits just under the marker', () => {
    rig.update(DEFAULT_CALIBRATION, 'middle');
    rig.markerSpace.updateMatrixWorld(true);
    const tip = rig.markerSpace.worldToLocal(model.anatomyFrame.localToWorld(new Vector3(0, 8.4, 0)));
    expect(tip.y).toBeGreaterThan(7);
    const k = rig.markerSpace.worldToLocal(model.anatomyFrame.localToWorld(MODEL_KNUCKLE.clone()));
    expect(k.length()).toBeCloseTo(0.2, 5); // tile thickness
  });

  it('applies finger length/width, flexion and the marker-unit scale', () => {
    const c = cloneCalibration(DEFAULT_CALIBRATION);
    c.fingers.index = { ...c.fingers.index, lengthCm: 10.2, widthCm: 2.4, flexionDeg: 30 };
    rig.update(c, 'index');
    expect(model.anatomyFrame.scale.y).toBeCloseTo(1.2);
    expect(model.anatomyFrame.scale.x).toBeCloseTo(1.2);
    rig.markerSpace.updateMatrixWorld(true);
    const tip = rig.hand.worldToLocal(model.anatomyFrame.localToWorld(new Vector3(0, 8, 0)));
    expect(tip.z).toBeLessThan(-2); // flexed toward the palm
    const ar = new HandRig({ markerUnits: true, showContext: true });
    ar.update(c, 'index');
    expect(ar.markerSpace.scale.x).toBeCloseTo(1 / c.markerSizeCm);
    ar.dispose();
  });

  it('builds a non-pickable context hand without the selected finger', () => {
    const ctx = new HandRig({ markerUnits: false, showContext: true });
    ctx.update(DEFAULT_CALIBRATION, 'ring');
    const contextGroup = ctx.hand.children.find((c) => c.name === 'HandContext') as Group;
    // palm + thenar + hypothenar + thumb + 3 other fingers + table
    expect(contextGroup.children).toHaveLength(8);
    let pickable = 0;
    contextGroup.traverse((o) => {
      const hits: unknown[] = [];
      o.raycast(new Raycaster(new Vector3(0, 0, 10), new Vector3(0, 0, -1)), hits as never);
      pickable += hits.length;
    });
    expect(pickable).toBe(0);
    ctx.dispose();
  });
});
