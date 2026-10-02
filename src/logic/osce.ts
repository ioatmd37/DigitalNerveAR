import { OSCE_RUBRIC, type OsceItemId } from '../config/osceRubric';
import type { LocalizedText } from '../types';
import { RED_STATUSES, type NeedleSide, type NeedleStatus } from './needle';

/**
 * Virtual OSCE ("Mode A") on the mannequin model: the learner performs the
 * station's steps in the app and the rubric items the app can observe are
 * scored automatically. Pure functions only (unit-tested).
 */

export type OsceEventType = 'start' | 'equipment' | 'drug' | 'draw' | 'aspirate' | 'inject' | 'sensation' | 'finish';

export interface OsceEvent {
  type: OsceEventType;
  t: number;
  side?: NeedleSide;
}

export interface OsceSideRecord {
  injectedMl: number;
  /** Aspirated with no blood at the injection position before injecting. */
  aspiratedBefore: boolean;
  /** Aspirated only after injecting on this side. */
  aspiratedAfter: boolean;
  entryOk: boolean;
  tipStatus: NeedleStatus;
  redEvents: NeedleStatus[];
  at: number;
}

export interface OsceState {
  phase: 'idle' | 'running' | 'finished';
  startedAt: number | null;
  finishedAt: number | null;
  syringeMl: number | null;
  needleG: number | null;
  drugId: string | null;
  drawnMl: number;
  /** Volume to give with the next injection (slider). */
  injectVolumeMl: number;
  sides: Partial<Record<NeedleSide, OsceSideRecord>>;
  sensationAt: number | null;
  log: OsceEvent[];
}

export function initialOsceState(): OsceState {
  return {
    phase: 'idle',
    startedAt: null,
    finishedAt: null,
    syringeMl: null,
    needleG: null,
    drugId: null,
    drawnMl: 0,
    injectVolumeMl: 1.5,
    sides: {},
    sensationAt: null,
    log: [],
  };
}

export type OsceLevel = 'full' | 'partial' | 'none' | 'pending';

export interface OsceItemResult {
  id: OsceItemId;
  level: OsceLevel;
  points: number;
  max: number;
  reason: LocalizedText;
}

export interface OsceScore {
  items: OsceItemResult[];
  autoScore: number;
  autoMax: number;
  /** Points left for the instructor to assess (physical-skill items). */
  instructorMax: number;
  elapsedMs: number;
}

const L = (th: string, en: string): LocalizedText => ({ th, en });
const fmt = (n: number) => (Math.round(n * 10) / 10).toString();
const SIDE_TH: Record<NeedleSide, string> = { radial: 'เรเดียล', ulnar: 'อัลนา' };

export function remainingMl(s: OsceState, exceptSide?: NeedleSide): number {
  const used = (Object.entries(s.sides) as [NeedleSide, OsceSideRecord][])
    .filter(([side]) => side !== exceptSide)
    .reduce((sum, [, r]) => sum + r.injectedMl, 0);
  return Math.max(0, s.drawnMl - used);
}

/** Ordering uses positions in the event log (robust even when steps share a timestamp). */
function firstIdx(s: OsceState, type: OsceEventType): number | null {
  const i = s.log.findIndex((e) => e.type === type);
  return i < 0 ? null : i;
}

function lastIdx(s: OsceState, type: OsceEventType): number | null {
  for (let i = s.log.length - 1; i >= 0; i--) if (s.log[i].type === type) return i;
  return null;
}

