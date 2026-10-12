import { DEFAULT_CALIBRATION } from '../config/appConfig';
import { calibrationEquals } from '../logic/calibration';
import { useT } from '../i18n/useT';
import { useAppStore } from '../store/useAppStore';
import type { TrackingStatus } from '../types';

function Dot({ className }: { className: string }) {
  return <span className={`h-2 w-2 shrink-0 rounded-full ${className}`} aria-hidden />;
}

/** Tracking status as text with a coloured dot (red = not found, amber = needs adjusting, green = tracking). */
export function TrackingBadge({ kind }: { kind: 'ar' | 'explorer' }) {
  const { t } = useT();
  const status = useAppStore((s) => s.trackingStatus);
  const angle = useAppStore((s) => s.trackingAngle);
  const source = useAppStore((s) => s.trackingSource);
  if (kind === 'explorer') {
    return (
      <span className="flex items-center gap-1.5 text-slate-400">
        <Dot className="bg-slate-500" />
        {t('tracking.explorer')}
      </span>
    );
  }
  const hand = source === 'hand';
  const map: Record<TrackingStatus, [string, string, string]> = {
    idle: ['bg-slate-500', 'text-slate-400', t('tracking.idle')],
    loading: ['bg-slate-400 animate-pulse', 'text-slate-300', t('tracking.loading')],
    searching: ['bg-rose-500', 'text-rose-300', hand ? t('tracking.handSearching') : t('tracking.searching')],
    lost: ['bg-rose-500', 'text-rose-300', hand ? t('tracking.handSearching') : t('tracking.lost')],
    tracking: ['bg-emerald-500', 'text-emerald-300', hand ? t('tracking.handTracking') : t('tracking.tracking')],
    error: ['bg-rose-600', 'text-rose-300', t('tracking.error')],
    partial: ['bg-amber-400', 'text-amber-300', t('tracking.handPartial')],
    tilted: ['bg-amber-400', 'text-amber-300', t('tracking.handTilted')],
  };
  const [dot, tone, text] = map[status];
  const showAngle = hand && angle !== null && (status === 'tracking' || status === 'tilted');
  return (
    <span className={`flex items-center gap-1.5 font-medium ${tone}`} role="status" aria-live="polite">
      <Dot className={dot} />
      {text}
      {showAngle && <span className="num font-normal text-slate-400">· {t('tracking.angle', { angle: Math.round(angle) })}</span>}
    </span>
  );
}

export function CalibrationBadge() {
  const { t } = useT();
  const calibration = useAppStore((s) => s.calibration);
  const saved = useAppStore((s) => s.savedCalibration);
  const state = saved
    ? calibrationEquals(calibration, saved)
      ? 'saved'
      : 'unsaved'
    : calibrationEquals(calibration, DEFAULT_CALIBRATION)
      ? 'default'
      : 'unsaved';
  const text = { default: t('calibration.default'), saved: t('calibration.saved'), unsaved: t('calibration.unsaved') }[state];
  return (
    <span className={state === 'unsaved' ? 'text-amber-300' : 'text-slate-400'} title={t('calibration.available')}>
      {t('calibration.title')}: {text}
    </span>
  );
}
