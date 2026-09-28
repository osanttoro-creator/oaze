import { useSyncExternalStore } from 'react';
import type { ID, Workspace } from '../domain/types';
import { loadState, saveState } from './persist';

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
}

export const COCO_CONSENT_VERSION = 1;

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
  };
}

let state: AppState = loadState() ?? initialState();
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;

function emit() {
  listeners.forEach((l) => l());
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveState(state), 150);
}

export function getState(): AppState {
  return state;
}

export function setState(fn: (s: AppState) => AppState): void {
  state = fn(state);
  emit();
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

export function flushSave(): void {
  clearTimeout(saveTimer);
  saveState(state);
}
