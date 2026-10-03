import type { FingerCalibration, FingerId, LocalizedText, Vec3 } from '../types';

/**
 * Default layout of a RIGHT mannequin hand in the hand frame:
 * origin = dorsal skin over the middle-finger MCP knuckle,
 * +X ulnar, +Y distal, +Z dorsal; centimetres.
 *
 * Typical adult proportions; calibration fine-tunes each digit. The default
 * pose is a flat hand with every digit ABDUCTED (spread away from the middle
 * finger, the thumb radially abducted), which keeps the web spaces open.
 */
export interface FingerPreset {
  id: FingerId;
  nameTh: string;
  nameEn: string;
  /** Short label for compact selectors. */
  shortTh: string;
  shortEn: string;
  /** Dorsal MCP knuckle position (hand frame, cm). */
  knuckle: Vec3;
  /** Default sideways angle, degrees (+ = toward the thumb). */
  splayDeg: number;
  /** Default flexion at the MCP, degrees (+ = toward the palm). */
  flexionDeg: number;
  /** Default rotation about the digit's long axis, degrees (− = nail toward radial). */
  rollDeg: number;
  lengthCm: number;
  widthCm: number;
}

export const FINGERS: FingerPreset[] = [
  {
    id: 'thumb',
    nameTh: 'นิ้วโป้ง',
    nameEn: 'Thumb',
    shortTh: 'โป้ง',
    shortEn: 'Thumb',
    // The thumb ray starts well proximal and volar to the finger knuckles;
    // at rest on a flat hand it is abducted, slightly flexed and pronated
    // so its nail faces dorsoradially.
    knuckle: { x: -5.0, y: -5.6, z: -1.1 },
    splayDeg: 40,
    flexionDeg: 10,
    rollDeg: -55,
    lengthCm: 5.7,
    widthCm: 2.3,
  },
  {
    id: 'index',
    nameTh: 'นิ้วชี้',
    nameEn: 'Index finger',
    shortTh: 'ชี้',
    shortEn: 'Index',
    knuckle: { x: -2.0, y: -0.3, z: -0.25 },
    splayDeg: 14,
    flexionDeg: 0,
    rollDeg: 0,
    lengthCm: 8.0,
    widthCm: 1.9,
  },
  {
    id: 'middle',
    nameTh: 'นิ้วกลาง',
    nameEn: 'Middle finger',
    shortTh: 'กลาง',
    shortEn: 'Middle',
    knuckle: { x: 0, y: 0, z: 0 },
    splayDeg: 0,
    flexionDeg: 0,
    rollDeg: 0,
    lengthCm: 8.8,
    widthCm: 1.9,
  },
  {
    id: 'ring',
    nameTh: 'นิ้วนาง',
    nameEn: 'Ring finger',
    shortTh: 'นาง',
    shortEn: 'Ring',
    knuckle: { x: 1.8, y: -0.4, z: -0.3 },
    splayDeg: -12,
    flexionDeg: 0,
    rollDeg: 0,
    lengthCm: 8.3,
    widthCm: 1.8,
  },
  {
    id: 'little',
    nameTh: 'นิ้วก้อย',
    nameEn: 'Little finger',
    shortTh: 'ก้อย',
    shortEn: 'Little',
    knuckle: { x: 3.4, y: -1.3, z: -0.8 },
    splayDeg: -24,
    flexionDeg: 0,
    rollDeg: 0,
    lengthCm: 6.6,
    widthCm: 1.6,
  },
];

export const FINGER_IDS: FingerId[] = FINGERS.map((f) => f.id);

export function getFinger(id: FingerId): FingerPreset {
  return FINGERS.find((f) => f.id === id) ?? FINGERS[1];
}

export function defaultFingerCalibration(id: FingerId): FingerCalibration {
  const f = getFinger(id);
  return {
    offset: { x: 0, y: 0, z: 0 },
    flexionDeg: f.flexionDeg,
    splayDeg: f.splayDeg,
    rollDeg: f.rollDeg,
    lengthCm: f.lengthCm,
    widthCm: f.widthCm,
  };
}

export const DEFAULT_FINGER: FingerId = 'index';

// ------------------------------------------------------------------ supply

export type SupplyKind = 'palmarNerve' | 'dorsalNerve' | 'artery';

/**
 * Usual origin of each digit's nerves and arteries, per side (common
 * pattern; variations are frequent, e.g. the ring finger's median/ulnar
 * split and median–ulnar communications).
 */
