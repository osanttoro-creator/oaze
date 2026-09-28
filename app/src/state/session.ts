import { useEffect, useState, useSyncExternalStore } from 'react';
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

export function useDesktop(): boolean {
  const q = '(min-width: 900px)';
  const [d, setD] = useState(() => matchMedia(q).matches);
  useEffect(() => {
    const m = matchMedia(q);
    const on = () => setD(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return d;
}
