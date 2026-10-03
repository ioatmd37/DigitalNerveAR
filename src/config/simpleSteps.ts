import type { SimpleStep } from '../types';

/**
 * Teacher-only scene: Lalonde's SIMPLE digital block — Single subcutaneous
 * Injection in the Middle of the Proximal phalanx with Lidocaine and
 * Epinephrine (a single volar subcutaneous injection). Text lives in the
 * locale files under `simple.*`. Educational summary on the mannequin model
 * only; instructors should present it with the original literature and
 * their institutional protocol.
 */
export const SIMPLE_STEPS: SimpleStep[] = [
  {
    id: 'concept',
    titleKey: 'simple.s1.title',
    bodyKey: 'simple.s1.body',
    layers: ['skin', 'landmarks', 'orientation'],
    skinOpacity: 0.85,
    highlight: ['landmark_pip_crease', 'landmark_ip_crease'],
    overlay: { site: true, plane: false, needle: false, bleb: 'none', dorsal: false },
  },
  {
    id: 'anatomy',
    titleKey: 'simple.s2.title',
    bodyKey: 'simple.s2.body',
    layers: ['skin', 'bone', 'tendon', 'nerves', 'arteries', 'orientation'],
    skinOpacity: 0.25,
    highlight: ['nerve_radial', 'nerve_ulnar', 'flexor_tendon'],
    overlay: { site: true, plane: true, needle: false, bleb: 'none', dorsal: false },
  },
  {
    id: 'insert',
    titleKey: 'simple.s3.title',
    bodyKey: 'simple.s3.body',
    layers: ['skin', 'bone', 'tendon', 'nerves', 'arteries', 'orientation'],
    skinOpacity: 0.3,
    highlight: [],
    overlay: { site: true, plane: true, needle: true, bleb: 'none', dorsal: false },
  },
  {
    id: 'inject',
    titleKey: 'simple.s4.title',
    bodyKey: 'simple.s4.body',
    layers: ['skin', 'bone', 'tendon', 'nerves', 'arteries', 'orientation'],
    skinOpacity: 0.3,
    highlight: ['nerve_radial', 'nerve_ulnar'],
    overlay: { site: true, plane: false, needle: true, bleb: 'spread', dorsal: false },
  },
  {
    id: 'dorsal',
    titleKey: 'simple.s5.title',
    bodyKey: 'simple.s5.body',
    layers: ['skin', 'bone', 'nerves', 'orientation'],
    skinOpacity: 0.3,
    highlight: ['dorsal_nerve_radial', 'dorsal_nerve_ulnar'],
    overlay: { site: false, plane: false, needle: false, bleb: 'full', dorsal: true },
  },
  {
    id: 'points',
    titleKey: 'simple.s6.title',
    bodyKey: 'simple.s6.body',
    layers: ['skin', 'bone', 'tendon', 'nerves', 'arteries', 'orientation'],
    skinOpacity: 0.3,
    highlight: [],
    overlay: { site: true, plane: false, needle: false, bleb: 'full', dorsal: false },
  },
];

export function clampSimpleStep(step: number): number {
  return Math.min(Math.max(0, Math.round(step)), SIMPLE_STEPS.length - 1);
}
