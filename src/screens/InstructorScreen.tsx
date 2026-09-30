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
      <div className="bg-amber-400 px-4 py-2 text-center text-sm font-bold text-slate-950">⚠ {t('safety.short')}</div>
      <div className="mx-auto max-w-3xl space-y-5 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="mr-auto text-2xl font-black text-white">🎓 {t('instructor.title')}</h1>
          <CalibrationBadge />
          <LanguageToggle compact />
        </div>

        <section className="grid gap-3 sm:grid-cols-2">
          <button className="btn btn-primary min-h-16" onClick={() => open('ar')}>
            ◉ {t('instructor.openAr')}
          </button>
          <button className="btn btn-secondary min-h-16" onClick={() => open('explorer')}>
            ⌬ {t('instructor.openExplorer')}
          </button>
          <button className="btn min-h-14 bg-violet-700 text-white hover:bg-violet-600" onClick={() => startAssessment('ar')}>
            ⏱ {t('instructor.assessmentAr')}
          </button>
          <button className="btn min-h-14 bg-violet-900 text-white hover:bg-violet-800" onClick={() => startAssessment('explorer')}>
            ⏱ {t('instructor.assessmentExplorer')}
          </button>
        </section>

        <section className="card p-5">
          <h2 className="panel-title">{t('instructor.quizSummary')}</h2>
          <p className="text-slate-200">
            {t('instructor.attempts', { count: attempts.length, best: bestScore(attempts), total: QUIZ_QUESTIONS.length })}
          </p>
        </section>

        <MarkerCompiler />

        <section className="flex flex-wrap gap-3">
          <button
            className="btn btn-danger"
            onClick={() => {
              if (window.confirm(t('instructor.clearConfirm'))) clearAll();
            }}
          >
            🗑 {t('instructor.clearData')}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              lock();
              setScreen('landing');
            }}
          >
            🔒 {t('instructor.lock')}
          </button>
        </section>
      </div>
    </div>
  );
}
