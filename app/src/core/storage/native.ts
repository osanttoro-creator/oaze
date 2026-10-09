import { newKeyMaterial, open, seal } from './crypto';
import type { SecureStore } from './index';

/*
  iOS e Android — o cofre do celular.

  O desenho tem duas metades de propósito:

  - a **chave** (32 bytes) vai para o Keychain/Keystore, que é o único lugar do
    aparelho protegido por hardware. Cabe folgado: é uma string curta.
  - o **corpo cifrado** vai para o armazenamento comum do app. Keychain e
    Keystore têm limite de tamanho e não foram feitos para guardar um documento
    de centenas de KB; forçar isso falha em aparelho real, não no emulador.

  Resultado: o arquivo no disco é AES-GCM sem a chave ao lado, e a chave está
  onde o sistema sabe proteger.

  Os plugins são lidos de `Capacitor.Plugins`, e não por `import`, porque este
  arquivo precisa compilar no build da web, onde os pacotes nativos não existem.
  Instalar de verdade:

      npm i capacitor-secure-storage-plugin @capacitor/preferences
      npx cap sync
*/

interface SecureStoragePlugin {
  get(o: { key: string }): Promise<{ value: string }>;
  set(o: { key: string; value: string }): Promise<{ value: boolean }>;
  remove(o: { key: string }): Promise<{ value: boolean }>;
}

interface PreferencesPlugin {
  get(o: { key: string }): Promise<{ value: string | null }>;
  set(o: { key: string; value: string }): Promise<void>;
  remove(o: { key: string }): Promise<void>;
}

interface Plugins {
  SecureStoragePlugin?: SecureStoragePlugin;
  Preferences?: PreferencesPlugin;
}

const KEY_NAME = 'oaze.dek.v1';

function plugins(): Plugins {
  return ((globalThis as { Capacitor?: { Plugins?: Plugins } }).Capacitor?.Plugins ?? {}) as Plugins;
}

async function keyMaterial(vault: SecureStoragePlugin): Promise<string> {
  try {
    const { value } = await vault.get({ key: KEY_NAME });
    if (value) return value;
  } catch {
    /* o plugin lança quando a chave não existe — é o caminho do primeiro uso */
  }
  const fresh = newKeyMaterial();
  await vault.set({ key: KEY_NAME, value: fresh });
  return fresh;
}

export async function create(): Promise<SecureStore> {
  const { SecureStoragePlugin: vault, Preferences: prefs } = plugins();
  if (!vault || !prefs) {
    throw new Error(
      'Cofre do aparelho indisponível: instale capacitor-secure-storage-plugin e @capacitor/preferences e rode `npx cap sync`.',
    );
  }
  const material = await keyMaterial(vault);

  return {
    kind: 'keystore',
    async get(key) {
      const { value } = await prefs.get({ key });
      if (!value) return null;
      try {
        return await open(material, value);
      } catch {
        /* chave trocada ou arquivo adulterado: devolver lixo seria pior que
           devolver vazio, e o app trata vazio como "primeira vez" */
        return null;
      }
    },
    async set(key, value) {
      await prefs.set({ key, value: await seal(material, value) });
    },
    async remove(key) {
      await prefs.remove({ key });
    },
  };
}
