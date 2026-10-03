import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import {
  BufferGeometry,
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
  TextureLoader,
  Vector3,
  type Object3D,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { DEFAULT_LAYER_VISIBILITY } from '../config/anatomy';
import { appConfig, DEFAULT_CALIBRATION } from '../config/appConfig';
import { computeViewState } from '../logic/visibility';
import { disposeObject } from '../three/anatomy/AnatomyModel';
import { FINGER } from '../three/anatomy/layout';
import { ProceduralFingerModel } from '../three/anatomy/ProceduralFingerModel';
import { createLabelTexture } from '../three/anatomy/textures';
import { applyRoomEnvironment } from '../three/environment';
import { HandRig } from '../three/HandRig';
import type { Language } from '../types';
import { assetUrl } from '../utils/assets';

export interface SetupSceneLabels {
  operator: string;
  marker: string;
  phone: string;
  stand: string;
  counterweight: string;
  distance: string;
}

/**
 * Illustrative set-up for the landing page (world = cm, +Y up): the
 * right mannequin hand palm-down on a table, fingertips toward the operator
 * (as for a digital block) and every digit abducted, the marker in the centre of the back of the hand, and a phone held
 * by a stand 12–20 cm above the hand (between the marker and the knuckles) with its rear camera facing down. The index finger carries the
 * anatomy overlay to show what the learner will see. Purely illustrative.
 */
export function SetupScene({ language, labels }: { language: Language; labels: SetupSceneLabels }) {
  return (
    <Canvas
      className="!absolute inset-0 touch-pan-y"
      dpr={[1, 1.75]}
      camera={{ fov: 32, near: 0.5, far: 400, position: [-56, 44, -58] }}
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={['#151515']} />
      <hemisphereLight args={['#f6f6f5', '#3a3a38', 0.9]} />
      <directionalLight position={[10, 30, 14]} intensity={1.4} />
      <directionalLight position={[-14, 8, -10]} intensity={0.4} />
      <Setup language={language} labels={labels} />
      {/* Rotate only: zooming would hijack page scrolling. */}
      <OrbitControls
        makeDefault
        target={[2, 9, 2]}
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.6}
        minPolarAngle={0.35}
        maxPolarAngle={1.45}
      />
    </Canvas>
  );
}

/** Phone above the hand: lens height, and where it looks (world z; the fingertips are toward −Z). */
const LENS_HEIGHT = 16;
/** Between the marker (z = 0) and the knuckles, so the marker and the whole finger are in view. */
const LOOK_Z = -5;
const PHONE = { w: 7.5, l: 15.5, t: 0.8 };

function Setup({ language, labels }: { language: Language; labels: SetupSceneLabels }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => applyRoomEnvironment(gl, scene), [gl, scene]);

  // Hand, marker and the index-finger overlay (reusing the AR rig).
  const hand = useMemo(() => {
    const model = new ProceduralFingerModel(language, FINGER);
    model.applyViewState(
      computeViewState({
        mode: 'anatomy',
        userLayers: { ...DEFAULT_LAYER_VISIBILITY, orientation: false },
        showLabels: false,
        guidedStep: 0,
        assessment: { revealed: false },
      }),
    );
    const rig = new HandRig({ markerUnits: false, showContext: true });
    rig.attach(model);
    rig.update(DEFAULT_CALIBRATION, 'index');
    // Marker space → world: the sticker lies flat, out of the marker = world up.
    const world = new Group();
    world.rotation.x = -Math.PI / 2;
    world.add(rig.markerSpace);
    const size = DEFAULT_CALIBRATION.markerSizeCm;
    const tex = new TextureLoader().load(assetUrl(appConfig.markerImageUrl));
    tex.colorSpace = SRGBColorSpace;
    const marker = new Mesh(new PlaneGeometry(size, size), new MeshBasicMaterial({ map: tex, toneMapped: false }));
    marker.position.z = 0.03;
    rig.markerSpace.add(marker);
    return { model, rig, world, tex };
  }, [language]);

  useEffect(
    () => () => {
      hand.rig.dispose();
      hand.model.dispose();
      hand.tex.dispose();
      disposeObject(hand.world);
    },
    [hand],
  );

  // Phone, stand, camera view and annotations.
  const props = useMemo(() => buildProps(labels), [labels]);
  useEffect(() => () => disposeObject(props.group), [props]);

  useFrame(({ clock }) => hand.model.update(clock.elapsedTime));

  return (
    <>
      <primitive object={hand.world} />
      <primitive object={props.group} />
    </>
  );
}

function label(text: string, color: string, height = 1.5): Sprite | null {
  const tex = createLabelTexture({ primary: text, color, compact: true });
  if (!tex) return null;
  const s = new Sprite(new SpriteMaterial({ map: tex.texture, depthTest: false, transparent: true }));
  s.scale.set(height * tex.aspect, height, 1);
  s.renderOrder = 10;
  return s;
}

