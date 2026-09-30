import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  CanvasTexture,
  Group,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  type PerspectiveCamera,
  type Texture,
} from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { appConfig } from '../config/appConfig';
import { useAnatomyModel } from '../hooks/useAnatomyModel';
import { useViewState } from '../hooks/useViewState';
import { useAppStore } from '../store/useAppStore';
import { applyCalibration } from '../three/calibrationTransform';
import type { AnatomyModel } from '../three/anatomy/AnatomyModel';
import { assetUrl } from '../utils/assets';

export type ViewPreset = 'dorsal' | 'volar' | 'radial' | 'ulnar' | 'oblique';

/** Camera direction per preset in the anatomical frame (+X ulnar, +Y distal, +Z dorsal). */
const PRESET_DIRECTIONS: Record<ViewPreset, [number, number, number]> = {
  dorsal: [0, -0.35, 1],
  volar: [0, -0.35, -1],
  radial: [-1, -0.2, 0.2],
  ulnar: [1, -0.2, 0.2],
  oblique: [-1, -0.55, 1],
};

const CAMERA_DISTANCE = 24;

interface ExplorerViewProps {
  preset: { name: ViewPreset; nonce: number };
  showMarker: boolean;
}

/**
 * Camera-free 3D explorer. The scene mirrors the AR setup: the virtual
 * marker lies on a "table" and the finger is placed relative to it using
 * the same calibration as AR, so instructors can preview calibration here.
 */
export function ExplorerView({ preset, showMarker }: ExplorerViewProps) {
  const model = useAnatomyModel();
  const selectStructure = useAppStore((s) => s.selectStructure);
  const view = useViewState();

  return (
    <Canvas
      className="!absolute inset-0 touch-none"
      dpr={[1, 2]}
      camera={{ fov: 42, near: 0.1, far: 500, position: [-14, 18, 10] }}
      onPointerMissed={() => view.interactive && selectStructure(null)}
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={['#0b1220']} />
      <hemisphereLight args={['#f8fafc', '#334155', 0.9]} />
      <directionalLight position={[8, 20, 12]} intensity={1.5} />
      <directionalLight position={[-10, 6, -8]} intensity={0.5} />
      {model && (
        <SceneContent model={model} interactive={view.interactive} showMarker={showMarker} preset={preset} />
      )}
    </Canvas>
  );
}

function SceneContent({
  model,
  interactive,
  showMarker,
  preset,
}: {
  model: AnatomyModel;
  interactive: boolean;
  showMarker: boolean;
  preset: ExplorerViewProps['preset'];
}) {
  const calibration = useAppStore((s) => s.calibration);
  const selectStructure = useAppStore((s) => s.selectStructure);
  const calibGroup = useRef<Group>(null);
  const size = appConfig.markerSizeCm;

  useLayoutEffect(() => {
    if (calibGroup.current) applyCalibration(calibGroup.current, calibration);
  }, [calibration]);

  useFrame(({ clock }) => model.update(clock.elapsedTime));

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (!interactive) return;
    e.stopPropagation();
    selectStructure(model.pick(e.intersections));
  };

  return (
    <>
      {/* Marker space → world: marker lies flat on the table (world XZ), +Z (out of marker) = world up. */}
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <mesh position={[0, 0, -0.05]} receiveShadow>
          <planeGeometry args={[60, 60]} />
          <meshStandardMaterial color="#1e293b" roughness={0.95} />
        </mesh>
        <gridHelper args={[60, 30, '#334155', '#243244']} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.04]} />
        {showMarker && (
          <Suspense fallback={null}>
            <MarkerPlane size={size} />
          </Suspense>
        )}
        <group ref={calibGroup}>
          <primitive object={model.root} onClick={onClick} />
        </group>
      </group>
      <CameraRig model={model} preset={preset} />
    </>
  );
}

function MarkerPlane({ size }: { size: number }) {
  const texture = useMemo<Texture>(() => {
    const t = new TextureLoader().load(assetUrl(appConfig.markerImageUrl));
    t.colorSpace = SRGBColorSpace;
    return t;
  }, []);
  const arrowTex = useMemo(() => distalArrowTexture(), []);
  useEffect(
    () => () => {
      texture.dispose();
      arrowTex?.dispose();
    },
    [texture, arrowTex],
  );
  return (
    <group>
      <mesh>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {arrowTex && (
        <mesh position={[size / 2 + 1.6, 0, 0.01]}>
          <planeGeometry args={[2.4, 4.8]} />
          <meshBasicMaterial map={arrowTex} transparent toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

/** Small "marker top" arrow drawn next to the virtual marker. */
function distalArrowTexture(): Texture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  if (!g) return null;
  g.fillStyle = 'rgba(148,163,184,0.9)';
  g.beginPath();
  g.moveTo(64, 10);
  g.lineTo(118, 90);
  g.lineTo(84, 90);
  g.lineTo(84, 200);
  g.lineTo(44, 200);
  g.lineTo(44, 90);
  g.lineTo(10, 90);
  g.closePath();
  g.fill();
  g.font = '700 30px system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillText('TOP', 64, 240);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** Smoothly moves the camera to a preset angle around the finger. */
function CameraRig({ model, preset }: { model: AnatomyModel; preset: ExplorerViewProps['preset'] }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const anim = useRef<{ fromPos: Vector3; toPos: Vector3; fromTarget: Vector3; toTarget: Vector3; t: number } | null>(
    null,
  );
  const calibration = useAppStore((s) => s.calibration);

  useEffect(() => {
    const frame = model.anatomyFrame;
    frame.updateWorldMatrix(true, false);
    const focus = model.getFocusPoint();
    const center = frame.localToWorld(focus.clone());
    const [x, y, z] = PRESET_DIRECTIONS[preset.name];
    const dirWorld = frame
      .localToWorld(focus.clone().add(new Vector3(x, y, z)))
      .sub(center)
      .normalize();
    // Avoid looking exactly along world-up (OrbitControls singularity).
    if (Math.abs(dirWorld.y) > 0.985) dirWorld.x += 0.1;
    dirWorld.normalize();
    const toPos = center.clone().addScaledVector(dirWorld, CAMERA_DISTANCE * calibration.scale);
    anim.current = {
      fromPos: camera.position.clone(),
      toPos,
      fromTarget: controls ? controls.target.clone() : center.clone(),
      toTarget: center,
      t: 0,
    };
    // Re-frame only when a preset is requested (or on first mount).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset.nonce, preset.name, model, controls]);

  useFrame((_, delta) => {
    const a = anim.current;
    if (!a) return;
    a.t = Math.min(1, a.t + delta / 0.6);
    const k = 1 - Math.pow(1 - a.t, 3);
    camera.position.lerpVectors(a.fromPos, a.toPos, k);
    if (controls) {
      controls.target.lerpVectors(a.fromTarget, a.toTarget, k);
      controls.update();
    } else {
      camera.lookAt(a.toTarget);
    }
    if (a.t >= 1) anim.current = null;
  });

  return <OrbitControls makeDefault enableDamping dampingFactor={0.12} minDistance={4} maxDistance={80} />;
}
