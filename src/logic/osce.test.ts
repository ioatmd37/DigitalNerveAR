import { beforeEach, describe, expect, it } from 'vitest';
import { OSCE_RUBRIC } from '../config/osceRubric';
import { resetAppStore, useAppStore } from '../store/useAppStore';
import { evaluateNeedle } from './needle';
import { scoreOsce } from './osce';

const s = () => useAppStore.getState();
const level = (id: string) => scoreOsce(s().osce).items.find((i) => i.id === id)!;

function blockSide(side: 'radial' | 'ulnar', opts: { aspirate?: boolean; volume?: number; aim?: number; depth?: number } = {}) {
  s().selectNeedleSide(side);
  s().setNeedle({ aimDeg: opts.aim ?? 43, depthCm: opts.depth ?? 0.8 });
  if (opts.aspirate ?? true) s().osceAspirate();
  s().osceSetInjectVolume(opts.volume ?? 1.5);
  return s().osceInject();
}

describe('virtual OSCE scoring (faculty rubric)', () => {
  beforeEach(() => {
    resetAppStore();
    s().startOsce();
  });

  it('rubric totals 100 points with a pass mark of 60', () => {
    expect(OSCE_RUBRIC.items.reduce((sum, i) => sum + i.points.full, 0)).toBe(OSCE_RUBRIC.totalScore);
    expect(OSCE_RUBRIC.passScore).toBe(60);
  });

  it('a correct virtual run scores every automatic item in full (85/85); 15 points remain for the instructor', () => {
    s().osceChooseEquipment(5, 24);
    s().osceChooseDrug('lido1');
    s().osceDraw(4);
    expect(blockSide('radial')).toBeNull();
    expect(blockSide('ulnar')).toBeNull();
    s().osceSensationTest();
    s().finishOsce();
    const score = scoreOsce(s().osce);
    expect(score.items.filter((i) => i.level !== 'pending').every((i) => i.level === 'full')).toBe(true);
    expect(score.autoScore).toBe(85);
    expect(score.autoMax).toBe(85);
    expect(score.instructorMax).toBe(15);
    expect(score.items.filter((i) => i.level === 'pending').map((i) => i.id)).toEqual(['1.9', '1.10', '2.3']);
    expect(s().osceAttempts[0].autoScore).toBe(85);
  });

  it('maps mistakes to the rubric levels', () => {
    s().osceChooseEquipment(20, 18); // wrong syringe and needle
    s().osceChooseDrug('nss'); // wrong drug
    s().osceDraw(8); // > 5 ml
    s().osceSensationTest(); // too early
    blockSide('radial', { aspirate: false, volume: 3 }); // no aspiration, too much
    s().osceAspirate(); // remembered after injecting
    expect(level('1.1').level).toBe('partial');
    expect(level('1.2').level).toBe('partial');
    expect(level('1.3').level).toBe('partial');
    expect(level('1.6').level).toBe('partial');
    expect(level('1.7').level).toBe('partial');
    expect(level('1.8').level).toBe('partial');
    expect(level('2.1').level).toBe('partial'); // sensation tested before injecting
    expect(level('2.2').level).toBe('partial'); // one side only
    expect(level('2.2').points).toBe(3);
  });

  it('scores 0 for steps not done and refuses impossible injections', () => {
    expect(s().osceInject()).toBe('notInserted');
    s().setNeedle({ aimDeg: 43, depthCm: 0.8 });
    expect(s().osceInject()).toBe('notDrawn');
    s().osceDraw(1);
    s().osceSetInjectVolume(2);
    expect(s().osceInject()).toBe('notEnoughDrug');
    const score = scoreOsce(s().osce);
    for (const id of ['1.1', '1.2', '1.4', '1.5', '1.6', '1.7', '1.8', '2.1', '2.2']) {
      expect(score.items.find((i) => i.id === id)!.points, id).toBe(0);
    }
  });

  it('an injection into the model artery shows blood on aspiration and fails 1.5', () => {
    s().osceChooseEquipment(10, 24);
    s().osceChooseDrug('lido2');
    s().osceDraw(5);
    s().selectNeedleSide('radial');
    // Find a needle position whose tip lies inside the model radial artery.
    let found = false;
    for (let aim = 30; aim <= 60 && !found; aim += 1) {
      for (let d = 0.6; d <= 1.3 && !found; d += 0.02) {
        if (evaluateNeedle({ ...s().needle, aimDeg: aim, depthCm: d }).tipStatus === 'artery') {
          s().setNeedle({ aimDeg: aim, depthCm: d });
          found = true;
        }
      }
    }
    expect(found).toBe(true);
    expect(s().osceAspirate()).toBe(true);
    expect(s().needle.aspiration).toBe('blood');
    s().osceInject();
    expect(s().osce.sides.radial!.tipStatus).toBe('artery');
    expect(s().osce.sides.radial!.aspiratedBefore).toBe(false);
    expect(level('1.5').level).toBe('partial');
  });

  it('flags going over the time limit in item 2.1', () => {
    s().osceChooseEquipment(5, 24);
    s().osceChooseDrug('lido1');
    s().osceDraw(4);
    blockSide('radial');
    blockSide('ulnar');
    s().osceSensationTest();
    useAppStore.setState((st) => ({ osce: { ...st.osce, startedAt: Date.now() - (OSCE_RUBRIC.timeLimitMin + 1) * 60_000 } }));
    s().finishOsce();
    expect(level('2.1').level).toBe('partial');
  });
});
