import {
  CapsuleGeometry,
  CatmullRomCurve3,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  FrontSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  type BufferGeometry,
  type Material,
  type MeshStandardMaterialParameters,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { COLORS } from '../../config/anatomy';
import { translate } from '../../config/locales';
import type { Language, StructureId } from '../../types';
import { BaseAnatomyModel, disposeSprite, STRUCTURE_ID_KEY } from './AnatomyModel';
import {
  createEnvelopeGeometry,
  createSurfacePatch,
  FLATTEN,
  JOINTS,
  longitudinalPath,
  skinRadiusAt,
  surfaceNormal,
  surfacePath,
  surfacePoint,
} from './geometry';
import { createDotTexture, createHatchTexture, createLabelTexture } from './textures';

/**
 * Procedural, SIMPLIFIED right index finger built from three.js primitives.
 *
 * Object hierarchy (names are stable and match structure ids, so a GLB
 * model can replace any structure by using the same node names):
 *
 *   AnatomyModelRoot
 *   ├─ AnatomyFrame              (scaled to the measured mannequin finger)
 *   │  ├─ Layer:skin             → skin, nail
 *   │  ├─ Layer:subcutaneous     → subcutaneous
 *   │  ├─ Layer:bone             → metacarpal_head, phalanx_*
 *   │  ├─ Layer:tendon           → flexor_tendon
 *   │  ├─ Layer:nerves           → nerve_radial, nerve_ulnar
 *   │  ├─ Layer:arteries         → artery_radial, artery_ulnar
 *   │  ├─ Layer:veins            → vein_radial, vein_ulnar
 *   │  ├─ Layer:safeZones        → safe_zone_radial, safe_zone_ulnar
 *   │  ├─ Layer:avoidZone        → avoid_zone_volar
 *   │  ├─ Layer:entryPoints      → entry_point_radial, entry_point_ulnar
 *   │  ├─ Layer:needlePath       → needle_path_radial, needle_path_ulnar
 *   │  ├─ Layer:injectate        → injectate_radial, injectate_ulnar
 *   │  ├─ Layer:landmarks        → landmark_*
 *   │  └─ Layer:orientation      → orientation_gizmo
 *   └─ Labels                    (label sprites + leader lines, unscaled)
 *
 * Frame: +X ulnar, −X radial, +Y distal, +Z dorsal; units = cm.
 */

type Side = 'radial' | 'ulnar';
/** X sign for each side (radial is toward the thumb = −X on a right hand). */
const SIDE_SIGN: Record<Side, number> = { radial: -1, ulnar: 1 };
/** Dorsolateral angle for each side, measured from +X toward +Z. */
const DORSOLATERAL_DEG: Record<Side, number> = { radial: 130, ulnar: 50 };

const ENTRY_Y = 1.0;
const LABEL_X = 3.4;

function std(color: string, opts: MeshStandardMaterialParameters = {}): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.0, ...opts });
}

function tube(points: Vector3[], radius: number, material: Material, name: string): Mesh {
  const curve = new CatmullRomCurve3(points);
  const mesh = new Mesh(new TubeGeometry(curve, 64, radius, 12, false), material);
  mesh.name = name;
  // Round end caps so tubes don't look hollow.
  const capGeo = new SphereGeometry(radius, 12, 8);
  for (const p of [points[0], points[points.length - 1]]) {
    const cap = new Mesh(capGeo, material);
    cap.position.copy(p);
    mesh.add(cap);
  }
  return mesh;
}

function mesh(geometry: BufferGeometry, material: Material, name: string): Mesh {
  const m = new Mesh(geometry, material);
  m.name = name;
  return m;
}

/** Arrow from `from` to `to` (tip at `to`). */
function arrow(from: Vector3, to: Vector3, color: string, shaftRadius: number, name: string): Group {
  const g = new Group();
  g.name = name;
  const dir = to.clone().sub(from);
  const len = dir.length();
  dir.normalize();
  const headLen = Math.min(0.32, len * 0.3);
  const mat = std(color, { emissive: color, emissiveIntensity: 0.35, transparent: true, opacity: 0.95 });
  const shaft = new Mesh(new CylinderGeometry(shaftRadius, shaftRadius, len - headLen, 12), mat);
  const head = new Mesh(new ConeGeometry(shaftRadius * 2.6, headLen, 16), mat);
  const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir);
  shaft.quaternion.copy(q);
  head.quaternion.copy(q);
  shaft.position.copy(from).addScaledVector(dir, (len - headLen) / 2);
  head.position.copy(from).addScaledVector(dir, len - headLen / 2);
  g.add(shaft, head);
  return g;
}

