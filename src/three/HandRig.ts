import {
  BufferGeometry,
  DoubleSide,
  Group,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  Vector3,
  type Object3D,
} from 'three';
import { FINGER_IDS } from '../config/hand';
import type { CalibrationSettings, FingerId } from '../types';
import type { AnatomyModel } from './anatomy/AnatomyModel';
import { disposeObject } from './anatomy/AnatomyModel';
import { createLoftGeometry } from './anatomy/geometry';
import { digitFor } from './anatomy/layout';
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

  /** Faint, non-pickable anatomical hand around the selected finger (Explorer only). */
  private rebuildContext(c: CalibrationSettings, selected: FingerId): void {
    const key = JSON.stringify([c.fingers, selected]);
    if (key === this.contextKey) return;
    this.contextKey = key;
    for (const child of [...this.context.children]) {
      this.context.remove(child);
      disposeObject(child);
    }
    const skin = () =>
      new MeshPhysicalMaterial({
        color: '#e2b192',
        roughness: 0.65,
        sheen: 0.5,
        sheenColor: '#ffd2bd',
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
      });
    const nailMat = () =>
      new MeshPhysicalMaterial({ color: '#f0bfb6', roughness: 0.25, clearcoat: 1, transparent: true, opacity: 0.55, side: DoubleSide });
    const add = (o: Object3D) => {
      o.traverse((x) => (x.raycast = () => {}));
      this.context.add(o);
    };

    // Palm and wrist: rounded-rectangle loft (dorsum just below the knuckles at z ≈ 0).
    add(
      new Mesh(
        createLoftGeometry([
          { y: -12, a: 2.9, b: 1.6, cx: 0.6, cz: -1.35 },
          { y: -9.6, a: 3.0, b: 1.05, cx: 0.6, cz: -1.25 },
          { y: -7.5, a: 3.6, b: 1.25, cx: 0.6, cz: -1.4 },
          { y: -4.5, a: 3.95, b: 1.3, cx: 0.7, cz: -1.35 },
          { y: -1.6, a: 4.05, b: 1.15, cx: 0.75, cz: -1.2 },
          { y: -0.2, a: 3.75, b: 0.95, cx: 0.7, cz: -1.0 },
          { y: 0.35, a: 3.3, b: 0.55, cx: 0.7, cz: -1.0 },
        ]),
        skin(),
      ),
    );
    // Thenar and hypothenar eminences.
    for (const [pos, scale, rz] of [
      [new Vector3(-2.3, -6.3, -2.05), new Vector3(1.7, 2.5, 1.05), 0.5],
      [new Vector3(3.7, -5.9, -1.95), new Vector3(1.15, 2.8, 0.9), -0.15],
    ] as const) {
      const m = new Mesh(new SphereGeometry(1, 32, 20), skin());
      m.position.copy(pos);
      m.scale.copy(scale);
      m.rotation.z = rz;
      add(m);
    }

    // The other digits (thumb included), each with its own layout and placement.
    for (const id of FINGER_IDS) {
      if (id === selected) continue;
      const digit = digitFor(id);
      const p = fingerPlacement(id, c);
      const g = new Group();
      g.position.copy(p.position);
      g.rotation.copy(p.rotation);
      const m = new Mesh(digit.createEnvelopeGeometry(1, 32, 60), skin());
      m.scale.copy(p.dims);
      m.position.copy(p.modelOffset);
      const [n0, n1] = digit.isThumb ? [50, 130] : [58, 122];
      const nail = new Mesh(digit.createSurfacePatch(digit.joints.nailFold, digit.nailEndY - 0.03, n0, n1, 1.03, 8, 10), nailMat());
      nail.scale.copy(p.dims);
      nail.position.copy(p.modelOffset);
      g.add(m, nail);
      add(g);
    }

    // One-sided table (faces dorsally) so volar views from below are not blocked.
    const table = new Mesh(new PlaneGeometry(40, 40), new MeshStandardMaterial({ color: '#1d1d1c', roughness: 0.95 }));
    table.position.set(0.7, -4, -3.0);
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
