/**
 * Core data model for the Digital Nerve Block AR Trainer.
 *
 * All anatomy is a SIMPLIFIED EDUCATIONAL MODEL of a right index finger on a
 * training mannequin. Nothing here describes a real patient.
 */

export type Language = 'th' | 'en';

/** Text provided in every supported language. */
export type LocalizedText = Record<Language, string>;

/** Toggleable visual layers. Every anatomy structure belongs to exactly one layer. */
export type LayerId =
  | 'skin'
  | 'subcutaneous'
  | 'bone'
  | 'tendon'
  | 'nerves'
  | 'arteries'
  | 'veins'
  | 'safeZones'
  | 'avoidZone'
  | 'entryPoints'
  | 'needlePath'
  | 'injectate'
  | 'landmarks'
  | 'orientation';

export type LayerVisibility = Record<LayerId, boolean>;

export interface AnatomyLayer {
  id: LayerId;
  nameTh: string;
  nameEn: string;
  /** Short non-color cue (symbol) shown next to the layer name. */
  icon: string;
  /** Representative swatch color (CSS hex). */
  color: string;
  /** Default visibility in Layer-by-Layer mode. */
  defaultVisible: boolean;
  /** Whether this layer is internal anatomy (hidden in surface/assessment views). */
  internal: boolean;
}

export type StructureId =
  | 'skin'
  | 'nail'
  | 'subcutaneous'
  | 'metacarpal_head'
  | 'phalanx_proximal'
  | 'phalanx_middle'
  | 'phalanx_distal'
  | 'flexor_tendon'
  | 'nerve_radial'
  | 'nerve_ulnar'
  | 'artery_radial'
  | 'artery_ulnar'
  | 'vein_radial'
  | 'vein_ulnar'
  | 'safe_zone_radial'
  | 'safe_zone_ulnar'
  | 'avoid_zone_volar'
  | 'entry_point_radial'
  | 'entry_point_ulnar'
  | 'needle_path_radial'
  | 'needle_path_ulnar'
  | 'injectate_radial'
  | 'injectate_ulnar'
  | 'landmark_mcp'
  | 'landmark_web_space'
  | 'landmark_pip_crease'
  | 'landmark_dip_crease'
  | 'landmark_nail_fold'
  | 'orientation_gizmo';

export interface AnatomyStructure {
  id: StructureId;
  nameTh: string;
  nameEn: string;
  /** Short symbol/letter used alongside color (accessibility: never color alone). */
  icon: string;
  description: LocalizedText;
  /** CSS hex color. */
  color: string;
  layer: LayerId;
  /** Default visibility inside its layer. */
  defaultVisible: boolean;
  educationalNote: LocalizedText;
  warningNote?: LocalizedText;
  /** Whether a 3D label is shown for this structure when labels are on. */
  showLabel: boolean;
}

export type LearningMode = 'surface' | 'anatomy' | 'layers' | 'guided' | 'quiz' | 'assessment';

/** Panel tabs: every learning mode plus the instructor-only calibration panel. */
export type PanelTab = LearningMode | 'calibration';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Transform from the printed marker to the virtual finger.
 *
 * Marker space: origin = marker centre, +X = marker right, +Y = marker top,
 * +Z = out of the marker toward the viewer. Units: centimetres.
 */
export interface CalibrationSettings {
  version: 1;
  /** Offset of the finger base (MCP region) from the marker centre, cm. */
  position: Vec3;
  /** Euler rotation in degrees (XYZ order). */
  rotationDeg: Vec3;
  /** Uniform scale multiplier. */
  scale: number;
  /** Measured mannequin index finger length (web crease → tip), cm. */
  fingerLengthCm: number;
  /** Measured mannequin index finger width at the proximal phalanx, cm. */
  fingerWidthCm: number;
  /** ISO timestamp of the last save (informational). */
  savedAt?: string;
}

export interface QuizQuestion {
  id: string;
  /** Locale key for the question text. */
  promptKey: string;
  /** Locale keys for the options. */
  optionKeys: string[];
  correctIndex: number;
  /** Locale key for the explanation shown after answering. */
  explanationKey: string;
  /** Structures to highlight while this question is displayed. */
  highlight?: StructureId[];
}

export interface QuizAttempt {
  id: string;
  startedAt: string;
  completedAt: string;
  /** Selected option index per question id. */
  answers: Record<string, number>;
  score: number;
  total: number;
  language: Language;
}

export interface GuidedStep {
  id: string;
  titleKey: string;
  bodyKey: string;
  layers: LayerId[];
  skinOpacity: number;
  highlight: StructureId[];
}

export type TrackingStatus = 'idle' | 'loading' | 'searching' | 'tracking' | 'lost' | 'error';

export interface AssessmentState {
  active: boolean;
  revealed: boolean;
  /** epoch ms when the timer was (re)started, or null if stopped. */
  startedAt: number | null;
  /** accumulated ms from previous runs. */
  accumulatedMs: number;
  finished: boolean;
}

export interface InstructorSettings {
  unlocked: boolean;
  /** Instructor passcode sourced from env/config (never persisted). */
  passcode: string;
}

export type Screen = 'landing' | 'ar' | 'explorer' | 'instructorLogin' | 'instructor';

export interface SessionState {
  screen: Screen;
  language: Language;
  mode: LearningMode;
  activeTab: PanelTab;
  userLayers: LayerVisibility;
  showLabels: boolean;
  guidedStep: number;
  selectedStructure: StructureId | null;
  calibration: CalibrationSettings;
  savedCalibration: CalibrationSettings | null;
  trackingStatus: TrackingStatus;
  assessment: AssessmentState;
  instructor: InstructorSettings;
  quizAttempts: QuizAttempt[];
}

/** Result of combining mode, user toggles and guided/assessment state. */
export interface ViewState {
  layers: LayerVisibility;
  skinOpacity: number;
  labels: boolean;
  highlight: StructureId[];
  interactive: boolean;
  animateInjectate: boolean;
}
