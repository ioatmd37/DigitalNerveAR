import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, TubeGeometry, Vector3 } from 'three';

/**
 * Geometry helpers for the procedural right-hand finger.
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

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export const ENVELOPE_Y0 = SKIN_PROFILE[0][0];
export const ENVELOPE_Y1 = SKIN_PROFILE[SKIN_PROFILE.length - 1][0];

/**
 * Small anatomical refinements on top of the elliptical cross-section
 * (visual only): a fuller volar fingertip pad and dorsal knuckle swellings.
 */
function envelopeBulge(y: number, thetaDeg: number): number {
  const t = (thetaDeg * Math.PI) / 180;
  const volar = Math.max(0, -Math.sin(t));
  const dorsal = Math.max(0, Math.sin(t));
  const pad = 0.09 * smoothstep(7.0, 7.7, y) * (1 - smoothstep(8.15, 8.45, y)) * volar ** 1.5;
  const knuckle = (yc: number, w: number, a: number) => a * Math.exp(-(((y - yc) / w) ** 2)) * dorsal ** 2;
  return 1 + pad + knuckle(4.1, 0.28, 0.045) + knuckle(6.35, 0.22, 0.03);
}

/**
 * Skin-like envelope with uniform rings and real UVs (u = angle around
 * the finger, v = position along it) so crease/fingerprint textures map
 * predictably. θ uses the same convention as `surfacePoint`.
 */
export function createEnvelopeGeometry(radiusScale = 1, segments = 64, rings = 120): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const p = new Vector3();
  for (let i = 0; i <= rings; i++) {
    const y = ENVELOPE_Y0 + ((ENVELOPE_Y1 - ENVELOPE_Y0) * i) / rings;
    for (let j = 0; j <= segments; j++) {
      const th = (360 * j) / segments;
      surfacePoint(y, th, radiusScale * envelopeBulge(y, th), p);
      positions.push(p.x, p.y, p.z);
      uvs.push(j / segments, i / rings);
    }
  }
  const row = segments + 1;
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * row + j;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      // Counter-clockwise seen from outside (θ increases from +X toward +Z, y increases distally).
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

export interface LoftRing {
  y: number;
  /** Half-width (x) and half-thickness (z). */
  a: number;
  b: number;
  cx?: number;
  cz?: number;
}

/**
 * Loft a rounded-rectangle ("superellipse") cross-section along +Y, e.g.
 * for the palm or the metacarpal region. Ends are left open.
 */
export function createLoftGeometry(ringsIn: LoftRing[], segments = 48, exponent = 2.6, subdivide = 6): BufferGeometry {
  const rings: LoftRing[] = [];
  for (let i = 0; i < ringsIn.length - 1; i++) {
    const r0 = ringsIn[i];
    const r1 = ringsIn[i + 1];
    for (let k = 0; k < subdivide; k++) {
      const t = smoothstep(0, 1, k / subdivide);
      const lerp = (u: number, v: number) => u + (v - u) * t;
      rings.push({
        y: r0.y + (r1.y - r0.y) * (k / subdivide),
        a: lerp(r0.a, r1.a),
        b: lerp(r0.b, r1.b),
        cx: lerp(r0.cx ?? 0, r1.cx ?? 0),
        cz: lerp(r0.cz ?? 0, r1.cz ?? 0),
      });
    }
  }
  rings.push(ringsIn[ringsIn.length - 1]);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const e = 2 / exponent;
  rings.forEach((r, i) => {
    for (let j = 0; j <= segments; j++) {
      const t = (j / segments) * Math.PI * 2;
      const c = Math.cos(t);
      const s = Math.sin(t);
      const x = (r.cx ?? 0) + r.a * Math.sign(c) * Math.abs(c) ** e;
      const z = (r.cz ?? 0) + r.b * Math.sign(s) * Math.abs(s) ** e;
      positions.push(x, r.y, z);
      uvs.push(j / segments, i / (rings.length - 1));
    }
  });
  const row = segments + 1;
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * row + j;
      indices.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Rescale a geometry's UVs into 0..1 (for patches whose UVs are in cm). */
export function normalizeUV(geo: BufferGeometry): BufferGeometry {
  const uv = geo.getAttribute('uv');
  let u0 = Infinity;
  let u1 = -Infinity;
  let v0 = Infinity;
  let v1 = -Infinity;
  for (let i = 0; i < uv.count; i++) {
    u0 = Math.min(u0, uv.getX(i));
    u1 = Math.max(u1, uv.getX(i));
    v0 = Math.min(v0, uv.getY(i));
    v1 = Math.max(v1, uv.getY(i));
  }
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (uv.getX(i) - u0) / (u1 - u0 || 1), (uv.getY(i) - v0) / (v1 - v0 || 1));
  }
  uv.needsUpdate = true;
  return geo;
}

/**
 * Tube along a smooth curve through `points` whose radius follows
 * `radius(t)` (t = 0..1 along the curve), optionally flattened
 * (`scaleX`, `scaleZ` act on the cross-section, for band-like tendons).
 */
export function createTaperedTube(
  points: Vector3[],
  radius: (t: number) => number,
  tubularSegments = 96,
  radialSegments = 14,
  scaleX = 1,
  scaleZ = 1,
): BufferGeometry {
  const curve = new CatmullRomCurve3(points, false, 'centripetal');
  const geo = new TubeGeometry(curve, tubularSegments, 1, radialSegments, false);
  const pos = geo.getAttribute('position');
  const c = new Vector3();
  const v = new Vector3();
  for (let i = 0; i <= tubularSegments; i++) {
    const t = i / tubularSegments;
    curve.getPointAt(t, c);
    const r = radius(t);
    for (let j = 0; j <= radialSegments; j++) {
      const idx = i * (radialSegments + 1) + j;
      v.fromBufferAttribute(pos, idx).sub(c);
      v.x *= r * scaleX;
      v.y *= r;
      v.z *= r * scaleZ;
      pos.setXYZ(idx, c.x + v.x, c.y + v.y, c.z + v.z);
    }
  }
  pos.needsUpdate = true;
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
