/**
 * Core data model for SimPlastic - DNBAR (Digital Nerve Block AR Trainer).
 *
 * All anatomy is a SIMPLIFIED EDUCATIONAL MODEL of a right-hand finger on a
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
  | 'extensor_tendon'
  | 'nerve_radial'
  | 'nerve_ulnar'
  | 'dorsal_nerve_radial'
  | 'dorsal_nerve_ulnar'
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
  | 'landmark_ip_crease'
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
  /** Thumb-specific wording where the thumb differs from the fingers. */
  thumb?: Partial<Pick<AnatomyStructure, 'nameTh' | 'nameEn' | 'description' | 'educationalNote' | 'warningNote'>>;
}

export type LearningMode = 'surface' | 'anatomy' | 'layers' | 'guided' | 'needle' | 'osce' | 'quiz' | 'assessment';

/** Panel tabs: every learning mode plus the instructor-only calibration panel. */
export type PanelTab = LearningMode | 'calibration';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Digits that can carry the overlay. The thumb uses its own two-phalanx model. */
export type FingerId = 'thumb' | 'index' | 'middle' | 'ring' | 'little';

/** Per-finger fine-tuning, relative to the finger's default position on the hand. */
export interface FingerCalibration {
  /** Extra offset of this finger's MCP knuckle from its default position, cm (hand frame). */
  offset: Vec3;
  /** Flexion/extension at the MCP joint, degrees (+ = fingertip toward the palm). */
  flexionDeg: number;
  /** Total sideways angle of the finger, degrees (+ = fingertip toward the thumb/radial). */
  splayDeg: number;
  /** Rotation about the digit's own long axis, degrees (− = nail turned toward radial; the thumb is pronated). */
  rollDeg: number;
  /** Measured length from the proximal finger crease (web) to the fingertip, cm. */
  lengthCm: number;
  /** Measured radial-to-ulnar width at the proximal phalanx, cm. */
  widthCm: number;
}

/**
 * Transform from the printed marker sticker to the mannequin hand.
 *
 * Marker space: origin = marker centre, +X = marker right, +Y = marker TOP
 * (toward the fingertips), +Z = out of the marker. Units: centimetres.
 *
 * Hand frame: origin = dorsal skin over the MIDDLE-finger MCP knuckle,
 * +X ulnar, +Y distal, +Z dorsal (right hand). With the sticker on that
 * knuckle and its TOP arrow toward the fingertips, both frames almost
 * coincide (only the sticker/tile thickness separates them).
 */
export interface CalibrationSettings {
  version: 2;
  /** Printed marker width, cm (must match the sticker). */
  markerSizeCm: number;
  /** Middle-finger MCP knuckle position relative to the marker centre, cm. */
  position: Vec3;
  /** Whole-hand Euler rotation in degrees (XYZ order). */
  rotationDeg: Vec3;
  /** Whole-hand uniform scale multiplier. */
  scale: number;
  fingers: Record<FingerId, FingerCalibration>;
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

export type Screen = 'landing' | 'ar' | 'explorer' | 'instructorLogin' | 'instructor' | 'developer';

export interface SessionState {
  screen: Screen;
  language: Language;
  mode: LearningMode;
  activeTab: PanelTab;
  userLayers: LayerVisibility;
  showLabels: boolean;
  guidedStep: number;
  selectedStructure: StructureId | null;
  /** Finger that currently carries the overlay. */
  selectedFinger: FingerId;
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
