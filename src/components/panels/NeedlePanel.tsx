import { useNeedleEvaluation } from '../../hooks/useNeedle';
import { useT } from '../../i18n/useT';
import { scoreAttempt, type NeedleResult, type NeedleSide } from '../../logic/needle';
import { useAppStore } from '../../store/useAppStore';
import { NeedleSliders, NeedleStatusCard } from './NeedleControls';
import { Toggle } from '../Toggle';

const SIDES: NeedleSide[] = ['radial', 'ulnar'];

/**
 * Virtual needle practice on the mannequin model: choose an entry point,
 * angle and depth, aspirate, inject, and get model-based feedback.
 */
export function NeedlePanel() {
  const { t } = useT();
  const n = useAppStore((s) => s.needle);
  const { setNeedleShowAnatomy, selectNeedleSide, restartNeedle, aspirateNeedle, injectNeedle } = useAppStore.getState();
  const e = useNeedleEvaluation();

  const aspirate = () => aspirateNeedle(e.tipStatus === 'artery');
  const inject = () => injectNeedle(scoreAttempt(n, e));

  const results = SIDES.map((side) => ({ side, r: n.results[side] }));
  const total = results.reduce((sum, x) => sum + (x.r?.score ?? 0), 0);

  return (
    <div className="space-y-3">
      <p className="flex items-start gap-2 text-xs text-amber-300">
        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" aria-hidden />
        {t('needle.disclaimer')}
      </p>
      <p className="text-sm leading-relaxed text-slate-300">{t('needle.intro')}</p>
      <p className="text-sm text-cyan-200">{t('needle.howTo')}</p>

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

      <NeedleStatusCard />
      <NeedleSliders />

      <div className="grid grid-cols-2 gap-2">
        <button className="btn btn-secondary" disabled={!e.inserted} onClick={aspirate}>
          {t('needle.aspirate')}
        </button>
        <button className="btn btn-primary" disabled={!e.inserted || n.injected} onClick={inject}>
          {t('needle.inject')}
        </button>
        <button className="btn btn-ghost btn-sm col-span-2" onClick={restartNeedle}>
          {t('needle.restart')}
        </button>
      </div>

      <Toggle
        label={t('needle.showAnatomy')}
       
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
        <p className="mt-2 text-right text-lg font-semibold text-white">{t('needle.total', { score: total, max: 8 })}</p>
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
