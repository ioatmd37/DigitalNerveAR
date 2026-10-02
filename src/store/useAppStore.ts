import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { appConfig, DEFAULT_CALIBRATION } from '../config/appConfig';
import { DEFAULT_LAYER_VISIBILITY, LAYER_IDS } from '../config/anatomy';
import { DEFAULT_FINGER, defaultFingerCalibration, FINGER_IDS } from '../config/hand';
import { clampCalibration, cloneCalibration } from '../logic/calibration';
import { defaultNeedleState, type NeedleResult, type NeedleSide, type NeedleState, type NeedleStatus } from '../logic/needle';
import { initialOsceState, remainingMl, scoreOsce, toAttempt, type OsceAttempt, type OsceState } from '../logic/osce';
import { evaluateNeedle } from '../logic/needle';
import { digitFor } from '../three/anatomy/layout';
import { appendAttempt } from '../logic/quiz';
import { clampGuidedStep } from '../logic/visibility';
import type {
  AssessmentState,
  CalibrationSettings,
  FingerCalibration,
  FingerId,
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

  /** Change needle position; any geometry change invalidates a previous aspiration. */
  setNeedle: (patch: Partial<Pick<NeedleState, 'entryY' | 'entryThetaDeg' | 'aimDeg' | 'tiltDeg' | 'depthCm' | 'side'>>) => void;
  setNeedleShowAnatomy: (show: boolean) => void;
  selectNeedleSide: (side: NeedleSide) => void;
  restartNeedle: () => void;
  recordNeedleEvents: (events: NeedleStatus[]) => void;
  aspirateNeedle: (blood: boolean) => void;
  injectNeedle: (result: NeedleResult) => void;

  startOsce: () => void;
  osceChooseEquipment: (syringeMl: number, needleG: number) => void;
  osceChooseDrug: (drugId: string) => void;
  osceDraw: (ml: number) => void;
  osceSetInjectVolume: (ml: number) => void;
  /** Returns true if blood was aspirated. */
  osceAspirate: () => boolean;
  /** Returns an error code, or null when the injection was recorded. */
  osceInject: () => 'notInserted' | 'notEnoughDrug' | 'notDrawn' | null;
  osceSensationTest: () => void;
  finishOsce: () => void;
  resetOsce: () => void;
  clearOsceAttempts: () => void;

  selectFinger: (finger: FingerId) => void;
  /** Patch whole-hand calibration (marker size, position, rotation, scale). */
  updateCalibration: (patch: Partial<Omit<CalibrationSettings, 'version' | 'fingers'>>) => void;
  /** Patch one finger's fine-tuning. */
  updateFingerCalibration: (finger: FingerId, patch: Partial<FingerCalibration>) => void;
  resetFingerCalibration: (finger: FingerId) => void;
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
  /** Virtual needle practice (session only, not persisted). */
  needle: NeedleState;
  /** Virtual OSCE station (session only). */
  osce: OsceState;
  /** Completed virtual OSCE attempts (persisted, this device only). */
  osceAttempts: OsceAttempt[];
}

export type AppState = SessionState & TransientState & AppActions;

type PersistedState = Pick<
  AppState,
  'language' | 'savedCalibration' | 'quizAttempts' | 'showLabels' | 'selectedFinger' | 'osceAttempts'
