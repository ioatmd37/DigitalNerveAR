import { HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision';
import wasmBinaryPath from '@mediapipe/tasks-vision/vision_wasm_internal.wasm?url';
import wasmLoaderPath from '@mediapipe/tasks-vision/vision_wasm_internal.js?url';
import {
  ACESFilmicToneMapping,
  AmbientLight,
  DirectionalLight,
  Group,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import { focalFromFov, type CameraIntrinsics, type HandObservation } from '../logic/handPose';
import { applyRoomEnvironment } from '../three/environment';
import { CameraError, closeCameraVideo, coverFitVideo, openCameraVideo } from './cameraVideo';
import { TrackerError } from './MarkerTracker';

export interface HandTrackerOptions {
  /** URL of the MediaPipe hand_landmarker.task model. */
  modelUrl: string;
  /** Field of view across the LONG side of the camera image, degrees (phone main cameras ≈ 60–70°). */
  cameraFovLongDeg: number;
  /** Called for every processed frame: the hand observation, or null when no hand is found. */
  onFrame: (obs: HandObservation | null, intrinsics: CameraIntrinsics) => void;
}

/**
 * Markerless AR: the rear camera feeds MediaPipe Hand Landmarker (WASM/WebGL,
 * all on this device; nothing is uploaded), and the overlay is drawn with a
 * pinhole camera matched to the video. `anchor` lives in camera space (cm):
 * the caller places the hand rig inside it from each observation.
 */
export class HandTracker {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(50, 1, 0.5, 500);
  readonly renderer: WebGLRenderer;
  /** Camera-space group (cm) that carries the overlay. */
  readonly anchor = new Group();

  private video: HTMLVideoElement | null = null;
  private landmarker: HandLandmarker | null = null;
  private intrinsics: CameraIntrinsics = { width: 1, height: 1, focal: 1 };
  private lastVideoTime = -1;
  private frozen = false;
  private stopped = false;
  private readonly onResize = () => this.resize();
  private readonly resizeObserver = new ResizeObserver(this.onResize);
  private readonly disposeEnvironment: () => void;

  constructor(
    private readonly container: HTMLElement,
    private readonly options: HandTrackerOptions,
  ) {
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.disposeEnvironment = applyRoomEnvironment(this.renderer, this.scene, 0.6);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    const canvas = this.renderer.domElement;
    Object.assign(canvas.style, { position: 'absolute', left: '0', top: '0', zIndex: '1', touchAction: 'none' });
    container.appendChild(canvas);

    this.anchor.visible = false;
    this.scene.add(this.anchor);
    this.scene.add(new AmbientLight(0xffffff, 0.6));
    const key = new DirectionalLight(0xffffff, 1.6);
    key.position.set(0.5, 1, 1.5);
    this.scene.add(key);

    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onResize);
    this.resizeObserver.observe(container);
  }

  /** Keep the overlay at its last pose even if the hand is lost. */
  setFrozen(frozen: boolean): void {
    this.frozen = frozen;
  }

  get isFrozen(): boolean {
    return this.frozen;
  }

  async start(): Promise<void> {
    // Load the model while the camera starts.
    const landmarkerPromise = HandLandmarker.createFromOptions(
      { wasmLoaderPath, wasmBinaryPath },
      {
        baseOptions: { modelAssetPath: this.options.modelUrl, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      },
    ).catch((err: unknown) => {
      throw new TrackerError('target', `Hand model failed to load: ${(err as Error)?.message ?? err}`);
    });
    try {
      this.video = await openCameraVideo(this.container, { isStopped: () => this.stopped });
    } catch (err) {
      landmarkerPromise.then((l) => l.close()).catch(() => undefined);
      if (err instanceof CameraError) throw new TrackerError(err.kind, err.message);
      throw err;
    }
    const landmarker = await landmarkerPromise;
    if (this.stopped || !this.video) {
      landmarker.close();
      return;
    }
    this.landmarker = landmarker;
    const { videoWidth: w, videoHeight: h } = this.video;
    this.intrinsics = { width: w, height: h, focal: focalFromFov(w, h, this.options.cameraFovLongDeg) };
    this.resize();
  }

  /** Run detection on the newest video frame (call once per animation frame). */
  detect(): void {
    const { video, landmarker } = this;
    if (!video || !landmarker || this.stopped || video.readyState < 2) return;
    if (video.currentTime === this.lastVideoTime) return;
    this.lastVideoTime = video.currentTime;
    let result: HandLandmarkerResult;
    try {
      result = landmarker.detectForVideo(video, performance.now());
    } catch (err) {
      console.warn('[AR] hand detection failed', err);
      return;
    }
    if (this.frozen) return;
    const image = result.landmarks?.[0];
    const world = result.worldLandmarks?.[0];
    this.options.onFrame(image && world ? { image, world } : null, this.intrinsics);
  }

  setAnimationLoop(callback: ((time: number) => void) | null): void {
    this.renderer.setAnimationLoop(callback);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  /** Match the render camera to the cover-fitted video. */
  resize(): void {
    const cw = this.container.clientWidth;
    const ch = this.container.clientHeight;
    this.renderer.setSize(cw, ch);
    const video = this.video;
    if (!video || !video.videoWidth) return;
    const { vh } = coverFitVideo(video, cw, ch);
    const k = vh / video.videoHeight; // display pixels per video pixel
    this.camera.fov = (2 * Math.atan(ch / 2 / (this.intrinsics.focal * k)) * 180) / Math.PI;
    this.camera.aspect = cw / ch;
    this.camera.updateProjectionMatrix();
  }

  stop(): void {
    this.stopped = true;
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('orientationchange', this.onResize);
    this.resizeObserver.disconnect();
    this.renderer.setAnimationLoop(null);
    this.landmarker?.close();
    this.landmarker = null;
    closeCameraVideo(this.video);
    this.video = null;
    this.disposeEnvironment();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
