import { FINGERS } from '../config/hand';
import { useT } from '../i18n/useT';
import { useAppStore } from '../store/useAppStore';

/** Choose which mannequin finger carries the overlay (right hand, thumb not modelled). */
export function FingerSelector({ compact = false }: { compact?: boolean }) {
  const { t, language } = useT();
  const selected = useAppStore((s) => s.selectedFinger);
  const select = useAppStore((s) => s.selectFinger);
  return (
    <div
      role="radiogroup"
      aria-label={t('fingers.title')}
      className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-slate-800/90 p-1 ring-1 ring-slate-600"
    >
      {!compact && <span className="px-2 text-sm font-semibold text-slate-300">☝ {t('fingers.title')}</span>}
      {FINGERS.map((f) => {
        const on = f.id === selected;
        return (
          <button
            key={f.id}
            role="radio"
            aria-checked={on}
            title={language === 'th' ? `${f.nameTh} (${f.nameEn})` : `${f.nameEn} (${f.nameTh})`}
            onClick={() => select(f.id)}
            className={`min-h-9 rounded-lg px-2.5 text-sm font-semibold transition ${
              on ? 'bg-cyan-500 text-slate-950' : 'text-slate-200 hover:bg-slate-700'
            }`}
          >
            {language === 'th' ? f.shortTh : f.shortEn}
          </button>
        );
      })}
    </div>
  );
}
