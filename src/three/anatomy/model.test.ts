import { describe, expect, it } from 'vitest';
import { Box3, Raycaster, Vector3, type Object3D } from 'three';
import { LAYER_IDS, layerVisibility, STRUCTURES } from '../../config/anatomy';
import { computeViewState } from '../../logic/visibility';
import { DEFAULT_LAYER_VISIBILITY } from '../../config/anatomy';
import { findStructureId } from './AnatomyModel';
import { ProceduralFingerModel } from './ProceduralFingerModel';
import { skinRadiusAt, surfacePoint } from './geometry';

function byName(root: Object3D, name: string): Object3D | undefined {
  return root.getObjectByName(name);
}

function worldCenter(o: Object3D): Vector3 {
  o.updateWorldMatrix(true, true);
  return new Box3().setFromObject(o).getCenter(new Vector3());
}

describe('ProceduralFingerModel', () => {
  const model = new ProceduralFingerModel('en');

  it('has a named node for every configured structure, grouped by layer', () => {
    for (const s of STRUCTURES) {
      const node = byName(model.root, s.id);
      expect(node, s.id).toBeDefined();
      expect(node!.parent!.name).toBe(`Layer:${s.layer}`);
      expect(findStructureId(node!)).toBe(s.id);
    }
    for (const id of LAYER_IDS) expect(byName(model.root, `Layer:${id}`)).toBeDefined();
  });

  it('is a RIGHT index finger: radial structures on −X (thumb side), ulnar on +X', () => {
    expect(worldCenter(byName(model.root, 'nerve_radial')!).x).toBeLessThan(0);
    expect(worldCenter(byName(model.root, 'nerve_ulnar')!).x).toBeGreaterThan(0);
    expect(worldCenter(byName(model.root, 'landmark_web_space')!).x).toBeLessThan(0);
  });

  it('places nerves volar to arteries, tendon volar, veins and nail dorsal', () => {
    const z = (id: string) => worldCenter(byName(model.root, id)!).z;
    expect(z('nerve_radial')).toBeLessThan(z('artery_radial'));
    expect(z('flexor_tendon')).toBeLessThan(0);
    expect(z('vein_ulnar')).toBeGreaterThan(0);
    expect(z('nail')).toBeGreaterThan(0);
    expect(z('avoid_zone_volar')).toBeLessThan(0);
    // Safe zones are dorsolateral on each side.
    const sr = worldCenter(byName(model.root, 'safe_zone_radial')!);
    const su = worldCenter(byName(model.root, 'safe_zone_ulnar')!);
    expect(sr.x).toBeLessThan(0);
    expect(su.x).toBeGreaterThan(0);
    expect(sr.z).toBeGreaterThan(0);
    expect(su.z).toBeGreaterThan(0);
  });

  it('keeps the model needle tip outside the nerve', () => {
    for (const side of ['radial', 'ulnar'] as const) {
      const tip = ProceduralFingerModel.needleTarget(side);
      const nerve = new Vector3(0.6 * (side === 'radial' ? -1 : 1), tip.y, -0.5);
      expect(tip.distanceTo(nerve)).toBeGreaterThan(0.2);
      const entry = ProceduralFingerModel.entryPoint(side);
      expect(entry.z).toBeGreaterThan(0); // dorsolateral entry
    }
  });

  it('distal is +Y: the nail is near the tip', () => {
    expect(worldCenter(byName(model.root, 'nail')!).y).toBeGreaterThan(6.5);
    expect(skinRadiusAt(8.5)).toBe(0);
  });

  it('applies layer visibility from the view state', () => {
    model.applyViewState(computeViewState({
      mode: 'assessment',
      userLayers: DEFAULT_LAYER_VISIBILITY,
      showLabels: true,
      guidedStep: 0,
      assessment: { revealed: false },
    }));
    expect(byName(model.root, 'Layer:nerves')!.visible).toBe(false);
    expect(byName(model.root, 'Layer:skin')!.visible).toBe(true);
    model.applyViewState({
      layers: layerVisibility(['skin', 'nerves']),
      skinOpacity: 0.3,
      labels: false,
      highlight: ['nerve_radial'],
      interactive: true,
      animateInjectate: false,
    });
    expect(byName(model.root, 'Layer:nerves')!.visible).toBe(true);
    expect(() => model.update(1.2)).not.toThrow();
  });

  it('picking prefers an inner structure over the translucent skin', () => {
    model.applyViewState({
      layers: layerVisibility(['skin', 'nerves', 'bone']),
      skinOpacity: 0.3,
      labels: false,
      highlight: [],
      interactive: true,
      animateInjectate: false,
    });
    model.root.updateMatrixWorld(true);
    // Ray from the radial side straight toward the radial nerve.
    const target = new Vector3(-0.6 * (skinRadiusAt(3) / skinRadiusAt(0)), 3, -0.5 * (skinRadiusAt(3) / skinRadiusAt(0)));
    const origin = surfacePoint(3, 200, 4);
    const ray = new Raycaster(origin, target.clone().sub(origin).normalize());
    const hits = ray.intersectObject(model.root, true);
    expect(model.pick(hits)).toBe('nerve_radial');
  });

  it('ignores hidden structures when picking', () => {
    model.applyViewState({
      layers: layerVisibility(['skin']),
      skinOpacity: 0.3,
      labels: false,
      highlight: [],
      interactive: true,
      animateInjectate: false,
    });
    model.root.updateMatrixWorld(true);
    const origin = surfacePoint(3, 180, 4);
    const ray = new Raycaster(origin, new Vector3(1, 0, 0));
    expect(model.pick(ray.intersectObject(model.root, true))).toBe('skin');
  });

  it('scales to the measured mannequin finger', () => {
    model.setDimensions(10.2, 2.4);
    expect(model.anatomyFrame.scale.y).toBeCloseTo(1.2);
    expect(model.anatomyFrame.scale.x).toBeCloseTo(1.2);
  });

  it('disposes without throwing', () => {
    const m = new ProceduralFingerModel('th');
    expect(() => m.dispose()).not.toThrow();
  });
});
