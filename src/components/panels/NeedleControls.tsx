import { useNeedleEvaluation } from '../../hooks/useNeedle';
import { useT } from '../../i18n/useT';
import { MAX_DEPTH_CM, statusLevel, type NeedleStatus } from '../../logic/needle';
import { useAppStore } from '../../store/useAppStore';
import { Slider } from '../Slider';

const LEVEL_STYLE = {
  neutral: { box: 'bg-slate-800 border-slate-600', icon: '•' },
  good: { box: 'bg-emerald-950/70 border-emerald-500', icon: '✓' },
  caution: { box: 'bg-amber-950/70 border-amber-500', icon: '!' },
  danger: { box: 'bg-rose-950/70 border-rose-500', icon: '✕' },
} as const;

/** Live model feedback for the virtual needle (shared by Needle Practice and the OSCE station). */
export function NeedleStatusCard() {
  const { t, td } = useT();
  const n = useAppStore((s) => s.needle);
  const e = useNeedleEvaluation();
  const level = statusLevel(e.tipStatus);
  const statusText = (s: NeedleStatus) => td(`needle.status.${s}`);
  // Path findings other than the one already shown for the tip.
  const pathOnly = e.pathEvents.filter((s) => s !== e.tipStatus);
  return (
    <div className={`rounded-2xl p-3 border ${LEVEL_STYLE[level].box}`} role="status" aria-live="polite">
      <p className="text-xs font-semibold text-slate-400">{t('needle.tip')}</p>
      <p className="flex items-start gap-2 text-base font-bold text-white">
        <span aria-hidden>{LEVEL_STYLE[level].icon}</span>
        {statusText(e.tipStatus)}
      </p>
      <p className={`mt-1 text-sm ${e.entryOk ? 'text-emerald-300' : 'text-amber-300'}`}>
        {e.entryOk ? `✓ ${t('needle.entryOk')}` : `! ${t('needle.entryOut')}`}
      </p>
      {pathOnly.length > 0 && (
        <p className="mt-1 text-sm text-rose-300">
          ✕ {t('needle.pathWarning', { list: pathOnly.map(statusText).join(', ') })}
        </p>
      )}
      {n.events.length > 0 && (
        <p className="mt-1 text-xs text-slate-400">
          {t('needle.eventsSoFar', { list: n.events.map(statusText).join(', ') })}
        </p>
      )}
      {n.aspiration !== 'none' && (
        <p className={`mt-1 text-sm font-semibold ${n.aspiration === 'blood' ? 'text-rose-300' : 'text-emerald-300'}`}>
          {n.aspiration === 'blood' ? t('needle.aspBlood') : `✓ ${t('needle.aspClear')}`}
        </p>
      )}
      {n.injected && (
        <p className={`mt-1 text-sm font-semibold ${level === 'good' ? 'text-cyan-200' : 'text-rose-300'}`}>
          {level === 'good' ? `${t('needle.injected')}` : `✕ ${t('needle.injectedBad')}`}
        </p>
      )}
    </div>
  );
}

/** Depth, angle, tilt and entry sliders for the virtual needle. */
export function NeedleSliders() {
  const { t } = useT();
  const n = useAppStore((s) => s.needle);
  const setNeedle = useAppStore((s) => s.setNeedle);
  return (
    <>
      <Slider
        label={t('needle.depth')}
        unit=" cm"
        min={0}
        max={MAX_DEPTH_CM}
        step={0.05}
        value={n.depthCm}
        onChange={(depthCm) => setNeedle({ depthCm })}
      />
      <Slider label={t('needle.aim')} unit="°" min={-60} max={75} step={1} value={n.aimDeg} onChange={(aimDeg) => setNeedle({ aimDeg })} />
      <Slider label={t('needle.tilt')} unit="°" min={-45} max={45} step={1} value={n.tiltDeg} onChange={(tiltDeg) => setNeedle({ tiltDeg })} />
      <Slider label={t('needle.entryY')} unit=" cm" min={-0.8} max={7.5} step={0.05} value={n.entryY} onChange={(entryY) => setNeedle({ entryY, depthCm: 0 })} />
      <Slider
        label={t('needle.entryTheta')}
        unit="°"
        min={0}
        max={359}
        step={1}
        value={n.entryThetaDeg}
        onChange={(entryThetaDeg) => setNeedle({ entryThetaDeg, depthCm: 0 })}
      />
    </>
  );
}
