import type { TransthecalStep } from '../types';

/**
 * Teacher-only scene: transthecal (intrathecal) volar digital block — a
 * single injection into the flexor tendon sheath at the A1 pulley, which
 * then spreads along the sheath and diffuses out to the palmar digital
 * nerves. Text lives under `transthecal.*` in the locale files. Educational
 * summary on the mannequin model only.
 */
export const TRANSTHECAL_STEPS: TransthecalStep[] = [
  {
    id: 'site',
    titleKey: 'transthecal.s1.title',
    bodyKey: 'transthecal.s1.body',
    layers: ['skin', 'landmarks', 'orientation'],
    skinOpacity: 0.85,
    highlight: ['landmark_mcp'],
    overlay: { site: true, sheath: false, needle: 'none', fill: 'none', pressure: false, diffusion: false },
  },
  {
    id: 'sheath',
    titleKey: 'transthecal.s2.title',
    bodyKey: 'transthecal.s2.body',
    layers: ['skin', 'bone', 'tendon', 'nerves', 'arteries', 'orientation'],
    skinOpacity: 0.25,
    highlight: ['flexor_tendon'],
    overlay: { site: true, sheath: true, needle: 'none', fill: 'none', pressure: false, diffusion: false },
  },
  {
    id: 'bone',
    titleKey: 'transthecal.s3.title',
    bodyKey: 'transthecal.s3.body',
    layers: ['skin', 'bone', 'tendon', 'nerves', 'orientation'],
    skinOpacity: 0.3,
    highlight: ['metacarpal_head'],
    overlay: { site: true, sheath: true, needle: 'bone', fill: 'none', pressure: false, diffusion: false },
  },
  {
    id: 'withdraw',
    titleKey: 'transthecal.s4.title',
    bodyKey: 'transthecal.s4.body',
    layers: ['skin', 'bone', 'tendon', 'nerves', 'orientation'],
    skinOpacity: 0.3,
    highlight: ['flexor_tendon'],
    overlay: { site: true, sheath: true, needle: 'sheath', fill: 'none', pressure: false, diffusion: false },
  },
  {
    id: 'inject',
    titleKey: 'transthecal.s5.title',
    bodyKey: 'transthecal.s5.body',
    layers: ['skin', 'bone', 'tendon', 'nerves', 'orientation'],
    skinOpacity: 0.3,
    highlight: [],
    overlay: { site: true, sheath: true, needle: 'sheath', fill: 'spread', pressure: true, diffusion: false },
  },
  {
    id: 'diffusion',
    titleKey: 'transthecal.s6.title',
    bodyKey: 'transthecal.s6.body',
    layers: ['skin', 'bone', 'tendon', 'nerves', 'arteries', 'orientation'],
    skinOpacity: 0.3,
    highlight: ['nerve_radial', 'nerve_ulnar'],
    overlay: { site: true, sheath: true, needle: 'none', fill: 'full', pressure: false, diffusion: true },
  },
];

export function clampTransthecalStep(step: number): number {
  return Math.min(Math.max(0, Math.round(step)), TRANSTHECAL_STEPS.length - 1);
}