>;

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
    needle: defaultNeedleState('radial'),
    osce: initialOsceState(),
    osceAttempts: [],
    selectedFinger: DEFAULT_FINGER,
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

      setNeedle: (patch) =>
        set((s) => {
          const geometryChanged = (['entryY', 'entryThetaDeg', 'aimDeg', 'tiltDeg', 'depthCm'] as const).some(
            (k) => k in patch && patch[k] !== s.needle[k],
          );
          return {
            needle: {
              ...s.needle,
              ...patch,
              ...(geometryChanged ? { aspiration: 'none' as const, injected: false } : {}),
            },
          };
        }),
      setNeedleShowAnatomy: (showAnatomy) => set((s) => ({ needle: { ...s.needle, showAnatomy } })),
      selectNeedleSide: (side) =>
        set((s) => ({
          needle: { ...defaultNeedleState(side, digitFor(s.selectedFinger)), showAnatomy: s.needle.showAnatomy, results: s.needle.results },
        })),
      restartNeedle: () =>
        set((s) => {
          const results = { ...s.needle.results };
          delete results[s.needle.side];
          return { needle: { ...defaultNeedleState(s.needle.side, digitFor(s.selectedFinger)), showAnatomy: s.needle.showAnatomy, results } };
        }),
      recordNeedleEvents: (events) =>
        set((s) => {
          const fresh = [...new Set(events)].filter((e) => !s.needle.events.includes(e));
          return fresh.length ? { needle: { ...s.needle, events: [...s.needle.events, ...fresh] } } : {};
        }),
      aspirateNeedle: (blood) => set((s) => ({ needle: { ...s.needle, aspiration: blood ? 'blood' : 'clear' } })),
      startOsce: () =>
        set((s) => ({
          mode: 'osce',
          activeTab: 'osce',
          selectedStructure: null,
          needle: { ...defaultNeedleState('radial', digitFor(s.selectedFinger)), showAnatomy: false },
          osce: { ...initialOsceState(), phase: 'running', startedAt: Date.now(), log: [{ type: 'start', t: Date.now() }] },
        })),
      osceChooseEquipment: (syringeMl, needleG) =>
        set((s) => ({ osce: { ...s.osce, syringeMl, needleG, log: [...s.osce.log, { type: 'equipment', t: Date.now() }] } })),
      osceChooseDrug: (drugId) =>
        set((s) => ({ osce: { ...s.osce, drugId, log: [...s.osce.log, { type: 'drug', t: Date.now() }] } })),
      osceDraw: (ml) => set((s) => ({ osce: { ...s.osce, drawnMl: ml, log: [...s.osce.log, { type: 'draw', t: Date.now() }] } })),
      osceSetInjectVolume: (injectVolumeMl) => set((s) => ({ osce: { ...s.osce, injectVolumeMl } })),
      osceAspirate: () => {
        const s = get();
        const e = evaluateNeedle(s.needle, digitFor(s.selectedFinger));
        if (!e.inserted) return false;
        const blood = e.tipStatus === 'artery';
        const side = s.needle.side;
        const rec = s.osce.sides[side];
        set({
          needle: { ...s.needle, aspiration: blood ? 'blood' : 'clear' },
          osce: {
            ...s.osce,
            sides: rec && s.needle.injected ? { ...s.osce.sides, [side]: { ...rec, aspiratedAfter: true } } : s.osce.sides,
            log: [...s.osce.log, { type: 'aspirate', t: Date.now(), side }],
          },
        });
        return blood;
      },
      osceInject: () => {
        const s = get();
        const e = evaluateNeedle(s.needle, digitFor(s.selectedFinger));
        if (!e.inserted) return 'notInserted';
        if (s.osce.drawnMl <= 0) return 'notDrawn';
        const side = s.needle.side;
        if (remainingMl(s.osce, side) + 1e-9 < s.osce.injectVolumeMl) return 'notEnoughDrug';
        const t = Date.now();
        set({
          needle: { ...s.needle, injected: true },
          osce: {
            ...s.osce,
            sides: {
              ...s.osce.sides,
              [side]: {
                injectedMl: s.osce.injectVolumeMl,
                aspiratedBefore: s.needle.aspiration === 'clear',
                aspiratedAfter: false,
                entryOk: e.entryOk,
                tipStatus: e.tipStatus,
                redEvents: [...new Set([...s.needle.events, ...e.pathEvents])],
                at: t,
              },
            },
            log: [...s.osce.log, { type: 'inject', t, side }],
          },
        });
        return null;
      },
      osceSensationTest: () =>
        set((s) => ({ osce: { ...s.osce, sensationAt: Date.now(), log: [...s.osce.log, { type: 'sensation', t: Date.now() }] } })),
      finishOsce: () =>
        set((s) => {
          const t = Date.now();
          const osce: OsceState = { ...s.osce, phase: 'finished', finishedAt: t, log: [...s.osce.log, { type: 'finish', t }] };
          return { osce, osceAttempts: [toAttempt(scoreOsce(osce, t), new Date(t)), ...s.osceAttempts].slice(0, 30) };
        }),
      resetOsce: () => set({ osce: initialOsceState() }),
      clearOsceAttempts: () => set({ osceAttempts: [] }),
      injectNeedle: (result) =>
        set((s) => ({
          needle: { ...s.needle, injected: true, results: { ...s.needle.results, [s.needle.side]: result } },
        })),

      selectFinger: (finger) =>
        set((s) => {
          const selectedFinger = FINGER_IDS.includes(finger) ? finger : DEFAULT_FINGER;
          // A different digit layout (finger / little / thumb) invalidates the needle position and results.
          const needle =
            digitFor(selectedFinger) === digitFor(s.selectedFinger)
              ? s.needle
              : { ...defaultNeedleState(s.needle.side, digitFor(selectedFinger)), showAnatomy: s.needle.showAnatomy };
          return { selectedFinger, selectedStructure: null, needle };
        }),
      updateCalibration: (patch) =>
        set((s) => ({
          calibration: clampCalibration({
            ...s.calibration,
            ...patch,
            position: { ...s.calibration.position, ...patch.position },
            rotationDeg: { ...s.calibration.rotationDeg, ...patch.rotationDeg },
          }),
        })),
      updateFingerCalibration: (finger, patch) =>
        set((s) => {
          const cur = s.calibration.fingers[finger];
          return {
            calibration: clampCalibration({
              ...s.calibration,
              fingers: {
                ...s.calibration.fingers,
                [finger]: { ...cur, ...patch, offset: { ...cur.offset, ...patch.offset } },
              },
            }),
          };
        }),
      resetFingerCalibration: (finger) =>
        set((s) => ({
          calibration: {
            ...s.calibration,
            fingers: { ...s.calibration.fingers, [finger]: defaultFingerCalibration(finger) },
          },
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
      // v2: whole-hand calibration with per-finger fine-tuning.
      version: 2,
      storage: createJSONStorage(safeLocalStorage),
      partialize: (s): PersistedState => ({
        language: s.language,
        savedCalibration: s.savedCalibration,
        quizAttempts: s.quizAttempts,
        showLabels: s.showLabels,
        selectedFinger: s.selectedFinger,
        osceAttempts: s.osceAttempts,
      }),
      // Older persisted state is handled in `merge` (v1 calibrations are dropped).
      migrate: (persisted) => persisted as PersistedState,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PersistedState>;
        // A v1 calibration (single finger, table-mounted marker) does not map onto the hand frame.
        const saved = p.savedCalibration?.version === 2 ? clampCalibration(p.savedCalibration) : null;
        return {
          ...current,
          language: p.language === 'en' || p.language === 'th' ? p.language : current.language,
          showLabels: typeof p.showLabels === 'boolean' ? p.showLabels : current.showLabels,
          selectedFinger: p.selectedFinger && FINGER_IDS.includes(p.selectedFinger) ? p.selectedFinger : current.selectedFinger,
          quizAttempts: Array.isArray(p.quizAttempts) ? p.quizAttempts : [],
          osceAttempts: Array.isArray(p.osceAttempts) ? p.osceAttempts : [],
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
