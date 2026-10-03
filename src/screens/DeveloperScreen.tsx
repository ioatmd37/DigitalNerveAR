import { DisclaimerText } from '../components/Disclaimer';
import { Icon } from '../components/Icon';
import { LanguageToggle } from '../components/LanguageToggle';
import { useT } from '../i18n/useT';
import { useAppStore } from '../store/useAppStore';

export const DEVELOPER = {
  name: 'Phachara Longmeewong, MD FRCST (ThPRS)',
  linkedin: 'https://www.linkedin.com/in/longpcr',
} as const;

/** Libraries the app is built on (all MIT-licensed unless noted). */
const STACK: { name: string; note: string }[] = [
  { name: 'React · TypeScript · Vite', note: 'UI and build' },
  { name: 'three.js · React Three Fiber · drei', note: '3D rendering' },
  { name: 'MindAR', note: 'Image-marker tracking' },
  { name: 'Zustand', note: 'App state' },
  { name: 'Tailwind CSS', note: 'Styling' },
  { name: 'IBM Plex Sans Thai · Plex Mono', note: 'Fonts (SIL Open Font License)' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 border-t border-slate-800 py-8 md:grid-cols-[12rem_1fr] md:gap-10">
      <h2 className="eyebrow pt-0.5">{title}</h2>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** About the app, its developer and this build. */
export function DeveloperScreen() {
  const { t } = useT();
  const setScreen = useAppStore((s) => s.setScreen);
  const built = new Date(__BUILD_TIME__);
  const releases = [t('developer.r1'), t('developer.r2'), t('developer.r3'), t('developer.r4'), t('developer.r5')];

  return (
    <div className="min-h-full bg-slate-950">
      <div className="border-b border-slate-800">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-3 sm:px-6">
          <button className="btn btn-ghost btn-sm -ml-1 gap-1 px-2" onClick={() => setScreen('landing')}>
            <Icon name="back" />
            {t('common.home')}
          </button>
          <LanguageToggle compact />
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-5 pb-12 sm:px-8">
        <header className="py-10 sm:py-14">
          <p className="eyebrow">{t('developer.title')}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">{t('app.title')}</h1>
          <p className="mt-2 text-lg text-slate-300">{t('app.fullName')}</p>
        </header>

        <Section title={t('developer.developerHeading')}>
          <p className="text-lg font-semibold text-slate-100">{DEVELOPER.name}</p>
          <a
            className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-200 underline underline-offset-4 hover:text-white"
            href={DEVELOPER.linkedin}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('developer.linkedin')}
            <span className="text-slate-500">linkedin.com/in/longpcr</span>
          </a>
          <p className="mt-3 text-sm text-slate-400">{t('developer.feedback')}</p>
        </Section>

        <Section title={t('developer.aboutHeading')}>
          <p className="text-[15px] leading-relaxed text-slate-300">{t('developer.about')}</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">{t('developer.status')}</p>
        </Section>

        <Section title={t('developer.releaseHeading')}>
          <ul className="space-y-2">
            {releases.map((r, i) => (
              <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-slate-300">
                <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-slate-500" aria-hidden />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title={t('developer.buildHeading')}>
          <dl className="grid grid-cols-[7rem_1fr] gap-y-1.5 text-sm">
            <dt className="text-slate-500">{t('developer.version')}</dt>
            <dd className="num text-slate-200">{__APP_VERSION__}</dd>
            <dt className="text-slate-500">{t('developer.commit')}</dt>
            <dd className="num text-slate-200">{__BUILD_SHA__}</dd>
            <dt className="text-slate-500">{t('developer.built')}</dt>
            <dd className="num text-slate-200">{Number.isNaN(built.getTime()) ? __BUILD_TIME__ : built.toISOString().slice(0, 16).replace('T', ' ')} UTC</dd>
          </dl>
        </Section>

        <Section title={t('developer.stackHeading')}>
          <ul className="divide-y divide-slate-800/80 text-sm">
            {STACK.map((s) => (
              <li key={s.name} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-2">
                <span className="text-slate-200">{s.name}</span>
                <span className="text-slate-500">{s.note}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title={`${t('safety.title')} · ${t('developer.privacyHeading')}`}>
          <DisclaimerText />
        </Section>
      </main>
    </div>
  );
}
