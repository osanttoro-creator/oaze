import { useEffect } from 'react';

/*
  Atalhos de teclado — antes só `N` existia (P13).

  Duas regras que todo atalho respeita, e que são a diferença entre atalho e
  armadilha:

  1. **Não dispara enquanto a pessoa digita.** Campo de texto, área de texto,
     seletor e qualquer `contenteditable` ficam de fora. Sem isso, escrever
     "Nubank" na descrição abriria o menu de novo lançamento na letra N.
  2. **Modificador do sistema é do sistema.** `Ctrl/Cmd+K` é nosso de propósito,
     mas um atalho de letra solta nunca captura `Ctrl`, `Alt` ou `Meta` — essas
     combinações pertencem ao navegador e ao sistema operacional.
*/

export interface Shortcut {
  /** `n`, `?`, `k` — sempre minúsculo. */
  key: string;
  /** `true` exige Ctrl no Windows/Linux e Cmd no macOS. */
  mod?: boolean;
  shift?: boolean;
  description: string;
  run: () => void;
}

function typing(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

export function useShortcuts(list: Shortcut[], active = true): void {
  useEffect(() => {
    if (!active) return;
    const on = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      for (const s of list) {
        if (e.key.toLowerCase() !== s.key) continue;
        if (!!s.mod !== mod) continue;
        if (!!s.shift !== e.shiftKey) continue;
        /* atalho de letra solta não vale durante digitação; com modificador vale,
           porque Ctrl+K dentro de um campo ainda deve abrir a paleta */
        if (!s.mod && typing(e.target)) continue;
        if (!s.mod && e.altKey) continue;
        e.preventDefault();
        s.run();
        return;
      }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [list, active]);
}

/** Rótulo por sistema: mostrar "Ctrl" num Mac é errado e irrita. */
export function modLabel(): string {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
    ? '⌘'
    : 'Ctrl';
}

export function describe(s: Shortcut): string {
  const parts: string[] = [];
  if (s.mod) parts.push(modLabel());
  if (s.shift) parts.push('Shift');
  parts.push(s.key.toUpperCase());
  return parts.join('+');
}
