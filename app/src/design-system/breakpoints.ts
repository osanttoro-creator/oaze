import { useEffect, useState } from 'react';
import { BREAKPOINTS, BREAKPOINT_ORDER, type Breakpoint } from './tokens';

/*
  Antes havia um `matchMedia('(min-width: 900px)')` solto decidindo tudo (P11).
  Agora a largura vira uma faixa nomeada, e a faixa decide qual casca de
  navegação monta. Layout interno de componente NÃO deve consultar isto: usa
  container query ou grade que se adapta ao espaço recebido.
*/

const QUERIES: Record<Breakpoint, string> = {
  phone: `(max-width: ${BREAKPOINTS.tablet - 1}px)`,
  tablet: `(min-width: ${BREAKPOINTS.tablet}px) and (max-width: ${BREAKPOINTS.desktop - 1}px)`,
  desktop: `(min-width: ${BREAKPOINTS.desktop}px) and (max-width: ${BREAKPOINTS.wide - 1}px)`,
  wide: `(min-width: ${BREAKPOINTS.wide}px)`,
};

export function currentBreakpoint(width = window.innerWidth): Breakpoint {
  if (width >= BREAKPOINTS.wide) return 'wide';
  if (width >= BREAKPOINTS.desktop) return 'desktop';
  if (width >= BREAKPOINTS.tablet) return 'tablet';
  return 'phone';
}

/** Uma assinatura por faixa, não um listener de `resize`: muda só na troca. */
export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(() => currentBreakpoint());
  useEffect(() => {
    const lists = BREAKPOINT_ORDER.map((name) => ({ name, mq: matchMedia(QUERIES[name]) }));
    const sync = () => {
      const hit = lists.find(({ mq }) => mq.matches);
      if (hit) setBp(hit.name);
    };
    lists.forEach(({ mq }) => mq.addEventListener('change', sync));
    sync();
    return () => lists.forEach(({ mq }) => mq.removeEventListener('change', sync));
  }, []);
  return bp;
}

export function atLeast(bp: Breakpoint, min: Breakpoint): boolean {
  return BREAKPOINT_ORDER.indexOf(bp) >= BREAKPOINT_ORDER.indexOf(min);
}

/** Casca de navegação: ilha inferior no celular e no tablet, lateral no resto. */
export type ShellKind = 'island' | 'sidebar';

export function shellFor(bp: Breakpoint): ShellKind {
  return atLeast(bp, 'desktop') ? 'sidebar' : 'island';
}

/** Painel de contexto: sob demanda no desktop, fixo em tela larga. */
export type ContextPanel = 'none' | 'on-demand' | 'fixed';

export function contextPanelFor(bp: Breakpoint): ContextPanel {
  if (bp === 'wide') return 'fixed';
  if (bp === 'desktop') return 'on-demand';
  return 'none';
}

/** `true` quando o ponteiro é grosso — toque. `:hover` não existe aqui. */
export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(() => matchMedia('(pointer: coarse)').matches);
  useEffect(() => {
    const mq = matchMedia('(pointer: coarse)');
    const on = () => setCoarse(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return coarse;
}

/** Respeitado por toda animação escrita em JS; o CSS já tem o @media. */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState(prefersReducedMotion);
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduce(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduce;
}
