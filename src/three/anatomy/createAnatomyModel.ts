import { appConfig } from '../../config/appConfig';
import type { Language } from '../../types';
import type { AnatomyModel } from './AnatomyModel';
import { ProceduralFingerModel } from './ProceduralFingerModel';

/**
 * Model factory. Returns the procedural model immediately; if a GLB model
 * is configured (VITE_MODEL_SOURCE=gltf) it is loaded asynchronously and
 * falls back to the procedural model on any error.
 */
export async function createAnatomyModel(language: Language): Promise<AnatomyModel> {
  if (appConfig.modelSource === 'gltf') {
    try {
      const { GltfAnatomyModel } = await import('./GltfAnatomyModel');
      return await GltfAnatomyModel.load(appConfig.modelGltfUrl, language);
    } catch (err) {
      console.warn('[anatomy] GLB model failed to load; using procedural model.', err);
    }
  }
  return new ProceduralFingerModel(language);
}
