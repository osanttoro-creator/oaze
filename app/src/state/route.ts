import { useSyncExternalStore } from 'react';
import type { EntryType } from './actions';
import type { ID } from '../domain/types';

export type Screen =
  | 'inicio' | 'lancamentos' | 'carteira' | 'mais'
  | 'investimentos' | 'categorias' | 'metas' | 'lembretes' | 'relatorios' | 'configuracoes' | 'plano';

export const MORE_SCREENS: Screen[] = ['mais', 'investimentos', 'categorias', 'metas', 'lembretes', 'relatorios', 'configuracoes', 'plano'];

export interface UIState {
  screen: Screen;
  /** Cartão ou conta tirado da carteira. */
  walletPick: ID | null;
  novo: { open: boolean; type: EntryType };
  coco: { open: boolean; tab: 'agora' | 'conversa' | 'memoria' };
  toast: { text: string; undo?: () => void } | null;
}

/* Rota fica no hash: o botão voltar do Android e o do navegador funcionam igual. */
const valid = new Set<Screen>(['inicio', 'lancamentos', 'carteira', ...MORE_SCREENS]);
function fromHash(): Screen {
  const h = location.hash.replace(/^#\/?/, '') as Screen;
  return valid.has(h) ? h : 'inicio';
}

let ui: UIState = {
  screen: fromHash(),
  walletPick: null,
  novo: { open: false, type: 'despesa' },
  coco: { open: false, tab: 'agora' },
  toast: null,
};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

window.addEventListener('hashchange', () => {
  const screen = fromHash();
  if (screen !== ui.screen) {
    ui = { ...ui, screen, walletPick: screen === 'carteira' ? ui.walletPick : null };
    emit();
  }
});

export function useUI<T>(select: (u: UIState) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => select(ui),
  );
}

export function patchUI(p: Partial<UIState>): void {
  ui = { ...ui, ...p };
  emit();
}

export function go(screen: Screen, walletPick: ID | null = null): void {
  ui = { ...ui, screen, walletPick };
  if (fromHash() !== screen) location.hash = '/' + screen;
  emit();
  document.querySelector('[data-scroll]')?.scrollTo({ top: 0 });
}

export function openNovo(type: EntryType = 'despesa'): void {
  patchUI({ novo: { open: true, type } });
}

export function closeNovo(): void {
  patchUI({ novo: { ...ui.novo, open: false } });
}

export function openCoco(tab: UIState['coco']['tab'] = ui.coco.tab): void {
  patchUI({ coco: { open: true, tab } });
}

export function closeCoco(): void {
  patchUI({ coco: { ...ui.coco, open: false } });
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(text: string, undo?: () => void): void {
  clearTimeout(toastTimer);
  patchUI({ toast: { text, undo } });
  toastTimer = setTimeout(() => patchUI({ toast: null }), undo ? 6000 : 3200);
}
