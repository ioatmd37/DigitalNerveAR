import { INTERNAL_LAYERS, LAYER_IDS, layerVisibility } from '../config/anatomy';
import { GUIDED_STEPS } from '../config/guidedSteps';
import type { AssessmentState, LayerId, LayerVisibility, LearningMode, StructureId, ViewState } from '../types';

export interface VisibilityInput {
  mode: LearningMode;
  userLayers: LayerVisibility;
  showLabels: boolean;
  guidedStep: number;
  assessment: Pick<AssessmentState, 'revealed'>;
  selectedStructure?: StructureId | null;
  /** Structures to pulse as quiz feedback (after an answer is chosen). */
  feedbackHighlight?: StructureId[];
}

const SURFACE_LAYERS: LayerId[] = ['skin', 'landmarks', 'safeZones', 'orientation'];
const ASSESSMENT_LAYERS: LayerId[] = ['skin', 'landmarks', 'orientation'];
const ANATOMY_LAYERS: LayerId[] = ['skin', 'bone', 'tendon', 'nerves', 'arteries', 'orientation'];
const QUIZ_LAYERS: LayerId[] = [
  'skin',
  'bone',
  'tendon',
  'nerves',
  'arteries',
  'veins',
  'safeZones',
  'avoidZone',
  'entryPoints',
  'needlePath',
  'landmarks',
  'orientation',
];

/** Skin opacity used when the skin is a "surface" (landmark) view. */
export const SURFACE_SKIN_OPACITY = 0.85;
/** Skin opacity used when internal anatomy should be seen through the skin. */
export const XRAY_SKIN_OPACITY = 0.25;

export function clampGuidedStep(step: number): number {
  return Math.min(Math.max(0, Math.round(step)), GUIDED_STEPS.length - 1);
}

/**
 * Single source of truth for what the 3D model shows. Pure function so it
 * is unit-tested and shared by the Explorer and the AR view.
 */
export function computeViewState(input: VisibilityInput): ViewState {
  const selected = input.selectedStructure ? [input.selectedStructure] : [];
  switch (input.mode) {
    case 'surface':
      return {
        layers: layerVisibility(SURFACE_LAYERS),
        skinOpacity: SURFACE_SKIN_OPACITY,
        labels: input.showLabels,
        highlight: selected,
        interactive: true,
        animateInjectate: false,
      };
    case 'anatomy':
      return {
        layers: layerVisibility([...ANATOMY_LAYERS, ...(input.userLayers.veins ? (['veins'] as LayerId[]) : [])]),
        skinOpacity: XRAY_SKIN_OPACITY,
        labels: input.showLabels,
        highlight: selected,
        interactive: true,
        animateInjectate: false,
      };
    case 'layers':
      return {
        layers: { ...input.userLayers },
        skinOpacity: XRAY_SKIN_OPACITY,
        labels: input.showLabels,
        highlight: selected,
        interactive: true,
        animateInjectate: input.userLayers.injectate,
      };
    case 'guided': {
      const step = GUIDED_STEPS[clampGuidedStep(input.guidedStep)];
      return {
        layers: layerVisibility(step.layers),
        skinOpacity: step.skinOpacity,
        labels: input.showLabels,
        highlight: selected.length ? selected : step.highlight,
        interactive: true,
        animateInjectate: step.layers.includes('injectate'),
      };
    }
    case 'quiz':
      return {
        layers: layerVisibility(QUIZ_LAYERS),
        skinOpacity: XRAY_SKIN_OPACITY,
        // Labels would give away answers during the quiz.
        labels: false,
        highlight: selected.length ? selected : (input.feedbackHighlight ?? []),
        interactive: true,
        animateInjectate: false,
      };
    case 'assessment':
      if (input.assessment.revealed) {
        return {
          layers: layerVisibility(LAYER_IDS.filter((l) => l !== 'injectate')),
          skinOpacity: XRAY_SKIN_OPACITY,
          labels: true,
          highlight: selected,
          interactive: true,
          animateInjectate: false,
        };
      }
      return {
        layers: layerVisibility(ASSESSMENT_LAYERS),
        skinOpacity: SURFACE_SKIN_OPACITY,
        labels: false,
        highlight: [],
        // No tap-to-label while the learner is being assessed.
        interactive: false,
        animateInjectate: false,
      };
  }
}

/** True when any internal-anatomy layer would be visible. */
export function showsInternalAnatomy(view: ViewState): boolean {
  return INTERNAL_LAYERS.some((l) => view.layers[l]);
}
