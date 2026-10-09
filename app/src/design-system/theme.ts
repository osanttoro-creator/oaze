import { useEffect, useState } from 'react';

/*
  O tema é resolvido aqui, em JS, e escrito como atributo no <html>. A folha de
  tokens só conhece `[data-theme="light"]` — resolver "seguir o sistema" dentro
  do CSS exigiria duas cópias da paleta clara, e duas cópias divergem.
*/

export type ThemeChoice = 'dark' | 'light' | 'auto';
export type ThemeResolved = 'dark' | 'light';

const KEY = 'oaze.theme';

function systemTheme(): ThemeResolved {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function readChoice(): ThemeChoice {
  try {
    const raw = localStorage.getItem(KEY);
    return raw === 'light' || raw === 'dark' || raw === 'auto' ? raw : 'dark';
  } catch {
    return 'dark';
  }
}

export function resolve(choice: ThemeChoice): ThemeResolved {
  return choice === 'auto' ? systemTheme() : choice;
}

function paint(choice: ThemeChoice): ThemeResolved {
  const resolved = resolve(choice);
  document.documentElement.dataset.theme = resolved;
  return resolved;
}

/** Chamado uma vez no arranque, antes do primeiro quadro. */
export function installTheme(): () => void {
  let choice = readChoice();
  paint(choice);
  const mq = matchMedia('(prefers-color-scheme: light)');
  const onSystem = () => {
    if (choice === 'auto') paint('auto');
  };
  mq.addEventListener('change', onSystem);
  const onStore = () => {
    choice = readChoice();
    paint(choice);
  };
  window.addEventListener('oaze:theme', onStore);
  return () => {
    mq.removeEventListener('change', onSystem);
    window.removeEventListener('oaze:theme', onStore);
  };
}

export function setTheme(choice: ThemeChoice): void {
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    /* modo privado: o tema vale só nesta sessão */
  }
  paint(choice);
  window.dispatchEvent(new Event('oaze:theme'));
}

export function useTheme(): { choice: ThemeChoice; resolved: ThemeResolved; set: (c: ThemeChoice) => void } {
  const [choice, setChoice] = useState<ThemeChoice>(readChoice);
  const [resolved, setResolved] = useState<ThemeResolved>(() => resolve(readChoice()));
  useEffect(() => {
    const sync = () => {
      const c = readChoice();
      setChoice(c);
      setResolved(resolve(c));
    };
    const mq = matchMedia('(prefers-color-scheme: light)');
    mq.addEventListener('change', sync);
    window.addEventListener('oaze:theme', sync);
    return () => {
      mq.removeEventListener('change', sync);
      window.removeEventListener('oaze:theme', sync);
    };
  }, []);
  return { choice, resolved, set: setTheme };
}
