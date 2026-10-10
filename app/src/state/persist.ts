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
const LOCAL_KEY = 'oaze.v2';
let ownerId: string | null = null;
let writes = Promise.resolve();

function keyFor(id: string | null): string {
  return id ? `oaze.v2.user.${encodeURIComponent(id)}` : LOCAL_KEY;
}

/** Cada conta tem sua própria gaveta; os dados sem conta continuam locais. */
export function selectPersistedOwner(id: string | null): void {
  ownerId = id;
}

export function persistedOwner(): string | null {
  return ownerId;
}

export async function readPersisted(): Promise<AppState | null> {
  return readPersistedFor(ownerId);
}

export async function readPersistedFor(id: string | null): Promise<AppState | null> {
  const raw = await store().get(keyFor(id));
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

export function savePersisted(s: AppState): Promise<void> {
  return savePersistedFor(ownerId, s);
}

/** Captura chave e conteúdo antes de qualquer troca de sessão. */
export function savePersistedFor(id: string | null, s: AppState): Promise<void> {
  const key = keyFor(id);
  const value = JSON.stringify(s);
  writes = writes.catch(() => {}).then(() => store().set(key, value));
  return writes;
}

export function flushPersistedWrites(): Promise<void> {
  return writes;
}

export async function clearPersisted(): Promise<void> {
  await flushPersistedWrites();
  await store().remove(keyFor(ownerId));
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
