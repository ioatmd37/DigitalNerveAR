import { DisclaimerText } from '../components/Disclaimer';
import { LanguageToggle } from '../components/LanguageToggle';
import { appConfig } from '../config/appConfig';
import { useT } from '../i18n/useT';
import { useAppStore } from '../store/useAppStore';
import { assetUrl } from '../utils/assets';

export function LandingScreen() {
  const { t } = useT();
  const setScreen = useAppStore((s) => s.setScreen);
  const saved = useAppStore((s) => s.savedCalibration);

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="bg-amber-400 px-4 py-2 text-center text-sm font-bold text-slate-950" role="note">
        ⚠ {t('safety.short')}
      </div>
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-8">
        <div className="flex justify-end">
          <LanguageToggle />
        </div>
        <header className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-800 ring-1 ring-slate-600">
            <img src={assetUrl('favicon.svg')} alt="" className="h-14 w-14" />
          </div>
          <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl">{t('app.title')}</h1>
          <p className="mt-2 text-lg text-cyan-200 sm:text-xl">{t('app.subtitle')}</p>
          <p className="mt-1 text-sm text-slate-400">{t('app.modelNotice')}</p>
        </header>

        <p className="rounded-2xl bg-slate-800/80 p-4 text-center text-base leading-relaxed text-slate-100 ring-1 ring-slate-700">
          📷 {t('landing.instruction')}
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <button className="btn btn-primary min-h-16 text-lg" onClick={() => setScreen('ar')}>
            ◉ {t('landing.startAr')}
          </button>
          <button className="btn btn-secondary min-h-16 text-lg" onClick={() => setScreen('explorer')}>
            ⌬ {t('landing.explore')}
          </button>
          <button className="btn min-h-16 bg-violet-700 text-lg text-white hover:bg-violet-600" onClick={() => setScreen('instructorLogin')}>
            🎓 {t('landing.instructor')}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-slate-300">
          <a className="btn btn-ghost btn-sm" href={assetUrl(appConfig.markerPrintUrl)} target="_blank" rel="noreferrer">
            🖨 {t('landing.printMarker')}
          </a>
          <span className="chip bg-slate-800 text-slate-200">
            ⌖ {saved ? t('landing.calibrationSaved') : t('landing.calibrationDefault')}
          </span>
        </div>

        <section className="card p-5">
          <DisclaimerText />
        </section>
        <p className="text-center text-xs text-slate-500">
          {t('landing.guides')} · {t('landing.version', { version: __APP_VERSION__ })}
        </p>
      </main>
    </div>
  );
}
