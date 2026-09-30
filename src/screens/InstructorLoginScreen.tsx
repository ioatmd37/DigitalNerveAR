import { useState, type FormEvent } from 'react';
import { LanguageToggle } from '../components/LanguageToggle';
import { useT } from '../i18n/useT';
import { useAppStore } from '../store/useAppStore';

export function InstructorLoginScreen() {
  const { t } = useT();
  const unlock = useAppStore((s) => s.unlockInstructor);
  const setScreen = useAppStore((s) => s.setScreen);
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (unlock(code)) {
      setScreen('instructor');
    } else {
      setError(true);
      setCode('');
    }
  };

  return (
    <div className="flex min-h-full flex-col bg-slate-950">
      <div className="bg-amber-400 px-4 py-2 text-center text-sm font-bold text-slate-950">⚠ {t('safety.short')}</div>
      <div className="flex items-center justify-between p-3">
        <button className="btn btn-secondary btn-sm" onClick={() => setScreen('landing')}>
          ← {t('common.back')}
        </button>
        <LanguageToggle compact />
      </div>
      <form onSubmit={submit} className="card mx-auto mt-8 w-[min(92vw,420px)] p-6">
        <h1 className="mb-1 text-2xl font-bold text-white">🎓 {t('instructor.loginTitle')}</h1>
        <p className="mb-4 text-sm text-slate-400">{t('instructor.loginHint')}</p>
        <label className="mb-1 block text-sm font-semibold text-slate-200" htmlFor="passcode">
          {t('instructor.passcode')}
        </label>
        <input
          id="passcode"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError(false);
          }}
          className="mb-3 min-h-14 w-full rounded-xl bg-slate-800 px-4 text-2xl tracking-[0.4em] text-white ring-1 ring-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        />
        {error && (
          <p className="mb-3 text-sm font-semibold text-rose-300" role="alert">
            ✕ {t('instructor.wrong')}
          </p>
        )}
        <button type="submit" className="btn btn-primary w-full" disabled={!code}>
          {t('instructor.unlock')}
        </button>
      </form>
    </div>
  );
}
