import { useSyncExternalStore } from 'react';
import type { EntryType } from './actions';
import type { ID, ISODate } from '../domain/types';

export type Screen =
  | 'inicio' | 'lancamentos' | 'carteira' | 'mais'
  | 'investimentos' | 'categorias' | 'metas' | 'agenda' | 'lembretes' | 'relatorios' | 'configuracoes' | 'plano';

export const MORE_SCREENS: Screen[] = ['mais', 'investimentos', 'categorias', 'metas', 'agenda', 'lembretes', 'relatorios', 'configuracoes', 'plano'];

export interface UIState {
  screen: Screen;
  /** Cartão ou conta tirado da carteira. */
  walletPick: ID | null;
  novo: { open: boolean; type: EntryType; date?: ISODate };
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

/* Trilha de telas, para o botão voltar do aparelho.

   O webview tem histórico próprio, mas assim que o app registra um ouvinte de
   `backButton` o Capacitor para de usá-lo e entrega a decisão para cá. Sem
   ouvinte nenhum ele volta no histórico quando pode — e, quando não pode,
   consome a tecla e não faz nada: um app que o voltar não fecha. Então a
   trilha é nossa, e quem decide é `backIntent()`. */
const TRAIL_MAX = 24;
let trail: Screen[] = [fromHash()];

function pushTrail(screen: Screen): void {
  if (trail[trail.length - 1] === screen) return;
  /* voltar encurta a trilha em vez de alongá-la: sem isto, ir e vir entre duas
     telas cresceria a trilha para sempre e o voltar nunca alcançaria o início */
  if (trail[trail.length - 2] === screen) trail.pop();
  else trail.push(screen);
  if (trail.length > TRAIL_MAX) trail.shift();
}

window.addEventListener('hashchange', () => {
  const screen = fromHash();
  if (screen !== ui.screen) {
    ui = { ...ui, screen, walletPick: screen === 'carteira' ? ui.walletPick : null };
    pushTrail(screen);
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
  pushTrail(screen);
  if (fromHash() !== screen) location.hash = '/' + screen;
  emit();
  /* `Element.scrollTo` não existe em todo WebView antigo de Android, e cair no
     topo da lista não vale derrubar a navegação. O `?.` do seletor não cobria
     isso: ele guarda o elemento ausente, não o método ausente. */
  const scroller = document.querySelector('[data-scroll]');
  if (scroller && typeof scroller.scrollTo === 'function') scroller.scrollTo({ top: 0 });
  else if (scroller) scroller.scrollTop = 0;
}

export function openNovo(type: EntryType = 'despesa', date?: ISODate): void {
  patchUI({ novo: { open: true, type, date } });
}

export function closeNovo(): void {
  patchUI({ novo: { ...ui.novo, open: false, date: undefined } });
}

export function openCoco(tab: UIState['coco']['tab'] = ui.coco.tab): void {
  patchUI({ coco: { open: true, tab } });
}

export function closeCoco(): void {
  patchUI({ coco: { ...ui.coco, open: false } });
}

/** `exit` significa "não há mais nada para desfazer aqui dentro". */
export type BackIntent = 'consumed' | 'exit';

/**
 * O que o botão voltar do aparelho deve fazer agora, na ordem em que a pessoa
 * espera: primeiro desfaz o que está sobreposto, depois recua na navegação, e
 * só na raiz sai do app. Sair é decisão desta função, mas quem sai é a camada
 * de plataforma — aqui não se sabe em qual loja o app está.
 */
export function backIntent(): BackIntent {
  if (ui.novo.open) {
    closeNovo();
    return 'consumed';
  }
  if (ui.coco.open) {
    closeCoco();
    return 'consumed';
  }
  if (ui.walletPick) {
    patchUI({ walletPick: null });
    return 'consumed';
  }
  if (trail.length > 1) {
    trail.pop();
    /* o `??` é só o tipo: `length > 1` já garante que sobrou alguém */
    go(trail[trail.length - 1] ?? 'inicio');
    return 'consumed';
  }
  if (ui.screen !== 'inicio') {
    /* Chegou direto aqui por link e não tem de onde recuar — por exemplo um
       `oaze://` que abriu a agenda. A trilha é reposta junto, senão o voltar
       seguinte traria a pessoa de volta para a tela de onde ela acabou de sair. */
    trail = ['inicio'];
    go('inicio');
    return 'consumed';
  }
  return 'exit';
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(text: string, undo?: () => void): void {
  clearTimeout(toastTimer);
  patchUI({ toast: { text, undo } });
  toastTimer = setTimeout(() => patchUI({ toast: null }), undo ? 6000 : 3200);
}
