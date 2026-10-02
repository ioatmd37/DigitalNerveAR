import { useEffect, useState } from 'react';
import { QUIZ_QUESTIONS } from '../../config/quiz';
import { useT } from '../../i18n/useT';
import { createAttempt, isCorrect } from '../../logic/quiz';
import { useAppStore } from '../../store/useAppStore';

type Phase = 'intro' | 'question' | 'result';

export function QuizPanel() {
  const { t, td, language } = useT();
  const attempts = useAppStore((s) => s.quizAttempts);
  const addAttempt = useAppStore((s) => s.addQuizAttempt);
  const clearAttempts = useAppStore((s) => s.clearQuizAttempts);
  const setFeedbackHighlight = useAppStore((s) => s.setFeedbackHighlight);
  const [phase, setPhase] = useState<Phase>('intro');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [startedAt, setStartedAt] = useState<Date>(() => new Date());
  const [lastScore, setLastScore] = useState<number | null>(null);

  useEffect(() => () => setFeedbackHighlight([]), [setFeedbackHighlight]);

  const q = QUIZ_QUESTIONS[index];
  const chosen = answers[q?.id];
  const answered = chosen !== undefined;

  const start = () => {
    setAnswers({});
    setIndex(0);
    setStartedAt(new Date());
    setFeedbackHighlight([]);
    setPhase('question');
  };

  const choose = (i: number) => {
    if (answered) return;
    setAnswers((a) => ({ ...a, [q.id]: i }));
    setFeedbackHighlight(q.highlight ?? []);
  };

  const next = () => {
    setFeedbackHighlight([]);
    if (index < QUIZ_QUESTIONS.length - 1) {
      setIndex(index + 1);
      return;
    }
    const attempt = createAttempt(QUIZ_QUESTIONS, answers, startedAt, language);
    addAttempt(attempt);
    setLastScore(attempt.score);
    setPhase('result');
  };

  const history = (
    <div className="mt-4">
      <h4 className="mb-1 text-sm font-bold text-slate-200">{t('quiz.history')}</h4>
      {attempts.length === 0 ? (
        <p className="muted">{t('quiz.noHistory')}</p>
      ) : (
        <>
          <ul className="max-h-32 space-y-1 overflow-y-auto text-sm">
            {attempts.slice(0, 8).map((a) => (
              <li key={a.id} className="flex justify-between rounded-lg bg-slate-800 px-3 py-1.5">
                <span className="text-slate-300">{new Date(a.completedAt).toLocaleString(language === 'th' ? 'th-TH' : 'en-GB')}</span>
                <span className="font-bold text-white">
                  {a.score}/{a.total}
                </span>
              </li>
            ))}
          </ul>
          <button className="btn btn-ghost btn-sm mt-2" onClick={clearAttempts}>
            {t('quiz.clearHistory')}
          </button>
        </>
      )}
      <p className="mt-2 text-xs text-slate-500">{t('quiz.savedLocally')}</p>
    </div>
  );

  if (phase === 'intro') {
    return (
      <div>
        <p className="mb-3 text-sm leading-relaxed text-slate-300">{t('modeHelp.quiz')}</p>
        <button className="btn btn-primary w-full" onClick={start}>
          {t('quiz.start')}
        </button>
        {history}
      </div>
    );
  }

  if (phase === 'result') {
    return (
      <div>
        <p className="text-3xl font-semibold text-white">{t('quiz.score', { score: lastScore ?? 0, total: QUIZ_QUESTIONS.length })}</p>
        <ul className="mt-3 space-y-1 text-sm">
          {QUIZ_QUESTIONS.map((qq, i) => {
            const ok = isCorrect(qq, answers[qq.id]);
            return (
              <li key={qq.id} className="flex gap-2">
                <span className={ok ? 'text-emerald-400' : 'text-rose-400'} aria-label={ok ? t('quiz.correct') : t('quiz.incorrect')}>
                  {ok ? '✓' : '✕'}
                </span>
                <span className="text-slate-200">
                  {i + 1}. {td(qq.promptKey)}
                </span>
              </li>
            );
          })}
        </ul>
        <button className="btn btn-primary mt-4 w-full" onClick={start}>
          {t('quiz.retry')}
        </button>
        {history}
      </div>
    );
  }

  const correct = answered && isCorrect(q, chosen);
  return (
    <div>
      <p className="text-sm font-semibold text-cyan-300">
        {t('quiz.question', { current: index + 1, total: QUIZ_QUESTIONS.length })}
      </p>
      <h3 className="mb-3 text-lg font-bold leading-snug text-white">{td(q.promptKey)}</h3>
      <div className="grid gap-2">
        {q.optionKeys.map((key, i) => {
          const isChosen = chosen === i;
          const isAnswer = i === q.correctIndex;
          let cls = 'bg-slate-800 hover:bg-slate-700 text-slate-100';
          if (answered && isAnswer) cls = 'bg-emerald-600 text-white border border-emerald-300';
          else if (answered && isChosen) cls = 'bg-rose-700 text-white border border-rose-300';
          else if (answered) cls = 'bg-slate-800 text-slate-400';
          return (
            <button
              key={key}
              onClick={() => choose(i)}
              disabled={answered}
              className={`flex min-h-12 items-center gap-3 rounded-xl px-4 py-2 text-left font-semibold transition disabled:cursor-default ${cls}`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-black/25 text-sm">
                {answered && isAnswer ? '✓' : answered && isChosen ? '✕' : String.fromCharCode(65 + i)}
              </span>
              {td(key)}
            </button>
          );
        })}
      </div>
      {answered && (
        <div
          className={`mt-3 rounded-xl p-3 text-sm border ${correct ? 'bg-emerald-950/60 border-emerald-700' : 'bg-rose-950/60 border-rose-700'}`}
          role="status"
        >
          <p className="font-bold">{correct ? `✓ ${t('quiz.correct')}` : `✕ ${t('quiz.incorrect')}`}</p>
          <p className="mt-1 leading-relaxed text-slate-100">{td(q.explanationKey)}</p>
        </div>
      )}
      <button className="btn btn-primary mt-4 w-full" disabled={!answered} onClick={next}>
        {index < QUIZ_QUESTIONS.length - 1 ? `${t('common.next')}` : t('quiz.finish')}
      </button>
    </div>
  );
}
