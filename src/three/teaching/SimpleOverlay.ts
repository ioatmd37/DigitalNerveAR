import {
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type BufferGeometry,
} from 'three';
import { COLORS } from '../../config/anatomy';
import type { SimpleOverlayStep } from '../../types';
import { disposeObject, type ModelExtension } from '../anatomy/AnatomyModel';
import { FINGER, type Digit } from '../anatomy/layout';

/** Bleb growth frames (precomputed patches, swapped while animating). */
const FRAMES = 24;
const SPREAD_SECONDS = 4;
const HOLD_SECONDS = 1.5;

/**
 * Teacher-only overlay for Lalonde's SIMPLE block on the simplified model
 * (anatomy frame, cm): the volar-midline site at the middle of the proximal
 * phalanx, the subcutaneous plane, a fine needle, the volar subcutaneous
 * bleb spreading to both palmar digital nerves, and optional dorsal top-ups.
 */
export class SimpleOverlay implements ModelExtension {
  readonly object = new Group();
  private readonly site = new Group();
  private readonly plane: Mesh;
  private readonly needle = new Group();
  private readonly bleb: Mesh;
  private readonly blebFrames: BufferGeometry[] = [];
  private readonly dorsal = new Group();
  private step: SimpleOverlayStep | null = null;
  private start = 0;
  private last = 0;

  constructor(digit: Digit = FINGER) {
    this.object.name = 'SimpleTechniqueOverlay';
    this.object.visible = false;
    const d = digit;
    const pp = d.bones.find((b) => b.id === 'phalanx_proximal') ?? d.bones[1];
    const y = (pp.y0 + pp.y1) / 2;
    const span = (pp.y1 - pp.y0) / 2;

    // Site: ring and dot on the volar midline.
    const siteMat = new MeshBasicMaterial({ color: '#f5f3ee', depthTest: false, transparent: true });
    const ring = new Mesh(new TorusGeometry(0.22, 0.03, 10, 36), siteMat);
    const dot = new Mesh(new SphereGeometry(0.06, 12, 8), siteMat);
    const p = d.surfacePoint(y, 270, 1.05);
    ring.position.copy(p);
    dot.position.copy(p);
    ring.renderOrder = dot.renderOrder = 20;
    this.site.add(ring, dot);

    // Subcutaneous plane: a light band just inside the volar skin.
    this.plane = new Mesh(
      d.createSurfacePatch(y - span * 0.9, y + span * 0.9, 220, 320, 0.93, 16, 24),
      new MeshBasicMaterial({ color: COLORS.subcutaneous, transparent: true, opacity: 0.45, side: DoubleSide, depthWrite: false }),
    );
    this.plane.renderOrder = 6;

    // Fine needle (27–30 G) perpendicular to the volar skin, tip in the subcutaneous fat.
    const tip = d.surfacePoint(y, 270, 0.9);
    const steel = new MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.9, roughness: 0.25 });
    const len = 2.6;
    const shaft = new Mesh(new CylinderGeometry(0.016, 0.016, len, 8), steel);
    shaft.rotation.x = Math.PI / 2;
    shaft.position.copy(tip).add(new Vector3(0, 0, -len / 2));
    const hub = new Mesh(new CylinderGeometry(0.09, 0.12, 0.5, 14), new MeshStandardMaterial({ color: '#f59e0b', roughness: 0.4 }));
    hub.rotation.x = Math.PI / 2;
    hub.position.copy(tip).add(new Vector3(0, 0, -len - 0.25));
    const barrel = new Mesh(
      new CylinderGeometry(0.32, 0.32, 3.2, 20),
      new MeshStandardMaterial({ color: '#f8fafc', transparent: true, opacity: 0.45, roughness: 0.1 }),
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.copy(tip).add(new Vector3(0, 0, -len - 0.5 - 1.6));
    this.needle.add(shaft, hub, barrel);

    // Volar subcutaneous bleb: grows from the midline around the volar half toward both nerves.
    for (let i = 0; i < FRAMES; i++) {
      const t = (i + 1) / FRAMES;
      const half = 8 + 56 * t;
      const ySpan = span * (0.25 + 0.6 * t);
      this.blebFrames.push(d.createSurfacePatch(y - ySpan, y + ySpan, 270 - half, 270 + half, 0.95, 12, 20));
    }
    this.bleb = new Mesh(
      this.blebFrames[0],
      new MeshBasicMaterial({ color: COLORS.injectate, transparent: true, opacity: 0.5, side: DoubleSide, depthWrite: false }),
    );
    this.bleb.renderOrder = 7;

    // Optional dorsal top-ups over the proximal phalanx, near the dorsal digital nerves.
    const dorsalMat = new MeshBasicMaterial({ color: COLORS.injectate, transparent: true, opacity: 0.5, side: DoubleSide, depthWrite: false });
    for (const [a, b] of [
      [100, 140],
      [40, 80],
    ]) {
      const m = new Mesh(d.createSurfacePatch(y - span * 0.45, y + span * 0.45, a, b, 0.95, 8, 10), dorsalMat);
      m.renderOrder = 7;
      this.dorsal.add(m);
    }

    this.object.add(this.site, this.plane, this.needle, this.bleb, this.dorsal);
  }

  setVisible(visible: boolean): void {
    this.object.visible = visible;
  }

  setStep(step: SimpleOverlayStep): void {
    const changed = this.step?.bleb !== step.bleb;
    this.step = step;
    this.site.visible = step.site;
    this.plane.visible = step.plane;
    this.needle.visible = step.needle;
    this.bleb.visible = step.bleb !== 'none';
    this.dorsal.visible = step.dorsal;
    if (changed) this.restart();
  }

  restart(): void {
    this.start = this.last;
  }

  update(elapsed: number): void {
    this.last = elapsed;
    if (!this.object.visible || !this.step || this.step.bleb === 'none') return;
    let frame = FRAMES - 1;
    if (this.step.bleb === 'spread') {
      const t = (elapsed - this.start) % (SPREAD_SECONDS + HOLD_SECONDS);
      frame = Math.min(FRAMES - 1, Math.floor((t / SPREAD_SECONDS) * FRAMES));
    }
    if (this.bleb.geometry !== this.blebFrames[frame]) this.bleb.geometry = this.blebFrames[frame];
  }

  dispose(): void {
    for (const g of this.blebFrames) g.dispose();
    this.bleb.geometry = this.blebFrames[0];
    disposeObject(this.object);
  }
}
