import { open, seal } from './crypto';
import type { SecureStore } from './index';

/*
  Windows e macOS — Tauri.

  O mesmo desenho do celular: a chave fica no cofre do sistema (Credential
  Manager no Windows, Keychain no macOS) e o corpo cifrado num arquivo da pasta
  de dados do app. Quem fala com o cofre é o Rust, porque é o único lado que
  tem como; os comandos estão em `src-tauri/src/lib.rs`.

  `invoke` é obtido de `__TAURI_INTERNALS__` em vez de `import('@tauri-apps/api')`
  para este arquivo continuar compilando no build da web.
*/

type Invoke = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

function invoker(): Invoke | null {
  const internals = (globalThis as { __TAURI_INTERNALS__?: { invoke?: Invoke } }).__TAURI_INTERNALS__;
  return internals?.invoke ?? null;
}

export async function create(): Promise<SecureStore> {
  const invoke = invoker();
  if (!invoke) throw new Error('Tauri indisponível: o cofre do sistema não respondeu.');

  /* o Rust devolve a chave existente ou cria uma; a decisão é dele porque é
     dele o acesso ao cofre */
  const material = await invoke<string>('oaze_data_key');

  return {
    kind: 'keychain-file',
    async get(key) {
      const sealed = await invoke<string | null>('oaze_read', { key });
      if (!sealed) return null;
      try {
        return await open(material, sealed);
      } catch {
        return null;
      }
    },
    async set(key, value) {
      await invoke('oaze_write', { key, body: await seal(material, value) });
    },
    async remove(key) {
      await invoke('oaze_delete', { key });
    },
  };
}
