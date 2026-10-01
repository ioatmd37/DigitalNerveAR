import {
  BufferGeometry,
  Color,
  Group,
  Line,
  LineBasicMaterial,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Sprite,
  SpriteMaterial,
  Vector3,
  type Texture,
} from 'three';
import { getStructure, LAYER_IDS } from '../../config/anatomy';
import { MODEL_REFERENCE } from '../../config/appConfig';
import type { AnatomyStructure, Language, LayerId, StructureId, ViewState } from '../../types';
import { createLabelTexture } from './textures';

/**
 * Contract shared by the procedural model and any future GLB/GLTF model.
 * Both the 3D Explorer (React Three Fiber) and the AR view (MindAR) only
 * talk to this interface.
 */
export interface AnatomyModel {
  /** Add this to a scene. Anatomical frame: +X ulnar, +Y distal, +Z dorsal, cm. */
  readonly root: Object3D;
  /** The (dimension-scaled) group that holds the anatomy. Use for world-space math. */
  readonly anatomyFrame: Object3D;
  readonly source: 'procedural' | 'gltf';
  applyViewState(view: ViewState): void;
  setLanguage(language: Language): void;
  /** Non-uniform scaling to match the measured mannequin finger. */
  setDimensions(lengthCm: number, widthCm: number): void;
  /** Resolve a raycast hit list to the structure the learner meant. */
  pick(intersections: ReadonlyArray<{ object: Object3D }>): StructureId | null;
  /** First visible hit on the skin, in the (unscaled) anatomy frame, or null. */
  pickSkinPoint(intersections: ReadonlyArray<{ object: Object3D; point: Vector3 }>): Vector3 | null;
  /** Attach an extra animated object (e.g. the virtual needle) to the anatomy frame. */
  addExtension(ext: ModelExtension): void;
  /** Restart the simulated spread animation. */
  restartInjectate(): void;
  /** Advance animations; `elapsed` in seconds. */
  update(elapsed: number): void;
  /** Local point (anatomy frame) to frame the camera on. */
  getFocusPoint(): Vector3;
  dispose(): void;
}

export interface ModelExtension {
  object: Object3D;
  update?(elapsed: number): void;
  dispose?(): void;
}

interface TrackedMaterial {
  material: MeshStandardMaterial | MeshBasicMaterial;
  baseOpacity: number;
  baseEmissive: number;
  baseColor: Color;
}

interface LabelEntry {
  sprite: Sprite;
  line: Line;
  anchor: Vector3;
  position: Vector3;
}

export interface StructureEntry {
  def: AnatomyStructure;
  group: Group;
  materials: TrackedMaterial[];
  labelAnchor: Vector3;
  labelPosition: Vector3;
  label?: LabelEntry;
}

/** Label sprite height in cm (anatomy frame). */
const LABEL_HEIGHT = 0.72;
/** Structures whose picking should lose to anything inside them. */
const ENVELOPE_IDS: StructureId[] = ['skin', 'subcutaneous', 'nail', 'avoid_zone_volar'];

export const STRUCTURE_ID_KEY = 'structureId';

export function findStructureId(object: Object3D | null): StructureId | null {
  let o: Object3D | null = object;
  while (o) {
    const id = o.userData?.[STRUCTURE_ID_KEY] as StructureId | undefined;
    if (id) return id;
    o = o.parent;
  }
  return null;
}

function visibleInHierarchy(object: Object3D): boolean {
  let o: Object3D | null = object;
  while (o) {
    if (!o.visible) return false;
    o = o.parent;
  }
  return true;
}

/**
 * Shared implementation: layer groups, per-structure materials, labels,
 * highlighting and picking. Subclasses populate structures via
 * `addStructure` / `replaceStructureContent`.
 */
export abstract class BaseAnatomyModel implements AnatomyModel {
  readonly root = new Group();
  readonly anatomyFrame = new Group();
  abstract readonly source: 'procedural' | 'gltf';

  protected readonly labelGroup = new Group();
  protected readonly layerGroups = new Map<LayerId, Group>();
  protected readonly structures = new Map<StructureId, StructureEntry>();
  protected language: Language = 'th';
  protected view: ViewState | null = null;
  protected dims = new Vector3(1, 1, 1);
  private readonly highlighted = new Set<StructureId>();
  private readonly ownedTextures = new Set<Texture>();
  private readonly extensions: ModelExtension[] = [];