interface InjectateBlob {
  mesh: Mesh;
  material: MeshBasicMaterial;
  phase: number;
}

export class ProceduralFingerModel extends BaseAnatomyModel {
  readonly source: 'procedural' | 'gltf' = 'procedural';

  private readonly blobs: InjectateBlob[] = [];
  private injectateStart = 0;
  private lastElapsed = 0;
  private gizmoLabels: Sprite[] = [];
  private gizmo = new Group();

  constructor(language: Language = 'th') {
    super();
    this.buildSkin();
    this.buildSubcutaneous();
    this.buildBones();
    this.buildTendon();
    this.buildNeurovascular();
    this.buildVeins();
    this.buildZones();
    this.buildEntryAndNeedle();
    this.buildInjectate();
    this.buildLandmarks();
    this.buildOrientationGizmo();
    this.setLanguage(language);
  }

  // ------------------------------------------------------------------ skin

  private buildSkin(): void {
    const skinMat = std(COLORS.skin, {
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      side: FrontSide,
      roughness: 0.7,
    });
    const envelope = mesh(createEnvelopeGeometry(1), skinMat, 'skin_envelope');
    envelope.renderOrder = 2;

    // Short stub of the hand (index metacarpal region) for context.
    const stubMat = std(COLORS.skin, { transparent: true, opacity: 0.18, depthWrite: false, roughness: 0.8 });
    stubMat.userData.opacityFactor = 0.55;
    const stub = mesh(new RoundedBoxGeometry(2.4, 3.6, 1.75, 4, 0.7), stubMat, 'hand_stub');
    stub.position.set(0, -2.55, 0);
    stub.renderOrder = 2;

    this.addStructure('skin', [envelope, stub], surfacePoint(2, 90), surfacePoint(2, 90, 3));

    const nailMat = std(COLORS.nail, { roughness: 0.3, side: DoubleSide, transparent: true, opacity: 0.95 });
    const nail = mesh(createSurfacePatch(JOINTS.nailFold, 8.15, 58, 122, 1.025, 12, 16), nailMat, 'nail_plate');
    nail.renderOrder = 3;
    this.addStructure('nail', [nail], surfacePoint(7.6, 90, 1.02), new Vector3(0, 8.6, 2.2));
  }

  private buildSubcutaneous(): void {
    const mat = std(COLORS.subcutaneous, { transparent: true, opacity: 0.28, depthWrite: false, roughness: 0.9 });
    const layer = mesh(createEnvelopeGeometry(0.9), mat, 'subcutaneous_shell');
    layer.renderOrder = 1;
    this.addStructure('subcutaneous', [layer], surfacePoint(7.2, 20, 0.9), new Vector3(LABEL_X, 7.6, 0.4));
  }

  // ----------------------------------------------------------------- bones

  private buildBones(): void {
    const bones: { id: StructureId; y0: number; y1: number; r: number }[] = [
      { id: 'metacarpal_head', y0: -3.8, y1: 0.05, r: 0.5 },
      { id: 'phalanx_proximal', y0: 0.25, y1: 3.95, r: 0.42 },
      { id: 'phalanx_middle', y0: 4.18, y1: 6.15, r: 0.35 },
      { id: 'phalanx_distal', y0: 6.36, y1: 7.95, r: 0.28 },
    ];
    for (const b of bones) {
      const mat = std(COLORS.bone, { roughness: 0.45 });
      const len = Math.max(0.01, b.y1 - b.y0 - 2 * b.r);
      const m = mesh(new CapsuleGeometry(b.r, len, 8, 20), mat, `${b.id}_mesh`);
      m.position.set(0, (b.y0 + b.y1) / 2, 0.08);
      m.scale.set(1, 1, 0.9);
      const anchor = new Vector3(b.r * 0.9, (b.y0 + b.y1) / 2, 0.3);
      this.addStructure(b.id, [m], anchor, new Vector3(LABEL_X, 6.4, 1.3));
    }
  }

  private buildTendon(): void {
    const mat = std(COLORS.tendon, { roughness: 0.35 });
    const pts = longitudinalPath(0, -0.5, -3.6, 6.55, 16);
    this.addStructure('flexor_tendon', [tube(pts, 0.16, mat, 'flexor_tendon_tube')], new Vector3(0, 5.2, -0.45), new Vector3(1.6, 8.2, -1.8));
  }

