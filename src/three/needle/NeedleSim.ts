import {
  BufferGeometry,
  CylinderGeometry,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import { FLATTEN, surfaceNormal } from '../anatomy/geometry';
import { disposeObject, type ModelExtension } from '../anatomy/AnatomyModel';
import { NEEDLE_LENGTH_CM, statusLevel, type NeedleEvaluation, type NeedleState } from '../../logic/needle';

const LEVEL_COLOR = {
  neutral: '#e2e8f0',
  good: '#22c55e',
  caution: '#f59e0b',
  danger: '#ef4444',
} as const;

const UP = new Vector3(0, 1, 0);

/**
 * Virtual needle + syringe drawn in the anatomy frame (cm). Purely visual:
 * all decisions come from `evaluateNeedle` in `src/logic/needle.ts`.
 */
export class NeedleSim implements ModelExtension {
  readonly object = new Group();
  private readonly shaft: Mesh;
  private readonly hub: Mesh;
  private readonly barrel: Mesh;
  private readonly barrelMat: MeshStandardMaterial;
  private readonly tipMarker: Mesh;
  private readonly tipMat: MeshBasicMaterial;
  private readonly entryRing: Mesh;
  private readonly trace: Line;
  private readonly spread: Mesh;
  private readonly spreadMat: MeshBasicMaterial;
  private injectStart: number | null = null;
  private lastElapsed = 0;
  private injected = false;

  constructor() {
    this.object.name = 'VirtualNeedle';
    this.object.visible = false;
    const steel = new MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.9, roughness: 0.25 });
    this.shaft = new Mesh(new CylinderGeometry(0.022, 0.022, NEEDLE_LENGTH_CM, 10), steel);
    this.hub = new Mesh(
      new CylinderGeometry(0.1, 0.14, 0.7, 16),
      new MeshStandardMaterial({ color: '#3b82f6', roughness: 0.4 }),
    );
    this.barrelMat = new MeshStandardMaterial({ color: '#f8fafc', transparent: true, opacity: 0.45, roughness: 0.1 });
    this.barrel = new Mesh(new CylinderGeometry(0.42, 0.42, 4.5, 24, 1, false), this.barrelMat);
    this.tipMat = new MeshBasicMaterial({ color: LEVEL_COLOR.neutral, depthTest: false, transparent: true });
    this.tipMarker = new Mesh(new SphereGeometry(0.075, 16, 10), this.tipMat);
    this.tipMarker.renderOrder = 1003;
    this.entryRing = new Mesh(
      new TorusGeometry(0.2, 0.03, 8, 32),
      new MeshBasicMaterial({ color: '#fde047', depthTest: false, transparent: true, opacity: 0.9 }),
    );
    this.entryRing.renderOrder = 1003;
    this.trace = new Line(
      new BufferGeometry().setFromPoints([new Vector3(), new Vector3()]),
      new LineBasicMaterial({ color: LEVEL_COLOR.neutral, depthTest: false, transparent: true }),
    );
    this.trace.renderOrder = 1002;
    this.spreadMat = new MeshBasicMaterial({ color: '#67e8f9', transparent: true, opacity: 0.4, depthWrite: false });
    this.spread = new Mesh(new SphereGeometry(1, 24, 16), this.spreadMat);
    this.spread.visible = false;
    for (const o of [this.shaft, this.hub, this.barrel, this.tipMarker, this.entryRing, this.trace, this.spread]) {
      o.raycast = () => {}; // never blocks tapping the finger
      this.object.add(o);
    }
  }

  setVisible(visible: boolean): void {
    this.object.visible = visible;
  }

  /** Place everything from the current state and its evaluation. */
  sync(state: NeedleState, e: NeedleEvaluation): void {
    const q = new Quaternion().setFromUnitVectors(UP, e.dir);
    const tail = e.tip.clone().addScaledVector(e.dir, -NEEDLE_LENGTH_CM);
    const place = (m: Mesh, from: Vector3, len: number) => {
      m.quaternion.copy(q);
      m.position.copy(from).addScaledVector(e.dir, -len / 2);
    };
    place(this.shaft, e.tip, NEEDLE_LENGTH_CM);
    place(this.hub, tail, 0.7);
    place(this.barrel, tail.clone().addScaledVector(e.dir, -0.7), 4.5);
    this.barrelMat.color.set(state.aspiration === 'blood' ? '#dc2626' : '#f8fafc');
    this.barrelMat.opacity = state.aspiration === 'blood' ? 0.7 : 0.45;

    const color = LEVEL_COLOR[statusLevel(e.tipStatus)];
    this.tipMat.color.set(color);
    this.tipMarker.position.copy(e.tip);
    this.tipMarker.visible = e.inserted;
    (this.trace.material as LineBasicMaterial).color.set(color);
    this.trace.geometry.setFromPoints([e.entry, e.tip]);
    this.trace.visible = e.inserted;

    const n = surfaceNormal(state.entryThetaDeg);
    this.entryRing.position.copy(e.entry).addScaledVector(n, 0.03);
    this.entryRing.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), n);
    (this.entryRing.material as MeshBasicMaterial).color.set(e.entryOk ? '#22c55e' : '#fde047');

    this.spread.position.copy(e.tip);
    if (state.injected && !this.injected) this.injectStart = this.lastElapsed;
    if (!state.injected) this.injectStart = null;
    this.injected = state.injected;
    this.spread.visible = state.injected && e.tipStatus !== 'artery' && e.tipStatus !== 'exited';
  }

  update(elapsed: number): void {
    this.lastElapsed = elapsed;
    if (this.injectStart === null || !this.spread.visible) return;
    // Conceptual spread: grows over ~2.5 s then gently pulses.
    const t = Math.min(1, (elapsed - this.injectStart) / 2.5);
    const r = 0.1 + 0.45 * t + 0.03 * Math.sin(elapsed * 3);
    this.spread.scale.set(r, r * 1.8, r * FLATTEN);
    this.spreadMat.opacity = 0.5 - 0.2 * t;
  }

  dispose(): void {
    disposeObject(this.object);
  }
}
