import { describe, expect, it } from 'vitest';
import { Box3, Raycaster, Vector3, type Object3D } from 'three';
import { LAYER_IDS, layerVisibility, STRUCTURES } from '../../config/anatomy';
import { computeViewState } from '../../logic/visibility';
import { DEFAULT_LAYER_VISIBILITY } from '../../config/anatomy';
import { findStructureId } from './AnatomyModel';
import { ProceduralFingerModel } from './ProceduralFingerModel';
import { FINGER, INDEX, LITTLE, THUMB } from './layout';

function byName(root: Object3D, name: string): Object3D | undefined {
  return root.getObjectByName(name);
}

function worldCenter(o: Object3D): Vector3 {
  o.updateWorldMatrix(true, true);
  return new Box3().setFromObject(o).getCenter(new Vector3());
}

describe('ProceduralFingerModel', () => {
  const model = new ProceduralFingerModel('en');

  it('has a named node for every structure of each digit, grouped by layer', () => {
    for (const digit of [FINGER, LITTLE, THUMB]) {
      const m = digit === FINGER ? model : new ProceduralFingerModel('en', digit);
      for (const s of STRUCTURES) {
        const node = byName(m.root, s.id);
        if (!digit.has(s.id)) {
          expect(node, `${digit.id}:${s.id}`).toBeUndefined();
          continue;
        }
        expect(node, `${digit.id}:${s.id}`).toBeDefined();
        expect(node!.parent!.name).toBe(`Layer:${s.layer}`);
        expect(findStructureId(node!)).toBe(s.id);
      }
      for (const id of LAYER_IDS) expect(byName(m.root, `Layer:${id}`)).toBeDefined();
    }
  });

  it('models the thumb with two phalanges, FPL only and EPL/EPB', () => {
    const thumb = new ProceduralFingerModel('en', THUMB);
    expect(byName(thumb.root, 'phalanx_middle')).toBeUndefined();
    expect(byName(thumb.root, 'landmark_ip_crease')).toBeDefined();
    expect(byName(thumb.root, 'fpl')).toBeDefined();
    expect(byName(thumb.root, 'fds')).toBeUndefined();
    expect(byName(thumb.root, 'epl')).toBeDefined();
    expect(byName(thumb.root, 'epb')).toBeDefined();
    expect(byName(thumb.root, 'sesamoid_radial')).toBeDefined();
    // First web space on the thumb's ulnar side; no web branch on its radial border.
    expect(worldCenter(byName(thumb.root, 'landmark_web_space')!).x).toBeGreaterThan(0);
    expect(byName(thumb.root, 'nerve_radial_common_branch')).toBeUndefined();
    expect(byName(thumb.root, 'nerve_ulnar_common_branch')).toBeUndefined();
    // Dorsal nerves reach the nail fold on the thumb.
    const dorsal = THUMB.paths().find((p) => p.name === 'dorsal_nerve_radial_trunk')!;
    expect(dorsal.points[dorsal.points.length - 1].y).toBeGreaterThanOrEqual(THUMB.joints.nailFold);
    thumb.dispose();
  });

  it('draws the index radial digital artery and nerve as single structures, not web bifurcations', () => {
    const index = new ProceduralFingerModel('en', INDEX);
    expect(byName(index.root, 'artery_radial_common_branch')).toBeUndefined();
    expect(byName(index.root, 'artery_radial_trunk')).toBeDefined();
    // The radial palmar nerve is one nerve too; the ulnar side still divides at the second web.
    expect(byName(index.root, 'nerve_radial_common_branch')).toBeUndefined();
    expect(byName(index.root, 'artery_ulnar_common_branch')).toBeDefined();
    expect(byName(index.root, 'nerve_ulnar_common_branch')).toBeDefined();
    for (const name of ['nerve_radial_trunk', 'dorsal_nerve_radial_trunk']) {
      const p0 = INDEX.paths().find((p) => p.name === name)!.points[0];
      expect(Math.abs(p0.x), name).toBeLessThan(1.0); // runs straight proximally, not into the first web
    }
    // The trunk runs straight proximally instead of swinging into the first web.
    const trunk = INDEX.paths().find((p) => p.name === 'artery_radial_trunk')!.points;
    expect(Math.abs(trunk[0].x)).toBeLessThan(1.0);
    // The thumb arteries (princeps pollicis) do not fork at a web either.
    expect(THUMB.paths().some((p) => p.name.startsWith('artery_') && p.name.endsWith('common_branch'))).toBe(false);
    index.dispose();
  });

  it('models the little finger without an ulnar web and with longer dorsal nerves', () => {
    const little = new ProceduralFingerModel('en', LITTLE);
    expect(byName(little.root, 'nerve_ulnar_common_branch')).toBeUndefined();
    expect(byName(little.root, 'nerve_radial_common_branch')).toBeDefined();
    const end = (d: typeof FINGER) => {
      const p = d.paths().find((x) => x.name === 'dorsal_nerve_ulnar_trunk')!;
      return p.points[p.points.length - 1].y;
    };
    expect(end(LITTLE)).toBeGreaterThan(end(FINGER));
    expect(end(LITTLE)).toBeLessThan(FINGER.joints.ip[1] + 0.1); // to about the DIP
    expect(end(FINGER)).toBeLessThan(FINGER.joints.ip[0] + 0.5); // to about the PIP
    little.dispose();
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
      const tip = FINGER.needleTarget(side);
      const nerve = new Vector3(0.6 * (side === 'radial' ? -1 : 1), tip.y, -0.5);
      expect(tip.distanceTo(nerve)).toBeGreaterThan(0.2);
      const entry = model.entryPoint(side);
      expect(entry.z).toBeGreaterThan(0); // dorsolateral entry
    }
  });

  it('distal is +Y: the nail is near the tip', () => {
    expect(worldCenter(byName(model.root, 'nail')!).y).toBeGreaterThan(6.5);
    expect(FINGER.skinRadiusAt(8.5)).toBe(0);
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
    const target = new Vector3(-0.6 * (FINGER.skinRadiusAt(3) / FINGER.skinRadiusAt(0)), 3, -0.5 * (FINGER.skinRadiusAt(3) / FINGER.skinRadiusAt(0)));
    const origin = FINGER.surfacePoint(3, 200, 4);
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
    const origin = FINGER.surfacePoint(3, 180, 4);
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

describe('teacher technique overlays', () => {
  it('show a proximal escape into the bursa only on the thumb and little finger', async () => {
    const { TransthecalOverlay } = await import('../teaching/TransthecalOverlay');
    const has = (d: typeof FINGER) => !!new TransthecalOverlay(d).object.getObjectByName('bursa_leak');
    expect(has(THUMB)).toBe(true);
    expect(has(LITTLE)).toBe(true);
    expect(has(FINGER)).toBe(false);
    expect(has(INDEX)).toBe(false);
  });

  it('lists digit cautions for the thumb and little finger in both techniques', async () => {
    const { TECHNIQUE_DIGIT_CAUTIONS, TECHNIQUE_FAILURES } = await import('../../config/techniqueCautions');
    for (const t of ['simple', 'transthecal'] as const) {
      expect(TECHNIQUE_FAILURES[t].length).toBeGreaterThan(2);
      expect(TECHNIQUE_DIGIT_CAUTIONS[t].thumb?.length).toBeGreaterThan(0);
      expect(TECHNIQUE_DIGIT_CAUTIONS[t].little?.length).toBeGreaterThan(0);
    }
  });
});
