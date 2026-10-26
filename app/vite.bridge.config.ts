import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
    outDir: 'dist-bridge',
    emptyOutDir: true,
    minify: true,
    sourcemap: false,
    lib: {
      entry: resolve(import.meta.dirname, 'src/native/published-bridge.ts'),
      name: 'OazeNativeBridge',
      formats: ['iife'],
      fileName: () => 'bridge.js',
    },
  },
});
