import { useSyncExternalStore } from 'react';
import { atLeast, useBreakpoint } from '../design-system/breakpoints';
import { getState } from './store';

/* Estado de sessão: nunca vai para o disco. Recarregar o app sempre trava. */
let unlocked = false;
let hiddenAt: number | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function useUnlocked(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => unlocked,
  );
}

export function unlock(): void {
  unlocked = true;
  emit();
}

export function lockNow(): void {
  unlocked = false;
  emit();
}

/** Trava de novo depois do tempo escolhido em segundo plano. */
export function installAutoLock(): () => void {
  const onVis = () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now();
      return;
    }
    const s = getState();
    if (!s.security.pin || hiddenAt == null) return;
    const away = Date.now() - hiddenAt;
    hiddenAt = null;
    if (away >= s.settings.lockAfterMin * 60_000) lockNow();
  };
  document.addEventListener('visibilitychange', onVis);
  return () => document.removeEventListener('visibilitychange', onVis);
}

/**
 * Mantido como atalho: as telas perguntam "sou desktop?" para escolher folha ou
 * janela, e isso é legítimo. O que saiu daqui foi o 900 px solto — a faixa agora
 * vem de design-system/breakpoints.ts, e o degrau é 1024 px.
 */
export function useDesktop(): boolean {
  return atLeast(useBreakpoint(), 'desktop');
}
