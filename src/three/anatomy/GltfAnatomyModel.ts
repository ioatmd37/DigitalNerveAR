import { Mesh, MeshStandardMaterial, Object3D, type Material } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { STRUCTURES } from '../../config/anatomy';
import type { Language, StructureId } from '../../types';
import { STRUCTURE_ID_KEY } from './AnatomyModel';
import { ProceduralFingerModel } from './ProceduralFingerModel';

const KNOWN_IDS = new Set<string>(STRUCTURES.map((s) => s.id));

/**
 * High-fidelity model adapter.
 *
 * Starts from the procedural model (so teaching overlays such as zones,
 * needle arrows, injectate and the orientation gizmo always exist), then
 * REPLACES any structure for which the GLB contains a node whose name — or
 * glTF `extras.structureId` — equals a structure id from
 * `src/config/anatomy.ts` (e.g. `nerve_radial`, `phalanx_proximal`).
 *
 * GLB requirements: right index finger, centimetres, anatomical frame
 * +X ulnar, +Y distal, +Z dorsal, finger base (web crease) at y = 0.
 */
export class GltfAnatomyModel extends ProceduralFingerModel {
  readonly source = 'gltf' as const;
  readonly replaced: StructureId[] = [];

  static async load(url: string, language: Language): Promise<GltfAnatomyModel> {
    const gltf = await new GLTFLoader().loadAsync(url);
    const model = new GltfAnatomyModel(language);
    model.adopt(gltf.scene);
    return model;
  }

  private adopt(scene: Object3D): void {
    const found = new Map<StructureId, Object3D>();
    scene.traverse((o) => {
      const tag = (o.userData?.structureId as string | undefined) ?? o.name;
      if (KNOWN_IDS.has(tag) && !found.has(tag as StructureId)) found.set(tag as StructureId, o);
    });
    for (const [id, node] of found) {
      node.parent?.remove(node);
      node.position.set(0, 0, 0);
      node.userData[STRUCTURE_ID_KEY] = id;
      // Per-structure material copies so highlighting one structure never
      // affects another that shared a material in the GLB.
      node.traverse((o) => {
        const m = o as Mesh;
        if (!m.isMesh) return;
        const clone = (mat: Material) => {
          const c = mat.clone();
          if (id === 'skin' && c instanceof MeshStandardMaterial) {
            c.transparent = true;
            c.depthWrite = false;
          }
          return c;
        };
        m.material = Array.isArray(m.material) ? m.material.map(clone) : clone(m.material);
      });
      this.replaceStructureContent(id, node);
      this.replaced.push(id);
    }
  }
}
