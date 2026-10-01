import { describe, expect, it } from 'vitest';
import { LAYER_IDS, LAYERS, STRUCTURES } from './anatomy';
import { GUIDED_STEPS } from './guidedSteps';
import { allKeys, lookup, MESSAGES, translate } from './locales';
import { QUIZ_QUESTIONS } from './quiz';
import type { StructureId } from '../types';

describe('locales', () => {
  it('Thai and English define exactly the same keys', () => {
    expect(allKeys(MESSAGES.th).sort()).toEqual(allKeys(MESSAGES.en).sort());
  });

  it('has no empty strings', () => {
    for (const lang of ['th', 'en'] as const) {
      for (const key of allKeys(MESSAGES[lang])) {
        expect(lookup(MESSAGES[lang], key)?.trim(), `${lang}:${key}`).toBeTruthy();
      }
    }
  });

  it('contains the exact required safety disclaimers', () => {
    expect(translate('th', 'safety.full')).toBe(
      'สื่อการเรียนรู้นี้ใช้สำหรับการฝึกกับหุ่นจำลองเท่านั้น ไม่ใช่เครื่องมือแนะนำตำแหน่งฉีดยาหรือการรักษาผู้ป่วยจริง ผู้เรียนต้องปฏิบัติตามแนวทางของสถาบันและอยู่ภายใต้การกำกับของอาจารย์ผู้สอน',
    );
    expect(translate('en', 'safety.full')).toBe(
      'This educational tool is for mannequin-based simulation only. It is not intended to guide injection placement or treatment in real patients. Learners must follow institutional protocols and faculty supervision.',
    );
    expect(translate('en', 'safety.shortAr')).toBe('Educational simulation only. Not for use as guidance on real patients.');
    expect(translate('en', 'safety.short')).toBe('Educational simulation only. Not for use on real patients.');
  });

  it('interpolates variables and falls back to the key', () => {
    expect(translate('en', 'quiz.score', { score: 4, total: 5 })).toBe('Score: 4 / 5');
    expect(translate('th', 'does.not.exist')).toBe('does.not.exist');
  });

  it('uses the required app title and Thai terminology', () => {
    expect(translate('en', 'app.title')).toBe('Digital Nerve Block AR Trainer');
    expect(translate('en', 'app.subtitle')).toBe('Right-Hand Finger Anatomy on a Mannequin');
    expect(translate('th', 'modes.guided')).toBe('โหมดฝึกแบบมีคำแนะนำ');
    expect(translate('th', 'modes.assessment')).toBe('โหมดประเมิน');
    expect(translate('th', 'modes.instructor' as string)).toBe('modes.instructor');
    expect(translate('th', 'instructor.title')).toBe('โหมดอาจารย์');
  });
});

describe('anatomy config', () => {
  it('has unique structure ids with complete bilingual content', () => {
    const ids = STRUCTURES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of STRUCTURES) {
      expect(s.nameTh, s.id).toBeTruthy();
      expect(s.nameEn, s.id).toBeTruthy();
      expect(s.description.th && s.description.en, s.id).toBeTruthy();
      expect(s.educationalNote.th && s.educationalNote.en, s.id).toBeTruthy();
      if (s.warningNote) expect(s.warningNote.th && s.warningNote.en, s.id).toBeTruthy();
      expect(s.color, s.id).toMatch(/^#[0-9a-f]{6}$/i);
      expect(LAYER_IDS).toContain(s.layer);
      expect(s.icon.length, `${s.id} needs a non-color symbol`).toBeGreaterThan(0);
    }
  });

  it('uses the required color scheme', () => {
    const color = (id: StructureId) => STRUCTURES.find((s) => s.id === id)!.color.toLowerCase();
    expect(color('nerve_radial')).toBe('#facc15'); // yellow
    expect(color('artery_ulnar')).toBe('#ef4444'); // red
    expect(color('vein_radial')).toBe('#3b82f6'); // blue
    expect(color('safe_zone_radial')).toBe('#22c55e'); // green
    expect(color('avoid_zone_volar')).toBe('#dc2626'); // red
    expect(color('needle_path_ulnar')).toBe('#06b6d4'); // cyan
  });

  it('every layer has at least one structure', () => {
    for (const l of LAYERS) {
      expect(STRUCTURES.some((s) => s.layer === l.id), l.id).toBe(true);
    }
  });

  it('includes both radial and ulnar nerves and arteries', () => {
    const ids = STRUCTURES.map((s) => s.id);
    for (const id of ['nerve_radial', 'nerve_ulnar', 'artery_radial', 'artery_ulnar'] as StructureId[]) {
      expect(ids).toContain(id);
    }
  });
});

describe('quiz and guided config', () => {
  it('has 5 valid quiz questions whose locale keys exist', () => {
    expect(QUIZ_QUESTIONS).toHaveLength(5);
    for (const q of QUIZ_QUESTIONS) {
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(q.optionKeys.length);
      for (const key of [q.promptKey, q.explanationKey, ...q.optionKeys]) {
        expect(lookup(MESSAGES.en, key), key).toBeDefined();
        expect(lookup(MESSAGES.th, key), key).toBeDefined();
      }
    }
  });

  it('has the 7 guided steps with existing locale keys', () => {
    expect(GUIDED_STEPS).toHaveLength(7);
    for (const s of GUIDED_STEPS) {
      expect(lookup(MESSAGES.en, s.titleKey), s.titleKey).toBeDefined();
      expect(lookup(MESSAGES.th, s.bodyKey), s.bodyKey).toBeDefined();
    }
  });

  it('guided text uses mannequin/educational framing, not patient directions', () => {
    const all = GUIDED_STEPS.map((s) => translate('en', s.bodyKey)).join(' ');
    expect(all).toMatch(/In this mannequin model|In this model|For educational spatial understanding/);
    expect(all).not.toMatch(/\byour patient\b|\bthe patient\b/i);
  });
});
