import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { Raycaster, Vector2 } from 'three';
import { appConfig } from '../config/appConfig';
import { useAnatomyModel } from '../hooks/useAnatomyModel';
import { useHandRig } from '../hooks/useHandRig';
import { useViewState } from '../hooks/useViewState';
import { useT } from '../i18n/useT';
import { useAppStore } from '../store/useAppStore';
import type { MarkerTracker, TrackerErrorKind } from './MarkerTracker';
import { loadTargetBuffer, TargetLoadError } from './targetStore';

type Phase = 'loading' | 'camera' | 'running' | 'error';

interface ARViewProps {
  frozen: boolean;
  onOpenExplorer: () => void;
}

/**
 * Camera AR view. MindAR (lazy-loaded) tracks the printed marker; the same
 * anatomy model as the Explorer is attached to the marker anchor through
 * the calibration transform:
 *
 *   anchor (1 unit = marker width) → markerSpace (cm) → hand → finger → model
 */
const RIG_OPTIONS = { markerUnits: true, showContext: false };
export function ARView({ frozen, onOpenExplorer }: ARViewProps) {
  const { t } = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const trackerRef = useRef<MarkerTracker | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [errorKind, setErrorKind] = useState<TrackerErrorKind | null>(null);
  const [customTarget, setCustomTarget] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const model = useAnatomyModel();
  const rig = useHandRig(model, RIG_OPTIONS);
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
        const [{ MarkerTracker }, target] = await Promise.all([import('./MarkerTracker'), loadTargetBuffer()]);
        if (cancelled) return;
        setCustomTarget(target.custom);
        const tracker = new MarkerTracker(container, {
          ...appConfig.tracking,
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

    return () => {
      cancelled = true;
      trackerRef.current?.stop();
      trackerRef.current = null;
      rig.markerSpace.parent?.remove(rig.markerSpace);
      setTrackingStatus('idle');
    };
  }, [model, rig, attempt, setTrackingStatus]);

  useEffect(() => {
    if (rig) rig.markerOutline.visible = activeTab === 'calibration';
  }, [rig, activeTab, phase]);

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
      selectStructure(model.pick(ray.intersectObject(model.root, true)));
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
          <div className="rounded-2xl bg-slate-900/85 px-5 py-4 text-center text-slate-100 shadow-xl">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
            <p className="text-base">{phase === 'loading' ? t('ar.loadingTracker') : t('ar.requesting')}</p>
          </div>
        </div>
      )}
      {phase === 'error' && errorKind && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="max-w-md rounded-2xl bg-slate-900/95 p-6 text-slate-100 shadow-2xl" role="alert">
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
        <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-slate-900/70 px-3 py-1 text-xs text-slate-200">
          {t('ar.customMarker')}
        </div>
      )}
    </div>
  );
}
