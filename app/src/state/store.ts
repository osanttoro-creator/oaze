import { useSyncExternalStore } from 'react';
import type { ID, Workspace } from '../domain/types';
import { savePersisted } from './persist';

export type LockAfter = 0 | 1 | 5 | 15;
export type NotifPrivacy = 'sem' | 'valores' | 'generico';

export interface PinRecord {
  hash: string;
  salt: string;
  iterations: number;
}

export interface Settings {
  hideValues: boolean;
  lockAfterMin: LockAfter;
  biometrics: boolean;
  notifPrivacy: NotifPrivacy;
  reminders: { fatura: boolean; fixa: boolean; rec: boolean };
  reminderHour: number;
  coco: { consentVersion: number | null; consentAt: string | null; learning: boolean };
}

export interface AppState {
  version: 2;
  owner: { name: string };
  plan: 'mensal' | 'anual' | null;
  workspaces: Workspace[];
  activeId: ID | null;
  settings: Settings;
  security: { pin: PinRecord | null; failed: number; lockedUntil: number | null };
  /** Decisões sobre as sugestões da Coco em "Agora": some quando aceita ou dispensa. */
  cocoDecisions: Record<string, 'done' | 'dismissed'>;
  /** Consumo de coconutz no mês corrente; `mes` é AAAA-MM e zera a contagem na virada. */
  coconutz: { mes: string; usados: number };
}

export const COCO_CONSENT_VERSION = 1;

/* ---------------------------------------------------------------
   COCONUTZ
   ---------------------------------------------------------------
   Cada pedido à Coco custa um coconut. O nome não é enfeite: "pedido"
   e "token" são a mesma palavra que todo mundo já usa para outra
   coisa, e ninguém sabe se um pedido são cinco palavras ou cinco
   parágrafos. Coconut é uma unidade do OAZE, contada de um em um —
   uma pergunta, um coconut — e por isso dá para mostrar o saldo do
   mês sem explicar nada.

   Fica à vista dentro da conversa, como nas outras IAs: quem gasta
   precisa ver o que sobrou ANTES de digitar, não descobrir no
   bloqueio.

   O plano grátis continua existindo e é o padrão (plan: null). */
export const COCONUTZ: Record<'gratis' | 'mensal' | 'anual', number> = { gratis: 10, mensal: 200, anual: 200 };

export function coconutzDoPlano(plan: AppState['plan']): number {
  return COCONUTZ[plan ?? 'gratis'];
}

export function initialState(): AppState {
  return {
    version: 2,
    owner: { name: '' },
    plan: null,
    workspaces: [],
    activeId: null,
    settings: {
      hideValues: false,
      lockAfterMin: 5,
      biometrics: false,
      notifPrivacy: 'sem',
      reminders: { fatura: true, fixa: true, rec: false },
      reminderHour: 9,
      coco: { consentVersion: null, consentAt: null, learning: true },
    },
    security: { pin: null, failed: 0, lockedUntil: null },
    cocoDecisions: {},
    coconutz: { mes: '', usados: 0 },
  };
}

let state: AppState = initialState();
let hydrated = false;
let writesFrozen = false;

/**
 * Troca o estado inicial pelo que estava guardado. Chamado uma vez por
 * `main.tsx`, depois de o cofre abrir — a leitura do cofre nativo é assíncrona,
 * então não dá para fazer isto na carga do módulo. Não grava de volta: hidratar
 * não é mudança do usuário.
 */
export function hydrate(next: AppState | null): void {
  if (hydrated) return;
  hydrated = true;
  if (next) state = next;
  listeners.forEach((l) => l());
}
const listeners = new Set<() => void>();
const changeListeners = new Set<(before: AppState, after: AppState) => void>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;

function emit() {
  listeners.forEach((l) => l());
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => savePersisted(state), 150);
}

export function getState(): AppState {
  return state;
}

/** Troca de conta: limpa o estado anterior sem enfileirar edição ou gravação. */
export function replaceState(next: AppState | null): void {
  clearTimeout(saveTimer);
  state = next ?? initialState();
  listeners.forEach((l) => l());
}

/** Bloqueia edições enquanto o cofre troca de conta. */
export function freezeStateWrites(frozen: boolean): void {
  writesFrozen = frozen;
}

export function setState(fn: (s: AppState) => AppState, source: 'local' | 'remote' = 'local'): void {
  if (writesFrozen) return;
  const before = state;
  state = fn(state);
  if (state === before) return;
  if (source === 'local') changeListeners.forEach((listener) => listener(before, state));
  emit();
}

/** A sincronização observa mutações locais, sem entrar em ciclo ao adotar dados remotos. */
export function subscribeChanges(listener: (before: AppState, after: AppState) => void): () => void {
  changeListeners.add(listener);
  return () => changeListeners.delete(listener);
}

export function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useApp<T>(select: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => select(state));
}

export function activeWorkspace(s: AppState = state): Workspace | null {
  return s.workspaces.find((w) => w.id === s.activeId) ?? null;
}

export function useWorkspace(): Workspace {
  const w = useApp(activeWorkspace);
  if (!w) throw new Error('nenhum espaço ativo');
  return w;
}

/**
 * Toda escrita no espaço passa por aqui: copia, altera a cópia e troca.
 * O motor de cálculo memoriza por objeto, então a troca invalida a memória sozinha.
 */
export function mutateWorkspace(fn: (draft: Workspace) => void): void {
  setState((s) => {
    const w = activeWorkspace(s);
    if (!w) return s;
    const draft = structuredClone(w);
    fn(draft);
    return { ...s, workspaces: s.workspaces.map((x) => (x.id === w.id ? draft : x)) };
  });
}

export function updateSettings(patch: Partial<Settings>): void {
  setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
}

export function flushSave(): Promise<void> {
  clearTimeout(saveTimer);
  return savePersisted(state);
}
