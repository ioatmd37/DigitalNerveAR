import { BufferGeometry, Float32BufferAttribute, LatheGeometry, Vector2, Vector3 } from 'three';

/**
 * Geometry helpers for the procedural right index finger.
 *
 * Anatomical frame (cm): +X ulnar, −X radial, +Y distal, +Z dorsal.
 * The finger's skin cross-section is an ellipse: semi-axis r(y) in X and
 * r(y)·FLATTEN in Z (fingers are slightly flatter dorso-volarly).
 */

export const FLATTEN = 0.85;

/** Skin radius profile along the finger: [y (cm), radius (cm)]. */
export const SKIN_PROFILE: ReadonlyArray<readonly [number, number]> = [
  [-1.2, 1.08],
  [0.0, 1.02],
  [1.0, 0.98],
  [2.5, 0.94],
  [3.7, 0.95],
  [4.1, 0.97],
  [4.6, 0.9],
  [5.8, 0.86],
  [6.35, 0.87],
  [6.8, 0.82],
  [7.6, 0.78],
  [8.0, 0.68],
  [8.3, 0.5],
  [8.45, 0.3],
  [8.5, 0.0],
];

export const FINGER_BASE_Y = 0;
export const FINGER_TIP_Y = 8.5;

/** Joint levels (cm from finger base). */
export const JOINTS = {
  mcp: -0.5,
  pip: 4.1,
  dip: 6.35,
  nailFold: 6.9,
} as const;

/** Linear interpolation of the skin radius at height y. */
export function skinRadiusAt(y: number): number {
  const p = SKIN_PROFILE;
  if (y <= p[0][0]) return p[0][1];
  for (let i = 1; i < p.length; i++) {
    const [y1, r1] = p[i];
    const [y0, r0] = p[i - 1];
    if (y <= y1) {
      const t = (y - y0) / (y1 - y0);
      return r0 + (r1 - r0) * t;
    }
  }
  return 0;
}

const DEG = Math.PI / 180;

/**
 * Point on (or offset from) the skin surface.
 * @param thetaDeg angle in the XZ plane measured from +X (ulnar) toward +Z (dorsal):
 *   0° = ulnar, 90° = dorsal, 180° = radial, 270° = volar.
 * @param s radial multiplier (1 = on the skin, >1 outside, <1 inside).
 */
export function surfacePoint(y: number, thetaDeg: number, s = 1, out = new Vector3()): Vector3 {
  const r = skinRadiusAt(y) * s;
  const t = thetaDeg * DEG;
  return out.set(r * Math.cos(t), y, r * FLATTEN * Math.sin(t));
}

/** Outward surface normal (ignores the small longitudinal slope). */
export function surfaceNormal(thetaDeg: number, out = new Vector3()): Vector3 {
  const t = thetaDeg * DEG;
  return out.set(Math.cos(t), 0, Math.sin(t) / FLATTEN).normalize();
}

/** Skin-like envelope: lathe around Y, flattened in Z. */
export function createEnvelopeGeometry(radiusScale = 1, segments = 48): BufferGeometry {
  const pts = SKIN_PROFILE.map(([y, r]) => new Vector2(Math.max(r * radiusScale, 0.0001), y));
  const geo = new LatheGeometry(pts, segments);
  geo.scale(1, 1, FLATTEN);
  geo.computeVertexNormals();
  return geo;
}

/**
 * A curved patch hugging the skin between two heights and two angles.
 * UVs are in centimetres of arc/length so repeating textures keep scale.
 */
export function createSurfacePatch(
  y0: number,
  y1: number,
  theta0: number,
  theta1: number,
  s = 1.03,
  segY = 24,
  segT = 24,
): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const p = new Vector3();
  for (let i = 0; i <= segY; i++) {
    const y = y0 + ((y1 - y0) * i) / segY;
    for (let j = 0; j <= segT; j++) {
      const th = theta0 + ((theta1 - theta0) * j) / segT;
      surfacePoint(y, th, s, p);
      positions.push(p.x, p.y, p.z);
      const arc = ((th - theta0) * DEG * skinRadiusAt(y) * s);
      uvs.push(arc, y - y0);
    }
  }
  const row = segT + 1;
  for (let i = 0; i < segY; i++) {
    for (let j = 0; j < segT; j++) {
      const a = i * row + j;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Path of a longitudinal structure (nerve, artery, tendon) that keeps a
 * constant position relative to the skin cross-section, so it tapers with
 * the finger.
 */
export function longitudinalPath(x: number, z: number, yStart: number, yEnd: number, samples = 14): Vector3[] {
  const ref = skinRadiusAt(0);
  const pts: Vector3[] = [];
  for (let i = 0; i <= samples; i++) {
    const y = yStart + ((yEnd - yStart) * i) / samples;
    const k = Math.max(skinRadiusAt(Math.min(y, 7.8)) / ref, 0.55);
    pts.push(new Vector3(x * k, y, z * k));
  }
  return pts;
}

/** Path that follows the skin at a fixed angle and depth (e.g. superficial veins). */
export function surfacePath(thetaDeg: number, s: number, yStart: number, yEnd: number, samples = 14): Vector3[] {
  const pts: Vector3[] = [];
  for (let i = 0; i <= samples; i++) {
    const y = yStart + ((yEnd - yStart) * i) / samples;
    pts.push(surfacePoint(y, thetaDeg, s));
  }
  return pts;
}
