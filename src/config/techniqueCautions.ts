import type { FingerId, LocalizedText, TechniqueMode } from '../types';

/**
 * Teacher-facing cautions: why a volar single-injection block (SIMPLE or
 * transthecal) may be incomplete, in general and for particular digits.
 * Typical anatomy; individual variation is common. Educational summary only.
 */

/** Reasons the technique may fail on any digit. */
export const TECHNIQUE_FAILURES: Record<TechniqueMode, LocalizedText[]> = {
  simple: [
    {
      th: 'ฉีดลึกเกินไป (เข้าปลอกเอ็นหรือเอ็น) หรือตื้นเกินไป (ในชั้นผิวหนัง) ยาจะไม่กระจายในชั้นไขมันใต้ผิวหนังไปถึงเส้นประสาททั้งสองข้าง',
      en: 'Too deep (into the sheath or tendon) or too shallow (intradermal): the solution does not spread through the subcutaneous fat to both nerves.',
    },
    {
      th: 'ปริมาณยาน้อยเกินไปหรือรอไม่นานพอก่อนทดสอบ ด้านที่ยาไปไม่ถึงจะยังรู้สึก',
      en: 'Too little volume, or testing too early: the side the bleb did not reach still has sensation.',
    },
    {
      th: 'ผิวด้านหลังเหนือกระดูกนิ้วท่อนต้นเลี้ยงโดยเส้นประสาทด้านหลัง (เรเดียล/อัลนา) ซึ่งยาด้านฝ่ามืออาจไปไม่ถึง',
      en: 'The dorsal skin over the proximal phalanx is supplied by the dorsal (radial/ulnar) nerves, which the volar bleb may not reach.',
    },
    {
      th: 'หัตถการที่อยู่ต้นกว่าจุดฉีด (เช่น บริเวณข้อ MCP หรือง่ามนิ้ว) จะไม่ชา',
      en: 'Procedures proximal to the injection (e.g. at the MCP joint or the web) are not covered.',
    },
    {
      th: 'แผลเป็น การบาดเจ็บ บวม หรือติดเชื้อเดิม อาจขวางการกระจายของยา และไม่ควรแทงผ่านบริเวณที่ติดเชื้อ',
      en: 'Scarring, trauma, swelling or infection can block the spread; never inject through an infected area.',
    },
  ],
  transthecal: [
    {
      th: 'ปลายเข็มยังอยู่ในเนื้อเอ็น (ฉีดต้านแรงมาก) หรือหลุดออกนอกปลอกเอ็น ยาจะไม่กระจายไปตามปลอกเอ็น',
      en: 'The tip is still in the tendon (high resistance) or has left the sheath: the solution does not run along the sheath.',
    },
    {
      th: 'ไม่ได้กดด้านต้นขณะฉีด ยาอาจไหลย้อนไปทางต้นแทนที่จะไปทางปลายนิ้ว',
      en: 'No proximal pressure during injection: the solution may run proximally instead of distally.',
    },
    {
      th: 'ยาต้องซึมออกจากปลอกเอ็นไปถึงเส้นประสาท จึงออกฤทธิ์ช้ากว่าและอาจไม่ครบ โดยเฉพาะผิวด้านหลังเหนือกระดูกนิ้วท่อนต้น',
      en: 'The solution must diffuse out of the sheath to the nerves, so onset is slower and coverage can be incomplete, especially over the dorsum of the proximal phalanx.',
    },
    {
      th: 'ปลอกเอ็นที่เคยอักเสบ ติดเชื้อ หรือผ่าตัด อาจตีบหรือมีพังผืด ยาไหลได้ไม่ดี และไม่ควรฉีดเข้าปลอกเอ็นที่สงสัยติดเชื้อ',
      en: 'A previously inflamed, infected or operated sheath may be narrowed or scarred; never inject into a sheath suspected of infection.',
    },
  ],
};

