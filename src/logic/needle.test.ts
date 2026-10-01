import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { needleTarget } from '../three/anatomy/layout';
import {
  classifyPoint,
  defaultNeedleState,
  entryFromPoint,
  entryInLearningZone,
  evaluateNeedle,
  needleGeometry,
  scoreAttempt,
  sideOfTheta,
  type NeedleState,
} from './needle';

const radial = (patch: Partial<NeedleState> = {}): NeedleState => ({ ...defaultNeedleState('radial'), ...patch });
const ulnar = (patch: Partial<NeedleState> = {}): NeedleState => ({ ...defaultNeedleState('ulnar'), ...patch });

describe('virtual needle (mannequin model)', () => {
  it('starts outside the skin at a dorsolateral entry inside the learning zone', () => {
    const e = evaluateNeedle(radial());
    expect(e.inserted).toBe(false);
    expect(e.tipStatus).toBe('outside');
    expect(e.entryOk).toBe(true);
    expect(e.side).toBe('radial');
    expect(e.entry.x).toBeLessThan(0); // radial = thumb side = −X on a right hand
  });

  it('positive aim swings the needle toward the palm on both sides', () => {
    for (const s of [radial(), ulnar()]) {
      const straight = needleGeometry(s).dir;
      const palmward = needleGeometry({ ...s, aimDeg: 30 }).dir;
      expect(palmward.z).toBeLessThan(straight.z);
    }
  });

  it('straight in from the dorsolateral entry contacts the bone', () => {
    expect(evaluateNeedle(radial({ depthCm: 0.6 })).tipStatus).toBe('bone');
  });

  it('aimed toward the palm alongside the bone reaches the model target', () => {
    for (const s of [radial({ aimDeg: 43, depthCm: 0.8 }), ulnar({ aimDeg: 43, depthCm: 0.8 })]) {
      const e = evaluateNeedle(s);
      expect(e.tipStatus).toBe('target');
      expect(e.pathEvents).toEqual([]);
    }
  });

  it('flags the artery, nerve and tendon at their centres', () => {
    expect(classifyPoint(new Vector3(-0.68 * 0.96, 1, -0.29 * 0.96))).toBe('artery');
    expect(classifyPoint(new Vector3(0.6 * 0.96, 1, -0.5 * 0.96))).toBe('nerve');
    expect(classifyPoint(new Vector3(0, 3, -0.47))).toBe('tendon');
    expect(classifyPoint(needleTarget('ulnar'))).toBe('target');
  });

  it('going much too deep exits through the far skin (red event)', () => {
    const e = evaluateNeedle(radial({ aimDeg: 43, depthCm: 1.4 }));
    expect(e.tipStatus).toBe('exited');
    expect(e.pathEvents).toContain('exited');
  });

  it('a volar (palm-side) entry is flagged as the model avoid zone or tendon', () => {
    const e = evaluateNeedle({ ...radial(), entryThetaDeg: 270, entryY: 2, depthCm: 0.3 });
    expect(['avoidZone', 'tendon']).toContain(e.tipStatus);
    expect(e.entryOk).toBe(false);
  });

  it('converts tapped skin points back to entry parameters', () => {
    const g = needleGeometry(radial({ entryY: 1.5, entryThetaDeg: 140 }));
    const back = entryFromPoint(g.entry);
    expect(back.entryY).toBeCloseTo(1.5, 5);
    expect(back.entryThetaDeg).toBe(140);
    expect(sideOfTheta(140)).toBe('radial');
    expect(sideOfTheta(40)).toBe('ulnar');
    expect(entryInLearningZone({ entryY: 3.5, entryThetaDeg: 130 })).toBe(false);
  });

  it('scores 4/4 for a clean attempt and penalises red events and skipped aspiration', () => {
    const good = radial({ aimDeg: 43, depthCm: 0.8, aspiration: 'clear' });
    expect(scoreAttempt(good, evaluateNeedle(good)).score).toBe(4);
    const noAsp = { ...good, aspiration: 'none' as const, events: ['artery' as const] };
    const r = scoreAttempt(noAsp, evaluateNeedle(noAsp));
    expect(r.aspiratedFirst).toBe(false);
    expect(r.noRedEvents).toBe(false);
    expect(r.score).toBe(2);
  });
});
