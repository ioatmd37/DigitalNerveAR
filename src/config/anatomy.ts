import type { AnatomyLayer, AnatomyStructure, LayerId, LayerVisibility, StructureId } from '../types';

/**
 * Configuration-first anatomy definition for a SIMPLIFIED right-hand finger
 * teaching model on a mannequin. Geometry lives in
 * `src/three/anatomy/ProceduralFingerModel.ts`; everything learner-facing
 * (names, colors, notes) lives here so it can be reviewed by faculty
 * without reading 3D code.
 *
 * Coordinate convention used by the model (anatomical frame):
 *   +X = ulnar (toward middle finger)   −X = radial (toward thumb)
 *   +Y = distal (toward fingertip)      −Y = proximal (toward hand)
 *   +Z = dorsal (nail side)             −Z = volar (palm side)
 */

export const COLORS = {
  skin: '#e8b89a',
  subcutaneous: '#f5d98c',
  bone: '#efe6cf',
  tendon: '#e5e7eb',
  nerve: '#facc15',
  artery: '#ef4444',
  vein: '#3b82f6',
  safe: '#22c55e',
  avoid: '#dc2626',
  entry: '#16a34a',
  needle: '#06b6d4',
  injectate: '#67e8f9',
  landmark: '#f8fafc',
  orientation: '#cbd5e1',
  nail: '#f7e1dc',
} as const;

export const LAYERS: AnatomyLayer[] = [
  { id: 'skin', nameTh: 'ผิวหนัง', nameEn: 'Skin', icon: '◌', color: COLORS.skin, defaultVisible: true, internal: false },
  { id: 'subcutaneous', nameTh: 'ชั้นใต้ผิวหนัง', nameEn: 'Subcutaneous', icon: '≈', color: COLORS.subcutaneous, defaultVisible: false, internal: true },
  { id: 'bone', nameTh: 'กระดูกนิ้ว', nameEn: 'Bone', icon: 'B', color: COLORS.bone, defaultVisible: true, internal: true },
  { id: 'tendon', nameTh: 'เอ็นงอนิ้ว', nameEn: 'Flexor tendon', icon: 'T', color: COLORS.tendon, defaultVisible: true, internal: true },
  { id: 'nerves', nameTh: 'เส้นประสาทดิจิทัล', nameEn: 'Digital nerves', icon: 'N', color: COLORS.nerve, defaultVisible: true, internal: true },
  { id: 'arteries', nameTh: 'หลอดเลือดแดงดิจิทัล', nameEn: 'Digital arteries', icon: 'A', color: COLORS.artery, defaultVisible: true, internal: true },
  { id: 'veins', nameTh: 'หลอดเลือดดำดิจิทัล', nameEn: 'Digital veins', icon: 'V', color: COLORS.vein, defaultVisible: false, internal: true },
  { id: 'safeZones', nameTh: 'บริเวณฝึกที่แนะนำ', nameEn: 'Safe learning zones', icon: '✓', color: COLORS.safe, defaultVisible: true, internal: false },
  { id: 'avoidZone', nameTh: 'บริเวณควรหลีกเลี่ยงในโมเดล', nameEn: 'Avoid zone', icon: '⚠', color: COLORS.avoid, defaultVisible: true, internal: true },
  { id: 'entryPoints', nameTh: 'จุดแทงเข็มในโมเดล', nameEn: 'Entry-point markers', icon: '◎', color: COLORS.entry, defaultVisible: false, internal: false },
  { id: 'needlePath', nameTh: 'แนวทิศทางเข็ม', nameEn: 'Needle path', icon: '➜', color: COLORS.needle, defaultVisible: false, internal: true },
  { id: 'injectate', nameTh: 'การกระจายของยาชา (จำลอง)', nameEn: 'Simulated anesthetic spread', icon: '◍', color: COLORS.injectate, defaultVisible: false, internal: true },
  { id: 'landmarks', nameTh: 'จุดสังเกตบนผิว', nameEn: 'Surface landmarks', icon: '•', color: COLORS.landmark, defaultVisible: true, internal: false },
  { id: 'orientation', nameTh: 'ทิศทางอ้างอิง', nameEn: 'Orientation axes', icon: '✥', color: COLORS.orientation, defaultVisible: true, internal: false },
];