function buildProps(labels: SetupSceneLabels): { group: Group } {
  const group = new Group();
  const add = (o: Object3D | null, x = 0, y = 0, z = 0) => {
    if (!o) return;
    o.position.set(x, y, z);
    group.add(o);
  };
  const metal = new MeshStandardMaterial({ color: '#3a3a38', metalness: 0.6, roughness: 0.35 });
  const dark = new MeshStandardMaterial({ color: '#202020', metalness: 0.2, roughness: 0.6 });

  // --- Phone: rear camera down, screen up. The operator sits at the fingertip side (−Z), so the
  // phone's top points toward the wrist and the screen tilts slightly toward the operator; the
  // fingers then point down the screen toward the operator, as on the real hand.
  const phone = new Group();
  const body = new Mesh(new RoundedBoxGeometry(PHONE.w, PHONE.t, PHONE.l, 4, 0.5), new MeshPhysicalMaterial({ color: '#2b2b2b', roughness: 0.35, clearcoat: 0.6 }));
  const screen = new Mesh(new PlaneGeometry(PHONE.w - 0.6, PHONE.l - 0.9), new MeshBasicMaterial({ color: '#30414f', toneMapped: false }));
  screen.rotation.x = -Math.PI / 2;
  screen.position.y = PHONE.t / 2 + 0.01;
  // A hint of the AR view on the screen: the finger and its overlay.
  const finger = new Mesh(new PlaneGeometry(1.1, 7), new MeshBasicMaterial({ color: '#c99a80', toneMapped: false }));
  finger.rotation.x = -Math.PI / 2;
  finger.position.set(0, PHONE.t / 2 + 0.02, -1.2);
  const nerveL = new Mesh(new PlaneGeometry(0.12, 6.4), new MeshBasicMaterial({ color: '#facc15', toneMapped: false }));
  nerveL.rotation.x = -Math.PI / 2;
  nerveL.position.set(-0.38, PHONE.t / 2 + 0.03, -1.2);
  const nerveR = nerveL.clone();
  nerveR.position.x = 0.38;
  const lensRing = new Mesh(new CylinderGeometry(0.55, 0.55, 0.25, 24), dark);
  const lensPos = new Vector3(-PHONE.w / 2 + 1.5, -PHONE.t / 2 - 0.1, -PHONE.l / 2 + 1.6);
  lensRing.position.copy(lensPos);
  const glass = new Mesh(new CircleGeometry(0.35, 24), new MeshPhysicalMaterial({ color: '#0b1220', roughness: 0.05, clearcoat: 1 }));
  glass.rotation.x = Math.PI / 2;
  glass.position.copy(lensPos).add(new Vector3(0, -0.13, 0));
  phone.add(body, screen, finger, nerveL, nerveR, lensRing, glass);
  const tilt = 0.22;
  phone.rotation.set(-tilt, Math.PI, 0);
  phone.updateMatrix();
  // Place the phone so the lens sits LENS_HEIGHT above the marker.
  const lensLocal = lensPos.clone().applyMatrix4(phone.matrix);
  phone.position.set(-lensLocal.x, LENS_HEIGHT - lensLocal.y, LOOK_Z - lensLocal.z);
  phone.updateMatrixWorld(true);
  group.add(phone);
  const lensWorld = lensPos.clone().applyMatrix4(phone.matrixWorld);

  // Clamp across the phone near its top (wrist) end, so the arm stays short and off the fingers.
  const clamp = new Mesh(new RoundedBoxGeometry(PHONE.w + 1.2, 1.4, 2.2, 3, 0.3), dark);
  clamp.position.set(0, 0.2, -3.6);
  phone.add(clamp);
  const clampWorld = new Vector3(0, 0.9, -3.6).applyMatrix4(phone.matrixWorld);

  // --- Stand: a weighted base on the table beyond the wrist (on the hand's midline), a rigid
  // upright, and a rigid horizontal boom with a counterweight behind the upright. The boom carries
  // the phone forward on a short drop rod with a tilt head. The combined centre of mass stays over
  // the base, nothing stands beside the fingers, and the space above the fingers is left free for
  // the operator's hands and syringe.
  const tableY = -3;
  const baseZ = 19;
  const boomY = LENS_HEIGHT + 6;
  const base = new Vector3(0, tableY, baseZ);
  const heavy = new MeshStandardMaterial({ color: '#2a2a28', metalness: 0.3, roughness: 0.55 });
  add(new Mesh(new RoundedBoxGeometry(18, 1.6, 13, 3, 0.4), heavy), base.x, tableY + 0.8, base.z);
  for (const [fx, fz] of [
    [-7.5, -5],
    [7.5, -5],
    [-7.5, 5],
    [7.5, 5],
  ]) {
    // Rubber feet.
    add(new Mesh(new CylinderGeometry(0.8, 0.8, 0.3, 16), dark), base.x + fx, tableY + 0.15, base.z + fz);
  }
  add(new Mesh(new CylinderGeometry(0.75, 0.85, boomY - tableY, 20), metal), base.x, (boomY + tableY) / 2, base.z);
  // Clamp knob where the boom meets the upright.
  add(new Mesh(new RoundedBoxGeometry(2.6, 2.6, 2.6, 3, 0.4), dark), base.x, boomY, base.z);
  const knob = new Mesh(new CylinderGeometry(0.9, 0.9, 1.2, 20), dark);
  knob.rotation.z = Math.PI / 2;
  add(knob, base.x + 2, boomY, base.z);
  // Boom: from behind the upright (counterweight) to above the clamp.
  const rearZ = baseZ + 9;
  const frontZ = clampWorld.z;
  const boom = new Mesh(new RoundedBoxGeometry(1.4, 1.4, rearZ - frontZ + 1.4, 3, 0.3), metal);
  add(boom, 0, boomY, (rearZ + frontZ) / 2);
  add(new Mesh(new RoundedBoxGeometry(4.5, 4, 5, 3, 0.6), heavy), 0, boomY, rearZ - 1.5);
  // Drop rod and tilt head down to the phone clamp.
  const dropTop = new Vector3(clampWorld.x, boomY, frontZ);
  const rod = new Mesh(new CylinderGeometry(0.45, 0.45, dropTop.y - clampWorld.y - 1, 16), metal);
  add(rod, dropTop.x, (dropTop.y + clampWorld.y + 1) / 2, frontZ);
  add(new Mesh(new SphereGeometry(1.1, 20, 14), dark), clampWorld.x, clampWorld.y + 0.9, clampWorld.z);

  // --- Camera view: a translucent pyramid from the lens to its footprint around the marker.
  const half = { x: 7.5, z: 9.5 };
  const corners = [
    new Vector3(-half.x, 0.1, -half.z),
    new Vector3(half.x, 0.1, -half.z),
    new Vector3(half.x, 0.1, half.z),
    new Vector3(-half.x, 0.1, half.z),
  ].map((c) => c.add(new Vector3(0, 0, LOOK_Z - 0.5)));
  const pts: Vector3[] = [];
  for (let i = 0; i < 4; i++) pts.push(lensWorld, corners[i], corners[i], corners[(i + 1) % 4]);
  const frustum = new LineSegments(new BufferGeometry().setFromPoints(pts), new LineBasicMaterial({ color: '#e8e5de', transparent: true, opacity: 0.45 }));
  group.add(frustum);
  const faces = new Mesh(
    new BufferGeometry().setFromPoints(corners.flatMap((c, i) => [lensWorld, c, corners[(i + 1) % 4]])),
    new MeshBasicMaterial({ color: '#e8e5de', transparent: true, opacity: 0.06, side: DoubleSide, depthWrite: false }),
  );
  group.add(faces);

  // --- Height dimension from the lens to the marker.
  const dimX = -9;
  const dimTop = new Vector3(dimX, lensWorld.y, lensWorld.z);
  const dimBottom = new Vector3(dimX, 0.1, LOOK_Z);
  const tick = (p: Vector3) => [p.clone().add(new Vector3(-0.8, 0, 0)), p.clone().add(new Vector3(0.8, 0, 0))];
  const dimLines = new LineSegments(
    new BufferGeometry().setFromPoints([
      dimTop,
      dimBottom,
      ...tick(dimTop),
      ...tick(dimBottom),
      dimTop,
      lensWorld,
      dimBottom,
      new Vector3(-1.2, 0.1, LOOK_Z),
    ]),
    new LineBasicMaterial({ color: '#facc15' }),
  );
  group.add(dimLines);

  add(label(labels.distance, '#facc15', 2.2), dimX - 5, (lensWorld.y + 0.1) / 2, lensWorld.z / 2);
  add(label(labels.marker, '#e8e5de', 1.7), -2, 3.6, 2);
  add(label(labels.phone, '#e8e5de', 1.7), 0, LENS_HEIGHT + 4.6, lensWorld.z - 2);
  add(label(labels.stand, '#e8e5de', 1.7), base.x, 9, base.z);
  add(label(labels.counterweight, '#e8e5de', 1.5), 0, boomY + 3.4, rearZ + 2);
  // Where the operator sits: at the fingertips.
  add(label(labels.operator, '#facc15', 1.9), 0, 1.5, -24);
  const arrow = new Mesh(new CylinderGeometry(0, 1.1, 2.4, 3), new MeshBasicMaterial({ color: '#facc15' }));
  arrow.rotation.x = Math.PI / 2; // tip toward +Z, i.e. toward the hand
  add(arrow, 0, tableY + 0.6, -19);

  // A larger table so the stand base sits on it (the rig's own table is smaller).
  const table = new Mesh(new PlaneGeometry(80, 70), new MeshStandardMaterial({ color: '#1d1d1c', roughness: 0.95 }));
  table.rotation.x = -Math.PI / 2;
  add(table, 4, tableY - 0.02, 6);
  return { group };
}
