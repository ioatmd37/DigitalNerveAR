import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { Raycaster, Vector2 } from 'three';
import { appConfig } from '../config/appConfig';
import { useAnatomyModel } from '../hooks/useAnatomyModel';
import { useHandRig } from '../hooks/useHandRig';
import { placeNeedleAt } from '../hooks/useNeedle';
import { usesNeedle } from '../logic/needle';
import { useViewState } from '../hooks/useViewState';
import { useT } from '../i18n/useT';
import { useAppStore } from '../store/useAppStore';
import { digitFor } from '../three/anatomy/layout';
import type { HandTracker } from './HandTracker';
import type { MarkerTracker, TrackerErrorKind } from './MarkerTracker';
import { assetUrl } from '../utils/assets';
import { loadTargetBuffer, TargetLoadError } from './targetStore';

type Phase = 'loading' | 'camera' | 'running' | 'error';

interface ARViewProps {
  frozen: boolean;
  onOpenExplorer: () => void;
}

/**
 * Camera AR view with two ways to find the mannequin hand (lazy-loaded):
 *
 *  - Hand detection (default): MediaPipe Hand Landmarker finds the hand; the
 *    overlay appears only when the thumb, index and little finger are in view
 *    and the hand is within 45–135° of facing the camera (lateral tilt ≤ 45°).
 *      anchor (camera space, cm) → hand (tracked) → finger (tracked) → model
 *  - Marker sticker (fallback): MindAR tracks the printed marker, and the
 *    calibration transform places the hand.
 *      anchor (1 unit = marker width) → markerSpace (cm) → hand → finger → model
 */
