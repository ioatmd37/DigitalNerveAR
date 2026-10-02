import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';
import type { Digit } from './layout';

/**
 * Canvas-based textures. In non-DOM environments (unit tests) these return
 * null and callers fall back to plain colors.
 */
export function createCanvas(width: number, height: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return c.getContext('2d') ? c : null;
}

function finishTexture(canvas: HTMLCanvasElement, repeat = 1): Texture {
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 4;
  return tex;
}

/** Diagonal hatching — a non-color cue for the avoid zone. */
export function createHatchTexture(color: string): Texture | null {
  const c = createCanvas(64, 64);
  if (!c) return null;
  const g = c.getContext('2d')!;
  g.fillStyle = color;
  g.globalAlpha = 0.28;
  g.fillRect(0, 0, 64, 64);
  g.globalAlpha = 0.85;
  g.strokeStyle = color;
  g.lineWidth = 9;
  for (let i = -64; i <= 128; i += 32) {
    g.beginPath();
    g.moveTo(i, 64);
    g.lineTo(i + 64, 0);
    g.stroke();
  }
  return finishTexture(c, 2.2);
}

/** Dot pattern — a non-color cue for the safe learning zones. */
export function createDotTexture(color: string): Texture | null {
  const c = createCanvas(64, 64);
  if (!c) return null;
  const g = c.getContext('2d')!;
  g.fillStyle = color;
  g.globalAlpha = 0.32;
  g.fillRect(0, 0, 64, 64);
  g.globalAlpha = 0.95;
  for (const [x, y] of [
    [16, 16],
    [48, 48],
  ]) {
    g.beginPath();
    g.arc(x, y, 8, 0, Math.PI * 2);
    g.fill();
  }
  return finishTexture(c, 3);
}

export interface LabelTextureOptions {
  primary: string;
  secondary?: string;
  icon?: string;
  color: string;
  compact?: boolean;
}

const LABEL_FONT = '"IBM Plex Sans Thai", "Noto Sans Thai", "Sarabun", "Leelawadee UI", "Thonburi", system-ui, sans-serif';

