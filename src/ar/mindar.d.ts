// Minimal typings for the parts of MindAR's image-tracking bundle we use.
// The bundle (`mind-ar/dist/mindar-image.prod.js`) has no three.js import,
// so it works with any three.js version.
declare module 'mind-ar/dist/mindar-image.prod.js' {
  export interface MindARUpdateEvent {
    type: 'updateMatrix' | 'processDone' | string;
    targetIndex?: number;
    worldMatrix?: number[] | null;
  }

  export interface ControllerOptions {
    inputWidth: number;
    inputHeight: number;
    onUpdate?: (data: MindARUpdateEvent) => void;
    debugMode?: boolean;
    maxTrack?: number;
    warmupTolerance?: number | null;
    missTolerance?: number | null;
    filterMinCF?: number | null;
    filterBeta?: number | null;
  }

  export class Controller {
    constructor(options: ControllerOptions);
    inputWidth: number;
    inputHeight: number;
    worker?: Worker;
    addImageTargetsFromBuffer(buffer: ArrayBuffer): { dimensions: [number, number][] };
    dummyRun(input: HTMLVideoElement): Promise<void>;
    processVideo(input: HTMLVideoElement): void;
    stopProcessVideo(): void;
    getProjectionMatrix(): number[];
  }

  export class Compiler {
    compileImageTargets(images: HTMLImageElement[], progress: (percent: number) => void): Promise<unknown>;
    exportData(): Uint8Array;
  }
}
