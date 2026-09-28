import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base './' so the same build loads inside Capacitor and Tauri.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5188, strictPort: true },
  build: { target: 'es2022', sourcemap: false },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