  // --------------------------------------------------------- neurovascular

  private buildNeurovascular(): void {
    for (const side of ['radial', 'ulnar'] as Side[]) {
      const sx = SIDE_SIGN[side];
      // In the digit the nerve lies volar to the artery (simplified).
      const nervePts = longitudinalPath(0.6 * sx, -0.5, -3.6, 8.0, 18);
      const arteryPts = longitudinalPath(0.68 * sx, -0.29, -3.6, 7.9, 18);
      const nerveMat = std(COLORS.nerve, { emissive: COLORS.nerve, emissiveIntensity: 0.12, roughness: 0.4 });
      const arteryMat = std(COLORS.artery, { emissive: COLORS.artery, emissiveIntensity: 0.1, roughness: 0.35 });
      this.addStructure(
        `nerve_${side}` as StructureId,
        [tube(nervePts, 0.08, nerveMat, `nerve_${side}_tube`)],
        new Vector3(0.58 * sx, 3.0, -0.48),
        new Vector3(LABEL_X * sx, 3.3, -1.0),
      );
      this.addStructure(
        `artery_${side}` as StructureId,
        [tube(arteryPts, 0.065, arteryMat, `artery_${side}_tube`)],
        new Vector3(0.64 * sx, 5.0, -0.26),
        new Vector3(LABEL_X * sx, 4.9, -0.3),
      );
    }
  }

  private buildVeins(): void {
    for (const side of ['radial', 'ulnar'] as Side[]) {
      const theta = side === 'radial' ? 118 : 62;
      const pts = surfacePath(theta, 0.9, -3.2, 7.0, 16);
      const mat = std(COLORS.vein, { roughness: 0.4 });
      this.addStructure(
        `vein_${side}` as StructureId,
        [tube(pts, 0.055, mat, `vein_${side}_tube`)],
        surfacePoint(5.8, theta, 0.9),
        new Vector3(LABEL_X * SIDE_SIGN[side] * 0.85, 7.0, 1.5),
      );
    }
  }

  // ----------------------------------------------------------------- zones

  private buildZones(): void {
    const dots = this.trackTexture(createDotTexture(COLORS.safe));
    for (const side of ['radial', 'ulnar'] as Side[]) {
      const c = DORSOLATERAL_DEG[side];
      const mat = new MeshBasicMaterial({
        color: dots ? '#ffffff' : COLORS.safe,
        map: dots,
        transparent: true,
        opacity: dots ? 0.9 : 0.45,
        side: DoubleSide,
        depthWrite: false,
      });
      const patch = mesh(createSurfacePatch(0.3, 2.2, c - 25, c + 25, 1.035), mat, `safe_zone_${side}_patch`);
      patch.renderOrder = 5;
      this.addStructure(
        `safe_zone_${side}` as StructureId,
        [patch],
        surfacePoint(1.6, c, 1.04),
        new Vector3(LABEL_X * SIDE_SIGN[side], 1.7, 1.5),
      );
    }

    const hatch = this.trackTexture(createHatchTexture(COLORS.avoid));
    const outerMat = new MeshBasicMaterial({
      color: hatch ? '#ffffff' : COLORS.avoid,
      map: hatch,
      transparent: true,
      opacity: hatch ? 0.8 : 0.4,
      side: DoubleSide,
      depthWrite: false,
    });
    const outer = mesh(createSurfacePatch(0.1, 7.3, 203, 337, 1.03, 40, 28), outerMat, 'avoid_zone_surface');
    outer.renderOrder = 5;
    // Faint inner volume so the zone reads as a region, not only a surface.
    const innerMat = new MeshBasicMaterial({
      color: COLORS.avoid,
      transparent: true,
      opacity: 0.12,
      side: DoubleSide,
      depthWrite: false,
    });
    const inner = mesh(createSurfacePatch(0.1, 7.3, 203, 337, 0.97, 40, 28), innerMat, 'avoid_zone_volume');
    inner.renderOrder = 4;
    this.addStructure('avoid_zone_volar', [outer, inner], surfacePoint(3.2, 270, 1.03), new Vector3(0, 3.0, -2.6));
  }

  // --------------------------------------------------- entry points / path

