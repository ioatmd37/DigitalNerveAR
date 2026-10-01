#!/usr/bin/env node
/**
 * Build the AR image marker and its compiled MindAR target.
 *
 *   node scripts/build-marker.mjs                 # compile public/marker/marker.png → targets.mind
 *   node scripts/build-marker.mjs --generate      # (re)generate marker.png, then compile
 *   node scripts/build-marker.mjs --image my.png  # compile a custom image (copied to marker.png)
 *   node scripts/build-marker.mjs --seed 7 --generate
 *
 * Uses MindAR's own browser compiler inside headless Chromium (via
 * playwright-core), so no native dependencies are needed. Chromium is found
 * via $CHROMIUM_PATH, Playwright's browser cache, or common system paths.
 * If no Chromium is available, use the in-app compiler
 * (Instructor Mode → Marker tools) or MindAR's online compiler instead
 * (see docs/AR_MARKER_SETUP_GUIDE.md).
 */
import { existsSync, readdirSync, readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'marker');
const markerPng = join(outDir, 'marker.png');
const targetFile = join(outDir, 'targets.mind');
const mindarDist = join(root, 'node_modules', 'mind-ar', 'dist');

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

function findChromium() {
  const candidates = [process.env.CHROMIUM_PATH];
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || join(process.env.HOME || '', '.cache', 'ms-playwright');
  for (const base of [cache, '/opt/pw-browsers']) {
    if (!existsSync(base)) continue;
    for (const d of readdirSync(base).filter((n) => /^chromium-\d+$/.test(n)).sort().reverse()) {
      candidates.push(join(base, d, 'chrome-linux', 'chrome'));
      candidates.push(join(base, d, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'));
      candidates.push(join(base, d, 'chrome-win', 'chrome.exe'));
    }
  }
  candidates.push(
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  );
  return candidates.find((p) => p && existsSync(p));
}

/** Runs in the browser: draws a deterministic, feature-rich, asymmetric marker. */
function drawMarker(seed) {
  const S = 1024;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d');
  let s = seed >>> 0;
  const rnd = () => {
    // mulberry32
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const ink = () => ['#0b0f19', '#0b0f19', '#0b0f19', '#0b0f19', '#1e3a8a', '#0e7490'][Math.floor(rnd() * 6)];

  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, S, S);

  // Random geometric texture (corners/edges = trackable features). Shapes and
  // strokes are deliberately bold so the marker still tracks when printed as
  // a small (~5 cm) sticker on the back of a mannequin hand.
  const M = 70;
  for (let i = 0; i < 150; i++) {
    const x = M + rnd() * (S - 2 * M);
    const y = 170 + rnd() * (S - 170 - M);
    const r = 22 + rnd() * 58;
    g.fillStyle = ink();
    g.strokeStyle = ink();
    g.lineWidth = 9 + rnd() * 12;
    const kind = rnd();
    g.save();
    g.translate(x, y);
    g.rotate(rnd() * Math.PI * 2);
    if (kind < 0.3) {
      g.beginPath();
      const n = 3 + Math.floor(rnd() * 3);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + rnd() * 0.5;
        const rr = r * (0.6 + rnd() * 0.6);
        k === 0 ? g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      g.closePath();
      g.fill();
    } else if (kind < 0.5) {
      g.fillRect(-r, -r * 0.35, r * 2, r * 0.7);
    } else if (kind < 0.68) {
      g.beginPath();
      g.arc(0, 0, r * 0.8, 0, Math.PI * 2);
      g.stroke();
    } else if (kind < 0.8) {
      g.beginPath();
      g.arc(0, 0, r * 0.5, 0, Math.PI * 2);
      g.fill();
    } else {
      g.beginPath();
      g.moveTo(-r, 0);
      g.lineTo(r, 0);
      g.moveTo(0, -r);
      g.lineTo(0, r * 0.4);
      g.stroke();
    }
    g.restore();
  }

  // Header band with orientation arrow (asymmetric → unambiguous rotation).
  g.fillStyle = '#0b0f19';
  g.fillRect(0, 0, S, 150);
  g.fillStyle = '#ffffff';
  g.font = '800 64px system-ui, sans-serif';
  g.textBaseline = 'middle';
  g.fillText('DNB-AR  R-HAND', 170, 60);
  g.font = '700 38px system-ui, sans-serif';
  g.fillStyle = '#67e8f9';
  g.fillText('TOP → FINGERTIPS', 170, 118);
  // Up arrow in the header (top-left).
  g.fillStyle = '#facc15';
  g.beginPath();
  g.moveTo(85, 18);
  g.lineTo(140, 88);
  g.lineTo(106, 88);
  g.lineTo(106, 134);
  g.lineTo(64, 134);
  g.lineTo(64, 88);
  g.lineTo(30, 88);
  g.closePath();
  g.fill();

  // Big asymmetric corner block (bottom-right) + checker strip (left).
  g.fillStyle = '#0b0f19';
  g.beginPath();
  g.moveTo(S, S);
  g.lineTo(S - 230, S);
  g.lineTo(S, S - 230);
  g.closePath();
  g.fill();
  for (let i = 0; i < 12; i++) {
    g.fillStyle = i % 2 ? '#0b0f19' : '#ffffff';
    g.fillRect(0, 170 + i * 60, 40, 60);
  }

  // Outer frame.
  g.strokeStyle = '#0b0f19';
  g.lineWidth = 28;
  g.strokeRect(14, 14, S - 28, S - 28);
  return c.toDataURL('image/png');
}

async function main() {
  const { chromium } = await import('playwright-core');
  const executablePath = findChromium();
  if (!executablePath) {
    console.error('✖ No Chromium found. Set CHROMIUM_PATH, or use the in-app compiler (Instructor Mode → Marker tools).');
    process.exit(1);
  }
  if (!existsSync(mindarDist)) {
    console.error('✖ node_modules/mind-ar not found. Run `npm install` first.');
    process.exit(1);
  }
  mkdirSync(outDir, { recursive: true });

  const custom = option('image', null);
  if (custom) {
    copyFileSync(resolve(custom), markerPng);
    console.log(`• Using custom image ${custom} → public/marker/marker.png`);
  }

  console.log(`• Chromium: ${executablePath}`);
  const browser = await chromium.launch({ executablePath });
  try {
    const page = await browser.newPage();
    const ORIGIN = 'http://mindar.local';
    await page.route(`${ORIGIN}/**`, (route) => {
      const name = new URL(route.request().url()).pathname.slice(1);
      if (name === '' || name === 'index.html') {
        return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body></body></html>' });
      }
      const file = join(mindarDist, name);
      if (!existsSync(file)) return route.fulfill({ status: 404, body: 'not found' });
      return route.fulfill({ contentType: 'application/javascript', body: readFileSync(file) });
    });
    page.on('console', (m) => {
      if (m.type() === 'error') console.error('  [browser]', m.text());
    });
    await page.goto(`${ORIGIN}/index.html`);

    if (flag('generate') || (!custom && !existsSync(markerPng))) {
      const seed = Number(option('seed', '20240917'));
      const dataUrl = await page.evaluate(drawMarker, seed);
      writeFileSync(markerPng, Buffer.from(dataUrl.split(',')[1], 'base64'));
      console.log(`• Generated public/marker/marker.png (seed ${seed})`);
    }

    const pngBase64 = readFileSync(markerPng).toString('base64');
    console.log('• Compiling MindAR target (this can take ~10–60 s)…');
    // Kick off compilation in the page and poll for the result; a single
    // long-lived evaluate() promise can be garbage collected by the driver.
    await page.evaluate(
      ({ origin, png }) => {
        window.__mindar = { progress: 0, done: false, error: null, bytes: null };
        (async () => {
          const { Compiler } = await import(`${origin}/mindar-image.prod.js`);
          const img = new Image();
          img.src = `data:image/png;base64,${png}`;
          await img.decode();
          const compiler = new Compiler();
          await compiler.compileImageTargets([img], (p) => (window.__mindar.progress = p));
          window.__mindar.bytes = Array.from(compiler.exportData());
          window.__mindar.done = true;
        })().catch((e) => {
          window.__mindar.error = String((e && e.stack) || e);
          window.__mindar.done = true;
        });
      },
      { origin: ORIGIN, png: pngBase64 },
    );
    let lastShown = -10;
    for (;;) {
      await new Promise((r) => setTimeout(r, 1000));
      const state = await page.evaluate(() => ({
        progress: window.__mindar.progress,
        done: window.__mindar.done,
        error: window.__mindar.error,
      }));
      if (state.progress - lastShown >= 10) {
        lastShown = state.progress;
        console.log(`  … ${Math.round(state.progress)}%`);
      }
      if (state.error) throw new Error(state.error);
      if (state.done) break;
    }
    const bytes = await page.evaluate(() => window.__mindar.bytes);
    writeFileSync(targetFile, Buffer.from(bytes));
    console.log(`✔ Wrote public/marker/targets.mind (${(bytes.length / 1024).toFixed(1)} KiB)`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('✖ Marker build failed:', err);
  process.exit(1);
});