export const DIGIT_SUPPLY: Record<FingerId, Record<SupplyKind, { radial: LocalizedText; ulnar: LocalizedText }>> = {
  thumb: {
    palmarNerve: {
      radial: { th: 'เส้นประสาทมีเดียน (proper palmar digital nerve ของนิ้วโป้ง)', en: 'Median nerve (proper palmar digital nerve of the thumb)' },
      ulnar: { th: 'เส้นประสาทมีเดียน (proper palmar digital nerve ของนิ้วโป้ง)', en: 'Median nerve (proper palmar digital nerve of the thumb)' },
    },
    dorsalNerve: {
      radial: { th: 'แขนงตื้นของเส้นประสาทเรเดียล — ไปถึงโคนเล็บ', en: 'Superficial branch of the radial nerve — reaches the nail fold' },
      ulnar: { th: 'แขนงตื้นของเส้นประสาทเรเดียล — ไปถึงโคนเล็บ', en: 'Superficial branch of the radial nerve — reaches the nail fold' },
    },
    artery: {
      radial: { th: 'princeps pollicis artery (จากหลอดเลือดแดงเรเดียล)', en: 'Princeps pollicis artery (from the radial artery)' },
      ulnar: { th: 'princeps pollicis artery (จากหลอดเลือดแดงเรเดียล)', en: 'Princeps pollicis artery (from the radial artery)' },
    },
  },
  index: {
    palmarNerve: {
      radial: {
        th: 'เส้นประสาทมีเดียน — proper palmar digital nerve ด้านเรเดียลของนิ้วชี้ แยกจากมีเดียนในฝ่ามือ (กลุ่มแขนงเดียวกับเส้นประสาทนิ้วโป้ง) วิ่งเป็นเส้นเดียวตามขอบเรเดียล ไม่แยกที่ง่ามนิ้วแรก และให้แขนงไป lumbrical ตัวที่ 1',
        en: 'Median nerve — the radial proper palmar digital nerve of the index leaves the median nerve in the palm (with the thumb’s digital nerves) and runs as a single nerve along the radial border, not divided at the first web; it also supplies the 1st lumbrical',
      },
      ulnar: { th: 'เส้นประสาทมีเดียน (common palmar digital nerve เส้นที่ 2 แยกที่ง่ามนิ้วที่ 2)', en: 'Median nerve (2nd common palmar digital nerve, dividing at the second web)' },
    },
    dorsalNerve: {
      radial: { th: 'แขนงตื้นของเส้นประสาทเรเดียล วิ่งตามขอบเรเดียลของกระดูกฝ่ามือชิ้นที่ 2 — ถึงราวข้อ PIP', en: 'Superficial radial nerve along the radial border of the 2nd metacarpal — to about the PIP joint' },
      ulnar: { th: 'แขนงตื้นของเส้นประสาทเรเดียล — ถึงราวข้อ PIP', en: 'Superficial radial nerve — to about the PIP joint' },
    },
    artery: {
      radial: { th: 'radialis indicis artery เส้นเดียว (จาก deep palmar arch / princeps pollicis) ไม่แยกที่ง่ามนิ้วแรก', en: 'Radialis indicis artery — a single vessel (deep arch / princeps pollicis), not divided at the first web' },
      ulnar: { th: 'common palmar digital artery จาก superficial palmar arch', en: 'Common palmar digital artery from the superficial palmar arch' },
    },
  },
  middle: {
    palmarNerve: {
      radial: { th: 'เส้นประสาทมีเดียน (common palmar digital nerve เส้นที่ 2)', en: 'Median nerve (2nd common palmar digital nerve)' },
      ulnar: { th: 'เส้นประสาทมีเดียน (common palmar digital nerve เส้นที่ 3)', en: 'Median nerve (3rd common palmar digital nerve)' },
    },
    dorsalNerve: {
      radial: { th: 'แขนงตื้นของเส้นประสาทเรเดียล — ถึงราวข้อ PIP', en: 'Superficial radial nerve — to about the PIP joint' },
      ulnar: { th: 'แขนงตื้นของเส้นประสาทเรเดียล — ถึงราวข้อ PIP', en: 'Superficial radial nerve — to about the PIP joint' },
    },
    artery: {
      radial: { th: 'common palmar digital artery จาก superficial palmar arch', en: 'Common palmar digital artery from the superficial palmar arch' },
      ulnar: { th: 'common palmar digital artery จาก superficial palmar arch', en: 'Common palmar digital artery from the superficial palmar arch' },
    },
  },
  ring: {
    palmarNerve: {
      radial: { th: 'เส้นประสาทมีเดียน (common palmar digital nerve เส้นที่ 3)', en: 'Median nerve (3rd common palmar digital nerve)' },
      ulnar: { th: 'เส้นประสาทอัลนา (common palmar digital nerve เส้นที่ 4)', en: 'Ulnar nerve (4th common palmar digital nerve)' },
    },
    dorsalNerve: {
      radial: { th: 'แขนงตื้นของเส้นประสาทเรเดียล — ถึงราวข้อ PIP', en: 'Superficial radial nerve — to about the PIP joint' },
      ulnar: { th: 'แขนงหลังของเส้นประสาทอัลนา (dorsal branch) — ถึงราวข้อ PIP', en: 'Dorsal branch of the ulnar nerve — to about the PIP joint' },
    },
    artery: {
      radial: { th: 'common palmar digital artery จาก superficial palmar arch', en: 'Common palmar digital artery from the superficial palmar arch' },
      ulnar: { th: 'common palmar digital artery จาก superficial palmar arch', en: 'Common palmar digital artery from the superficial palmar arch' },
    },
  },
  little: {
    palmarNerve: {
      radial: { th: 'เส้นประสาทอัลนา (common palmar digital nerve เส้นที่ 4)', en: 'Ulnar nerve (4th common palmar digital nerve)' },
      ulnar: { th: 'เส้นประสาทอัลนา (proper palmar digital nerve แยกตรงจากแขนงตื้น ไม่ผ่านง่ามนิ้ว)', en: 'Ulnar nerve (proper palmar digital nerve straight from the superficial branch; no web space)' },
    },
    dorsalNerve: {
      radial: { th: 'แขนงหลังของเส้นประสาทอัลนา — ถึงราวข้อ DIP', en: 'Dorsal branch of the ulnar nerve — to about the DIP joint' },
      ulnar: { th: 'แขนงหลังของเส้นประสาทอัลนา — ถึงราวข้อ DIP', en: 'Dorsal branch of the ulnar nerve — to about the DIP joint' },
    },
    artery: {
      radial: { th: 'common palmar digital artery จาก superficial palmar arch', en: 'Common palmar digital artery from the superficial palmar arch' },
      ulnar: { th: 'proper palmar digital artery จากหลอดเลือดแดงอัลนา / superficial palmar arch', en: 'Proper palmar digital artery from the ulnar artery / superficial arch' },
    },
  },
};

