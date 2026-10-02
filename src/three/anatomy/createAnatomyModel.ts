import { appConfig } from '../../config/appConfig';
import type { Language } from '../../types';
import type { AnatomyModel } from './AnatomyModel';
import { FINGER, type Digit } from './layout';
import { ProceduralFingerModel } from './ProceduralFingerModel';

/**
 * Model factory. Returns the procedural model immediately; if a GLB model
 * is configured (VITE_MODEL_SOURCE=gltf) it is loaded asynchronously and
 * falls back to the procedural model on any error. The GLB describes a
 * finger, so the thumb always uses the procedural thumb model.
 */
export async function createAnatomyModel(language: Language, digit: Digit = FINGER): Promise<AnatomyModel> {
  if (appConfig.modelSource === 'gltf' && !digit.isThumb) {
    try {
      const { GltfAnatomyModel } = await import('./GltfAnatomyModel');
      return await GltfAnatomyModel.load(appConfig.modelGltfUrl, language, digit);
    } catch (err) {
      console.warn('[anatomy] GLB model failed to load; using procedural model.', err);
    }
  }
  return new ProceduralFingerModel(language, digit);
}
