import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { appConfig, DEFAULT_CALIBRATION } from '../config/appConfig';
import { DEFAULT_LAYER_VISIBILITY, LAYER_IDS } from '../config/anatomy';
import { clampCalibration, cloneCalibration } from '../logic/calibration';
import { appendAttempt } from '../logic/quiz';
import { clampGuidedStep } from '../logic/visibility';
import type {
  AssessmentState,
  CalibrationSettings,
  Language,
  LayerId,
  LearningMode,
  PanelTab,
  QuizAttempt,
  Screen,
  SessionState,
  StructureId,
  TrackingStatus,
} from '../types';

const INITIAL_ASSESSMENT: AssessmentState = {
  active: false,
  revealed: false,
  startedAt: null,
  accumulatedMs: 0,
  finished: false,
};

export interface AppActions {
  setScreen: (screen: Screen) => void;
  setLanguage: (language: Language) => void;
  setMode: (mode: LearningMode) => void;
  setActiveTab: (tab: PanelTab) => void;
  toggleLayer: (id: LayerId) => void;
  setLayer: (id: LayerId, visible: boolean) => void;
  setAllLayers: (visible: boolean) => void;
  setShowLabels: (show: boolean) => void;
  setGuidedStep: (step: number) => void;
  selectStructure: (id: StructureId | null) => void;
  setFeedbackHighlight: (ids: StructureId[]) => void;
  setTrackingStatus: (status: TrackingStatus) => void;
  replayInjectate: () => void;

  updateCalibration: (patch: Partial<Omit<CalibrationSettings, 'version'>>) => void;
  replaceCalibration: (c: CalibrationSettings) => void;
  saveCalibration: () => void;
  resetCalibration: () => void;
  revertCalibration: () => void;

  unlockInstructor: (passcode: string) => boolean;
  lockInstructor: () => void;

  startAssessment: (screen: 'ar' | 'explorer') => void;
  startTimer: (now?: number) => void;
  pauseTimer: (now?: number) => void;
  finishAssessment: (now?: number) => void;
  setRevealed: (revealed: boolean) => void;
  restartAssessment: () => void;
  exitAssessment: () => void;

  addQuizAttempt: (attempt: QuizAttempt) => void;
  clearQuizAttempts: () => void;
  clearAllLocalData: () => void;
}

interface TransientState {
  feedbackHighlight: StructureId[];
  /** Incremented to restart the simulated spread animation. */
  injectateNonce: number;
}

export type AppState = SessionState & TransientState & AppActions;

type PersistedState = Pick<AppState, 'language' | 'savedCalibration' | 'quizAttempts' | 'showLabels'>;

function initialState(): SessionState & TransientState {
  return {
    screen: 'landing',
    language: appConfig.defaultLanguage,
    mode: 'anatomy',
    activeTab: 'anatomy',
    userLayers: { ...DEFAULT_LAYER_VISIBILITY },
    showLabels: true,
    guidedStep: 0,
    selectedStructure: null,
    feedbackHighlight: [],
    injectateNonce: 0,
    calibration: cloneCalibration(DEFAULT_CALIBRATION),
    savedCalibration: null,
    trackingStatus: 'idle',
    assessment: { ...INITIAL_ASSESSMENT },
    instructor: { unlocked: false, passcode: appConfig.instructorPasscode },
    quizAttempts: [],
  };
}

