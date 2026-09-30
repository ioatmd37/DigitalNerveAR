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

  it('saves, reverts and resets calibration', () => {
    s().updateCalibration({ position: { ...DEFAULT_CALIBRATION.position, x: 4 } });
    expect(s().calibration.position.x).toBe(4);
    expect(s().savedCalibration).toBeNull();
    s().saveCalibration();
    expect(s().savedCalibration?.position.x).toBe(4);
    expect(s().savedCalibration?.savedAt).toBeTruthy();
    s().updateCalibration({ scale: 1.5 });
    s().revertCalibration();
    expect(s().calibration.scale).toBe(1);
    s().resetCalibration();
    expect(s().calibration.position.x).toBe(DEFAULT_CALIBRATION.position.x);
  });

  it('persists calibration and quiz results to local storage', () => {
    s().updateCalibration({ scale: 1.25 });
    s().saveCalibration();
    const raw = useAppStore.persist.getOptions().storage?.getItem('dnb-ar-trainer:v1');
    const stored = raw as { state: { savedCalibration: { scale: number } } } | null;
    expect(stored?.state.savedCalibration.scale).toBe(1.25);
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

  it('toggles layers individually and all at once', () => {
    s().toggleLayer('veins');
    expect(s().userLayers.veins).toBe(true);
    s().setAllLayers(false);
    expect(Object.values(s().userLayers).every((v) => !v)).toBe(true);
    s().setAllLayers(true);
    expect(Object.values(s().userLayers).every((v) => v)).toBe(true);
  });
});
