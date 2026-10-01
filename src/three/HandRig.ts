import {
  BufferGeometry,
  CapsuleGeometry,
  Group,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshStandardMaterial,
  Vector3,
  type Object3D,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { COLORS } from '../config/anatomy';
import { FINGER_IDS } from '../config/hand';
import type { CalibrationSettings, FingerId } from '../types';
import type { AnatomyModel } from './anatomy/AnatomyModel';
import { disposeObject } from './anatomy/AnatomyModel';
import { createEnvelopeGeometry } from './anatomy/geometry';
import { applyFingerPlacement, applyHandCalibration, fingerPlacement } from './handPlacement';

export interface HandRigOptions {
  /** AR: the parent anchor is in marker widths, so scale by 1/markerSizeCm. Explorer: false (world = cm). */
  markerUnits: boolean;
  /** Explorer: draw a faint hand (palm, thumb, other fingers) and a table for context. */
  showContext: boolean;
}

/**
 * marker → markerSpace (cm) → hand (whole-hand calibration) → finger → model.
 * See `handPlacement.ts` for the frames.
 */
export class HandRig {
  readonly markerSpace = new Group();
  readonly hand = new Group();
  readonly finger = new Group();
  readonly markerOutline: LineLoop;
  private readonly context = new Group();
  private model: AnatomyModel | null = null;
  private outlineSize = 0;
  private contextKey = '';

  constructor(private readonly options: HandRigOptions) {
    this.markerSpace.name = 'MarkerSpace(cm)';
    this.hand.name = 'Hand';
    this.finger.name = 'SelectedFinger';
    this.context.name = 'HandContext';
    this.markerOutline = new LineLoop(
      new BufferGeometry(),
      new LineBasicMaterial({ color: '#22d3ee', depthTest: false }),
    );
    this.markerOutline.name = 'MarkerOutline';
    this.markerOutline.renderOrder = 1002;
    this.markerOutline.visible = false;
    this.markerSpace.add(this.markerOutline, this.hand);
    this.hand.add(this.context, this.finger);
  }

  attach(model: AnatomyModel): void {
    this.detach();
    this.model = model;
    this.finger.add(model.root);
  }

  detach(): void {
    if (this.model) this.finger.remove(this.model.root);
    this.model = null;
  }

  update(c: CalibrationSettings, selected: FingerId): void {
    this.markerSpace.scale.setScalar(this.options.markerUnits ? 1 / c.markerSizeCm : 1);
    if (c.markerSizeCm !== this.outlineSize) {
      const h = c.markerSizeCm / 2;
      this.markerOutline.geometry.setFromPoints([
        new Vector3(-h, -h, 0),
        new Vector3(h, -h, 0),
        new Vector3(h, h, 0),
        new Vector3(-h, h, 0),
      ]);
      this.outlineSize = c.markerSizeCm;
    }
    applyHandCalibration(this.hand, c);
    const f = c.fingers[selected];
    this.model?.setDimensions(f.lengthCm, f.widthCm);
    if (this.model) applyFingerPlacement(this.finger, this.model.root, selected, c);
    if (this.options.showContext) this.rebuildContext(c, selected);
  }

  /** Faint, non-pickable hand around the selected finger (Explorer only). */
  private rebuildContext(c: CalibrationSettings, selected: FingerId): void {
    const key = JSON.stringify([c.fingers, selected]);
    if (key === this.contextKey) return;
    this.contextKey = key;
    for (const child of [...this.context.children]) {
      this.context.remove(child);
      disposeObject(child);
    }
    const ghost = () =>
      new MeshStandardMaterial({ color: COLORS.skin, transparent: true, opacity: 0.16, depthWrite: false, roughness: 0.8 });
    const add = (o: Object3D) => {
      o.raycast = () => {};
      o.traverse((x) => (x.raycast = () => {}));
      this.context.add(o);
    };

    const palm = new Mesh(new RoundedBoxGeometry(7.6, 9.0, 2.8, 4, 1.0), ghost());
    palm.position.set(0.7, -4.7, -1.5);
    add(palm);

    const thumb = new Mesh(new CapsuleGeometry(0.95, 4.6, 6, 16), ghost());
    thumb.position.set(-4.4, -5.0, -1.9);
    thumb.rotation.set(0, 0, Math.PI / 4.2);
    add(thumb);

    for (const id of FINGER_IDS) {
      if (id === selected) continue;
      const p = fingerPlacement(id, c);
      const g = new Group();
      g.position.copy(p.position);
      g.rotation.copy(p.rotation);
      const m = new Mesh(createEnvelopeGeometry(1, 24), ghost());
      m.scale.copy(p.dims);
      m.position.copy(p.modelOffset);
      g.add(m);
      add(g);
    }

    const table = new Mesh(
      new RoundedBoxGeometry(40, 40, 0.4, 2, 0.1),
      new MeshStandardMaterial({ color: '#1e293b', roughness: 0.95 }),
    );
    table.position.set(0.7, -2, -3.3);
    add(table);
  }

  setContextVisible(visible: boolean): void {
    this.context.visible = visible;
  }

  dispose(): void {
    this.detach();
    disposeObject(this.context);
    this.markerOutline.geometry.dispose();
    (this.markerOutline.material as LineBasicMaterial).dispose();
  }
}
