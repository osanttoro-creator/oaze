import { useEffect, useRef } from 'react';

/*
  As quatro coisas que todo diálogo precisa e que ninguém lembra de escrever:
  Esc fecha, o foco entra, o foco não escapa, e o foco volta de onde veio.
*/

/*
  O que conta como alcançável por Tab.

  A exclusão é feita no próprio seletor — `disabled`, `hidden`, `aria-hidden` e
  `tabindex="-1"` — e NÃO por `offsetParent !== null`, que foi a primeira versão
  disto e estava errada: `offsetParent` é `null` para qualquer elemento
  `position: fixed`, e as camadas do OAZE (folha, janela, painel) são todas
  fixas. O trap simplesmente não prendia nada.
*/
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
]
  .map((s) => `${s}:not([hidden]):not([aria-hidden="true"])`)
  .join(',');

export function useEscape(onClose: () => void, active = true): void {
  useEffect(() => {
    if (!active) return;
    const on = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', on);
    return () => document.removeEventListener('keydown', on);
  }, [onClose, active]);
}

/**
 * Prende o foco dentro do elemento e devolve ao anterior na saída. Sem isto,
 * Tab num diálogo passeia pela página atrás — que o leitor de tela nem deveria
 * estar alcançando.
 */
export function useFocusTrap<T extends HTMLElement>(active = true) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const box = ref.current;
    if (!active || !box) return;
    const came = document.activeElement as HTMLElement | null;
    const first = box.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? box).focus({ preventScroll: true });

    const on = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = [...box.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!items.length) return;
      const head = items[0];
      const tail = items[items.length - 1];
      if (!head || !tail) return;
      if (e.shiftKey && document.activeElement === head) {
        e.preventDefault();
        tail.focus();
      } else if (!e.shiftKey && document.activeElement === tail) {
        e.preventDefault();
        head.focus();
      }
    };
    box.addEventListener('keydown', on);
    return () => {
      box.removeEventListener('keydown', on);
      came?.focus?.({ preventScroll: true });
    };
  }, [active]);
  return ref;
}

/** Trava a rolagem do fundo enquanto uma camada está aberta. */
export function useScrollLock(active = true): void {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);
}

/** Navegação por setas em lista de opções (menu, dropdown, paleta). */
export function rove(items: HTMLElement[], current: number, key: string): number | null {
  if (!items.length) return null;
  if (key === 'ArrowDown') return (current + 1) % items.length;
  if (key === 'ArrowUp') return (current - 1 + items.length) % items.length;
  if (key === 'Home') return 0;
  if (key === 'End') return items.length - 1;
  return null;
}
