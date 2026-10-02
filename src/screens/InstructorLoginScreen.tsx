import { useState, type FormEvent } from 'react';
import { DisclaimerBanner } from '../components/Disclaimer';
import { Icon } from '../components/Icon';
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
      <div className="flex h-12 items-center justify-between border-b border-slate-800 px-3">
        <button className="btn btn-ghost btn-sm -ml-1 gap-1 px-2" onClick={() => setScreen('landing')}>
          <Icon name="back" />
          {t('common.back')}
        </button>
        <LanguageToggle compact />
      </div>
      <form onSubmit={submit} className="mx-auto mt-16 w-[min(92vw,380px)]">
        <h1 className="mb-1 text-2xl font-semibold text-slate-50">{t('instructor.loginTitle')}</h1>
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
          className="num mb-3 min-h-12 w-full rounded-md border border-slate-700 bg-slate-900 px-4 text-xl tracking-[0.4em] text-white focus:border-slate-400 focus:outline-none"
        />
        {error && (
          <p className="mb-3 text-sm font-semibold text-rose-300" role="alert">
            {t('instructor.wrong')}
          </p>
        )}
        <button type="submit" className="btn btn-primary w-full" disabled={!code}>
          {t('instructor.unlock')}
        </button>
        <div className="mt-10">
          <DisclaimerBanner variant="landing" />
        </div>
      </form>
    </div>
  );
}
