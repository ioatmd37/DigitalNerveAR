/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import pkg from './package.json' with { type: 'json' };

// `npm run dev:https` runs Vite with `--mode https`, which enables a
// self-signed certificate. Mobile browsers only grant camera access on
// HTTPS (or localhost), so HTTPS is required when a tablet connects over
// the local network.
export default defineConfig(({ mode }) => ({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
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