/** Rounded dark label with a colored badge containing the structure symbol. */
export function createLabelTexture(opts: LabelTextureOptions): { texture: Texture; aspect: number } | null {
  const compact = opts.compact ?? false;
  const height = compact ? 88 : opts.secondary ? 150 : 110;
  const primarySize = compact ? 40 : 44;
  const secondarySize = 30;
  const probe = createCanvas(8, 8);
  if (!probe) return null;
  const pg = probe.getContext('2d')!;
  pg.font = `700 ${primarySize}px ${LABEL_FONT}`;
  const w1 = pg.measureText(opts.primary).width;
  pg.font = `500 ${secondarySize}px ${LABEL_FONT}`;
  const w2 = opts.secondary ? pg.measureText(opts.secondary).width : 0;
  const badge = opts.icon ? height * 0.5 : 0;
  const pad = 22;
  const width = Math.ceil(Math.min(1400, pad * 2 + (badge ? badge + 18 : 0) + Math.max(w1, w2)));

  const c = createCanvas(width, height)!;
  const g = c.getContext('2d')!;
  // Flat dark plate, hairline border, thin colour bar on the left.
  const r = 10;
  g.fillStyle = 'rgba(17, 17, 17, 0.88)';
  g.beginPath();
  g.roundRect(0, 0, width, height, r);
  g.fill();
  g.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  g.lineWidth = 2;
  g.beginPath();
  g.roundRect(1, 1, width - 2, height - 2, r - 1);
  g.stroke();
  g.fillStyle = opts.color;
  g.beginPath();
  g.roundRect(0, 0, 9, height, [r, 0, 0, r]);
  g.fill();

  let x = pad + 6;
  if (opts.icon) {
    const cy = height / 2;
    g.fillStyle = opts.color;
    g.beginPath();
    g.roundRect(x, cy - badge / 2, badge, badge, 6);
    g.fill();
    g.fillStyle = '#111111';
    g.font = `800 ${Math.round(badge * 0.55)}px ${LABEL_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(opts.icon, x + badge / 2, cy + 2);
    x += badge + 18;
  }
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.fillStyle = '#f6f6f5';
  g.font = `600 ${primarySize}px ${LABEL_FONT}`;
  const primaryY = opts.secondary ? height * 0.37 : height / 2;
  g.fillText(opts.primary, x, primaryY);
  if (opts.secondary) {
    g.fillStyle = '#b4b4b1';
    g.font = `400 ${secondarySize}px ${LABEL_FONT}`;
    g.fillText(opts.secondary, x, height * 0.72);
  }
  const texture = new CanvasTexture(c);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return { texture, aspect: width / height };
}

// ------------------------------------------------------------------ realism textures
// All procedural (no image assets). Envelope UVs: u = angle around the
// finger (0 = ulnar, 0.25 = dorsal, 0.5 = radial, 0.75 = volar),
// v = position along the envelope from the digit's envelopeY0 to envelopeY1.


const SKIN_W = 1024;
const SKIN_H = 2048;
const uOf = (thetaDeg: number) => (SKIN_W * (((thetaDeg % 360) + 360) % 360)) / 360;

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Draws crease lines across an angular range at height y. */
function crease(g: CanvasRenderingContext2D, vOf: (y: number) => number, y: number, th0: number, th1: number, width: number, wobble = 4) {
  g.beginPath();
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const th = th0 + ((th1 - th0) * i) / steps;
    const x = uOf(th);
    const yy = vOf(y) + wobble * Math.sin(i * 0.9) + 6 * Math.sin((i / steps) * Math.PI);
    if (i === 0) g.moveTo(x, yy);
    else g.lineTo(x, yy);
  }
  g.lineWidth = width;
  g.stroke();
}

export interface SkinTextures {
  map: Texture;
  bump: Texture;
}

/** Skin colour (with knuckle/pulp tint variation) + bump (pores, creases, fingerprint). */
export function createSkinTextures(d: Digit, seed = 7): SkinTextures | null {
  const vOf = (y: number) => SKIN_H * (1 - (y - d.envelopeY0) / (d.envelopeY1 - d.envelopeY0));
  const ip = d.joints.ip;
  const color = createCanvas(SKIN_W, SKIN_H);
  const bump = createCanvas(SKIN_W, SKIN_H);
  if (!color || !bump) return null;
  const rnd = seeded(seed);

  // ---- colour
  const c = color.getContext('2d')!;
  c.fillStyle = '#e2b192';
  c.fillRect(0, 0, SKIN_W, SKIN_H);
  // Paler palmar skin.
  const volar = c.createLinearGradient(uOf(200), 0, uOf(340), 0);
  volar.addColorStop(0, 'rgba(240,206,182,0)');
  volar.addColorStop(0.5, 'rgba(240,206,182,0.75)');
  volar.addColorStop(1, 'rgba(240,206,182,0)');
  c.fillStyle = volar;
  c.fillRect(uOf(200), 0, uOf(340) - uOf(200), SKIN_H);
  // Redder knuckles and fingertip pad.
  const blush = (th: number, y: number, rx: number, ry: number, a: number) => {
    const g = c.createRadialGradient(uOf(th), vOf(y), 1, uOf(th), vOf(y), rx);
    g.addColorStop(0, `rgba(200,120,100,${a})`);
    g.addColorStop(1, 'rgba(200,120,100,0)');
    c.save();
    c.translate(uOf(th), vOf(y));
    c.scale(1, ry / rx);
    c.translate(-uOf(th), -vOf(y));
    c.fillStyle = g;
    c.fillRect(uOf(th) - rx, vOf(y) - rx, rx * 2, rx * 2);
    c.restore();
  };
  blush(90, d.joints.mcp, 170, 120, 0.35);
  ip.forEach((y, i) => blush(90, y, i === 0 ? 140 : 110, i === 0 ? 80 : 60, i === 0 ? 0.3 : 0.22));
  blush(270, d.tipY - 0.7, 200, 110, 0.25);
  // Fine mottling.
  for (let i = 0; i < 9000; i++) {
    c.fillStyle = `rgba(${150 + rnd() * 60},${90 + rnd() * 40},${70 + rnd() * 30},${0.04 + rnd() * 0.05})`;
    c.fillRect(rnd() * SKIN_W, rnd() * SKIN_H, 2 + rnd() * 5, 2 + rnd() * 5);
  }

  // ---- bump (128 = flat; darker = lower)
  const b = bump.getContext('2d')!;
  b.fillStyle = 'rgb(128,128,128)';
  b.fillRect(0, 0, SKIN_W, SKIN_H);
  for (let i = 0; i < 26000; i++) {
    const g = 110 + rnd() * 36;
    b.fillStyle = `rgb(${g},${g},${g})`;
    b.fillRect(rnd() * SKIN_W, rnd() * SKIN_H, 1.5 + rnd() * 2, 1.5 + rnd() * 2);
  }
  b.strokeStyle = 'rgb(60,60,60)';
  b.lineCap = 'round';
  // Volar flexion creases: proximal digital (double), PIP (double), DIP; the thumb has one IP crease.
  const creases: [number, number][] = [
    [0.0, 7],
    [0.18, 5],
  ];
  if (ip.length >= 2) creases.push([ip[0] - 0.12, 7], [ip[0] + 0.1, 6], ...ip.slice(1).map((y) => [y, 6] as [number, number]));
  else creases.push(...ip.map((y) => [y, 7] as [number, number]));
  for (const [y, w] of creases) crease(b, vOf, y, 205, 335, w);
  // Dorsal knuckle wrinkles over PIP and DIP (short curved lines).
  b.strokeStyle = 'rgb(85,85,85)';
  for (const [yc, n, span] of [
    ...ip.map((y, i) => [y, i === 0 ? 6 : 4, i === 0 ? 0.42 : 0.26] as const),
    [d.joints.mcp, 4, 0.36] as const,
  ]) {
    for (let i = 0; i < n; i++) {
      const y = yc - span / 2 + (span * i) / (n - 1);
      const half = 28 - Math.abs(i - (n - 1) / 2) * 5;
      crease(b, vOf, y, 90 - half, 90 + half, 3, 2);
    }
  }
  // Fingerprint whorl on the pulp.
  b.strokeStyle = 'rgb(95,95,95)';
  b.lineWidth = 2.2;
  const cx = uOf(270);
  const cy = vOf(d.tipY - 0.8);
  for (let r = 6; r < 120; r += 7) {
    b.beginPath();
    b.ellipse(cx, cy, r * 1.15, r * 0.85, 0.15, 0, Math.PI * 2);
    b.stroke();
  }

  const map = new CanvasTexture(color);
  map.colorSpace = SRGBColorSpace;
  map.anisotropy = 8;
  const bumpTex = new CanvasTexture(bump);
  bumpTex.anisotropy = 8;
  return { map, bump: bumpTex };
}

/** Nail plate: pink bed, white lunula proximally, pale free edge distally (UV 0..1, v = proximal→distal). */
export function createNailTexture(): Texture | null {
  const cv = createCanvas(256, 256);
  if (!cv) return null;
  const g = cv.getContext('2d')!;
  const grad = g.createLinearGradient(0, 256, 0, 0);
  grad.addColorStop(0, '#f2c4bd');
  grad.addColorStop(0.75, '#eeb3ab');
  grad.addColorStop(0.88, '#f6dcd6');
  grad.addColorStop(1, '#fbf3ee');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = 'rgba(255,250,245,0.85)';
  g.beginPath();
  g.ellipse(128, 256, 82, 58, 0, Math.PI, 0);
  g.fill();
  // Faint longitudinal ridges.
  g.strokeStyle = 'rgba(255,255,255,0.12)';
  for (let x = 20; x < 256; x += 14) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x + 3, 256);
    g.stroke();
  }
  const t = new CanvasTexture(cv);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** Longitudinal fibre stripes for tendons and nerve fascicles (bump map; tube u = along, v = around). */
export function createFiberTexture(): Texture | null {
  const cv = createCanvas(64, 256);
  if (!cv) return null;
  const g = cv.getContext('2d')!;
  const rnd = seeded(3);
  for (let y = 0; y < 256; y += 4) {
    const v = 100 + rnd() * 60;
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(0, y, 64, 4);
  }
  const t = new CanvasTexture(cv);
  t.wrapS = RepeatWrapping;
  t.wrapT = RepeatWrapping;
  t.repeat.set(6, 1);
  return t;
}
