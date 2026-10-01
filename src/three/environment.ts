import { PMREMGenerator, type Scene, type WebGLRenderer } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * Soft studio-style image-based lighting generated locally (no HDR
 * download), so physical materials (skin sheen, glossy vessels, nail)
 * read realistically in both the Explorer and AR.
 */
export function applyRoomEnvironment(renderer: WebGLRenderer, scene: Scene, intensity = 0.55): () => void {
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const env = pmrem.fromScene(room, 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = intensity;
  room.dispose?.();
  return () => {
    if (scene.environment === env) scene.environment = null;
    env.dispose();
    pmrem.dispose();
  };
}
