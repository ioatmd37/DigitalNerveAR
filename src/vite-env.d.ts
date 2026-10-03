/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_INSTRUCTOR_PASSCODE?: string;
  readonly VITE_MARKER_TARGET_URL?: string;
  readonly VITE_MARKER_SIZE_CM?: string;
  readonly VITE_MODEL_SOURCE?: 'procedural' | 'gltf';
  readonly VITE_MODEL_GLTF_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Injected by Vite `define` from package.json. */
declare const __APP_VERSION__: string;
declare const __BUILD_SHA__: string;
declare const __BUILD_TIME__: string;
