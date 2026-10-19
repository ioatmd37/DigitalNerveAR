import { useT } from '../i18n/useT';
import { useAppStore } from '../store/useAppStore';

/** Left/right mannequin. The right-hand anatomy is mirrored for a left hand (AR, Explorer and the set-up figure). */
export function HandSideToggle({ className = '' }: { className?: string }) {
  const { t } = useT();
  const side = useAppStore((s) => s.handSide);
  const setHandSide = useAppStore((s) => s.setHandSide);
  return (
    <div className={`seg ${className}`} role="radiogroup" aria-label={t('handSide.label')}>
      {(['left', 'right'] as const).map((s) => (
        <button key={s} role="radio" aria-checked={side === s} className="seg-item flex-1" onClick={() => setHandSide(s)}>
          {t(`handSide.${s}`)}
        </button>
      ))}
    </div>
  );
}
