import type { AppState } from './store';

/*
  Web: localStorage, como no OAZE 1. No app nativo esta camada troca para
  armazenamento cifrado com a chave no Keychain/Keystore (ver docs/02-TRD.md);
  o PIN protege a interface, não o arquivo — por isso a troca é obrigatória
  antes de publicar nas lojas.
*/
const KEY = 'oaze.v2';

export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppState;
    return parsed && parsed.version === 2 ? parsed : null;
  } catch {
    return null;
  }
}

export function saveState(s: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // cota cheia ou modo privado: o app segue funcionando em memória
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nada a limpar */
  }
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
