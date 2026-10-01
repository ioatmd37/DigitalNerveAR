import {
  AmbientLight,
  DirectionalLight,
  Group,
  Matrix4,
  PerspectiveCamera,
  Quaternion,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import { Controller, type MindARUpdateEvent } from 'mind-ar/dist/mindar-image.prod.js';

export type TrackerErrorKind = 'insecure' | 'no-camera' | 'permission' | 'target' | 'unknown';

export class TrackerError extends Error {
  constructor(
    readonly kind: TrackerErrorKind,
    message: string,
  ) {
    super(message);
  }
}

export interface TrackerOptions {
  filterMinCF: number;
  filterBeta: number;
  warmupTolerance: number;
  missTolerance: number;
  /** Request 1920×1080 instead of 1280×720 (for very small markers; costs more CPU/GPU). */
  highResolution?: boolean;
  onTrackingChange: (tracking: boolean) => void;
}

/**
 * Marker tracking + rendering for AR, adapted from MindAR's `MindARThree`
 * (which is incompatible with current three.js releases).
 *
 * All processing is local: the camera stream goes to a <video> element and
 * MindAR's TensorFlow.js/WebGL pipeline in this browser. Nothing is uploaded.
 *
 * `anchor` follows the marker. Its local frame: origin at the marker centre,
 * +X marker right, +Y marker top, +Z out of the marker, 1 unit = marker width.
 */
export class MarkerTracker {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera();
  readonly renderer: WebGLRenderer;
  readonly anchor = new Group();

  private video: HTMLVideoElement | null = null;
  private controller: Controller | null = null;
  private postMatrix = new Matrix4();
  private tracking = false;
  private frozen = false;
  private stopped = false;
  private readonly onResize = () => this.resize();

  constructor(
    private readonly container: HTMLElement,
    private readonly options: TrackerOptions,
  ) {
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    const canvas = this.renderer.domElement;
    Object.assign(canvas.style, { position: 'absolute', left: '0', top: '0', zIndex: '1', touchAction: 'none' });
    container.appendChild(canvas);

    this.anchor.matrixAutoUpdate = false;
    this.anchor.visible = false;
    this.scene.add(this.anchor);
    this.scene.add(new AmbientLight(0xffffff, 1.2));
    const key = new DirectionalLight(0xffffff, 1.6);
    key.position.set(0.5, 1, 1.5);
    this.scene.add(key);

    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onResize);
  }

  get isTracking(): boolean {
    return this.tracking;
  }

  /** Keep the overlay at its last pose even if the marker is lost/occluded. */
  setFrozen(frozen: boolean): void {
    this.frozen = frozen;
    if (frozen && this.anchor.matrix.determinant() !== 0) {
      this.anchor.visible = true;
    } else if (!frozen) {
      this.anchor.visible = this.tracking;
    }
  }

  async start(targetBuffer: ArrayBuffer): Promise<void> {
    if (!window.isSecureContext) {
      throw new TrackerError('insecure', 'Camera requires a secure context (HTTPS or localhost).');
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new TrackerError('no-camera', 'getUserMedia is not available.');
    }
    await this.startVideo();
    if (this.stopped) return;
    await this.startTracking(targetBuffer);
  }

  private async startVideo(): Promise<void> {
    const video = document.createElement('video');
    video.setAttribute('autoplay', '');
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.muted = true;
    // maxWidth/maxHeight: CSS resets (e.g. Tailwind preflight) clamp videos to
    // 100% width, which would break the cover-fit sizing in resize().
    Object.assign(video.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      zIndex: '0',
      maxWidth: 'none',
      maxHeight: 'none',
    });
    this.container.appendChild(video);
    this.video = video;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: this.options.highResolution ? 1920 : 1280 },
          height: { ideal: this.options.highResolution ? 1080 : 720 },
        },
      });
    } catch (err) {
      const name = (err as DOMException)?.name;
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        throw new TrackerError('permission', 'Camera permission denied.');
      }
      try {
        // Retry with the loosest constraints (e.g. OverconstrainedError on some webcams).
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
      } catch (err2) {
        const n2 = (err2 as DOMException)?.name;
        if (n2 === 'NotAllowedError') throw new TrackerError('permission', 'Camera permission denied.');
        throw new TrackerError('no-camera', `No usable camera (${n2 ?? 'unknown'}).`);
      }
    }
    if (this.stopped) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    await new Promise<void>((resolve) => {
      video.addEventListener('loadedmetadata', () => resolve(), { once: true });
      video.srcObject = stream;
    });
    await video.play().catch(() => undefined);
    video.width = video.videoWidth;
    video.height = video.videoHeight;
  }

  private async startTracking(targetBuffer: ArrayBuffer): Promise<void> {
    const video = this.video!;
    const controller = new Controller({
      inputWidth: video.videoWidth,
      inputHeight: video.videoHeight,
      maxTrack: 1,
      filterMinCF: this.options.filterMinCF,
      filterBeta: this.options.filterBeta,
      warmupTolerance: this.options.warmupTolerance,
      missTolerance: this.options.missTolerance,
      onUpdate: (data) => this.handleUpdate(data),
    });
    this.controller = controller;

    let dimensions: [number, number][];
    try {
      ({ dimensions } = controller.addImageTargetsFromBuffer(targetBuffer));
    } catch (err) {
      throw new TrackerError('target', `Invalid marker target file: ${(err as Error).message}`);
    }
    if (!dimensions?.length) throw new TrackerError('target', 'Marker target file contains no targets.');

    // Same post-transform as MindARThree: origin at marker centre, 1 unit = marker width.
    const [w, h] = dimensions[0];
    this.postMatrix.compose(new Vector3(w / 2, w / 2 + (h - w) / 2, 0), new Quaternion(), new Vector3(w, w, w));

    this.resize();
    await controller.dummyRun(video);
    if (this.stopped) return;
    controller.processVideo(video);
  }

  private handleUpdate(data: MindARUpdateEvent): void {
    if (data.type !== 'updateMatrix' || data.targetIndex !== 0) return;
    const found = data.worldMatrix != null;
    if (found && !this.frozen) {
      const m = new Matrix4().fromArray(data.worldMatrix as number[]);
      m.multiply(this.postMatrix);
      this.anchor.matrix.copy(m);
      this.anchor.matrixWorldNeedsUpdate = true;
    }
    this.anchor.visible = found || this.frozen;
    if (found !== this.tracking) {
      this.tracking = found;
      this.options.onTrackingChange(found);
    }
  }

  setAnimationLoop(callback: ((time: number) => void) | null): void {
    this.renderer.setAnimationLoop(callback);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  /** Match the camera frustum to MindAR's projection and cover-fit the video. */
  resize(): void {
    const { container, video, controller, camera, renderer } = this;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    renderer.setSize(cw, ch);
    if (!video || !controller || !video.videoWidth) return;

    const videoRatio = video.videoWidth / video.videoHeight;
    const containerRatio = cw / ch;
    let vw: number;
    let vh: number;
    if (videoRatio > containerRatio) {
      vh = ch;
      vw = vh * videoRatio;
    } else {
      vw = cw;
      vh = vw / videoRatio;
    }

    const proj = controller.getProjectionMatrix();
    const inputRatio = controller.inputWidth / controller.inputHeight;
    const inputAdjust =
      inputRatio > containerRatio ? video.width / controller.inputWidth : video.height / controller.inputHeight;
    let videoDisplayHeight: number;
    if (inputRatio > containerRatio) {
      videoDisplayHeight = ch * inputAdjust;
    } else {
      videoDisplayHeight = (cw / controller.inputWidth) * controller.inputHeight * inputAdjust;
    }
    const fovAdjust = ch / videoDisplayHeight;
    camera.fov = (2 * Math.atan((1 / proj[5]) * fovAdjust) * 180) / Math.PI;
    camera.near = proj[14] / (proj[10] - 1.0);
    camera.far = proj[14] / (proj[10] + 1.0);
    camera.aspect = cw / ch;
    camera.updateProjectionMatrix();

    Object.assign(video.style, {
      top: `${-(vh - ch) / 2}px`,
      left: `${-(vw - cw) / 2}px`,
      width: `${vw}px`,
      height: `${vh}px`,
    });
  }

  stop(): void {
    this.stopped = true;
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('orientationchange', this.onResize);
    this.renderer.setAnimationLoop(null);
    try {
      this.controller?.stopProcessVideo();
      this.controller?.worker?.terminate();
    } catch {
      // Controller may not be fully initialised.
    }
    const stream = this.video?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    this.video?.remove();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.controller = null;
    this.video = null;
  }
}