const MARKER_RIG = { markerUnits: true, showContext: false };
const HAND_RIG = { markerUnits: false, showContext: false, tracked: true };
export function ARView({ frozen, onOpenExplorer }: ARViewProps) {
  const { t } = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const trackerRef = useRef<MarkerTracker | HandTracker | null>(null);
  const source = useAppStore((s) => s.trackingSource);
  const [phase, setPhase] = useState<Phase>('loading');
  const [errorKind, setErrorKind] = useState<TrackerErrorKind | null>(null);
  const [customTarget, setCustomTarget] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const model = useAnatomyModel();
  const rig = useHandRig(model, source === 'hand' ? HAND_RIG : MARKER_RIG);
  const view = useViewState();
  const activeTab = useAppStore((s) => s.activeTab);
  const setTrackingStatus = useAppStore((s) => s.setTrackingStatus);
  const selectStructure = useAppStore((s) => s.selectStructure);

  // Start / stop the tracker.
  useEffect(() => {
    if (!model || !rig || !containerRef.current) return;
    let cancelled = false;
    const container = containerRef.current;
    setPhase('loading');
    setErrorKind(null);
    setTrackingStatus('loading');

    (async () => {
      try {
        if (!window.isSecureContext) throw Object.assign(new Error('insecure'), { kind: 'insecure' });
        if (source === 'hand') {
          await startHandTracking();
          return;
        }
        const [{ MarkerTracker }, target] = await Promise.all([import('./MarkerTracker'), loadTargetBuffer()]);
        if (cancelled) return;
        setCustomTarget(target.custom);
        const tracker = new MarkerTracker(container, {
          ...appConfig.tracking,
          highResolution: useAppStore.getState().calibration.markerSizeCm <= appConfig.smallMarkerCm,
          onTrackingChange: (tracking) => setTrackingStatus(tracking ? 'tracking' : 'lost'),
        });
        trackerRef.current = tracker;

        tracker.anchor.add(rig.markerSpace);

        setPhase('camera');
        await tracker.start(target.buffer);
        if (cancelled) return;
        setPhase('running');
        setTrackingStatus('searching');
        const start = performance.now();
        tracker.setAnimationLoop(() => {
          model.update((performance.now() - start) / 1000);
          tracker.render();
        });
      } catch (err) {
        if (cancelled) return;
        const kind: TrackerErrorKind =
          err instanceof TargetLoadError
            ? 'target'
            : ((err as { kind?: TrackerErrorKind }).kind ?? 'unknown');
        console.error('[AR] start failed', err);
        setErrorKind(kind);
        setPhase('error');
        setTrackingStatus('error');
      }
    })();

    /** Markerless: detect the hand, gate the overlay on the border digits and the lateral angle. */
    async function startHandTracking() {
      const [{ HandTracker }, pose] = await Promise.all([import('./HandTracker'), import('../logic/handPose')]);
      if (cancelled || !model || !rig) return;
      const cfg = appConfig.handTracking;
      const gate = new pose.ViewAngleGate(cfg.minViewDeg, cfg.maxViewDeg);
      const handSmooth = new pose.PoseSmoother(cfg.smoothing);
      const fingerSmooth = new pose.PoseSmoother(cfg.smoothing);
      let length = 0;
      let lastStatus = '';
      let lastAngle = -1;
      const report = (status: 'searching' | 'partial' | 'tilted' | 'tracking', angle: number | null) => {
        const a = angle === null ? null : Math.round(angle);
        if (status === lastStatus && a === lastAngle) return;
        lastStatus = status;
        lastAngle = a ?? -1;
        setTrackingStatus(status, a);
      };
      const tracker = new HandTracker(container, {
        modelUrl: assetUrl(cfg.modelUrl),
        cameraFovLongDeg: cfg.cameraFovLongDeg,
        onFrame: (obs, cam) => {
          const hide = () => {
            tracker.anchor.visible = false;
            handSmooth.reset();
            fingerSmooth.reset();
            length = 0;
          };
          if (!obs) {
            gate.reset();
            hide();
            report('searching', null);
            return;
          }
          const angle = pose.lateralViewAngle(obs.world, obs.image, cam);
          if (!pose.borderDigitsInView(obs.image)) {
            hide();
            report('partial', angle);
            return;
          }
          if (!gate.update(angle)) {
            hide();
            report('tilted', angle);
            return;
          }
          const { calibration, selectedFinger } = useAppStore.getState();
          const f = calibration.fingers[selectedFinger];
          // Width is not visible in the image: keep the calibrated proportions of the digit.
          const widthCm = length ? (f.widthCm * length) / f.lengthCm : f.widthCm;
          const p = pose.estimateHandPose(obs, cam, selectedFinger, digitFor(selectedFinger), {
            widthCm,
            rollDeg: f.rollDeg ?? 0,
            offset: f.offset,
          });
          length = length ? length + (p.lengthCm - length) * cfg.smoothing : p.lengthCm;
          rig.applyTrackedPose(handSmooth.smooth(p.hand), fingerSmooth.smooth(p.fingerLocal), length, (f.widthCm * length) / f.lengthCm, selectedFinger);
          tracker.anchor.visible = true;
          report('tracking', angle);
        },
      });
      trackerRef.current = tracker;
      tracker.anchor.add(rig.markerSpace);
      setPhase('camera');
      await tracker.start();
      if (cancelled) return;
      setPhase('running');
      setTrackingStatus('searching', null);
      const start = performance.now();
      tracker.setAnimationLoop(() => {
        tracker.detect();
        model.update((performance.now() - start) / 1000);
        tracker.render();
      });
    }

    return () => {
      cancelled = true;
      trackerRef.current?.stop();
      trackerRef.current = null;
      rig.markerSpace.parent?.remove(rig.markerSpace);
      setTrackingStatus('idle', null);
    };
  }, [model, rig, attempt, source, setTrackingStatus]);

  useEffect(() => {
    if (rig) rig.markerOutline.visible = source === 'marker' && activeTab === 'calibration';
  }, [rig, activeTab, phase, source]);

  useEffect(() => {
    trackerRef.current?.setFrozen(frozen);
  }, [frozen, phase]);

  // Tap-to-label.
  const down = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: PointerEvent) => {
    down.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = useCallback(
    (e: PointerEvent) => {
      const start = down.current;
      down.current = null;
      const tracker = trackerRef.current;
      if (!start || !tracker || !model || !view.interactive || !tracker.anchor.visible) return;
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 12) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const ndc = new Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      const ray = new Raycaster();
      ray.setFromCamera(ndc, tracker.camera);
      ray.camera = tracker.camera;
      tracker.scene.updateMatrixWorld();
      const hits = ray.intersectObject(model.root, true);
      if (usesNeedle(useAppStore.getState().mode)) {
        const p = model.pickSkinPoint(hits);
        if (p) placeNeedleAt(p);
        return;
      }
      selectStructure(model.pick(hits));
    },
    [model, view.interactive, selectStructure],
  );

  const errorText: Record<TrackerErrorKind, string> = {
    insecure: t('ar.errInsecure'),
    'no-camera': t('ar.errNoCamera'),
    permission: t('ar.errPermission'),
    target: t('ar.errTarget'),
    unknown: t('ar.errUnknown'),
  };

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <div
        ref={containerRef}
        className="absolute inset-0 isolate"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      />
      {(phase === 'loading' || phase === 'camera') && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
          <div className="rounded-2xl bg-slate-900/85 px-5 py-4 text-center text-slate-100">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
            <p className="text-base">{phase === 'loading' ? t('ar.loadingTracker') : t('ar.requesting')}</p>
          </div>
        </div>
      )}
      {phase === 'error' && errorKind && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="max-w-md rounded-2xl bg-slate-900/95 p-6 text-slate-100" role="alert">
            <h2 className="mb-2 text-xl font-bold text-rose-300">{t('ar.errorTitle')}</h2>
            <p className="mb-5 leading-relaxed">{errorText[errorKind]}</p>
            <div className="flex flex-wrap gap-3">
              <button className="btn btn-primary" onClick={() => setAttempt((a) => a + 1)}>
                {t('ar.retry')}
              </button>
              <button className="btn btn-secondary" onClick={onOpenExplorer}>
                {t('ar.useExplorer')}
              </button>
            </div>
          </div>
        </div>
      )}
      {phase === 'running' && customTarget && (
        <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 portrait:top-28 rounded-full bg-slate-900/70 px-3 py-1 text-xs text-slate-200">
          {t('ar.customMarker')}
        </div>
      )}
    </div>
  );
}
