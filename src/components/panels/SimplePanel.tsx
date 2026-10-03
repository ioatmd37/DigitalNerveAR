import { SIMPLE_STEPS } from '../../config/simpleSteps';
import { useT } from '../../i18n/useT';
import { useAppStore } from '../../store/useAppStore';

/** Teacher-only walkthrough of Lalonde's SIMPLE block on the model. */
export function SimplePanel() {
  const { t, td } = useT();
  const step = useAppStore((s) => s.simpleStep);
  const setStep = useAppStore((s) => s.setSimpleStep);
  const replay = useAppStore((s) => s.replayInjectate);
  const current = SIMPLE_STEPS[step];
  const last = step === SIMPLE_STEPS.length - 1;
  return (
    <div>
      <p className="mb-2 inline-flex items-center gap-2 rounded border border-slate-700 px-2 py-0.5 text-xs font-medium text-slate-300">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-300" aria-hidden />
        {t('simple.teacherOnly')}
      </p>
      <p className="mb-3 text-xs leading-relaxed text-slate-400">{t('simple.intro')}</p>
      <ol className="mb-3 flex gap-1.5" aria-label={t('common.step', { current: step + 1, total: SIMPLE_STEPS.length })}>
        {SIMPLE_STEPS.map((s, i) => (
          <li key={s.id} className="flex-1">
            <button
              onClick={() => setStep(i)}
              aria-current={i === step ? 'step' : undefined}
              aria-label={`${i + 1}. ${td(s.titleKey)}`}
              className={`h-9 w-full rounded-md text-sm font-semibold transition-colors ${
                i === step ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:text-slate-100'
              }`}
            >
              {i + 1}
            </button>
          </li>
        ))}
      </ol>
      <p className="text-xs text-slate-500">{t('common.step', { current: step + 1, total: SIMPLE_STEPS.length })}</p>
      <h3 className="mb-2 mt-0.5 text-lg font-semibold leading-snug text-slate-50">{td(current.titleKey)}</h3>
      <p className="leading-relaxed text-slate-200">{td(current.bodyKey)}</p>
      {current.overlay.bleb === 'spread' && (
        <button className="btn btn-ghost btn-sm mt-3" onClick={replay}>
          {t('simple.replay')}
        </button>
      )}
      <div className="mt-4 flex gap-2">
        <button className="btn btn-secondary flex-1" disabled={step === 0} onClick={() => setStep(step - 1)}>
          {t('common.previous')}
        </button>
        <button className="btn btn-primary flex-1" disabled={last} onClick={() => setStep(step + 1)}>
          {t('common.next')}
        </button>
      </div>
      <p className="mt-4 text-xs text-slate-500">{t('simple.viewHint')}</p>
      <p className="mt-3 flex items-start gap-2 text-xs text-amber-300">
        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" aria-hidden />
        {t('simple.modelNote')}
      </p>
      <p className="mt-3 border-t border-slate-800 pt-3 text-xs leading-relaxed text-slate-500">{t('simple.reference')}</p>
    </div>
  );
}
