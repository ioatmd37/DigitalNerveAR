import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CALIBRATION } from '../config/appConfig';
import { resetAppStore, useAppStore } from './useAppStore';

const s = () => useAppStore.getState();

describe('app store', () => {
  beforeEach(() => resetAppStore());

  it('defaults to Thai and the landing screen', () => {
    expect(s().language).toBe('th');
    expect(s().screen).toBe('landing');
  });

  it('only unlocks instructor mode with the configured passcode', () => {
    expect(s().unlockInstructor('wrong')).toBe(false);
    expect(s().instructor.unlocked).toBe(false);
    expect(s().unlockInstructor(s().instructor.passcode)).toBe(true);
    expect(s().instructor.unlocked).toBe(true);
  });

  it('calibration panel requires instructor mode', () => {
    s().setActiveTab('calibration');
    expect(s().activeTab).not.toBe('calibration');
    s().unlockInstructor(s().instructor.passcode);
    s().setActiveTab('calibration');
    expect(s().activeTab).toBe('calibration');
  });

  it('the SIMPLE and transthecal technique scenes are teacher-only and closes when instructor mode locks', async () => {
    const { computeViewState } = await import('../logic/visibility');
    const { SIMPLE_STEPS } = await import('../config/simpleSteps');
    s().setActiveTab('simple');
    expect(s().mode).not.toBe('simple');
    s().setMode('simple');
    expect(s().mode).not.toBe('simple');
    s().unlockInstructor(s().instructor.passcode);
    s().setActiveTab('simple');
    expect(s().mode).toBe('simple');
    s().setSimpleStep(99);
    expect(s().simpleStep).toBe(SIMPLE_STEPS.length - 1);
    // Steps show the volar anatomy without the model's avoid zone (the injection is subcutaneous, volar).
    for (let i = 0; i < SIMPLE_STEPS.length; i++) {
      const v = computeViewState({ ...s(), mode: 'simple', simpleStep: i, assessment: { revealed: false } });
      expect(v.layers.skin).toBe(true);
      expect(v.layers.avoidZone).toBe(false);
    }
    s().setActiveTab('transthecal');
    expect(s().mode).toBe('transthecal');
    s().setTransthecalStep(-5);
    expect(s().transthecalStep).toBe(0);
    s().lockInstructor();
    expect(s().mode).toBe('anatomy');
    expect(s().activeTab).toBe('anatomy');
    s().setActiveTab('transthecal');
    expect(s().mode).toBe('anatomy');
  });

  it('saves, reverts and resets calibration', () => {
    s().updateCalibration({ position: { ...DEFAULT_CALIBRATION.position, x: 4 }, markerSizeCm: 6 });
    expect(s().calibration.position.x).toBe(4);
    expect(s().savedCalibration).toBeNull();
    s().saveCalibration();
    expect(s().savedCalibration?.position.x).toBe(4);
    expect(s().savedCalibration?.markerSizeCm).toBe(6);
    expect(s().savedCalibration?.savedAt).toBeTruthy();
    s().updateCalibration({ scale: 1.5 });
    s().revertCalibration();
    expect(s().calibration.scale).toBe(1);
    s().resetCalibration();
    expect(s().calibration.position.x).toBe(DEFAULT_CALIBRATION.position.x);
  });

  it('selects a finger and fine-tunes it independently', () => {
    expect(s().selectedFinger).toBe('index');
    s().selectFinger('ring');
    expect(s().selectedFinger).toBe('ring');
    s().updateFingerCalibration('ring', { lengthCm: 7.4, offset: { x: 0.3, y: 0, z: 0 } });
    expect(s().calibration.fingers.ring.lengthCm).toBe(7.4);
    expect(s().calibration.fingers.ring.offset.x).toBe(0.3);
    expect(s().calibration.fingers.index).toEqual(DEFAULT_CALIBRATION.fingers.index);
    s().resetFingerCalibration('ring');
    expect(s().calibration.fingers.ring).toEqual(DEFAULT_CALIBRATION.fingers.ring);
  });

  it('persists calibration and quiz results to local storage', () => {
    s().updateCalibration({ scale: 1.25 });
    s().saveCalibration();
    const raw = useAppStore.persist.getOptions().storage?.getItem('dnb-ar-trainer:v1');
    const stored = raw as { state: { savedCalibration: { scale: number; version: number }; selectedFinger: string } } | null;
    expect(stored?.state.savedCalibration.scale).toBe(1.25);
    expect(stored?.state.savedCalibration.version).toBe(2);
    expect(stored?.state.selectedFinger).toBe('index');
  });

  it('runs the assessment flow: hide → finish → reveal → exit', () => {
    s().startAssessment('explorer');
    expect(s().mode).toBe('assessment');
    expect(s().assessment.active).toBe(true);
    // Learners cannot switch modes during assessment.
    s().setMode('anatomy');
    expect(s().mode).toBe('assessment');
    // Reveal is only possible after the learner finishes.
    s().setRevealed(true);
    expect(s().assessment.revealed).toBe(false);
    s().finishAssessment(Date.now() + 1000);
    expect(s().assessment.finished).toBe(true);
    expect(s().assessment.accumulatedMs).toBeGreaterThanOrEqual(1000);
    s().setRevealed(true);
    expect(s().assessment.revealed).toBe(true);
    s().exitAssessment();
    expect(s().assessment.active).toBe(false);
    expect(s().mode).toBe('anatomy');
  });

  it('runs a needle practice attempt: insert → aspirate → inject → score', async () => {
    const { evaluateNeedle, scoreAttempt } = await import('../logic/needle');
    s().setMode('needle');
    s().setNeedle({ aimDeg: 43, depthCm: 0.8 });
    s().aspirateNeedle(false);
    expect(s().needle.aspiration).toBe('clear');
    // Any geometry change invalidates the aspiration.
    s().setNeedle({ depthCm: 0.79 });
    expect(s().needle.aspiration).toBe('none');
    s().setNeedle({ depthCm: 0.8 });
    s().aspirateNeedle(false);
    const e = evaluateNeedle(s().needle);
    s().injectNeedle(scoreAttempt(s().needle, e));
    expect(s().needle.results.radial?.score).toBe(4);
    s().recordNeedleEvents(['bone', 'bone', 'artery']);
    expect(s().needle.events).toEqual(['bone', 'artery']);
    s().restartNeedle();
    expect(s().needle.results.radial).toBeUndefined();
    expect(s().needle.events).toEqual([]);
    s().selectNeedleSide('ulnar');
    expect(s().needle.entryThetaDeg).toBe(50);
  });

  it('toggles layers individually and all at once', () => {
    s().toggleLayer('veins');
    expect(s().userLayers.veins).toBe(true);
    s().setAllLayers(false);
    expect(Object.values(s().userLayers).every((v) => !v)).toBe(true);
    s().setAllLayers(true);
    expect(Object.values(s().userLayers).every((v) => v)).toBe(true);
  });
});