  protected constructor() {
    this.root.name = 'AnatomyModelRoot';
    this.anatomyFrame.name = 'AnatomyFrame';
    this.labelGroup.name = 'Labels';
    this.root.add(this.anatomyFrame, this.labelGroup);
    for (const id of LAYER_IDS) {
      const g = new Group();
      g.name = `Layer:${id}`;
      this.layerGroups.set(id, g);
      this.anatomyFrame.add(g);
    }
  }

  /** Register a structure and its content under its layer group. */
  protected addStructure(
    id: StructureId,
    content: Object3D[],
    labelAnchor: Vector3,
    labelPosition: Vector3,
  ): StructureEntry {
    const def = getStructure(id);
    const group = new Group();
    group.name = id;
    group.userData[STRUCTURE_ID_KEY] = id;
    group.visible = def.defaultVisible;
    for (const c of content) group.add(c);
    this.layerGroups.get(def.layer)!.add(group);
    const entry: StructureEntry = { def, group, materials: [], labelAnchor, labelPosition };
    this.structures.set(id, entry);
    this.collectMaterials(entry);
    return entry;
  }

  /** Swap a structure's geometry (e.g. with a node from a GLB file). */
  protected replaceStructureContent(id: StructureId, content: Object3D): void {
    const entry = this.structures.get(id);
    if (!entry) return;
    for (const child of [...entry.group.children]) {
      entry.group.remove(child);
      disposeObject(child);
    }
    entry.group.add(content);
    this.collectMaterials(entry);
  }

