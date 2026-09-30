import type { GuidedStep } from '../types';

/**
 * Guided Simulation: a NON-CLINICAL educational sequence on the mannequin
 * model. Text lives in the locale files under `guided.*`.
 */
export const GUIDED_STEPS: GuidedStep[] = [
  {
    id: 'orientation',
    titleKey: 'guided.s1.title',
    bodyKey: 'guided.s1.body',
    layers: ['skin', 'landmarks', 'orientation'],
    skinOpacity: 0.8,
    highlight: ['landmark_mcp', 'landmark_web_space', 'landmark_nail_fold'],
  },
  {
    id: 'bundles',
    titleKey: 'guided.s2.title',
    bodyKey: 'guided.s2.body',
    layers: ['skin', 'bone', 'tendon', 'nerves', 'arteries', 'orientation'],
    skinOpacity: 0.22,
    highlight: ['nerve_radial', 'nerve_ulnar', 'artery_radial', 'artery_ulnar'],
  },
  {
    id: 'zones',
    titleKey: 'guided.s3.title',
    bodyKey: 'guided.s3.body',
    layers: ['skin', 'bone', 'tendon', 'nerves', 'arteries', 'safeZones', 'avoidZone', 'orientation'],
    skinOpacity: 0.3,
    highlight: ['safe_zone_radial', 'safe_zone_ulnar'],
  },
  {
    id: 'entry',
    titleKey: 'guided.s4.title',
    bodyKey: 'guided.s4.body',
    layers: ['skin', 'bone', 'nerves', 'arteries', 'safeZones', 'entryPoints', 'orientation'],
    skinOpacity: 0.35,
    highlight: ['entry_point_radial', 'entry_point_ulnar'],
  },
  {
    id: 'direction',
    titleKey: 'guided.s5.title',
    bodyKey: 'guided.s5.body',
    layers: ['skin', 'bone', 'tendon', 'nerves', 'arteries', 'safeZones', 'entryPoints', 'needlePath', 'orientation'],
    skinOpacity: 0.25,
    highlight: ['needle_path_radial', 'needle_path_ulnar'],
  },
  {
    id: 'spread',
    titleKey: 'guided.s6.title',
    bodyKey: 'guided.s6.body',
    layers: ['skin', 'bone', 'tendon', 'nerves', 'arteries', 'needlePath', 'injectate', 'orientation'],
    skinOpacity: 0.2,
    highlight: ['injectate_radial', 'injectate_ulnar'],
  },
  {
    id: 'safety',
    titleKey: 'guided.s7.title',
    bodyKey: 'guided.s7.body',
    layers: ['skin', 'bone', 'tendon', 'nerves', 'arteries', 'veins', 'safeZones', 'avoidZone', 'orientation'],
    skinOpacity: 0.25,
    highlight: ['avoid_zone_volar', 'artery_radial', 'artery_ulnar'],
  },
];
