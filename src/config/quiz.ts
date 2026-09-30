import type { QuizQuestion } from '../types';

/**
 * Knowledge Check questions about the DISPLAYED MANNEQUIN MODEL.
 * Question/option/explanation text lives in the locale files under `quiz.*`.
 */
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1-nerve-color',
    promptKey: 'quiz.q1.prompt',
    optionKeys: ['quiz.q1.o1', 'quiz.q1.o2', 'quiz.q1.o3', 'quiz.q1.o4'],
    correctIndex: 1,
    explanationKey: 'quiz.q1.explain',
    highlight: ['nerve_radial', 'nerve_ulnar'],
  },
  {
    id: 'q2-radial-side',
    promptKey: 'quiz.q2.prompt',
    optionKeys: ['quiz.q2.o1', 'quiz.q2.o2', 'quiz.q2.o3', 'quiz.q2.o4'],
    correctIndex: 0,
    explanationKey: 'quiz.q2.explain',
    highlight: ['landmark_web_space'],
  },
  {
    id: 'q3-avoid-zone',
    promptKey: 'quiz.q3.prompt',
    optionKeys: ['quiz.q3.o1', 'quiz.q3.o2', 'quiz.q3.o3', 'quiz.q3.o4'],
    correctIndex: 2,
    explanationKey: 'quiz.q3.explain',
    highlight: ['avoid_zone_volar'],
  },
  {
    id: 'q4-entry-marker',
    promptKey: 'quiz.q4.prompt',
    optionKeys: ['quiz.q4.o1', 'quiz.q4.o2', 'quiz.q4.o3', 'quiz.q4.o4'],
    correctIndex: 3,
    explanationKey: 'quiz.q4.explain',
    highlight: ['entry_point_radial', 'entry_point_ulnar'],
  },
  {
    id: 'q5-distal',
    promptKey: 'quiz.q5.prompt',
    optionKeys: ['quiz.q5.o1', 'quiz.q5.o2', 'quiz.q5.o3', 'quiz.q5.o4'],
    correctIndex: 0,
    explanationKey: 'quiz.q5.explain',
    highlight: ['landmark_nail_fold'],
  },
];