  /** Where the model arrow tip stops: beside the bone, near the bundle. */
  static needleTarget(side: Side): Vector3 {
    return new Vector3(0.74 * SIDE_SIGN[side], ENTRY_Y, -0.16);
  }

  static entryPoint(side: Side): Vector3 {
    return surfacePoint(ENTRY_Y, DORSOLATERAL_DEG[side], 1.0);
  }

  private buildEntryAndNeedle(): void {
    for (const side of ['radial', 'ulnar'] as Side[]) {
      const theta = DORSOLATERAL_DEG[side];
      const p = surfacePoint(ENTRY_Y, theta, 1.06);
      const n = surfaceNormal(theta);
      const mat = std(COLORS.entry, { emissive: COLORS.entry, emissiveIntensity: 0.4 });
      const ring = mesh(new TorusGeometry(0.2, 0.04, 10, 36), mat, `entry_point_${side}_ring`);
      const dot = mesh(new SphereGeometry(0.06, 12, 8), mat, `entry_point_${side}_dot`);
      ring.position.copy(p);
      ring.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), n);
      dot.position.copy(p);
      this.addStructure(
        `entry_point_${side}` as StructureId,
        [ring, dot],
        p.clone(),
        new Vector3(LABEL_X * SIDE_SIGN[side], 0.1, 2.4),
      );

