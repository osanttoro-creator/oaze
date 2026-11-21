import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base './' so the same build loads inside Capacitor and Tauri.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5188, strictPort: true },
  build: { target: 'es2022', sourcemap: false },
  test: {
    /*
      O ambiente padrão é `node`, e cada teste de componente pede jsdom com um
      docblock `@vitest-environment jsdom` na primeira linha.

      Por que não jsdom em tudo: o jsdom entrega um `crypto` sem `subtle`, e é
      exatamente ele que o PIN (PBKDF2) e o cofre cifrado (AES-GCM) usam. Ligar
      jsdom globalmente faria os testes de criptografia passarem a testar outra
      coisa — ou quebrarem sem motivo real.
    */
    environment: 'node',
    /* Telas lazy podem carregar mais devagar em máquinas com Drive sincronizado. */
    testTimeout: 15000,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['src/test/setup.ts'],
    /*
      `globals` existe por uma razão só: a limpeza automática do
      @testing-library/react se registra quando enxerga um `afterEach` global.
      Sem isso, o DOM de um teste sobra para o próximo e os erros saem como
      "found multiple elements" — que parece bug do componente e não é.
      Os testes continuam importando `describe`/`it`/`expect` explicitamente.
    */
    globals: true,
  },
});
