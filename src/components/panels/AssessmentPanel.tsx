import { useEffect, useState } from 'react';
import { useT } from '../../i18n/useT';
import { elapsedMs, formatDuration } from '../../logic/timer';
import { useAppStore } from '../../store/useAppStore';

export function AssessmentPanel() {
  const { t } = useT();
  const a = useAppStore((s) => s.assessment);
  const unlocked = useAppStore((s) => s.instructor.unlocked);
  const { startTimer, pauseTimer, finishAssessment, setRevealed, restartAssessment, exitAssessment } =
    useAppStore.getState();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (a.startedAt === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [a.startedAt]);

  const running = a.startedAt !== null;
  const ms = elapsedMs(a, running ? now : 0);

  return (
    <div>
      <p className="mb-3 text-sm leading-relaxed text-slate-300">{t('assessment.hint')}</p>
      <div className="mb-3 flex items-center justify-between rounded-2xl bg-slate-800 px-4 py-3">
        <span className="text-sm font-semibold text-slate-300">⏱ {t('assessment.timer')}</span>
        <span className="font-mono text-4xl font-black tabular-nums text-white" aria-live="off">
          {formatDuration(ms)}
        </span>
      </div>
      {a.finished && <p className="mb-2 font-semibold text-emerald-300">✓ {t('assessment.finished')}</p>}

      {!a.finished && (
        <div className="mb-2 flex gap-2">
          {running ? (
            <button className="btn btn-secondary flex-1" onClick={() => pauseTimer()}>
              ❚❚ {t('assessment.pause')}
            </button>
          ) : (
            <button className="btn btn-secondary flex-1" onClick={() => startTimer()}>
              ▶ {t('assessment.start')}
            </button>
          )}
          <button className="btn btn-success flex-1" onClick={() => finishAssessment()}>
            ✓ {t('assessment.finish')}
          </button>
        </div>
      )}

      {unlocked ? (
        <div className="grid gap-2">
          <button
            className={`btn ${a.revealed ? 'btn-secondary' : 'btn-primary'}`}
            disabled={!a.finished}
            onClick={() => setRevealed(!a.revealed)}
          >
            {a.revealed ? `🙈 ${t('assessment.hide')}` : `👁 ${t('assessment.reveal')}`}
          </button>
          {!a.finished && <p className="text-xs text-slate-400">{t('assessment.revealAfterFinish')}</p>}
          <div className="flex gap-2">
            <button className="btn btn-ghost btn-sm flex-1" onClick={restartAssessment}>
              ↻ {t('assessment.restart')}
            </button>
            <button className="btn btn-ghost btn-sm flex-1" onClick={exitAssessment}>
              ⏏ {t('assessment.exit')}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400">{t('assessment.instructorOnly')}</p>
      )}
    </div>
  );
}
