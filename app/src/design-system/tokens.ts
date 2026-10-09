/*
  Espelho tipado dos tokens que o JavaScript precisa conhecer.

  A folha `tokens.css` é a fonte para tudo que é visual. Os valores abaixo são
  os mesmos números, repetidos aqui porque animação com canvas, media query em
  JS e teste de arquitetura não leem custom property. `tests/tokens.test.ts`
  compara os dois arquivos e falha quando um lado é alterado sem o outro.
*/

/** Quatro faixas, nomeadas. O breakpoint decide a CASCA, não o layout interno. */
export const BREAKPOINTS = {
  phone: 0,
  tablet: 600,
  desktop: 1024,
  wide: 1440,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

export const BREAKPOINT_ORDER: readonly Breakpoint[] = ['phone', 'tablet', 'desktop', 'wide'];

/** Durações em milissegundos, iguais às de `tokens.css`. */
export const DURATION = {
  instant: 90,
  fast: 150,
  base: 250,
  slow: 380,
  sheet: 420,
  card: 550,
  shimmer: 1600,
} as const;

export const EASE = {
  out: 'cubic-bezier(.2, .9, .2, 1)',
  inOut: 'cubic-bezier(.4, 0, .2, 1)',
  spring: 'cubic-bezier(.34, 1.56, .64, 1)',
} as const;

/** Alvo de toque mínimo. Nada interativo fica menor do que isto. */
export const TOUCH_MIN = 44;

/** Cores que o canvas do campo de partículas precisa em número, não em var(). */
export const PARTICLE_COLORS = {
  dark: { core: '#5FA99B', halo: '#F0E5CF', warn: '#E9875E', danger: '#E07A6A' },
  light: { core: '#3C7F71', halo: '#14242F', warn: '#B65A2E', danger: '#A8453A' },
} as const;

export const SERIES = [
  '--series-1',
  '--series-2',
  '--series-3',
  '--series-4',
  '--series-5',
  '--series-6',
  '--series-7',
  '--series-8',
  '--series-9',
  '--series-10',
] as const;
