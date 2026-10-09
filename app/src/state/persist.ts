import { store } from '../core/storage';
import type { AppState } from './store';

/*
  Persistência do espaço local.

  O cofre (`core/storage`) decide ONDE: `localStorage` no navegador, cifrado com
  chave no Keychain/Keystore/Credential Manager no app instalado. Esta camada só
  sabe serializar — e é por isso que resolver o P2 da auditoria não exigiu tocar
  em `state/store.ts`.

  A leitura é assíncrona porque o cofre nativo é assíncrono. Quem orquestra é
  `main.tsx`: abre o cofre, lê, hidrata a loja e só então renderiza.
*/
const KEY = 'oaze.v2';

export async function readPersisted(): Promise<AppState | null> {
  const raw = await store().get(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AppState;
    return parsed && parsed.version === 2 ? parsed : null;
  } catch {
    /* arquivo ilegível: começar vazio é melhor que travar no arranque. O backup
       do usuário continua sendo o caminho de volta. */
    return null;
  }
}

export function savePersisted(s: AppState): void {
  void store().set(KEY, JSON.stringify(s));
}

export async function clearPersisted(): Promise<void> {
  await store().remove(KEY);
}

/** Backup: o espaço inteiro em JSON, sem o PIN. */
export function exportBackup(s: AppState): string {
  const { security: _omit, ...rest } = s;
  return JSON.stringify({ app: 'oaze', format: 2, exportedAt: new Date().toISOString(), data: rest }, null, 2);
}

export function parseBackup(text: string): Omit<AppState, 'security'> {
  const parsed = JSON.parse(text) as { app?: string; format?: number; data?: Omit<AppState, 'security'> };
  if (parsed.app !== 'oaze' || parsed.format !== 2 || !parsed.data || !Array.isArray(parsed.data.workspaces)) {
    throw new Error('Este arquivo não é um backup do OAZE 2.');
  }
  return parsed.data;
}
