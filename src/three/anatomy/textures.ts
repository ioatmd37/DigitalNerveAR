import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';

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

const LABEL_FONT = '"Noto Sans Thai", "Sarabun", "Leelawadee UI", "Thonburi", system-ui, sans-serif';

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
  const badge = opts.icon ? height * 0.62 : 0;
  const pad = 22;
  const width = Math.ceil(Math.min(1400, pad * 2 + (badge ? badge + 18 : 0) + Math.max(w1, w2)));

  const c = createCanvas(width, height)!;
  const g = c.getContext('2d')!;
  const r = 22;
  g.fillStyle = 'rgba(15, 23, 42, 0.82)';
  g.beginPath();
  g.roundRect(0, 0, width, height, r);
  g.fill();
  g.strokeStyle = opts.color;
  g.lineWidth = 5;
  g.beginPath();
  g.roundRect(2.5, 2.5, width - 5, height - 5, r - 2);
  g.stroke();

  let x = pad;
  if (opts.icon) {
    const cy = height / 2;
    g.fillStyle = opts.color;
    g.beginPath();
    g.arc(x + badge / 2, cy, badge / 2, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#0f172a';
    g.font = `800 ${Math.round(badge * 0.55)}px ${LABEL_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(opts.icon, x + badge / 2, cy + 2);
    x += badge + 18;
  }
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.fillStyle = '#f8fafc';
  g.font = `700 ${primarySize}px ${LABEL_FONT}`;
  const primaryY = opts.secondary ? height * 0.37 : height / 2;
  g.fillText(opts.primary, x, primaryY);
  if (opts.secondary) {
    g.fillStyle = '#cbd5e1';
    g.font = `500 ${secondarySize}px ${LABEL_FONT}`;
    g.fillText(opts.secondary, x, height * 0.72);
  }
  const texture = new CanvasTexture(c);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return { texture, aspect: width / height };
}
