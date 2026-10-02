import { DisclaimerText } from '../components/Disclaimer';
import { Icon } from '../components/Icon';
import { LanguageToggle } from '../components/LanguageToggle';
import { appConfig } from '../config/appConfig';
import { useT } from '../i18n/useT';
import { useAppStore } from '../store/useAppStore';
import { assetUrl } from '../utils/assets';

export function LandingScreen() {
  const { t } = useT();
  const setScreen = useAppStore((s) => s.setScreen);
  const saved = useAppStore((s) => s.savedCalibration);

  const actions = [
    { key: 'ar', title: t('landing.startAr'), body: t('landing.instruction'), onClick: () => setScreen('ar'), primary: true },
    { key: 'explorer', title: t('landing.explore'), body: t('common.noCamera'), onClick: () => setScreen('explorer') },
    { key: 'instructor', title: t('landing.instructor'), body: t('landing.instructorHint'), onClick: () => setScreen('instructorLogin') },
  ];

  return (
    <div className="min-h-full bg-slate-950">
      <div className="mx-auto flex min-h-full max-w-2xl flex-col px-5 pb-10 pt-6 sm:px-8">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">{t('app.shortTitle')}</span>
          <LanguageToggle compact />
        </div>

        <header className="mt-14 sm:mt-20">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-slate-50 sm:text-4xl">{t('app.title')}</h1>
          <p className="mt-2 text-lg text-slate-300">{t('app.subtitle')}</p>
          <p className="mt-4 flex items-center gap-2 text-sm text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />
            {t('safety.short')}
          </p>
        </header>

        <nav className="mt-10 divide-y divide-slate-800 border-y border-slate-800">
          {actions.map((a) => (
            <button
              key={a.key}
              onClick={a.onClick}
              className="group flex w-full items-center gap-4 py-5 text-left transition-colors hover:bg-slate-900/60"
            >
              <span className="min-w-0 flex-1">
                <span className={`block text-lg font-semibold ${a.primary ? 'text-slate-50' : 'text-slate-100'}`}>{a.title}</span>
                <span className="mt-0.5 block text-sm text-slate-400">{a.body}</span>
              </span>
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
                  a.primary ? 'bg-cyan-500 text-slate-950' : 'border border-slate-700 text-slate-300 group-hover:text-slate-50'
                }`}
              >
                <Icon name="chevronRight" />
              </span>
            </button>
          ))}
        </nav>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-400">
          <a className="text-slate-200 underline underline-offset-4 hover:text-white" href={assetUrl(appConfig.markerPrintUrl)} target="_blank" rel="noreferrer">
            {t('landing.printMarker')}
          </a>
          <span>{saved ? t('landing.calibrationSaved') : t('landing.calibrationDefault')}</span>
        </div>

        <section className="mt-12 rounded-lg border border-slate-800 p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-200">{t('safety.title')}</h2>
          <DisclaimerText />
        </section>

        <p className="mt-auto pt-10 text-xs text-slate-500">
          {t('landing.guides')} · {t('landing.version', { version: __APP_VERSION__ })}
        </p>
      </div>
    </div>
  );
}
