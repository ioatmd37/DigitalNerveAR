import type { LocalizedText } from '../types';

/**
 * OSCE rubric for the Digital nerve block station (virtual mannequin
 * practice, "Mode A"). Faculty can edit this file to match their own
 * assessment form: item text, points, which choices are accepted, the time
 * limit and the pass mark.
 *
 * Items marked `instructor` cannot be observed by the app (they are
 * physical skills) and are shown as "assessed by the instructor".
 *
 * This is a practice aid on a mannequin model only; the official result of
 * an OSCE is always the examiner's judgement.
 */

export type OsceItemId =
  | '1.1'
  | '1.2'
  | '1.3'
  | '1.4'
  | '1.5'
  | '1.6'
  | '1.7'
  | '1.8'
  | '1.9'
  | '1.10'
  | '2.1'
  | '2.2'
  | '2.3';

export interface OsceItem {
  id: OsceItemId;
  section: 1 | 2;
  text: LocalizedText;
  /** Points for complete / incomplete / not done. */
  points: { full: number; partial: number; none: number };
  /** How the app scores it. */
  kind: 'auto' | 'instructor';
  /** What "incomplete" means on the official form (shown with the result). */
  partialNote?: LocalizedText;
}

export const OSCE_RUBRIC = {
  title: { th: 'แบบประเมินทักษะหัตถการ Digital nerve block', en: 'Digital nerve block skills assessment' } as LocalizedText,
  totalScore: 100,
  passScore: 60,
  /** Time allowed for the virtual station, minutes (used by item 2.1). */
  timeLimitMin: 8,
  /** Accepted equipment (item 1.1). */
  syringeOptionsMl: [3, 5, 10, 20],
  acceptedSyringeMl: [5, 10],
  needleOptionsG: [18, 21, 24, 27],
  acceptedNeedleG: [24],
  /** Drug options (item 1.2). `accepted` = counts as correct. */
  drugs: [
    { id: 'lido1', th: 'Xylocaine 1% (ไม่มี adrenaline)', en: 'Xylocaine 1% (without adrenaline)', accepted: true },
    { id: 'lido1e', th: 'Xylocaine 1% with adrenaline', en: 'Xylocaine 1% with adrenaline', accepted: true },
    { id: 'lido2', th: 'Xylocaine 2% (ไม่มี adrenaline)', en: 'Xylocaine 2% (without adrenaline)', accepted: true },
    { id: 'lido2e', th: 'Xylocaine 2% with adrenaline', en: 'Xylocaine 2% with adrenaline', accepted: true },
    { id: 'nss', th: 'Normal saline (NSS)', en: 'Normal saline (NSS)', accepted: false },
    { id: 'water', th: 'Sterile water', en: 'Sterile water', accepted: false },
  ],
  /** Item 1.3: maximum drawn volume (ml). */
  maxDrawMl: 5,
  /** Item 1.7: accepted volume per injection site (ml). */
  perSiteMl: { min: 1, max: 2 },
  items: [
    {
      id: '1.1',
      section: 1,
      kind: 'auto',
      text: { th: 'เลือกอุปกรณ์ได้ถูกต้อง (syringe 5 หรือ 10 ml, เข็ม No.24)', en: 'Correct equipment (5 or 10 ml syringe, 24G needle)' },
      points: { full: 10, partial: 6, none: 0 },
      partialNote: { th: 'เลือก syringe/เข็มผิดเบอร์', en: 'Wrong syringe or needle size' },
    },
    {
      id: '1.2',
      section: 1,
      kind: 'auto',
      text: { th: 'ใช้ Xylocaine 1% หรือ 2% (with หรือ without adrenaline)', en: 'Xylocaine 1% or 2% (with or without adrenaline)' },
      points: { full: 10, partial: 6, none: 0 },
      partialNote: { th: 'รายละเอียดยาไม่ถูกต้อง/ไม่ครบ', en: 'Drug details incorrect or incomplete' },
    },
    {
      id: '1.3',
      section: 1,
      kind: 'auto',
      text: { th: 'Draw ยาชาปริมาณพอเหมาะ (ไม่เกิน 5 ml)', en: 'Draw an appropriate volume (not more than 5 ml)' },
      points: { full: 5, partial: 3, none: 0 },
    },
    {
      id: '1.4',
      section: 1,
      kind: 'auto',
      text: {
        th: 'Local landmark: ระดับ MCP, ด้าน dorsum, กึ่งกลาง web space หรือ mid-lateral ทั้งสองด้าน',
        en: 'Local landmark: MCP level, dorsum, mid web space or mid-lateral, both sides',
      },
      points: { full: 10, partial: 6, none: 0 },
    },
    {
      id: '1.5',
      section: 1,
      kind: 'auto',
      text: { th: 'แทงเข็มผ่าน web จนเกือบถึงด้าน palmar', en: 'Advance the needle through the web almost to the palmar side' },
      points: { full: 10, partial: 6, none: 0 },
    },
    {
      id: '1.6',
      section: 1,
      kind: 'auto',
      text: { th: 'ก่อนฉีดยาต้อง draw ก่อนว่าไม่มีเลือด', en: 'Aspirate (no blood) before injecting' },
      points: { full: 10, partial: 6, none: 0 },
      partialNote: { th: 'นึกได้ภายหลังฉีดยาแล้ว', en: 'Remembered only after injecting' },
    },
    {
      id: '1.7',
      section: 1,
      kind: 'auto',
      text: { th: 'ใช้ Xylocaine ฉีดตำแหน่งละ 1–2 ml', en: 'Inject 1–2 ml per site' },
      points: { full: 5, partial: 3, none: 0 },
      partialNote: { th: 'ฉีดน้อย/เกิน', en: 'Too little or too much' },
    },
    {
      id: '1.8',
      section: 1,
      kind: 'auto',
      text: { th: 'Test บริเวณปลายนิ้วว่าชาหรือไม่ก่อนทำหัตถการ', en: 'Test fingertip numbness before the procedure' },
      points: { full: 10, partial: 6, none: 0 },
      partialNote: { th: 'ทดสอบก่อนฉีดครบทั้งสองด้าน', en: 'Tested before both sides were injected' },
    },
    {
      id: '1.9',
      section: 1,
      kind: 'instructor',
      text: { th: 'ใช้ Aseptic technique', en: 'Aseptic technique' },
      points: { full: 5, partial: 3, none: 0 },
    },
    {
      id: '1.10',
      section: 1,
      kind: 'instructor',
      text: { th: 'Re-cap ปลอกเข็มถูกวิธี (non-touch technique)', en: 'Correct one-handed (non-touch) re-capping' },
      points: { full: 5, partial: 3, none: 0 },
    },
    {
      id: '2.1',
      section: 2,
      kind: 'auto',
      text: { th: 'ทำหัตถการตามขั้นตอน ครบตามเวลา ด้วยความนุ่มนวล', en: 'Correct sequence, within time, gentle' },
      points: { full: 10, partial: 6, none: 0 },
      partialNote: { th: 'ลำดับไม่ถูกต้องหรือเกินเวลา (ความนุ่มนวลอาจารย์ประเมิน)', en: 'Wrong order or over time (gentleness is judged by the instructor)' },
    },
    {
      id: '2.2',
      section: 2,
      kind: 'auto',
      text: { th: 'ฉีดยาชาครบทั้งด้าน ulnar และ radial', en: 'Both ulnar and radial sides injected' },
      points: { full: 5, partial: 3, none: 0 },
    },
    {
      id: '2.3',
      section: 2,
      kind: 'instructor',
      text: { th: 'ไม่ใช้มือเปล่าจับเข็ม (Safety technique)', en: 'Never handle the needle with bare fingers (safety)' },
      points: { full: 5, partial: 0, none: 0 },
    },
  ] as OsceItem[],
  /** Deductions on the official form (instructor only). */
  deductions: [
    { th: 'มี contamination แล้วรู้ตัวและขอแก้ไขทำใหม่', en: 'Contamination, noticed and corrected', points: -5 },
    { th: 'มี contamination แล้วไม่ได้แก้ไข', en: 'Contamination, not corrected', points: -10 },
  ] as (LocalizedText & { points: number })[],
};
