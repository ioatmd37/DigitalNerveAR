import { useNeedleEvaluation } from '../../hooks/useNeedle';
import { useT } from '../../i18n/useT';
import { MAX_DEPTH_CM, scoreAttempt, statusLevel, type NeedleResult, type NeedleSide, type NeedleStatus } from '../../logic/needle';
import { useAppStore } from '../../store/useAppStore';
import { Slider } from '../Slider';
import { Toggle } from '../Toggle';

const LEVEL_STYLE = {
  neutral: { box: 'bg-slate-800 ring-slate-600', icon: '•' },
  good: { box: 'bg-emerald-950/70 ring-emerald-500', icon: '✓' },
  caution: { box: 'bg-amber-950/70 ring-amber-500', icon: '!' },
  danger: { box: 'bg-rose-950/70 ring-rose-500', icon: '✕' },
} as const;

const SIDES: NeedleSide[] = ['radial', 'ulnar'];

/**
 * Virtual needle practice on the mannequin model: choose an entry point,
 * angle and depth, aspirate, inject, and get model-based feedback.
 */
export function NeedlePanel() {
  const { t, td } = useT();
  const n = useAppStore((s) => s.needle);
  const { setNeedle, setNeedleShowAnatomy, selectNeedleSide, restartNeedle, aspirateNeedle, injectNeedle } =
    useAppStore.getState();
  const e = useNeedleEvaluation();
  const level = statusLevel(e.tipStatus);
  const statusText = (s: NeedleStatus) => td(`needle.status.${s}`);

  const aspirate = () => aspirateNeedle(e.tipStatus === 'artery');
  const inject = () => injectNeedle(scoreAttempt(n, e));

  // Path findings other than the one already shown for the tip.
  const pathOnly = e.pathEvents.filter((s) => s !== e.tipStatus);
  const results = SIDES.map((side) => ({ side, r: n.results[side] }));
  const total = results.reduce((sum, x) => sum + (x.r?.score ?? 0), 0);

  return (
    <div className="space-y-3">
      <p className="rounded-xl bg-amber-400/15 px-3 py-2 text-xs font-semibold text-amber-200 ring-1 ring-amber-500/40">
        ⚠ {t('needle.disclaimer')}
      </p>
      <p className="text-sm leading-relaxed text-slate-300">{t('needle.intro')}</p>
      <p className="text-sm text-cyan-200">👆 {t('needle.howTo')}</p>

      <div role="radiogroup" aria-label={t('needle.side')} className="grid grid-cols-2 gap-2">
        {SIDES.map((side) => (
          <button
            key={side}
            role="radio"
            aria-checked={n.side === side}
            onClick={() => selectNeedleSide(side)}
            className={`btn btn-sm ${n.side === side ? 'btn-primary' : 'btn-secondary'}`}
          >
            {t(`needle.${side}`)}
          </button>
        ))}
      </div>

      {/* Live status */}
      <div className={`rounded-2xl p-3 ring-1 ${LEVEL_STYLE[level].box}`} role="status" aria-live="polite">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('needle.tip')}</p>
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
            {n.aspiration === 'blood' ? `🩸 ${t('needle.aspBlood')}` : `✓ ${t('needle.aspClear')}`}
          </p>
        )}
        {n.injected && (
          <p className={`mt-1 text-sm font-semibold ${level === 'good' ? 'text-cyan-200' : 'text-rose-300'}`}>
            {level === 'good' ? `◍ ${t('needle.injected')}` : `✕ ${t('needle.injectedBad')}`}
          </p>
        )}
      </div>

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

      <div className="grid grid-cols-2 gap-2">
        <button className="btn btn-secondary" disabled={!e.inserted} onClick={aspirate}>
          ⇡ {t('needle.aspirate')}
        </button>
        <button className="btn btn-primary" disabled={!e.inserted || n.injected} onClick={inject}>
          ◍ {t('needle.inject')}
        </button>
        <button className="btn btn-ghost btn-sm col-span-2" onClick={restartNeedle}>
          ↻ {t('needle.restart')}
        </button>
      </div>

      <Toggle
        label={t('needle.showAnatomy')}
        icon="👁"
        color="#94a3b8"
        checked={n.showAnatomy}
        onChange={setNeedleShowAnatomy}
      />

      <section className="rounded-2xl bg-slate-800/70 p-3">
        <h3 className="panel-title">{t('needle.results')}</h3>
        <div className="grid gap-2 @md:grid-cols-2">
          {results.map(({ side, r }) => (
            <ResultCard key={side} title={t(`needle.${side}`)} result={r} />
          ))}
        </div>
        <p className="mt-2 text-right text-lg font-black text-white">{t('needle.total', { score: total, max: 8 })}</p>
      </section>
    </div>
  );
}

function ResultCard({ title, result }: { title: string; result?: NeedleResult }) {
  const { t } = useT();
  if (!result) {
    return (
      <div className="rounded-xl bg-slate-900/70 p-3 text-sm">
        <p className="font-bold text-slate-100">{title}</p>
        <p className="text-slate-400">{t('needle.notDone')}</p>
      </div>
    );
  }
  const rows: [string, boolean][] = [
    [t('needle.checkEntry'), result.entryOk],
    [t('needle.checkNoRed'), result.noRedEvents],
    [t('needle.checkAspirate'), result.aspiratedFirst],
    [t('needle.checkTarget'), result.injectedAtTarget],
  ];
  return (
    <div className="rounded-xl bg-slate-900/70 p-3 text-sm">
      <p className="flex justify-between font-bold text-slate-100">
        <span>{title}</span>
        <span>{t('needle.score', { score: result.score })}</span>
      </p>
      <ul className="mt-1 space-y-0.5">
        {rows.map(([label, ok]) => (
          <li key={label} className={ok ? 'text-emerald-300' : 'text-rose-300'}>
            {ok ? '✓' : '✕'} {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