      const entry = ProceduralFingerModel.entryPoint(side);
      const target = ProceduralFingerModel.needleTarget(side);
      const outward = entry.clone().sub(target).normalize();
      const start = entry.clone().addScaledVector(outward, 2.2);
      const arr = arrow(start, target, COLORS.needle, 0.035, `needle_path_${side}_arrow`);
      this.addStructure(
        `needle_path_${side}` as StructureId,
        [arr],
        start.clone().lerp(entry, 0.5),
        new Vector3(LABEL_X * SIDE_SIGN[side] * 0.9, 2.4, 3.0),
      );
    }
  }

  // ------------------------------------------------------------- injectate

  private buildInjectate(): void {
    const geo = new SphereGeometry(1, 24, 16);
    for (const side of ['radial', 'ulnar'] as Side[]) {
      const sx = SIDE_SIGN[side];
      const center = new Vector3(0.68 * sx, ENTRY_Y + 0.2, -0.3);
      const content: Object3D[] = [];
      for (let i = 0; i < 3; i++) {
        const material = new MeshBasicMaterial({
          color: COLORS.injectate,
          transparent: true,
          opacity: 0.4,
          depthWrite: false,
        });
        const m = new Mesh(geo, material);
        m.name = `injectate_${side}_halo_${i}`;
        m.position.copy(center);
        m.renderOrder = 6;
        content.push(m);
        this.blobs.push({ mesh: m, material, phase: i / 3 });
      }
      this.addStructure(
        `injectate_${side}` as StructureId,
        content,
        center.clone(),
        new Vector3(LABEL_X * sx, -0.9, -1.2),
      );
    }
  }

  restartInjectate(): void {
    this.injectateStart = this.lastElapsed;
  }

  update(elapsed: number): void {
    super.update(elapsed);
    this.lastElapsed = elapsed;
    const view = this.view;
    const animate = !!view?.animateInjectate;
    const t = elapsed - this.injectateStart;
    const PERIOD = 3.2;
    for (const b of this.blobs) {
      // Grow-and-fade halos; staggered phases give a continuous "spread" feel.
      const p = animate ? (((t / PERIOD + b.phase) % 1) + 1) % 1 : 0.75 - b.phase * 0.3;
      const r = 0.12 + 0.55 * p;
      b.mesh.scale.set(r, r * 1.9, r * FLATTEN);
      b.material.opacity = animate ? 0.5 * (1 - p) + 0.05 : 0.18;
    }
  }

  // ------------------------------------------------------------- landmarks

  private buildLandmarks(): void {
    const dotGeo = new SphereGeometry(0.1, 16, 10);
    const make = (name: string) =>
      mesh(dotGeo, std(COLORS.landmark, { emissive: '#ffffff', emissiveIntensity: 0.25 }), name);

    const mcp = make('landmark_mcp_dot');
    mcp.position.copy(surfacePoint(JOINTS.mcp, 90, 1.03));
    this.addStructure('landmark_mcp', [mcp], mcp.position.clone(), new Vector3(0, -1.8, 2.3));

    const web = make('landmark_web_space_dot');
    web.position.copy(surfacePoint(0.15, 180, 1.03));
    this.addStructure('landmark_web_space', [web], web.position.clone(), new Vector3(-LABEL_X, -1.5, -0.2));

    for (const [id, y] of [
      ['landmark_pip_crease', JOINTS.pip],
      ['landmark_dip_crease', JOINTS.dip],
    ] as [StructureId, number][]) {
      const r = skinRadiusAt(y) * 1.02;
      // Volar crease line: a 144° torus arc. The torus starts in the XY plane
      // at +X; rotating −90° about X puts the arc on the volar (−Z) side,
      // rotating 18° about Y centres it on the volar midline, and the Z
      // scale matches the flattened finger cross-section.
      const creaseGeo = new TorusGeometry(r, 0.035, 8, 40, Math.PI * 0.8);
      creaseGeo.rotateX(-Math.PI / 2);
      creaseGeo.rotateY(Math.PI / 10);
      creaseGeo.scale(1, 1, FLATTEN);
      const crease = mesh(
        creaseGeo,
        std(COLORS.landmark, { emissive: '#ffffff', emissiveIntensity: 0.2 }),
        `${id}_line`,
      );
      crease.position.set(0, y, 0);
      const dot = make(`${id}_dot`);
      dot.position.copy(surfacePoint(y, 270, 1.03));
      this.addStructure(id, [crease, dot], dot.position.clone(), new Vector3(LABEL_X, y, -0.6));
    }

    const nail = make('landmark_nail_fold_dot');
    nail.position.copy(surfacePoint(JOINTS.nailFold, 90, 1.05));
    this.addStructure('landmark_nail_fold', [nail], nail.position.clone(), new Vector3(-LABEL_X, 7.4, 1.4));
  }

  // ----------------------------------------------------------- orientation

  private readonly gizmoAxes: { key: string; dir: Vector3; color: string }[] = [
    { key: 'orientation.dorsal', dir: new Vector3(0, 0, 1), color: '#e2e8f0' },
    { key: 'orientation.volar', dir: new Vector3(0, 0, -1), color: '#94a3b8' },
    { key: 'orientation.radial', dir: new Vector3(-1, 0, 0), color: '#e2e8f0' },
    { key: 'orientation.ulnar', dir: new Vector3(1, 0, 0), color: '#94a3b8' },
    { key: 'orientation.distal', dir: new Vector3(0, 1, 0), color: '#e2e8f0' },
    { key: 'orientation.proximal', dir: new Vector3(0, -1, 0), color: '#94a3b8' },
  ];

  private readonly gizmoCenter = new Vector3(3.4, -4.2, 0);

  private buildOrientationGizmo(): void {
    this.gizmo = new Group();
    this.gizmo.name = 'orientation_gizmo_axes';
    const center = this.gizmoCenter;
    const hub = mesh(new SphereGeometry(0.14, 16, 10), std('#e2e8f0'), 'orientation_hub');
    hub.position.copy(center);
    this.gizmo.add(hub);
    for (const a of this.gizmoAxes) {
      const to = center.clone().addScaledVector(a.dir, 1.25);
      this.gizmo.add(arrow(center.clone().addScaledVector(a.dir, 0.12), to, a.color, 0.03, `axis_${a.key}`));
    }
    this.addStructure('orientation_gizmo', [this.gizmo], center.clone(), center.clone());
  }

  protected onLanguageChanged(): void {
    for (const s of this.gizmoLabels) {
      s.parent?.remove(s);
      disposeSprite(s);
    }
    this.gizmoLabels = [];
    for (const a of this.gizmoAxes) {
      const tex = createLabelTexture({ primary: translate(this.language, a.key), color: a.color, compact: true });
      if (!tex) continue;
      const sprite = new Sprite(new SpriteMaterial({ map: tex.texture, depthTest: false, transparent: true }));
      const h = 0.36;
      sprite.scale.set(h * tex.aspect, h, 1);
      sprite.position.copy(this.gizmoCenter).addScaledVector(a.dir, 1.25 + 0.3 + (a.dir.x !== 0 ? h * tex.aspect * 0.45 : 0.1));
      sprite.renderOrder = 1001;
      sprite.raycast = () => {};
      sprite.userData[STRUCTURE_ID_KEY] = 'orientation_gizmo';
      this.gizmo.add(sprite);
      this.gizmoLabels.push(sprite);
    }
  }

  getFocusPoint(): Vector3 {
    return new Vector3(0, 3.2, 0);
  }
}