/** Layers shown in the Layer-by-Layer toggle list, in display order. */
export const LAYER_IDS: LayerId[] = LAYERS.map((l) => l.id);

export const INTERNAL_LAYERS: LayerId[] = LAYERS.filter((l) => l.internal).map((l) => l.id);

export function layerVisibility(visible: LayerId[]): LayerVisibility {
  return Object.fromEntries(LAYER_IDS.map((id) => [id, visible.includes(id)])) as LayerVisibility;
}

export const DEFAULT_LAYER_VISIBILITY: LayerVisibility = layerVisibility(
  LAYERS.filter((l) => l.defaultVisible).map((l) => l.id),
);

const SIMPLIFIED_TH = 'โมเดลนี้เป็นกายวิภาคแบบย่อเพื่อการสอนบนหุ่นจำลองเท่านั้น';
const SIMPLIFIED_EN = 'This is a simplified teaching representation on a mannequin model only.';

export const STRUCTURES: AnatomyStructure[] = [
  {
    id: 'skin',
    nameTh: 'ผิวหนัง',
    nameEn: 'Skin envelope',
    icon: '◌',
    color: COLORS.skin,
    layer: 'skin',
    defaultVisible: true,
    showLabel: false,
    description: {
      th: 'เปลือกผิวหนังโปร่งแสงของนิ้วมือขวาที่เลือกในหุ่นจำลอง',
      en: 'Semi-transparent skin envelope of the selected mannequin right-hand finger.',
    },
    educationalNote: {
      th: `ใช้ผิวหนังเพื่อเชื่อมโยงจุดสังเกตภายนอกกับโครงสร้างภายใน ${SIMPLIFIED_TH}`,
      en: `Use the skin to relate external landmarks to internal structures. ${SIMPLIFIED_EN}`,
    },
  },
  {
    id: 'nail',
    nameTh: 'เล็บ (ด้านหลังนิ้ว)',
    nameEn: 'Nail (dorsal cue)',
    icon: '▭',
    color: COLORS.nail,
    layer: 'skin',
    defaultVisible: true,
    showLabel: false,
    description: {
      th: 'เล็บอยู่ด้านหลัง (dorsal) ของนิ้ว ใช้ยืนยันการวางแนวของหุ่น',
      en: 'The nail marks the dorsal side of the finger and helps confirm mannequin orientation.',
    },
    educationalNote: {
      th: 'ถ้ามองเห็นเล็บ แปลว่ากำลังมองจากด้านหลังของนิ้ว',
      en: 'If you can see the nail, you are looking at the dorsal side.',
    },
  },
  {
    id: 'subcutaneous',
    nameTh: 'ชั้นใต้ผิวหนัง',
    nameEn: 'Subcutaneous tissue',
    icon: '≈',
    color: COLORS.subcutaneous,
    layer: 'subcutaneous',
    defaultVisible: true,
    showLabel: true,
    description: {
      th: 'ชั้นไขมันและเนื้อเยื่อเกี่ยวพันใต้ผิวหนังแบบย่อ',
      en: 'Simplified fatty and connective tissue layer beneath the skin.',
    },
    educationalNote: {
      th: 'ในโมเดลนี้ มัดเส้นประสาทและหลอดเลือดอยู่ภายในชั้นนี้ ใกล้ด้านข้างค่อนไปทางฝ่ามือ',
      en: 'In this model, the neurovascular bundles run within this layer on the volar-lateral sides.',
    },
  },
  {
    id: 'metacarpal_head',
    nameTh: 'หัวกระดูกฝ่ามือ',
    nameEn: 'Metacarpal head',
    icon: 'B',
    color: COLORS.bone,
    layer: 'bone',
    defaultVisible: true,
    showLabel: false,
    description: {
      th: 'ปลายกระดูกฝ่ามือของนิ้วที่เลือก บริเวณข้อโคนนิ้ว (MCP)',
      en: 'Distal end of the selected finger’s metacarpal at the MCP joint region.',
    },
    educationalNote: {
      th: 'ใช้เป็นจุดอ้างอิงด้านต้น (proximal) ของนิ้ว',
      en: 'A proximal reference point for the finger.',
    },
  },
  {
    id: 'phalanx_proximal',
    nameTh: 'กระดูกนิ้วท่อนต้น',
    nameEn: 'Proximal phalanx',
    icon: 'B',
    color: COLORS.bone,
    layer: 'bone',
    defaultVisible: true,
    showLabel: true,
    description: {
      th: 'กระดูกนิ้วท่อนต้น ตำแหน่งหลักของบริเวณฝึกในโมเดลนี้',
      en: 'Proximal phalanx — the main region used for the learning zones in this model.',
    },
    educationalNote: {
      th: 'ในโมเดลนี้ มัดเส้นประสาทและหลอดเลือดวิ่งขนานกับกระดูกทางด้านข้างค่อนไปทางฝ่ามือ',
      en: 'In this model, the neurovascular bundles run alongside the bone on its volar-lateral aspects.',
    },
  },
  {
    id: 'phalanx_middle',
    nameTh: 'กระดูกนิ้วท่อนกลาง',
    nameEn: 'Middle phalanx',
    icon: 'B',
    color: COLORS.bone,
    layer: 'bone',
    defaultVisible: true,
    showLabel: false,
    description: { th: 'กระดูกนิ้วท่อนกลาง (แบบย่อ)', en: 'Middle phalanx (simplified).' },
    educationalNote: {
      th: 'อยู่ระหว่างข้อ PIP และข้อ DIP',
      en: 'Lies between the PIP and DIP joints.',
    },
  },
  {
    id: 'phalanx_distal',
    nameTh: 'กระดูกนิ้วท่อนปลาย',
    nameEn: 'Distal phalanx',
    icon: 'B',
    color: COLORS.bone,
    layer: 'bone',
    defaultVisible: true,
    showLabel: false,
    description: { th: 'กระดูกนิ้วท่อนปลาย (แบบย่อ)', en: 'Distal phalanx (simplified).' },
    educationalNote: {
      th: 'อยู่ใต้เล็บ ปลายสุดของนิ้ว',
      en: 'Lies beneath the nail at the tip of the finger.',
    },
  },
  {
    id: 'flexor_tendon',
    nameTh: 'เอ็นงอนิ้ว',
    nameEn: 'Flexor tendon',
    icon: 'T',
    color: COLORS.tendon,
    layer: 'tendon',
    defaultVisible: true,
    showLabel: true,
    description: {
      th: 'เอ็นงอนิ้วแบบย่อ วิ่งตามแนวกลางด้านฝ่ามือ',
      en: 'Simplified flexor tendon running along the volar midline.',
    },
    educationalNote: {
      th: 'ในโมเดลนี้ เอ็นงอนิ้วอยู่ด้านฝ่ามือของกระดูก ระหว่างมัดเส้นประสาททั้งสองข้าง',
      en: 'In this model, the flexor tendon lies volar to the bone, between the two neurovascular bundles.',
    },
    warningNote: {
      th: 'อยู่ภายในบริเวณควรหลีกเลี่ยงด้านฝ่ามือของโมเดล',
      en: 'Located inside the model’s volar avoid zone.',
    },
  },
  {
    id: 'nerve_radial',
    nameTh: 'เส้นประสาทดิจิทัลด้านเรเดียล',
    nameEn: 'Radial digital nerve',
    icon: 'N',
    color: COLORS.nerve,
    layer: 'nerves',
    defaultVisible: true,
    showLabel: true,
    description: {
      th: 'เส้นประสาทดิจิทัลฝั่งนิ้วโป้ง (เรเดียล) แสดงเป็นท่อสีเหลือง',
      en: 'Digital nerve on the thumb (radial) side, shown as a yellow tube.',
    },
    educationalNote: {
      th: 'ในโมเดลนี้ เส้นประสาทอยู่ด้านข้างค่อนไปทางฝ่ามือ และอยู่ด้านฝ่ามือของหลอดเลือดแดง',
      en: 'In this model the nerve lies volar-lateral, on the volar side of the artery.',
    },
    warningNote: {
      th: 'โครงสร้างสำคัญ — อยู่ในบริเวณควรหลีกเลี่ยงของโมเดล',
      en: 'Critical structure — lies within the model avoid zone.',
    },
  },
  {
    id: 'nerve_ulnar',
    nameTh: 'เส้นประสาทดิจิทัลด้านอัลนา',
    nameEn: 'Ulnar digital nerve',
    icon: 'N',
    color: COLORS.nerve,
    layer: 'nerves',
    defaultVisible: true,
    showLabel: true,
    description: {
      th: 'เส้นประสาทดิจิทัลฝั่งนิ้วกลาง (อัลนา) แสดงเป็นท่อสีเหลือง',
      en: 'Digital nerve on the middle-finger (ulnar) side, shown as a yellow tube.',
    },
    educationalNote: {
      th: 'ในโมเดลนี้ มีเส้นประสาทหนึ่งเส้นในแต่ละข้างของนิ้ว',
      en: 'In this model there is one digital nerve on each side of the finger.',
    },
    warningNote: {
      th: 'โครงสร้างสำคัญ — อยู่ในบริเวณควรหลีกเลี่ยงของโมเดล',
      en: 'Critical structure — lies within the model avoid zone.',
    },
  },
  {
    id: 'artery_radial',
    nameTh: 'หลอดเลือดแดงดิจิทัลด้านเรเดียล',
    nameEn: 'Radial digital artery',
    icon: 'A',
    color: COLORS.artery,
    layer: 'arteries',
    defaultVisible: true,
    showLabel: true,
    description: {
      th: 'หลอดเลือดแดงดิจิทัลฝั่งเรเดียล แสดงเป็นท่อสีแดง',
      en: 'Radial-side digital artery, shown as a red tube.',
    },
    educationalNote: {
      th: 'ในโมเดลนี้ หลอดเลือดแดงวิ่งคู่กับเส้นประสาทเป็นมัดเดียวกัน',
      en: 'In this model the artery travels with the nerve as a neurovascular bundle.',
    },
    warningNote: {
      th: 'แนวคิดความปลอดภัย: หลีกเลี่ยงการฉีดเข้าหลอดเลือด',
      en: 'Safety concept: avoid intravascular injection.',
    },
  },
  {
    id: 'artery_ulnar',
    nameTh: 'หลอดเลือดแดงดิจิทัลด้านอัลนา',
    nameEn: 'Ulnar digital artery',
    icon: 'A',
    color: COLORS.artery,
    layer: 'arteries',
    defaultVisible: true,
    showLabel: true,
    description: {
      th: 'หลอดเลือดแดงดิจิทัลฝั่งอัลนา แสดงเป็นท่อสีแดง',
      en: 'Ulnar-side digital artery, shown as a red tube.',
    },
    educationalNote: {
      th: 'ในโมเดลนี้ หลอดเลือดแดงอยู่ด้านหลังเล็กน้อย (dorsal) เมื่อเทียบกับเส้นประสาท',
      en: 'In this model the artery sits slightly dorsal to its companion nerve.',
    },
    warningNote: {
      th: 'แนวคิดความปลอดภัย: หลีกเลี่ยงการฉีดเข้าหลอดเลือด',
      en: 'Safety concept: avoid intravascular injection.',
    },
  },
  {
    id: 'vein_radial',
    nameTh: 'หลอดเลือดดำดิจิทัลด้านเรเดียล',
    nameEn: 'Radial dorsal digital vein',
    icon: 'V',
    color: COLORS.vein,
    layer: 'veins',
    defaultVisible: true,
    showLabel: true,
    description: {
      th: 'หลอดเลือดดำตื้นด้านหลังนิ้วแบบย่อ (เลือกแสดงได้)',
      en: 'Simplified superficial dorsal vein (optional layer).',
    },
    educationalNote: {
      th: 'ในโมเดลนี้ หลอดเลือดดำอยู่ตื้นกว่าและค่อนไปทางด้านหลังนิ้ว',
      en: 'In this model veins are more superficial and dorsal.',
    },
  },
  {
    id: 'vein_ulnar',
    nameTh: 'หลอดเลือดดำดิจิทัลด้านอัลนา',
    nameEn: 'Ulnar dorsal digital vein',
    icon: 'V',
    color: COLORS.vein,
    layer: 'veins',
    defaultVisible: true,
    showLabel: false,
    description: {
      th: 'หลอดเลือดดำตื้นด้านหลังนิ้วแบบย่อ (เลือกแสดงได้)',
      en: 'Simplified superficial dorsal vein (optional layer).',
    },
    educationalNote: {
      th: 'ในโมเดลนี้ หลอดเลือดดำอยู่ตื้นกว่าและค่อนไปทางด้านหลังนิ้ว',
      en: 'In this model veins are more superficial and dorsal.',
    },
  },
  {
    id: 'safe_zone_radial',
    nameTh: 'บริเวณฝึกที่แนะนำ (เรเดียล)',
    nameEn: 'Safe learning zone (radial)',
    icon: '✓',
    color: COLORS.safe,
    layer: 'safeZones',
    defaultVisible: true,
    showLabel: true,
    description: {
      th: 'แถบสีเขียวโปร่งแสง (ลายจุด) ด้านหลัง-ข้างของโคนนิ้วฝั่งเรเดียล',
      en: 'Transparent green (dotted) patch on the dorsolateral base of the finger, radial side.',
    },
    educationalNote: {
      th: 'ในหุ่นจำลองนี้ บริเวณนี้คือโซนฝึกที่กำหนดไว้สำหรับการเรียนรู้เชิงพื้นที่เท่านั้น',
      en: 'In this mannequin model, this is the designated learning zone for spatial understanding only.',
    },
    warningNote: {
      th: 'ไม่ใช่การกำหนดตำแหน่งฉีดยาที่ปลอดภัยในผู้ป่วยจริง',
      en: 'This does not determine a safe injection site on a real patient.',
    },
  },
  {
    id: 'safe_zone_ulnar',
    nameTh: 'บริเวณฝึกที่แนะนำ (อัลนา)',
    nameEn: 'Safe learning zone (ulnar)',
    icon: '✓',
    color: COLORS.safe,
    layer: 'safeZones',
    defaultVisible: true,
    showLabel: true,
    description: {
      th: 'แถบสีเขียวโปร่งแสง (ลายจุด) ด้านหลัง-ข้างของโคนนิ้วฝั่งอัลนา',
      en: 'Transparent green (dotted) patch on the dorsolateral base of the finger, ulnar side.',
    },
    educationalNote: {
      th: 'ในหุ่นจำลองนี้ บริเวณนี้คือโซนฝึกที่กำหนดไว้สำหรับการเรียนรู้เชิงพื้นที่เท่านั้น',
      en: 'In this mannequin model, this is the designated learning zone for spatial understanding only.',
    },
    warningNote: {
      th: 'ไม่ใช่การกำหนดตำแหน่งฉีดยาที่ปลอดภัยในผู้ป่วยจริง',
      en: 'This does not determine a safe injection site on a real patient.',
    },
  },
  {
    id: 'avoid_zone_volar',
    nameTh: 'บริเวณควรหลีกเลี่ยงในโมเดล (ด้านฝ่ามือ)',
    nameEn: 'Volar avoid zone (model)',
    icon: '⚠',
    color: COLORS.avoid,
    layer: 'avoidZone',
    defaultVisible: true,
    showLabel: true,
    description: {
      th: 'บริเวณสีแดงโปร่งแสง (ลายเส้นทแยง) ด้านฝ่ามือ ครอบคลุมเส้นประสาท หลอดเลือดแดง และเอ็นงอนิ้ว',
      en: 'Transparent red (diagonal-hatched) volar region covering the digital nerves, arteries and flexor tendon.',
    },
    educationalNote: {
      th: 'ในโมเดลนี้ ใช้แสดงบริเวณที่มีโครงสร้างสำคัญหนาแน่นด้านฝ่ามือ',
      en: 'In this model it highlights the volar region where critical structures are concentrated.',
    },
    warningNote: {
      th: 'บริเวณหลีกเลี่ยงในโมเดลการเรียนรู้ ไม่ใช่แผนที่ความเสี่ยงของผู้ป่วยจริง',
      en: 'A learning-model avoid region, not a risk map for real patients.',
    },
  },
  {
    id: 'entry_point_radial',
    nameTh: 'จุดแทงเข็มในโมเดล (เรเดียล)',
    nameEn: 'Model entry marker (radial)',
    icon: '◎',
    color: COLORS.entry,
    layer: 'entryPoints',
    defaultVisible: true,
    showLabel: true,
    description: {
      th: 'วงกลมสีเขียวบนบริเวณฝึกฝั่งเรเดียลของหุ่นจำลอง',
      en: 'Green circle on the radial mannequin learning zone.',
    },
    educationalNote: {
      th: 'เพื่อความเข้าใจเชิงพื้นที่: จุดนี้แสดงตำแหน่งเริ่มต้นของเข็มในโมเดลสาธิต',
      en: 'For educational spatial understanding: shows where the demonstration needle starts in this model.',
    },
    warningNote: {
      th: 'ใช้กับหุ่นจำลองเท่านั้น',
      en: 'For the mannequin only.',
    },
  },
  {
    id: 'entry_point_ulnar',
    nameTh: 'จุดแทงเข็มในโมเดล (อัลนา)',
    nameEn: 'Model entry marker (ulnar)',
    icon: '◎',
    color: COLORS.entry,
    layer: 'entryPoints',
    defaultVisible: true,
    showLabel: true,
    description: {
      th: 'วงกลมสีเขียวบนบริเวณฝึกฝั่งอัลนาของหุ่นจำลอง',
      en: 'Green circle on the ulnar mannequin learning zone.',
    },
    educationalNote: {
      th: 'เพื่อความเข้าใจเชิงพื้นที่: จุดนี้แสดงตำแหน่งเริ่มต้นของเข็มในโมเดลสาธิต',
      en: 'For educational spatial understanding: shows where the demonstration needle starts in this model.',
    },
    warningNote: {
      th: 'ใช้กับหุ่นจำลองเท่านั้น',
      en: 'For the mannequin only.',
    },
  },
  {
    id: 'needle_path_radial',
    nameTh: 'แนวทิศทางเข็มในโมเดล (เรเดียล)',
    nameEn: 'Model needle direction (radial)',
    icon: '➜',
    color: COLORS.needle,
    layer: 'needlePath',
    defaultVisible: true,
    showLabel: true,
    description: {
      th: 'ลูกศรสีฟ้าอมเขียวแสดงทิศทางเข็มจากด้านหลัง-ข้าง ไปทางด้านฝ่ามือ ขนานกับกระดูก',
      en: 'Cyan arrow showing a dorsolateral-to-volar model direction alongside the bone.',
    },
    educationalNote: {
      th: 'ในโมเดลนี้ ปลายลูกศรหยุดข้างกระดูก ใกล้แต่ไม่เข้าไปในมัดเส้นประสาทและหลอดเลือด',
      en: 'In this model the arrow tip stops beside the bone, near — not into — the neurovascular bundle.',
    },
    warningNote: {
      th: 'ภาพประกอบการสอน ไม่ใช่แนวทางการฉีดในผู้ป่วย',
      en: 'Teaching illustration, not patient injection guidance.',
    },
  },
  {
    id: 'needle_path_ulnar',
    nameTh: 'แนวทิศทางเข็มในโมเดล (อัลนา)',
    nameEn: 'Model needle direction (ulnar)',
    icon: '➜',
    color: COLORS.needle,
    layer: 'needlePath',
    defaultVisible: true,
    showLabel: true,
    description: {
      th: 'ลูกศรสีฟ้าอมเขียวแสดงทิศทางเข็มจากด้านหลัง-ข้าง ไปทางด้านฝ่ามือ ขนานกับกระดูก',
      en: 'Cyan arrow showing a dorsolateral-to-volar model direction alongside the bone.',
    },
    educationalNote: {
      th: 'ในโมเดลนี้ ปลายลูกศรหยุดข้างกระดูก ใกล้แต่ไม่เข้าไปในมัดเส้นประสาทและหลอดเลือด',
      en: 'In this model the arrow tip stops beside the bone, near — not into — the neurovascular bundle.',
    },
    warningNote: {
      th: 'ภาพประกอบการสอน ไม่ใช่แนวทางการฉีดในผู้ป่วย',
      en: 'Teaching illustration, not patient injection guidance.',
    },
  },
  {
    id: 'injectate_radial',
    nameTh: 'การกระจายของยาชาจำลอง (เรเดียล)',
    nameEn: 'Simulated spread (radial)',
    icon: '◍',
    color: COLORS.injectate,
    layer: 'injectate',
    defaultVisible: true,
    showLabel: true,
    description: {
      th: 'ทรงกลมโปร่งแสงเคลื่อนไหว แสดงแนวคิดการกระจายของยารอบมัดเส้นประสาท',
      en: 'Animated translucent halo illustrating the concept of spread around the bundle.',
    },
    educationalNote: {
      th: 'เป็นภาพเชิงแนวคิด ไม่ได้จำลองปริมาตร ความดัน หรือเภสัชวิทยาจริง',
      en: 'Conceptual only — does not model real volume, pressure or pharmacology.',
    },
  },
  {
    id: 'injectate_ulnar',
    nameTh: 'การกระจายของยาชาจำลอง (อัลนา)',
    nameEn: 'Simulated spread (ulnar)',
    icon: '◍',
    color: COLORS.injectate,
    layer: 'injectate',
    defaultVisible: true,
    showLabel: false,
    description: {
      th: 'ทรงกลมโปร่งแสงเคลื่อนไหว แสดงแนวคิดการกระจายของยารอบมัดเส้นประสาท',
      en: 'Animated translucent halo illustrating the concept of spread around the bundle.',
    },
    educationalNote: {
      th: 'เป็นภาพเชิงแนวคิด ไม่ได้จำลองปริมาตร ความดัน หรือเภสัชวิทยาจริง',
      en: 'Conceptual only — does not model real volume, pressure or pharmacology.',
    },
  },
  {
    id: 'landmark_mcp',
    nameTh: 'ข้อโคนนิ้ว (MCP)',
    nameEn: 'MCP knuckle',
    icon: '•',
    color: COLORS.landmark,
    layer: 'landmarks',
    defaultVisible: true,
    showLabel: true,
    description: {
      th: 'ปุ่มข้อโคนนิ้วด้านหลัง จุดอ้างอิงด้านต้นของนิ้ว',
      en: 'Dorsal MCP knuckle — the proximal reference of the finger.',
    },
    educationalNote: {
      th: 'ใช้จุดนี้จัดแนวโคนนิ้วเสมือนกับหุ่นจริงระหว่างการปรับเทียบ',
      en: 'Use this point to align the virtual finger base with the mannequin during calibration.',
    },
  },
  {
    id: 'landmark_web_space',
    nameTh: 'ง่ามนิ้ว (ฝั่งเรเดียล)',
    nameEn: 'Web space (radial)',
    icon: '•',
    color: COLORS.landmark,
    layer: 'landmarks',
    defaultVisible: true,
    showLabel: true,
    description: {
      th: 'ง่ามนิ้วฝั่งเรเดียลของนิ้วที่เลือก (สำหรับนิ้วชี้คือง่ามนิ้วโป้ง)',
      en: 'Web space on the radial side of the selected finger (for the index finger, the thumb web).',
    },
    educationalNote: {
      th: 'ช่วยยืนยันว่าด้านนี้คือด้านเรเดียล (ฝั่งนิ้วโป้ง)',
      en: 'Helps confirm that this side is radial (thumb side).',
    },
  },
  {
    id: 'landmark_pip_crease',
    nameTh: 'รอยพับข้อ PIP',
    nameEn: 'PIP crease',
    icon: '•',
    color: COLORS.landmark,
    layer: 'landmarks',
    defaultVisible: true,
    showLabel: true,
    description: { th: 'ระดับข้อต่อระหว่างกระดูกนิ้วท่อนต้นและท่อนกลาง', en: 'Level of the proximal interphalangeal joint.' },
    educationalNote: {
      th: 'บริเวณฝึกในโมเดลอยู่ด้านต้นต่อระดับนี้',
      en: 'The model learning zones lie proximal to this level.',
    },
  },
  {
    id: 'landmark_dip_crease',
    nameTh: 'รอยพับข้อ DIP',
    nameEn: 'DIP crease',
    icon: '•',
    color: COLORS.landmark,
    layer: 'landmarks',
    defaultVisible: true,
    showLabel: true,
    description: { th: 'ระดับข้อต่อระหว่างกระดูกนิ้วท่อนกลางและท่อนปลาย', en: 'Level of the distal interphalangeal joint.' },
    educationalNote: { th: 'จุดอ้างอิงด้านปลาย', en: 'A distal reference point.' },
  },
  {
    id: 'landmark_nail_fold',
    nameTh: 'โคนเล็บ',
    nameEn: 'Nail fold',
    icon: '•',
    color: COLORS.landmark,
    layer: 'landmarks',
    defaultVisible: true,
    showLabel: true,
    description: { th: 'โคนเล็บด้านหลัง (dorsal) ของนิ้ว', en: 'Proximal nail fold on the dorsal side.' },
    educationalNote: {
      th: 'ยืนยันด้านหลังและทิศปลายนิ้ว',
      en: 'Confirms the dorsal side and the distal direction.',
    },
  },
  {
    id: 'orientation_gizmo',
    nameTh: 'แกนทิศทางอ้างอิง',
    nameEn: 'Orientation axes',
    icon: '✥',
    color: COLORS.orientation,
    layer: 'orientation',
    defaultVisible: true,
    showLabel: false,
    description: {
      th: 'ลูกศรแสดงทิศ Dorsal/Volar, Radial/Ulnar, Proximal/Distal ของนิ้วมือขวา',
      en: 'Arrows showing dorsal/volar, radial/ulnar and proximal/distal for a right-hand finger.',
    },
    educationalNote: {
      th: 'มือขวา: ด้านเรเดียลคือฝั่งนิ้วโป้ง ด้านอัลนาคือฝั่งนิ้วกลาง',
      en: 'Right hand: radial is the thumb side, ulnar is the middle-finger side.',
    },
  },
];