/** Short "about this digit" notes shown in the anatomy panel. */
export const DIGIT_NOTES: Record<FingerId, LocalizedText[]> = {
  thumb: [
    {
      th: 'มีกระดูกนิ้วเพียง 2 ท่อน (ท่อนต้นและท่อนปลาย) และข้อ IP ข้อเดียว ไม่มีข้อ PIP/DIP',
      en: 'Only two phalanges (proximal and distal) and a single IP joint — no PIP or DIP.',
    },
    {
      th: 'ด้านฝ่ามือมีเอ็น FPL เส้นเดียว (ไม่มี FDS) ในปลอกเอ็นที่มี pulley A1, oblique และ A2; ด้านหลังมีเอ็น EPL ไปกระดูกท่อนปลาย และ EPB ไปกระดูกท่อนต้น',
      en: 'One flexor (FPL, no FDS) in a sheath with A1, oblique and A2 pulleys; dorsally EPL inserts on the distal phalanx and EPB on the proximal phalanx.',
    },
    {
      th: 'เส้นประสาทด้านหลังมาจากแขนงตื้นของเส้นประสาทเรเดียลและไปไกลถึงโคนเล็บ จึงต้องครอบคลุมทั้งด้านหลังและด้านฝ่ามือ',
      en: 'The dorsal nerves (superficial radial) reach the nail fold, so both dorsal and palmar nerves matter.',
    },
    {
      th: 'ปลอกเอ็น FPL ของนิ้วโป้งต่อเนื่องกับ radial bursa ในฝ่ามือ',
      en: 'The FPL sheath of the thumb continues into the radial bursa in the palm.',
    },
    {
      th: 'นิ้วโป้งหมุนเข้า (pronate) ประมาณ 60–90° เทียบกับนิ้วอื่น เล็บจึงหันไปทางเรเดียล ด้านอัลนาของนิ้วโป้งคือฝั่งง่ามนิ้วแรก (ฝั่งนิ้วชี้)',
      en: 'The thumb is pronated about 60–90° relative to the fingers: its nail faces radially, and its ulnar side is the first web space (toward the index).',
    },
  ],
  index: [
    {
      th: 'ด้านเรเดียลติดกับง่ามนิ้วแรก (ระหว่างนิ้วโป้งกับนิ้วชี้) ด้านอัลนาติดกับง่ามนิ้วที่ 2',
      en: 'Its radial side borders the first web space (thumb–index); its ulnar side the second web space.',
    },
    {
      th: 'เส้นประสาทด้านฝ่ามือทั้งสองข้างมาจากเส้นประสาทมีเดียน ด้านหลังมาจากแขนงตื้นของเส้นประสาทเรเดียลถึงราวข้อ PIP ส่วนด้านหลังของกระดูกท่อนกลาง-ปลายได้จากแขนงด้านหลังของเส้นด้านฝ่ามือ',
      en: 'Both palmar digital nerves are median; the dorsal nerves (superficial radial) reach about the PIP, and the dorsum of the middle and distal phalanges is supplied by dorsal branches of the palmar nerves.',
    },
    {
      th: 'หลอดเลือดด้านเรเดียลคือ radialis indicis เป็นเส้นเดียวจากระบบหลอดเลือดแดงเรเดียล ไม่ได้แยกจาก common palmar digital artery ที่ง่ามนิ้ว ส่วนด้านอัลนามาจาก common palmar digital artery เส้นที่ 2 (superficial palmar arch) ที่แยกที่ง่ามนิ้วที่ 2 และมักเป็นเส้นที่ใหญ่กว่า',
      en: 'The radial-side artery is the radialis indicis, a single vessel from the radial artery system — not a branch of a common palmar digital artery dividing at the web. The ulnar-side artery comes from the 2nd common palmar digital artery (superficial arch), which divides at the second web, and is usually the larger one.',
    },
    {
      th: 'ด้านหลังมีเอ็น EDC และเอ็น extensor indicis (EIP อยู่ด้านอัลนาของ EDC ที่ข้อ MCP) รวมเข้า extensor hood; ด้านเรเดียลมีกล้ามเนื้อ first dorsal interosseous และ lumbrical ตัวที่ 1 (ไม่ได้แสดงในโมเดล)',
      en: 'Dorsally EDC and extensor indicis (EIP, ulnar to EDC at the MCP) join the extensor hood; the first dorsal interosseous and first lumbrical lie on the radial side (not shown in the model).',
    },
  ],
  middle: [
    {
      th: 'เส้นประสาทด้านฝ่ามือทั้งสองข้างมาจากเส้นประสาทมีเดียน',
      en: 'Both palmar digital nerves come from the median nerve.',
    },
  ],
  ring: [
    {
      th: 'ด้านเรเดียลมักได้จากเส้นประสาทมีเดียน ด้านอัลนาจากเส้นประสาทอัลนา (มีความแปรผันได้)',
      en: 'Radial side usually median nerve, ulnar side ulnar nerve (variation is common).',
    },
  ],
  little: [
    {
      th: 'เส้นประสาททั้งด้านฝ่ามือและด้านหลังมาจากเส้นประสาทอัลนา',
      en: 'Both palmar and dorsal nerves come from the ulnar nerve.',
    },
    {
      th: 'ด้านอัลนาไม่มีง่ามนิ้ว: มัดเส้นประสาท-หลอดเลือดด้านนี้วิ่งตรงมาจาก hypothenar',
      en: 'There is no web on the ulnar side: that bundle runs straight in from the hypothenar region.',
    },
    {
      th: 'เส้นประสาทด้านหลัง (แขนงหลังของอัลนา) มักไปไกลถึงราวข้อ DIP มากกว่านิ้วชี้-นิ้วกลาง',
      en: 'The dorsal nerves (dorsal branch of the ulnar nerve) usually reach about the DIP joint, further than in the index and middle fingers.',
    },
    {
      th: 'ปลอกเอ็นงอนิ้วของนิ้วก้อยมักต่อเนื่องกับ ulnar bursa ในฝ่ามือ (นิ้วชี้ กลาง นาง มักปิดที่ระดับข้อ MCP)',
      en: 'The little finger’s flexor sheath usually continues into the ulnar bursa in the palm (the index, middle and ring sheaths usually end at the MCP level).',
    },
    {
      th: 'เอ็น FDS ของนิ้วก้อยอาจเล็กหรือไม่มีในบางคน; ด้านหลังมีเอ็น EDM ร่วมกับ EDC',
      en: 'The little-finger FDS may be small or absent in some people; dorsally EDM joins the EDC slip.',
    },
  ],
};
