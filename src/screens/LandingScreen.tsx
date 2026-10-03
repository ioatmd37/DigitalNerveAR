import { CrossSectionFigure } from '../components/CrossSectionFigure';
import { DisclaimerText } from '../components/Disclaimer';
import { Icon } from '../components/Icon';
import { SetupFigure } from '../components/SetupFigure';
import { DEVELOPER } from './DeveloperScreen';
import { LanguageToggle } from '../components/LanguageToggle';
import { appConfig } from '../config/appConfig';
import { useT } from '../i18n/useT';
import { useAppStore } from '../store/useAppStore';
import type { LearningMode } from '../types';
import { assetUrl } from '../utils/assets';

type LearnerMode = Exclude<LearningMode, 'assessment' | 'simple' | 'transthecal'>;

const MODE_GROUPS: { group: 'learn' | 'practice'; modes: LearnerMode[] }[] = [
  { group: 'learn', modes: ['surface', 'anatomy', 'layers', 'guided'] },
  { group: 'practice', modes: ['needle', 'osce', 'quiz'] },
];

/** Small wordmark glyph: a finger cross-section reduced to a ring and two bundles. */
function Mark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <ellipse cx="12" cy="12" rx="10" ry="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <ellipse cx="12" cy="10.5" rx="4" ry="3.4" fill="currentColor" opacity="0.85" />
      <circle cx="6.4" cy="16" r="1.6" fill="var(--color-nerve)" />
      <circle cx="17.6" cy="16" r="1.6" fill="var(--color-nerve)" />
    </svg>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="eyebrow">{children}</h2>;
}

export function LandingScreen() {
  const { t } = useT();
  const setScreen = useAppStore((s) => s.setScreen);
  const saved = useAppStore((s) => s.savedCalibration);
  const size = String(appConfig.markerSizeCm);
  const markerHref = assetUrl(appConfig.markerPrintUrl);

  const steps = [
    { title: t('landing.step1Title'), body: t('landing.step1Body', { size }) },
    { title: t('landing.step2Title'), body: t('landing.step2Body') },
    { title: t('landing.step3Title'), body: t('landing.step3Body') },
  ];

  return (
    <div className="min-h-full bg-slate-950">
      {/* ------------------------------------------------ top bar */}
      <div className="border-b border-slate-800">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-8">
          <span className="flex items-center gap-2.5 text-sm font-medium text-slate-200">
            <Mark />
            {t('app.shortTitle')}
          </span>
          <LanguageToggle compact />
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* ------------------------------------------------ hero */}
        <section className="grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16 lg:py-20">
          <div>
            <p className="eyebrow">{t('landing.eyebrow')}</p>
            <h1 className="mt-4 text-[32px] font-semibold leading-[1.1] tracking-tight text-slate-50 sm:text-5xl">
              {t('app.title')}
            </h1>
            <p className="mt-3 text-lg text-slate-200 sm:text-xl">{t('app.fullName')}</p>
            <p className="mt-1 text-base text-slate-400">{t('app.subtitle')}</p>
            <p className="mt-3 text-sm text-slate-400">
              {t('landing.by')}{' '}
              <button className="text-slate-200 underline underline-offset-4 hover:text-white" onClick={() => setScreen('developer')}>
                {DEVELOPER.name}
              </button>
            </p>
            <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-slate-400">{t('landing.lede')}</p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button className="btn btn-primary min-h-12 px-5 text-base" onClick={() => setScreen('ar')}>
                {t('landing.startAr')}
                <Icon name="chevronRight" />
              </button>
              <button className="btn btn-secondary min-h-12 px-5 text-base" onClick={() => setScreen('explorer')}>
                {t('landing.explore')}
                <span className="font-normal text-slate-400">· {t('common.noCamera')}</span>
              </button>
            </div>

            <p className="mt-6 flex items-center gap-2 text-sm text-amber-300" role="note">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" aria-hidden />
              {t('safety.short')}
            </p>
          </div>

          <CrossSectionFigure />
        </section>

        {/* ------------------------------------------------ setup */}
        <section className="border-t border-slate-800 py-10 sm:py-12">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <SectionTitle>{t('landing.setupTitle')}</SectionTitle>
            <span className="text-sm text-slate-500">{saved ? t('landing.calibrationSaved') : t('landing.calibrationDefault')}</span>
          </div>
          <ol className="mt-6 grid gap-px overflow-hidden rounded-lg border border-slate-800 bg-slate-800 sm:grid-cols-3">
            {steps.map((s, i) => (
              <li key={i} className="flex flex-col bg-slate-950 p-5">
                <span className="num text-sm text-slate-500">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="mt-3 text-base font-semibold text-slate-100">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{s.body}</p>
                {i === 0 && (
                  <a
                    className="btn btn-secondary btn-sm mt-4 self-start"
                    href={markerHref}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t('landing.printMarker')}
                  </a>
                )}
              </li>
            ))}
          </ol>
          <SetupFigure />
        </section>

        {/* ------------------------------------------------ modes */}
        <section className="border-t border-slate-800 py-10 sm:py-12">
          <SectionTitle>{t('landing.insideTitle')}</SectionTitle>
          <div className="mt-6 grid gap-8 md:grid-cols-2 md:gap-12">
            {MODE_GROUPS.map(({ group, modes }) => (
              <div key={group}>
                <h3 className="text-sm font-semibold text-slate-200">{t(`modeGroups.${group}`)}</h3>
                <dl className="mt-2 divide-y divide-slate-800/80">
                  {modes.map((m) => (
                    <div key={m} className="grid gap-x-6 gap-y-0.5 py-3 sm:grid-cols-[11rem_1fr]">
                      <dt className="text-[15px] text-slate-100">{t(`modes.${m}`)}</dt>
                      <dd className="text-sm text-slate-400">{t(`landing.modeDesc.${m}`)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>

          <button
            onClick={() => setScreen('instructorLogin')}
            className="group mt-10 flex w-full items-center gap-4 rounded-lg border border-slate-800 px-5 py-4 text-left transition-colors hover:border-slate-700 hover:bg-slate-900"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-slate-100">{t('landing.instructor')}</span>
              <span className="mt-0.5 block text-sm text-slate-400">{t('landing.instructorHint')}</span>
            </span>
            <Icon name="chevronRight" className="text-slate-500 transition-colors group-hover:text-slate-200" />
          </button>
        </section>

        {/* ------------------------------------------------ safety */}
        <section className="border-t border-slate-800 py-10 sm:py-12">
          <div className="grid gap-4 md:grid-cols-[11rem_1fr] md:gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <SectionTitle>{t('safety.title')}</SectionTitle>
            <div className="max-w-3xl">
              <DisclaimerText />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-5 py-5 text-xs text-slate-500 sm:px-8">
          <span>{t('landing.guides')}</span>
          <span className="flex items-center gap-4">
            <button className="text-slate-300 underline underline-offset-4 hover:text-white" onClick={() => setScreen('developer')}>
              {t('developer.navLink')}
            </button>
            <span className="num">{t('landing.version', { version: __APP_VERSION__ })}</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
