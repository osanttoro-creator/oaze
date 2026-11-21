import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

/*
  Preparação comum dos testes.

  Roda nos dois ambientes. Tudo que mexe em DOM é protegido por uma checagem,
  porque os testes de regra e de criptografia rodam em `node` puro — e um setup
  que explode fora do navegador faria metade da suíte falhar por motivo errado.
*/

if (typeof window !== 'undefined') {
  configure({ asyncUtilTimeout: 10000 });
  /* O jsdom não implementa matchMedia, e o app inteiro decide casca, tema e
     "reduzir movimento" por ele. Sem esta ponte, nada renderiza. */
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }

  /* Também não existem no jsdom, e o campo de partículas usa os dois. */
  if (!window.IntersectionObserver) {
    window.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
      root = null;
      rootMargin = '';
      thresholds: number[] = [];
    } as unknown as typeof window.IntersectionObserver;
  }
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = ((cb: FrameRequestCallback) =>
      setTimeout(() => cb(performance.now()), 16) as unknown as number) as typeof window.requestAnimationFrame;
    window.cancelAnimationFrame = ((id: number) => clearTimeout(id)) as typeof window.cancelAnimationFrame;
  }

  /* `getContext` devolve null no jsdom; o campo de partículas já trata isso e
     simplesmente não desenha. Declarado aqui para a intenção ficar visível. */
  HTMLCanvasElement.prototype.getContext = (() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });
}

/** Ajuda a definir o tamanho de janela que o teste quer. */
export function setViewport(width: number): void {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
  window.matchMedia = ((query: string) => {
    const min = /min-width:\s*(\d+)px/.exec(query);
    const max = /max-width:\s*(\d+)px/.exec(query);
    const matches = (!min || width >= Number(min[1])) && (!max || width <= Number(max[1]));
    return {
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    };
  }) as unknown as typeof window.matchMedia;
}
