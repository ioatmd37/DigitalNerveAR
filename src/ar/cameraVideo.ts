import type { TrackerErrorKind } from './MarkerTracker';

export class CameraError extends Error {
  constructor(
    readonly kind: TrackerErrorKind,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Open the rear camera into a <video> appended to `container` (behind the
 * WebGL canvas). Frames stay on this device. Throws CameraError.
 */
export async function openCameraVideo(
  container: HTMLElement,
  opts: { highResolution?: boolean; isStopped: () => boolean },
): Promise<HTMLVideoElement | null> {
  if (!window.isSecureContext) throw new CameraError('insecure', 'Camera requires a secure context (HTTPS or localhost).');
  if (!navigator.mediaDevices?.getUserMedia) throw new CameraError('no-camera', 'getUserMedia is not available.');

  const video = document.createElement('video');
  video.setAttribute('autoplay', '');
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.muted = true;
  // maxWidth/maxHeight: CSS resets (e.g. Tailwind preflight) clamp videos to
  // 100% width, which would break cover-fit sizing.
  Object.assign(video.style, { position: 'absolute', left: '0', top: '0', zIndex: '0', maxWidth: 'none', maxHeight: 'none' });
  container.appendChild(video);

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: opts.highResolution ? 1920 : 1280 },
        height: { ideal: opts.highResolution ? 1080 : 720 },
      },
    });
  } catch (err) {
    const name = (err as DOMException)?.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      video.remove();
      throw new CameraError('permission', 'Camera permission denied.');
    }
    try {
      // Retry with the loosest constraints (e.g. OverconstrainedError on some webcams).
      stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
    } catch (err2) {
      video.remove();
      const n2 = (err2 as DOMException)?.name;
      if (n2 === 'NotAllowedError') throw new CameraError('permission', 'Camera permission denied.');
      throw new CameraError('no-camera', `No usable camera (${n2 ?? 'unknown'}).`);
    }
  }
  if (opts.isStopped()) {
    stream.getTracks().forEach((t) => t.stop());
    video.remove();
    return null;
  }
  await new Promise<void>((resolve) => {
    video.addEventListener('loadedmetadata', () => resolve(), { once: true });
    video.srcObject = stream;
  });
  await video.play().catch(() => undefined);
  video.width = video.videoWidth;
  video.height = video.videoHeight;
  return video;
}

export function closeCameraVideo(video: HTMLVideoElement | null): void {
  const stream = video?.srcObject as MediaStream | null;
  stream?.getTracks().forEach((t) => t.stop());
  video?.remove();
}

/** Cover-fit a video into a container; returns the displayed size. */
export function coverFitVideo(video: HTMLVideoElement, cw: number, ch: number): { vw: number; vh: number } {
  const videoRatio = video.videoWidth / video.videoHeight;
  let vw: number;
  let vh: number;
  if (videoRatio > cw / ch) {
    vh = ch;
    vw = vh * videoRatio;
  } else {
    vw = cw;
    vh = vw / videoRatio;
  }
  Object.assign(video.style, { top: `${-(vh - ch) / 2}px`, left: `${-(vw - cw) / 2}px`, width: `${vw}px`, height: `${vh}px` });
  return { vw, vh };
}
