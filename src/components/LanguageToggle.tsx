import { LANGUAGES } from '../config/locales';
import { useT } from '../i18n/useT';
import { useAppStore } from '../store/useAppStore';

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { t, language } = useT();
  const setLanguage = useAppStore((s) => s.setLanguage);
  return (
    <div role="group" aria-label={t('common.language')} className="inline-flex rounded-xl bg-slate-800/90 p-1 ring-1 ring-slate-600">
      {LANGUAGES.map((l) => (
        <button
          key={l.id}
          lang={l.id}
          aria-pressed={language === l.id}
          onClick={() => setLanguage(l.id)}
          className={`rounded-lg font-semibold transition ${compact ? 'min-h-9 px-2.5 text-sm' : 'min-h-11 px-4'} ${
            language === l.id ? 'bg-cyan-500 text-slate-950' : 'text-slate-200 hover:bg-slate-700'
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