function safeLocalStorage(): Storage {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    // Access can throw in some privacy modes; fall through to memory storage.
  }
  const mem = new Map<string, string>();
  return {
    get length() {
      return mem.size;
    },
    clear: () => mem.clear(),
    getItem: (k) => mem.get(k) ?? null,
    key: (i) => Array.from(mem.keys())[i] ?? null,
    removeItem: (k) => void mem.delete(k),
    setItem: (k, v) => void mem.set(k, v),
  };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState(),

      setScreen: (screen) =>
        set((s) => ({
          screen,
          selectedStructure: null,
          trackingStatus: screen === 'ar' ? s.trackingStatus : 'idle',
        })),
      setLanguage: (language) => set({ language }),
      setMode: (mode) =>
        set((s) => {
          if (s.assessment.active && mode !== 'assessment') return {};
          return { mode, activeTab: mode, selectedStructure: null, feedbackHighlight: [] };
        }),
      setActiveTab: (tab) =>
        set((s) => {
          if (tab === 'calibration') {
            return s.instructor.unlocked ? { activeTab: tab } : {};
          }
          if (s.assessment.active && tab !== 'assessment') return {};
          return { activeTab: tab, mode: tab, selectedStructure: null, feedbackHighlight: [] };
        }),
      toggleLayer: (id) => set((s) => ({ userLayers: { ...s.userLayers, [id]: !s.userLayers[id] } })),
      setLayer: (id, visible) => set((s) => ({ userLayers: { ...s.userLayers, [id]: visible } })),
      setAllLayers: (visible) =>
        set({ userLayers: Object.fromEntries(LAYER_IDS.map((id) => [id, visible])) as SessionState['userLayers'] }),
      setShowLabels: (showLabels) => set({ showLabels }),
      setGuidedStep: (step) => set({ guidedStep: clampGuidedStep(step), selectedStructure: null }),
      selectStructure: (selectedStructure) => set({ selectedStructure }),
      setFeedbackHighlight: (feedbackHighlight) => set({ feedbackHighlight }),
      setTrackingStatus: (trackingStatus) => set({ trackingStatus }),
      replayInjectate: () => set((s) => ({ injectateNonce: s.injectateNonce + 1 })),

      updateCalibration: (patch) =>
        set((s) => ({
          calibration: clampCalibration({
            ...s.calibration,
            ...patch,
            position: { ...s.calibration.position, ...patch.position },
            rotationDeg: { ...s.calibration.rotationDeg, ...patch.rotationDeg },
          }),
        })),
      replaceCalibration: (c) => set({ calibration: clampCalibration(c) }),
      saveCalibration: () =>
        set((s) => {
          const saved = { ...cloneCalibration(s.calibration), savedAt: new Date().toISOString() };
          return { calibration: saved, savedCalibration: cloneCalibration(saved) };
        }),
      resetCalibration: () => set({ calibration: cloneCalibration(DEFAULT_CALIBRATION) }),
      revertCalibration: () =>
        set((s) => ({ calibration: cloneCalibration(s.savedCalibration ?? DEFAULT_CALIBRATION) })),

      unlockInstructor: (passcode) => {
        const ok = passcode.trim() === get().instructor.passcode;
        if (ok) set((s) => ({ instructor: { ...s.instructor, unlocked: true } }));
        return ok;
      },
      lockInstructor: () =>
        set((s) => ({
          instructor: { ...s.instructor, unlocked: false },
          activeTab: s.activeTab === 'calibration' ? s.mode : s.activeTab,
        })),

      startAssessment: (screen) =>
        set({
          screen,
          mode: 'assessment',
          activeTab: 'assessment',
          selectedStructure: null,
          feedbackHighlight: [],
          assessment: { ...INITIAL_ASSESSMENT, active: true, startedAt: Date.now() },
        }),
      startTimer: (now = Date.now()) =>
        set((s) =>
          s.assessment.startedAt !== null || s.assessment.finished
            ? {}
            : { assessment: { ...s.assessment, startedAt: now } },
        ),
      pauseTimer: (now = Date.now()) =>
        set((s) =>
          s.assessment.startedAt === null
            ? {}
            : {
                assessment: {
                  ...s.assessment,
                  startedAt: null,
                  accumulatedMs: s.assessment.accumulatedMs + Math.max(0, now - s.assessment.startedAt),
                },
              },
        ),
      finishAssessment: (now = Date.now()) =>
        set((s) => {
          const running = s.assessment.startedAt !== null ? Math.max(0, now - s.assessment.startedAt) : 0;
          return {
            assessment: {
              ...s.assessment,
              startedAt: null,
              accumulatedMs: s.assessment.accumulatedMs + running,
              finished: true,
            },
          };
        }),
      setRevealed: (revealed) =>
        set((s) => (s.assessment.finished ? { assessment: { ...s.assessment, revealed } } : {})),
      restartAssessment: () =>
        set({ assessment: { ...INITIAL_ASSESSMENT, active: true, startedAt: Date.now() }, selectedStructure: null }),
      exitAssessment: () =>
        set({ assessment: { ...INITIAL_ASSESSMENT }, mode: 'anatomy', activeTab: 'anatomy', selectedStructure: null }),

      addQuizAttempt: (attempt) => set((s) => ({ quizAttempts: appendAttempt(s.quizAttempts, attempt) })),
      clearQuizAttempts: () => set({ quizAttempts: [] }),
      clearAllLocalData: () => {
        const fresh = initialState();
        set({
          ...fresh,
          screen: get().screen,
          instructor: get().instructor,
        });
      },
    }),
    {
      name: appConfig.storageKeys.app,
      version: 1,
      storage: createJSONStorage(safeLocalStorage),
      partialize: (s): PersistedState => ({
        language: s.language,
        savedCalibration: s.savedCalibration,
        quizAttempts: s.quizAttempts,
        showLabels: s.showLabels,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PersistedState>;
        const saved = p.savedCalibration ? clampCalibration(p.savedCalibration) : null;
        return {
          ...current,
          language: p.language === 'en' || p.language === 'th' ? p.language : current.language,
          showLabels: typeof p.showLabels === 'boolean' ? p.showLabels : current.showLabels,
          quizAttempts: Array.isArray(p.quizAttempts) ? p.quizAttempts : [],
          savedCalibration: saved,
          calibration: saved ? cloneCalibration(saved) : current.calibration,
        };
      },
    },
  ),
);

/** For tests: reset the store to a clean initial state. */
export function resetAppStore(): void {
  useAppStore.setState(initialState());
}
