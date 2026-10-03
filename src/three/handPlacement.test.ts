import { describe, expect, it } from 'vitest';
import { Group, Raycaster, Vector3 } from 'three';
import { DEFAULT_CALIBRATION } from '../config/appConfig';
import { FINGER_IDS, getFinger } from '../config/hand';
import { cloneCalibration } from '../logic/calibration';
import { digitFor } from './anatomy/layout';
import { ProceduralFingerModel } from './anatomy/ProceduralFingerModel';
import { HandRig } from './HandRig';
import { fingerPlacement, MODEL_KNUCKLE } from './handPlacement';

/** World position of the model's MCP knuckle landmark, expressed in hand-frame coordinates. */
function knuckleInHand(rig: HandRig, model: ProceduralFingerModel): Vector3 {
  rig.markerSpace.updateMatrixWorld(true);
  const world = model.anatomyFrame.localToWorld(model.digit.knuckle());
  return rig.hand.worldToLocal(world);
}

describe('hand placement (right hand, marker on the middle-finger knuckle)', () => {
  const model = new ProceduralFingerModel('en');
  const rig = new HandRig({ markerUnits: false, showContext: false });
  rig.attach(model);

  it('puts each digit’s MCP knuckle landmark on that digit’s knuckle point', () => {
    for (const id of FINGER_IDS) {
      const m = new ProceduralFingerModel('en', digitFor(id));
      const r = new HandRig({ markerUnits: false, showContext: false });
      r.attach(m);
      r.update(DEFAULT_CALIBRATION, id);
      const k = knuckleInHand(r, m);
      const preset = getFinger(id).knuckle;
      expect(k.x).toBeCloseTo(preset.x, 5);
      expect(k.y).toBeCloseTo(preset.y, 5);
      expect(k.z).toBeCloseTo(preset.z, 5);
      r.dispose();
      m.dispose();
    }
  });

  it('pronates the thumb: its nail faces radially, and it points distally-radially from a volar knuckle', () => {
    const m = new ProceduralFingerModel('en', digitFor('thumb'));
    const r = new HandRig({ markerUnits: false, showContext: false });
    r.attach(m);
    r.update(DEFAULT_CALIBRATION, 'thumb');
    r.markerSpace.updateMatrixWorld(true);
    const inHand = (v: Vector3) => r.hand.worldToLocal(m.anatomyFrame.localToWorld(v));
    const base = inHand(new Vector3(0, 0, 0));
    const tip = inHand(new Vector3(0, 5.4, 0));
    const nail = inHand(new Vector3(0, 4.3, 1)).sub(inHand(new Vector3(0, 4.3, 0)));
    expect(tip.y).toBeGreaterThan(base.y);
    expect(tip.x).toBeLessThan(base.x);
    expect(nail.x).toBeLessThan(0); // nail turned toward the radial side
    expect(getFinger('thumb').knuckle.z).toBeLessThan(getFinger('index').knuckle.z);
    r.dispose();
    m.dispose();
  });

  it('orders digits radial → ulnar: thumb, index, middle, ring, little', () => {
    const xs = FINGER_IDS.map((id) => fingerPlacement(id, DEFAULT_CALIBRATION).position.x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    expect(fingerPlacement('index', DEFAULT_CALIBRATION).position.x).toBeLessThan(0);
  });

  it('fingers point distally (+Y) and the middle knuckle lies distal to the mid-dorsum marker', () => {
    rig.update(DEFAULT_CALIBRATION, 'middle');
    rig.markerSpace.updateMatrixWorld(true);
    const tip = rig.markerSpace.worldToLocal(model.anatomyFrame.localToWorld(new Vector3(0, 8.4, 0)));
    expect(tip.y).toBeGreaterThan(7);
    const k = rig.markerSpace.worldToLocal(model.anatomyFrame.localToWorld(MODEL_KNUCKLE.clone()));
    expect(k.y).toBeCloseTo(4.5, 5); // marker in the centre of the back of the hand
    expect(k.z).toBeCloseTo(-0.15, 5);
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
    // palm + thenar + hypothenar + 4 other digits (thumb included) + table
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
