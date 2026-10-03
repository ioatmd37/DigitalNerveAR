import {
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type BufferGeometry,
} from 'three';
import { COLORS } from '../../config/anatomy';
import type { TransthecalOverlayStep } from '../../types';
import { disposeObject, type ModelExtension } from '../anatomy/AnatomyModel';
import { createTaperedTube } from '../anatomy/geometry';
import { FINGER, type Digit } from '../anatomy/layout';

const FRAMES = 24;
const SPREAD_SECONDS = 4;
const HOLD_SECONDS = 1.5;
const UP = new Vector3(0, 1, 0);

/**
 * Teacher-only overlay for the transthecal (intrathecal) volar digital block
 * on the simplified model (anatomy frame, cm): the entry over the A1 pulley,
 * the flexor sheath, a needle at about 45° toward the fingertip (at bone, or
 * withdrawn into the sheath), the sheath filling distally under proximal
 * pressure, and diffusion out of the sheath toward the palmar nerves.
 */
export class TransthecalOverlay implements ModelExtension {
  readonly object = new Group();
  private readonly site = new Group();
  private readonly sheath: Mesh;
  private readonly needle = new Group();
  private readonly fill: Mesh;
  private readonly fillFrames: BufferGeometry[] = [];
  private readonly pressure = new Group();
  private readonly diffusion = new Group();
  private readonly tipBone: Vector3;
  private readonly tipSheath: Vector3;
  private readonly dir: Vector3;
  private step: TransthecalOverlayStep | null = null;
  private start = 0;
  private last = 0;