/** Digit-specific cautions for each technique. */
export const TECHNIQUE_DIGIT_CAUTIONS: Record<TechniqueMode, Partial<Record<FingerId, LocalizedText[]>>> = {
  simple: {
    thumb: [
      {
        th: 'เส้นประสาทด้านหลังของนิ้วโป้ง (แขนงตื้นของเส้นประสาทเรเดียล) ไปถึงโคนเล็บ การฉีดด้านฝ่ามืออย่างเดียวมักไม่ชาด้านหลังและบริเวณเล็บ ควรวางแผนฉีดเสริมใต้ผิวหนังด้านหลังที่โคนนิ้วโป้ง',
        en: 'The thumb’s dorsal nerves (superficial radial) reach the nail fold, so a volar-only injection often leaves the dorsum and nail area sensate; plan a dorsal subcutaneous top-up across the base of the thumb.',
      },
      {
        th: 'นิ้วโป้งกว้างและหมุนเข้า ยาจุดเดียวด้านฝ่ามืออาจไปไม่ถึงทั้งสองข้าง อาจต้องเพิ่มปริมาณหรือฉีดเพิ่มอีกด้าน',
        en: 'The thumb is wider and pronated; a single volar bleb may not reach both sides, and more volume or a second injection may be needed.',
      },
    ],
    index: [
      {
        th: 'ผิวด้านหลังด้านเรเดียลของนิ้วชี้เลี้ยงโดยแขนงตื้นของเส้นประสาทเรเดียลที่วิ่งตามขอบกระดูกฝ่ามือชิ้นที่ 2 ยาด้านฝ่ามืออาจไปไม่ถึง',
        en: 'The radial dorsal skin of the index is supplied by the superficial radial nerve along the 2nd metacarpal, which the volar bleb may not reach.',
      },
    ],
    ring: [
      {
        th: 'ด้านเรเดียลมาจากเส้นประสาทมีเดียน ด้านอัลนามาจากเส้นประสาทอัลนา และอาจมีแขนงเชื่อมระหว่างกัน ถ้ายาไปไม่ถึงข้างใดข้างหนึ่ง ด้านนั้นจะยังรู้สึก',
        en: 'Radial side median, ulnar side ulnar, often with a communicating branch; if the bleb misses one side, that side keeps sensation.',
      },
    ],
    little: [
      {
        th: 'เส้นประสาทด้านหลังของนิ้วก้อย (แขนงหลังของเส้นประสาทอัลนา) ไปถึงราวข้อ DIP ผิวด้านหลังของกระดูกท่อนต้นและท่อนกลางจึงมักต้องฉีดเสริมด้านหลัง',
        en: 'The little finger’s dorsal nerves (dorsal branch of the ulnar nerve) reach about the DIP, so the dorsum of the proximal and middle phalanges more often needs a dorsal top-up.',
      },
      {
        th: 'ด้านอัลนาไม่มีง่ามนิ้ว เส้นประสาทวิ่งมาจาก hypothenar ถ้ายาไม่กระจายไปถึงขอบอัลนา ด้านนี้จะยังรู้สึก',
        en: 'The ulnar border has no web and its nerve comes from the hypothenar side; if the bleb does not reach the ulnar border, that side keeps sensation.',
      },
    ],
  },
  transthecal: {
    thumb: [
      {
        th: 'ปลอกเอ็น FPL ของนิ้วโป้งต่อเนื่องกับ radial bursa ยาอาจไหลย้อนเข้าฝ่ามือ/ข้อมือแทนที่จะอยู่ในนิ้ว ทำให้บล็อกไม่ครบ และถ้าติดเชื้อจะลามได้กว้าง',
        en: 'The thumb’s FPL sheath continues into the radial bursa: the solution can escape proximally into the palm/wrist instead of staying in the digit (incomplete block), and an infection could spread widely.',
      },
      {
        th: 'ด้านหลังของนิ้วโป้ง (แขนงตื้นของเส้นประสาทเรเดียล) ไม่ได้รับยาจากปลอกเอ็น ต้องฉีดเสริมด้านหลัง',
        en: 'The dorsum of the thumb (superficial radial nerve) is not reached from the sheath; a dorsal top-up is needed.',
      },
    ],
    index: [
      {
        th: 'ด้านหลังด้านเรเดียลของนิ้วชี้ (แขนงตื้นของเส้นประสาทเรเดียล) อาจไม่ชาจากยาที่ซึมออกจากปลอกเอ็น',
        en: 'The radial dorsum of the index (superficial radial nerve) may not be reached by diffusion from the sheath.',
      },
    ],
    middle: [
      {
        th: 'ปลอกเอ็นของนิ้วชี้ นิ้วกลาง และนิ้วนาง มักปิดที่ระดับข้อ MCP ยาจึงอยู่ในนิ้วได้ดีกว่านิ้วโป้งและนิ้วก้อย แต่ผิวด้านหลังเหนือกระดูกนิ้วท่อนต้นยังอาจต้องฉีดเสริม',
        en: 'The index, middle and ring sheaths usually end at the MCP level, so the solution stays in the digit better than in the thumb or little finger; the dorsum over the proximal phalanx may still need a top-up.',
      },
    ],
    ring: [
      {
        th: 'เส้นประสาทสองข้างมาจากคนละเส้น (มีเดียน/อัลนา) ถ้ายาซึมออกไม่สมดุล อาจชาเพียงข้างเดียว',
        en: 'The two sides come from different nerves (median/ulnar); uneven diffusion can leave one side sensate.',
      },
    ],
    little: [
      {
        th: 'ปลอกเอ็นของนิ้วก้อยต่อเนื่องกับ ulnar bursa ในคนส่วนใหญ่ ยาอาจไหลย้อนเข้าฝ่ามือ ทำให้บล็อกไม่ครบ และถ้าติดเชื้ออาจลามเป็น ulnar bursitis',
        en: 'In most hands the little finger’s sheath continues into the ulnar bursa: the solution can escape proximally into the palm (incomplete block), and an infection could spread to the bursa.',
      },
      {
        th: 'เส้นประสาทด้านหลัง (แขนงหลังของเส้นประสาทอัลนา) ไปถึงราวข้อ DIP มักต้องฉีดเสริมด้านหลัง',
        en: 'The dorsal nerves (dorsal branch of the ulnar nerve) reach about the DIP, so a dorsal top-up is often needed.',
      },
    ],
  },
};
