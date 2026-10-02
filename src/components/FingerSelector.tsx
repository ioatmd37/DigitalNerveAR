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
      className="seg items-center"
    >
      {!compact && <span className="px-2 text-sm text-slate-400">{t('fingers.title')}</span>}
      {FINGERS.map((f) => {
        const on = f.id === selected;
        return (
          <button
            key={f.id}
            role="radio"
            aria-checked={on}
            title={language === 'th' ? `${f.nameTh} (${f.nameEn})` : `${f.nameEn} (${f.nameTh})`}
            onClick={() => select(f.id)}
            className="seg-item"
          >
            {language === 'th' ? f.shortTh : f.shortEn}
          </button>
        );
      })}
    </div>
  );
}