  private collectMaterials(entry: StructureEntry): void {
    entry.materials = [];
    entry.group.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        if (m instanceof MeshStandardMaterial || m instanceof MeshBasicMaterial) {
          entry.materials.push({
            material: m,
            baseOpacity: m.opacity,
            baseEmissive: m instanceof MeshStandardMaterial ? m.emissiveIntensity : 0,
            baseColor: m.color.clone(),
          });
        }
      }
    });
  }

  protected trackTexture<T extends Texture | null>(t: T): T {
    if (t) this.ownedTextures.add(t);
    return t;
  }

  applyViewState(view: ViewState): void {
    this.view = view;
    for (const [id, g] of this.layerGroups) g.visible = view.layers[id];

    const skin = this.structures.get('skin');
    if (skin) {
      for (const tm of skin.materials) {
        // Per-material factor lets e.g. the hand stub stay fainter than the finger.
        const factor = (tm.material.userData.opacityFactor as number | undefined) ?? 1;
        tm.material.opacity = view.skinOpacity * factor;
        tm.material.depthWrite = view.skinOpacity * factor > 0.6;
      }
    }

    this.highlighted.clear();
    for (const id of view.highlight) this.highlighted.add(id);
    this.resetHighlightMaterials();
    this.updateLabelVisibility();
  }

  private labelsBuilt = false;

  setLanguage(language: Language): void {
    if (language === this.language && this.labelsBuilt) return;
    this.language = language;
    this.labelsBuilt = true;
    this.rebuildLabels();
  }

  setDimensions(lengthCm: number, widthCm: number): void {
    this.dims.set(
      widthCm / MODEL_REFERENCE.fingerWidthCm,
      lengthCm / MODEL_REFERENCE.fingerLengthCm,
      widthCm / MODEL_REFERENCE.fingerWidthCm,
    );
    this.anatomyFrame.scale.copy(this.dims);
    for (const entry of this.structures.values()) {
      if (entry.label) this.positionLabel(entry.label);
    }
  }

  pick(intersections: ReadonlyArray<{ object: Object3D }>): StructureId | null {
    let envelope: StructureId | null = null;
    for (const hit of intersections) {
      if (!visibleInHierarchy(hit.object)) continue;
      const id = findStructureId(hit.object);
      if (!id || id === 'orientation_gizmo') continue;
      // Labels are drawn on top of everything, so they win immediately.
      if ((hit.object as Sprite).isSprite) return id;
      if (ENVELOPE_IDS.includes(id)) {
        envelope ??= id;
        continue;
      }
      return id;
    }
    return envelope;
  }

  pickSkinPoint(intersections: ReadonlyArray<{ object: Object3D; point: Vector3 }>): Vector3 | null {
    for (const hit of intersections) {
      if (!visibleInHierarchy(hit.object) || (hit.object as Sprite).isSprite) continue;
      const id = findStructureId(hit.object);
      if (id === 'skin') return this.anatomyFrame.worldToLocal(hit.point.clone());
    }
    return null;
  }

  addExtension(ext: ModelExtension): void {
    this.extensions.push(ext);
    this.anatomyFrame.add(ext.object);
  }

  getFocusPoint(): Vector3 {
    return new Vector3(0, 3.6, 0);
  }

  restartInjectate(): void {}

  update(elapsed: number): void {
    for (const ext of this.extensions) ext.update?.(elapsed);
    if (this.highlighted.size === 0) return;
    const pulse = 0.5 + 0.5 * Math.sin(elapsed * 4);
    for (const id of this.highlighted) {
      const entry = this.structures.get(id);
      if (!entry) continue;
      for (const tm of entry.materials) {
        if (tm.material instanceof MeshStandardMaterial) {
          tm.material.emissive.copy(tm.baseColor);
          tm.material.emissiveIntensity = tm.baseEmissive + 0.25 + 0.55 * pulse;
        } else {
          tm.material.opacity = Math.min(1, tm.baseOpacity * (1.1 + 0.6 * pulse));
        }
      }
    }
  }

  private resetHighlightMaterials(): void {
    for (const [id, entry] of this.structures) {
      if (id === 'skin') continue;
      for (const tm of entry.materials) {
        if (tm.material instanceof MeshStandardMaterial) {
          if (!this.highlighted.has(id)) tm.material.emissiveIntensity = tm.baseEmissive;
        } else if (!this.highlighted.has(id)) {
          tm.material.opacity = tm.baseOpacity;
        }
      }
    }
  }

  // ---------------------------------------------------------------- labels

  protected rebuildLabels(): void {
    for (const entry of this.structures.values()) {
      if (entry.label) {
        this.labelGroup.remove(entry.label.sprite, entry.label.line);
        disposeSprite(entry.label.sprite);
        disposeObject(entry.label.line);
        entry.label = undefined;
      }
      if (!entry.def.showLabel) continue;
      const primary = this.language === 'th' ? entry.def.nameTh : entry.def.nameEn;
      const secondary = this.language === 'th' ? entry.def.nameEn : entry.def.nameTh;
      const tex = createLabelTexture({ primary, secondary, icon: entry.def.icon, color: entry.def.color });
      if (!tex) continue;
      const sprite = new Sprite(
        new SpriteMaterial({ map: tex.texture, depthTest: false, depthWrite: false, transparent: true }),
      );
      sprite.name = `Label:${entry.def.id}`;
      sprite.userData[STRUCTURE_ID_KEY] = entry.def.id;
      sprite.renderOrder = 1000;
      sprite.scale.set(LABEL_HEIGHT * tex.aspect, LABEL_HEIGHT, 1);
      const line = new Line(
        new BufferGeometry().setFromPoints([new Vector3(), new Vector3()]),
        new LineBasicMaterial({ color: entry.def.color, transparent: true, opacity: 0.85, depthTest: false }),
      );
      line.renderOrder = 999;
      line.raycast = () => {};
      const label: LabelEntry = {
        sprite,
        line,
        anchor: entry.labelAnchor.clone(),
        position: entry.labelPosition.clone(),
      };
      entry.label = label;
      this.positionLabel(label);
      this.labelGroup.add(line, sprite);
    }
    this.onLanguageChanged();
    this.updateLabelVisibility();
  }

  /** Hook for subclasses with extra localized content (e.g. orientation gizmo). */
  protected onLanguageChanged(): void {}

  private positionLabel(label: LabelEntry): void {
    const a = label.anchor.clone().multiply(this.dims);
    const p = label.position.clone().multiply(this.dims);
    label.sprite.position.copy(p);
    label.line.geometry.setFromPoints([a, p]);
    label.line.geometry.computeBoundingSphere();
  }

  private updateLabelVisibility(): void {
    const view = this.view;
    for (const entry of this.structures.values()) {
      if (!entry.label) continue;
      const visible =
        !!view && view.labels && view.layers[entry.def.layer] && entry.group.visible;
      entry.label.sprite.visible = visible;
      entry.label.line.visible = visible;
    }
  }

  dispose(): void {
    for (const ext of this.extensions) ext.dispose?.();
    disposeObject(this.root);
    for (const t of this.ownedTextures) t.dispose();
    this.ownedTextures.clear();
  }
}

/** Sprites share one module-level geometry in three.js: dispose material/map only. */
export function disposeSprite(sprite: Sprite): void {
  sprite.material.map?.dispose();
  sprite.material.dispose();
}

export function disposeObject(root: Object3D): void {
  root.traverse((o) => {
    if ((o as Sprite).isSprite) {
      disposeSprite(o as Sprite);
      return;
    }
    const mesh = o as Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = (mesh as { material?: Material | Material[] }).material;
    const mats = mat ? (Array.isArray(mat) ? mat : [mat]) : [];
    for (const m of mats) {
      const map = (m as { map?: Texture | null }).map;
      if (map) map.dispose();
      m.dispose();
    }
  });
}
