import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, TubeGeometry, Vector3 } from 'three';

/**
 * Generic geometry helpers (lofts, tapered tubes, UV utilities). Digit
 * specific skin geometry lives in `layout.ts` (`Digit`).
 *
 * Anatomical frame (cm): +X ulnar, −X radial, +Y distal, +Z dorsal.
 */

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
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
