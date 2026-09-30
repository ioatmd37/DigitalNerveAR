import type { AssessmentState } from '../types';

export function elapsedMs(a: Pick<AssessmentState, 'startedAt' | 'accumulatedMs'>, now: number): number {
  return a.accumulatedMs + (a.startedAt !== null ? Math.max(0, now - a.startedAt) : 0);
}

export function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
