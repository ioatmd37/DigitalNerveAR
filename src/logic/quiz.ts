import type { Language, QuizAttempt, QuizQuestion } from '../types';

export function isCorrect(question: QuizQuestion, answer: number | undefined): boolean {
  return answer === question.correctIndex;
}

export function scoreAnswers(questions: QuizQuestion[], answers: Record<string, number>): number {
  return questions.reduce((sum, q) => sum + (isCorrect(q, answers[q.id]) ? 1 : 0), 0);
}

export function createAttempt(
  questions: QuizQuestion[],
  answers: Record<string, number>,
  startedAt: Date,
  language: Language,
  completedAt: Date = new Date(),
): QuizAttempt {
  return {
    id: `${completedAt.getTime().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    answers: { ...answers },
    score: scoreAnswers(questions, answers),
    total: questions.length,
    language,
  };
}

/** Keep the most recent attempts only (local storage is small). */
export const MAX_STORED_ATTEMPTS = 50;

export function appendAttempt(history: QuizAttempt[], attempt: QuizAttempt): QuizAttempt[] {
  return [attempt, ...history].slice(0, MAX_STORED_ATTEMPTS);
}

export function bestScore(history: QuizAttempt[]): number {
  return history.reduce((best, a) => Math.max(best, a.score), 0);
}
