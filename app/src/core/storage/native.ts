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

  Os módulos são carregados apenas no app nativo. Seus pacotes precisam estar
  nas dependências para o Capacitor registrar as implementações de cada SO.
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

const KEY_NAME = 'oaze.dek.v1';

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
  const [secure, preferences] = await Promise.all([
    import('capacitor-secure-storage-plugin'),
    import('@capacitor/preferences'),
  ]);
  const vault = secure.SecureStoragePlugin as SecureStoragePlugin;
  const prefs = preferences.Preferences as PreferencesPlugin;
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
