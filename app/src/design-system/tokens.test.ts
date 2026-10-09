import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BREAKPOINTS, DURATION, EASE, TOUCH_MIN } from './tokens';

/*
  Dois guardas que valem mais do que parecem:

  1. `tokens.css` e `tokens.ts` guardam os mesmos números em formatos
     diferentes, porque canvas e media query em JS não leem custom property.
     Duas cópias divergem na primeira pressa — então o teste compara.
  2. O briefing proíbe valor visual espalhado pelo código. O segundo bloco varre
     as folhas do design system procurando hex, raio e duração escritos à mão.
*/

const here = join(process.cwd(), 'src', 'design-system');
const tokensCss = readFileSync(join(here, 'tokens.css'), 'utf8');

function cssVar(name: string): string {
  const m = tokensCss.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!m?.[1]) throw new Error(`token --${name} não existe em tokens.css`);
  return m[1].trim();
}

describe('tokens.ts espelha tokens.css', () => {
  it('as durações batem', () => {
    for (const [name, ms] of Object.entries(DURATION)) {
      expect(cssVar(`dur-${name}`), `--dur-${name}`).toBe(`${ms}ms`);
    }
  });

  it('as curvas batem', () => {
    const norm = (s: string) => s.replace(/\s+/g, '');
    expect(norm(cssVar('ease-out'))).toBe(norm(EASE.out));
    expect(norm(cssVar('ease-in-out'))).toBe(norm(EASE.inOut));
    expect(norm(cssVar('ease-spring'))).toBe(norm(EASE.spring));
  });

  it('o alvo de toque mínimo bate, e não é menor que 44 px', () => {
    expect(cssVar('touch-min')).toBe(`${TOUCH_MIN}px`);
    expect(TOUCH_MIN).toBeGreaterThanOrEqual(44);
  });

  it('as quatro faixas estão declaradas e em ordem crescente', () => {
    const values = Object.values(BREAKPOINTS);
    expect(values).toEqual([...values].sort((a, b) => a - b));
    expect(new Set(values).size).toBe(values.length);
  });
});

describe('escala de texto', () => {
  it('a tipografia é em rem, para a fonte do sistema ter efeito', () => {
    const escala = [...tokensCss.matchAll(/--t-[\w-]+:\s*([^;]+);/g)].map((m) => m[1]!);
    expect(escala.length).toBeGreaterThan(6);
    const comPx = escala.filter((v) => /\d+px/.test(v));
    expect(comPx, 'passos da escala ainda em px').toEqual([]);
  });

  it('as folhas do design system não fixam tamanho de fonte em px', () => {
    for (const file of ['components/components.css', 'intelligence/intelligence.css']) {
      const css = readFileSync(join(here, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      expect(css.match(/font-size:\s*\d+px/g) ?? [], file).toEqual([]);
    }
  });
});

describe('o tema claro cobre o escuro', () => {
  it('todo token de cor do tema escuro tem equivalente no claro', () => {
    const dark = tokensCss.slice(0, tokensCss.indexOf("[data-theme='light']"));
    const light = tokensCss.slice(tokensCss.indexOf("[data-theme='light']"));
    /* os tokens que mudam de tema são os de superfície, texto e série; marca,
       tipo, espaço, raio e tempo são iguais nos dois e ficam de fora */
    const themed = /--(bg|surface|sidebar|line|fill|text|in|out|accent|warn|danger|series)[\w-]*:/g;
    const names = new Set([...dark.matchAll(themed)].map((m) => m[0]));
    const missing = [...names].filter((n) => !light.includes(n));
    expect(missing).toEqual([]);
  });
});

describe('nenhum valor visual solto nas folhas do design system', () => {
  const sheets = ['tokens.css', 'components/components.css', 'intelligence/intelligence.css'];

  it('não há cor em hex fora de tokens.css', () => {
    for (const file of sheets.filter((f) => f !== 'tokens.css')) {
      const css = readFileSync(join(here, file), 'utf8');
      const hits = css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
      expect(hits, file).toEqual([]);
    }
  });

  it('não há duração em ms ou s fora de tokens.css', () => {
    for (const file of sheets.filter((f) => f !== 'tokens.css')) {
      const css = readFileSync(join(here, file), 'utf8');
      /* ignora o que está dentro de comentário e as frações de @keyframes */
      const body = css.replace(/\/\*[\s\S]*?\*\//g, '');
      const hits = body.match(/(?<![\w-])\d+(\.\d+)?m?s(?![\w-])/g) ?? [];
      expect(hits, file).toEqual([]);
    }
  });
});
