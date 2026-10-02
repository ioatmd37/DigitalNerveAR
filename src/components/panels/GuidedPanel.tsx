import { GUIDED_STEPS } from '../../config/guidedSteps';
import { useT } from '../../i18n/useT';
import { useAppStore } from '../../store/useAppStore';

export function GuidedPanel() {
  const { t, td } = useT();
  const step = useAppStore((s) => s.guidedStep);
  const setStep = useAppStore((s) => s.setGuidedStep);
  const setMode = useAppStore((s) => s.setMode);
  const replay = useAppStore((s) => s.replayInjectate);
  const current = GUIDED_STEPS[step];
  const last = step === GUIDED_STEPS.length - 1;
  return (
    <div>
      <p className="mb-2 text-xs text-slate-400">{t('guided.intro')}</p>
      <ol className="mb-3 flex gap-1.5" aria-label={t('common.step', { current: step + 1, total: GUIDED_STEPS.length })}>
        {GUIDED_STEPS.map((s, i) => (
          <li key={s.id} className="flex-1">
            <button
              onClick={() => setStep(i)}
              aria-current={i === step ? 'step' : undefined}
              aria-label={`${i + 1}. ${td(s.titleKey)}`}
              className={`h-10 w-full rounded-lg text-sm font-bold transition ${
                i === step ? 'bg-cyan-500 text-slate-950' : i < step ? 'bg-cyan-900 text-cyan-100' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {i + 1}
            </button>
          </li>
        ))}
      </ol>
      <p className="text-sm font-semibold text-cyan-300">
        {t('common.step', { current: step + 1, total: GUIDED_STEPS.length })}
      </p>
      <h3 className="mb-2 text-lg font-bold leading-snug text-white">{td(current.titleKey)}</h3>
      <p className="leading-relaxed text-slate-200">{td(current.bodyKey)}</p>
      {current.id === 'spread' && (
        <button className="btn btn-ghost btn-sm mt-3" onClick={replay}>
          {t('guided.replay')}
        </button>
      )}
      <div className="mt-4 flex gap-2">
        <button className="btn btn-secondary flex-1" disabled={step === 0} onClick={() => setStep(step - 1)}>
          {t('common.previous')}
        </button>
        {last ? (
          <button className="btn btn-primary flex-1" onClick={() => setMode('quiz')}>
            {t('modes.quiz')}
          </button>
        ) : (
          <button className="btn btn-primary flex-1" onClick={() => setStep(step + 1)}>
            {t('common.next')}
          </button>
        )}
      </div>
      {last && <p className="mt-3 text-sm text-slate-300">{t('guided.done')}</p>}
    </div>
  );
}
