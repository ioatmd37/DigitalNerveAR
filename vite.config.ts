/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { execSync } from 'node:child_process';
import pkg from './package.json' with { type: 'json' };

/** Short commit of this build (CI provides GITHUB_SHA; locally ask git; otherwise "dev"). */
function commitSha(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'dev';
  }
}

// `npm run dev:https` runs Vite with `--mode https`, which enables a
// self-signed certificate. Mobile browsers only grant camera access on
// HTTPS (or localhost), so HTTPS is required when a tablet connects over
// the local network.
export default defineConfig(({ mode }) => ({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_SHA__: JSON.stringify(commitSha()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [react(), tailwindcss(), ...(mode === 'https' ? [basicSsl()] : [])],
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
  build: {
    // MindAR + TensorFlow.js is a large (lazy-loaded) chunk by nature.
    chunkSizeWarningLimit: 4000,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}));
