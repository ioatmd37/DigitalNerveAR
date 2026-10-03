import { DisclaimerBanner } from '../components/Disclaimer';
import { Icon } from '../components/Icon';
import { LanguageToggle } from '../components/LanguageToggle';
import { CalibrationBadge } from '../components/StatusBadges';
import { QUIZ_QUESTIONS } from '../config/quiz';
import { useT } from '../i18n/useT';
import { bestScore } from '../logic/quiz';
import { useAppStore } from '../store/useAppStore';
import { MarkerCompiler } from './MarkerCompiler';

export function InstructorScreen() {
  const { t } = useT();
  const setScreen = useAppStore((s) => s.setScreen);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const startAssessment = useAppStore((s) => s.startAssessment);
  const lock = useAppStore((s) => s.lockInstructor);
  const attempts = useAppStore((s) => s.quizAttempts);
  const clearAll = useAppStore((s) => s.clearAllLocalData);

  const open = (screen: 'ar' | 'explorer') => {
    setScreen(screen);
    setActiveTab('calibration');
  };

  return (
    <div className="min-h-full bg-slate-950">
      <header className="flex h-12 items-center gap-3 border-b border-slate-800 px-3">
        <button className="btn btn-ghost btn-sm -ml-1 gap-1 px-2" onClick={() => setScreen('landing')}>
          <Icon name="back" />
          <span className="hidden sm:inline">{t('common.home')}</span>
        </button>
        <h1 className="flex-1 text-sm font-semibold text-slate-100">{t('instructor.title')}</h1>
        <LanguageToggle compact />
      </header>
      <div className="mx-auto max-w-2xl space-y-8 px-5 py-8">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <DisclaimerBanner variant="landing" />
          <span className="text-slate-400">
            <CalibrationBadge />
          </span>
        </div>

        <section>
          <h2 className="panel-title">{t('calibration.title')}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <button className="btn btn-primary" onClick={() => open('ar')}>
              {t('instructor.openAr')}
            </button>
            <button className="btn btn-secondary" onClick={() => open('explorer')}>
              {t('instructor.openExplorer')}
            </button>
          </div>
        </section>

        <section>
          <h2 className="panel-title">{t('modes.simple')}</h2>
          <p className="mb-2 text-sm text-slate-400">{t('simple.intro')}</p>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setScreen('explorer');
              setActiveTab('simple');
            }}
          >
            {t('instructor.openSimple')}
          </button>
        </section>

        <section>
          <h2 className="panel-title">{t('modes.assessment')}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <button className="btn btn-secondary" onClick={() => startAssessment('ar')}>
              {t('instructor.assessmentAr')}
            </button>
            <button className="btn btn-secondary" onClick={() => startAssessment('explorer')}>
              {t('instructor.assessmentExplorer')}
            </button>
          </div>
        </section>

        <section className="border-t border-slate-800 pt-6">
          <h2 className="panel-title">{t('instructor.quizSummary')}</h2>
          <p className="text-slate-200">
            {t('instructor.attempts', { count: attempts.length, best: bestScore(attempts), total: QUIZ_QUESTIONS.length })}
          </p>
        </section>

        <MarkerCompiler />

        <section className="flex flex-wrap gap-3 border-t border-slate-800 pt-6">
          <button
            className="btn btn-danger"
            onClick={() => {
              if (window.confirm(t('instructor.clearConfirm'))) clearAll();
            }}
          >
            {t('instructor.clearData')}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              lock();
              setScreen('landing');
            }}
          >
            {t('instructor.lock')}
          </button>
        </section>
      </div>
    </div>
  );
}
