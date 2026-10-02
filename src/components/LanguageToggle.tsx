import { LANGUAGES } from '../config/locales';
import { useT } from '../i18n/useT';
import { useAppStore } from '../store/useAppStore';

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { t, language } = useT();
  const setLanguage = useAppStore((s) => s.setLanguage);
  return (
    <div role="radiogroup" aria-label={t('common.language')} className="seg">
      {LANGUAGES.map((l) => (
        <button
          key={l.id}
          lang={l.id}
          role="radio"
          aria-checked={language === l.id}
          onClick={() => setLanguage(l.id)}
          className={`seg-item ${compact ? '' : 'min-h-10 px-4'}`}
        >
          {compact ? (l.id === 'th' ? 'ไทย' : 'EN') : l.label}
        </button>
      ))}
    </div>
  );
}