  constructor(digit: Digit = FINGER) {
    this.object.name = 'TransthecalTechniqueOverlay';
    this.object.visible = false;
    const d = digit;
    const a1 = d.pulleys.find(([name]) => name === 'A1')?.[1] ?? d.joints.mcp;
    const [s0, s1] = d.sheath;
    const centre = (y: number) => new Vector3(0, y, d.tendonZ * d.taper(y) - 0.03);

    // Entry marker over the A1 pulley.
    const siteMat = new MeshBasicMaterial({ color: '#f5f3ee', depthTest: false, transparent: true });
    const entry = d.surfacePoint(a1, 270, 1.0);
    const ring = new Mesh(new TorusGeometry(0.22, 0.03, 10, 36), siteMat);
    const dot = new Mesh(new SphereGeometry(0.06, 12, 8), siteMat);
    ring.position.copy(d.surfacePoint(a1, 270, 1.05));
    dot.position.copy(ring.position);
    ring.renderOrder = dot.renderOrder = 20;
    this.site.add(ring, dot);

    // Sheath outline (the model's own sheath is faint): a slightly larger translucent tube.
    const sheathPts = Array.from({ length: 30 }, (_, i) => centre(s0 + ((s1 - s0) * i) / 29));
    this.sheath = new Mesh(
      createTaperedTube(sheathPts, (t) => (0.33 - 0.09 * t) * d.k, 80, 18, 1.28, 0.98),
      new MeshBasicMaterial({ color: '#e8e5de', transparent: true, opacity: 0.18, side: DoubleSide, depthWrite: false }),
    );
    this.sheath.renderOrder = 5;

    // Needle path: about 45° toward the fingertip from the entry; find where it meets bone.
    this.dir = new Vector3(0, 1, 1).normalize();
    let tip = entry.clone();
    for (let s = 0; s < 4; s += 0.01) {
      const p = entry.clone().addScaledVector(this.dir, s);
      if (d.insideBone(p)) {
        tip = p;
        break;
      }
    }
    this.tipBone = tip;
    this.tipSheath = tip.clone().addScaledVector(this.dir, -0.15);
    const steel = new MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.9, roughness: 0.25 });
    const len = 3.4;
    const shaft = new Mesh(new CylinderGeometry(0.02, 0.02, len, 8), steel);
    shaft.position.set(0, -len / 2, 0);
    const hub = new Mesh(new CylinderGeometry(0.1, 0.13, 0.55, 14), new MeshStandardMaterial({ color: '#f59e0b', roughness: 0.4 }));
    hub.position.set(0, -len - 0.27, 0);
    const barrel = new Mesh(
      new CylinderGeometry(0.34, 0.34, 3.4, 20),
      new MeshStandardMaterial({ color: '#f8fafc', transparent: true, opacity: 0.45, roughness: 0.1 }),
    );
    barrel.position.set(0, -len - 0.55 - 1.7, 0);
    // Local +Y of the needle group points along the needle toward its tip.
    this.needle.add(shaft, hub, barrel);
    this.needle.quaternion.copy(new Quaternion().setFromUnitVectors(UP, this.dir));

    // Sheath filling distally from the A1 level (precomputed growth frames).
    for (let i = 0; i < FRAMES; i++) {
      const t = (i + 1) / FRAMES;
      const y1 = a1 + (s1 - a1) * t;
      const pts = Array.from({ length: 16 }, (_, j) => centre(a1 - 0.2 + ((y1 - a1 + 0.2) * j) / 15));
      this.fillFrames.push(createTaperedTube(pts, (u) => (0.29 - 0.06 * u * t) * d.k, 60, 16, 1.25, 0.95));
    }
    this.fill = new Mesh(
      this.fillFrames[0],
      new MeshBasicMaterial({ color: COLORS.injectate, transparent: true, opacity: 0.55, depthWrite: false }),
    );
    this.fill.renderOrder = 7;

    // Pressure just proximal to the entry: the operator's fingertip pressing on the palm.
    const pad = new Mesh(new SphereGeometry(0.6, 20, 14), new MeshStandardMaterial({ color: '#d8b49c', roughness: 0.7 }));
    pad.scale.set(1, 0.8, 0.55);
    const padAt = d.surfacePoint(a1 - 1.5, 270, 1.0);
    pad.position.copy(padAt).add(new Vector3(0, 0, -0.35));
    const arrowMat = new MeshBasicMaterial({ color: '#facc15' });
    const arrowShaft = new Mesh(new CylinderGeometry(0.05, 0.05, 1.0, 10), arrowMat);
    const arrowHead = new Mesh(new ConeGeometry(0.16, 0.35, 14), arrowMat);
    const into = new Quaternion().setFromUnitVectors(UP, new Vector3(0, 0, 1));
    arrowShaft.quaternion.copy(into);
    arrowHead.quaternion.copy(into);
    arrowShaft.position.copy(padAt).add(new Vector3(0, 0, -1.6));
    arrowHead.position.copy(padAt).add(new Vector3(0, 0, -0.95));
    this.pressure.add(pad, arrowShaft, arrowHead);

    // Diffusion out of the sheath toward both palmar digital nerves.
    const diffMat = new MeshBasicMaterial({ color: COLORS.injectate, transparent: true, opacity: 0.22, side: DoubleSide, depthWrite: false });
    const pp = d.bones.find((b) => b.id === 'phalanx_proximal') ?? d.bones[1];
    const diff = new Mesh(d.createSurfacePatch(Math.max(a1, 0), pp.y1, 212, 328, 0.82, 16, 24), diffMat);
    diff.renderOrder = 6;
    this.diffusion.add(diff);

    this.object.add(this.site, this.sheath, this.needle, this.fill, this.pressure, this.diffusion);
  }

  setVisible(visible: boolean): void {
    this.object.visible = visible;
  }

  setStep(step: TransthecalOverlayStep): void {
    const changed = this.step?.fill !== step.fill;
    this.step = step;
    this.site.visible = step.site;
    this.sheath.visible = step.sheath;
    this.needle.visible = step.needle !== 'none';
    if (step.needle !== 'none') this.needle.position.copy(step.needle === 'bone' ? this.tipBone : this.tipSheath);
    this.fill.visible = step.fill !== 'none';
    this.pressure.visible = step.pressure;
    this.diffusion.visible = step.diffusion;
    if (changed) this.restart();
  }

  restart(): void {
    this.start = this.last;
  }

  update(elapsed: number): void {
    this.last = elapsed;
    if (!this.object.visible || !this.step || this.step.fill === 'none') return;
    let frame = FRAMES - 1;
    if (this.step.fill === 'spread') {
      const t = (elapsed - this.start) % (SPREAD_SECONDS + HOLD_SECONDS);
      frame = Math.min(FRAMES - 1, Math.floor((t / SPREAD_SECONDS) * FRAMES));
    }
    if (this.fill.geometry !== this.fillFrames[frame]) this.fill.geometry = this.fillFrames[frame];
  }

  dispose(): void {
    for (const g of this.fillFrames) g.dispose();
    this.fill.geometry = this.fillFrames[0];
    disposeObject(this.object);
  }
}