const STRUCTURE_MAP = new Map(STRUCTURES.map((s) => [s.id, s]));

export function getStructure(id: StructureId): AnatomyStructure {
  const s = STRUCTURE_MAP.get(id);
  if (!s) throw new Error(`Unknown anatomy structure: ${id}`);
  return s;
}

export function getLayer(id: LayerId): AnatomyLayer {
  const l = LAYERS.find((x) => x.id === id);
  if (!l) throw new Error(`Unknown layer: ${id}`);
  return l;
}

export function structuresInLayer(layer: LayerId): AnatomyStructure[] {
  return STRUCTURES.filter((s) => s.layer === layer);
}

/** Structures shown in the Anatomy Overlay legend (tap-to-label list). */
export const LEGEND_STRUCTURES: StructureId[] = [
  'nerve_radial',
  'nerve_ulnar',
  'artery_radial',
  'artery_ulnar',
  'vein_radial',
  'flexor_tendon',
  'phalanx_proximal',
  'subcutaneous',
  'safe_zone_radial',
  'avoid_zone_volar',
];

export const LANDMARK_STRUCTURES: StructureId[] = [
  'landmark_mcp',
  'landmark_web_space',
  'landmark_pip_crease',
  'landmark_dip_crease',
  'landmark_nail_fold',
  'safe_zone_radial',
  'safe_zone_ulnar',
];