export function scoreOsce(s: OsceState, now: number = Date.now()): OsceScore {
  const R = OSCE_RUBRIC;
  const sides = Object.entries(s.sides) as [NeedleSide, OsceSideRecord][];
  const both = sides.length === 2;
  const injected = sides.length > 0;
  const elapsedMs = s.startedAt === null ? 0 : (s.finishedAt ?? now) - s.startedAt;

  const verdict = (id: OsceItemId): ((level: OsceLevel, reason: LocalizedText) => OsceItemResult) => {
    const item = R.items.find((i) => i.id === id)!;
    return (level, reason) => ({
      id,
      level,
      reason,
      max: item.points.full,
      points: level === 'full' ? item.points.full : level === 'partial' ? item.points.partial : 0,
    });
  };
  const notInjected = L('ยังไม่ได้ฉีด', 'No injection done');
  const results: OsceItemResult[] = [];

  // 1.1 Equipment
  {
    const v = verdict('1.1');
    if (s.syringeMl === null || s.needleG === null) results.push(v('none', L('ยังไม่ได้เลือกอุปกรณ์', 'Equipment not chosen')));
    else {
      const ok = R.acceptedSyringeMl.includes(s.syringeMl) && R.acceptedNeedleG.includes(s.needleG);
      results.push(
        v(ok ? 'full' : 'partial', L(`เลือก syringe ${s.syringeMl} ml, เข็ม ${s.needleG}G`, `Chose ${s.syringeMl} ml syringe, ${s.needleG}G needle`)),
      );
    }
  }
  // 1.2 Drug
  {
    const v = verdict('1.2');
    const drug = R.drugs.find((d) => d.id === s.drugId);
    if (!drug) results.push(v('none', L('ยังไม่ได้เลือกยา', 'Drug not chosen')));
    else results.push(v(drug.accepted ? 'full' : 'partial', L(`เลือก ${drug.th}`, `Chose ${drug.en}`)));
  }
  // 1.3 Draw volume
  {
    const v = verdict('1.3');
    if (s.drawnMl <= 0) results.push(v('none', L('ยังไม่ได้ดูดยา', 'Nothing drawn')));
    else if (s.drawnMl <= R.maxDrawMl) results.push(v('full', L(`ดูดยา ${fmt(s.drawnMl)} ml`, `Drew ${fmt(s.drawnMl)} ml`)));
    else results.push(v('partial', L(`ดูดยา ${fmt(s.drawnMl)} ml (เกิน ${R.maxDrawMl} ml)`, `Drew ${fmt(s.drawnMl)} ml (over ${R.maxDrawMl} ml)`)));
  }
  // 1.4 Landmark (entry point) on both sides
  {
    const v = verdict('1.4');
    if (!injected) results.push(v('none', notInjected));
    else {
      const bad = sides.filter(([, r]) => !r.entryOk).map(([side]) => side);
      if (both && bad.length === 0) results.push(v('full', L('จุดแทงอยู่ในบริเวณ landmark ทั้งสองด้าน', 'Entry at the landmark on both sides')));
      else
        results.push(
          v(
            'partial',
            bad.length
              ? L(`จุดแทงนอก landmark: ${bad.map((b) => SIDE_TH[b]).join(', ')}`, `Entry outside the landmark: ${bad.join(', ')}`)
              : L('ทำเพียงด้านเดียว', 'Only one side done'),
          ),
        );
    }
  }
  // 1.5 Needle advanced almost to the palmar side (model target) without red events
  {
    const v = verdict('1.5');
    if (!injected) results.push(v('none', notInjected));
    else {
      const issues: string[] = [];
      const issuesEn: string[] = [];
      for (const [side, r] of sides) {
        if (r.tipStatus !== 'target') {
          issues.push(`${SIDE_TH[side]}: ปลายเข็มไม่อยู่ที่ตำแหน่งเป้าหมาย`);
          issuesEn.push(`${side}: tip not at the model target`);
        }
        const red = r.redEvents.filter((e) => RED_STATUSES.includes(e));
        if (red.length) {
          issues.push(`${SIDE_TH[side]}: มีเหตุการณ์สีแดง (${red.join(', ')})`);
          issuesEn.push(`${side}: red events (${red.join(', ')})`);
        }
      }
      if (both && issues.length === 0) results.push(v('full', L('แทงถึงตำแหน่งเป้าหมายทั้งสองด้าน ไม่มีเหตุการณ์สีแดง', 'Target reached on both sides, no red events')));
      else results.push(v('partial', issues.length ? L(issues.join('; '), issuesEn.join('; ')) : L('ทำเพียงด้านเดียว', 'Only one side done')));
    }
  }
  // 1.6 Aspiration before injecting
  {
    const v = verdict('1.6');
    const any = sides.some(([, r]) => r.aspiratedBefore || r.aspiratedAfter);
    if (!injected || !any) results.push(v('none', injected ? L('ไม่ได้ดูดทดสอบ', 'Never aspirated') : notInjected));
    else if (both && sides.every(([, r]) => r.aspiratedBefore)) results.push(v('full', L('ดูดทดสอบก่อนฉีดทั้งสองด้าน', 'Aspirated before injecting on both sides')));
    else {
      const missing = sides.filter(([, r]) => !r.aspiratedBefore).map(([side]) => side);
      results.push(
        v(
          'partial',
          missing.length
            ? L(`ไม่ได้ดูดก่อนฉีด: ${missing.map((m) => SIDE_TH[m]).join(', ')}`, `Not aspirated before injecting: ${missing.join(', ')}`)
            : L('ทำเพียงด้านเดียว', 'Only one side done'),
        ),
      );
    }
  }
  // 1.7 Volume per site
  {
    const v = verdict('1.7');
    if (!injected) results.push(v('none', notInjected));
    else {
      const { min, max } = R.perSiteMl;
      const bad = sides.filter(([, r]) => r.injectedMl < min || r.injectedMl > max);
      const th = sides.map(([side, r]) => `${SIDE_TH[side]} ${fmt(r.injectedMl)} ml`).join(', ');
      const en = sides.map(([side, r]) => `${side} ${fmt(r.injectedMl)} ml`).join(', ');
      results.push(v(both && bad.length === 0 ? 'full' : 'partial', L(th, en)));
    }
  }
  // 1.8 Fingertip sensation test after the block
  {
    const v = verdict('1.8');
    if (s.sensationAt === null) results.push(v('none', L('ไม่ได้ทดสอบความชา', 'Numbness not tested')));
    else if (both && (lastIdx(s, 'sensation') ?? -1) > (lastIdx(s, 'inject') ?? Infinity)) results.push(v('full', L('ทดสอบหลังฉีดครบสองด้าน', 'Tested after both sides were injected')));
    else results.push(v('partial', L('ทดสอบก่อนฉีดครบสองด้าน', 'Tested before both sides were injected')));
  }
  // 1.9, 1.10 and 2.3: instructor
  // 2.1 Sequence and time
  const seq = (() => {
    const v = verdict('2.1');
    if (!injected) return v('none', notInjected);
    const problems: [string, string][] = [];
    const eq = firstIdx(s, 'equipment');
    const dr = firstIdx(s, 'drug');
    const dw = firstIdx(s, 'draw');
    const inj = firstIdx(s, 'inject');
    if (eq === null || dr === null || dw === null || inj === null || !(eq <= dr && dr <= dw && dw <= inj)) {
      problems.push(['ลำดับ อุปกรณ์ → ยา → ดูดยา → ฉีด ไม่ถูกต้อง', 'Order equipment → drug → draw → inject not followed']);
    }
    const sens = lastIdx(s, 'sensation');
    if (sens !== null && sens < (lastIdx(s, 'inject') ?? -1)) problems.push(['ทดสอบความชาก่อนฉีดเสร็จ', 'Numbness tested before finishing the injections']);
    if (elapsedMs > R.timeLimitMin * 60_000) problems.push([`เกินเวลา ${R.timeLimitMin} นาที`, `Over the ${R.timeLimitMin}-minute limit`]);
    if (problems.length === 0) return v('full', L('ลำดับถูกต้องและอยู่ในเวลา (ความนุ่มนวลอาจารย์ประเมิน)', 'Correct order and within time (gentleness judged by the instructor)'));
    return v('partial', L(problems.map((p) => p[0]).join('; '), problems.map((p) => p[1]).join('; ')));
  })();
  // 2.2 Both sides
  const bothSides = (() => {
    const v = verdict('2.2');
    if (both) return v('full', L('ฉีดครบทั้ง radial และ ulnar', 'Both radial and ulnar injected'));
    if (injected) return v('partial', L(`ฉีดเฉพาะด้าน${SIDE_TH[sides[0][0]]}`, `Only the ${sides[0][0]} side`));
    return v('none', notInjected);
  })();

  const pending = (id: OsceItemId): OsceItemResult => {
    const item = R.items.find((i) => i.id === id)!;
    return { id, level: 'pending', points: 0, max: item.points.full, reason: L('อาจารย์ประเมินจากการทำจริงบนหุ่น', 'Assessed by the instructor on the physical mannequin') };
  };

  const byId = new Map<OsceItemId, OsceItemResult>([...results, seq, bothSides].map((r) => [r.id, r]));
  const items = R.items.map((it) => (it.kind === 'instructor' ? pending(it.id) : byId.get(it.id)!));
  const auto = items.filter((i) => i.level !== 'pending');
  return {
    items,
    autoScore: auto.reduce((sum, i) => sum + i.points, 0),
    autoMax: auto.reduce((sum, i) => sum + i.max, 0),
    instructorMax: items.filter((i) => i.level === 'pending').reduce((sum, i) => sum + i.max, 0),
    elapsedMs,
  };
}

export interface OsceAttempt {
  id: string;
  completedAt: string;
  autoScore: number;
  autoMax: number;
  elapsedMs: number;
  items: { id: OsceItemId; points: number; level: OsceLevel }[];
}

export function toAttempt(score: OsceScore, at: Date = new Date()): OsceAttempt {
  return {
    id: `${at.getTime().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    completedAt: at.toISOString(),
    autoScore: score.autoScore,
    autoMax: score.autoMax,
    elapsedMs: score.elapsedMs,
    items: score.items.map((i) => ({ id: i.id, points: i.points, level: i.level })),
  };
}
