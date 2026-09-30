import { DEFAULT_CALIBRATION } from '../config/appConfig';
import { calibrationEquals } from '../logic/calibration';
import { useT } from '../i18n/useT';
import { useAppStore } from '../store/useAppStore';

/** Marker tracking status: red = not detected, green = detected. Icon + text, never color alone. */
export function TrackingBadge({ kind }: { kind: 'ar' | 'explorer' }) {
  const { t } = useT();
  const status = useAppStore((s) => s.trackingStatus);
  if (kind === 'explorer') {
    return (
      <span className="chip bg-slate-700/90 text-slate-100">
        <span aria-hidden>◇</span>
        {t('tracking.explorer')}
      </span>
    );
  }
  const map = {
    idle: { cls: 'bg-slate-600 text-white', icon: '○', text: t('tracking.idle') },
    loading: { cls: 'bg-slate-600 text-white', icon: '…', text: t('tracking.loading') },
    searching: { cls: 'bg-rose-600 text-white', icon: '✕', text: t('tracking.searching') },
    lost: { cls: 'bg-rose-600 text-white', icon: '✕', text: t('tracking.lost') },
    tracking: { cls: 'bg-emerald-500 text-slate-950', icon: '✓', text: t('tracking.tracking') },
    error: { cls: 'bg-rose-800 text-white', icon: '!', text: t('tracking.error') },
  }[status];
  return (
    <span className={`chip ${map.cls}`} role="status" aria-live="polite">
      <span aria-hidden className="font-black">
        {map.icon}
      </span>
      {map.text}
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
  const text = { default: t('calibration.default'), saved: t('calibration.saved'), unsaved: t('calibration.unsaved') }[
    state
  ];
  return (
    <span
      className={`chip ${state === 'unsaved' ? 'bg-amber-500 text-slate-950' : 'bg-slate-700/90 text-slate-100'}`}
      title={t('calibration.available')}
    >
      <span aria-hidden>⌖</span>
      {t('calibration.title')}: {text}
    </span>
  );
}
