/*
  AES-GCM sobre WebCrypto, para o arquivo cifrado do desktop. A chave é bruta de
  256 bits, guardada no cofre do sistema operacional (Credential Manager no
  Windows, Keychain no macOS) — nunca neste arquivo, nunca ao lado dele.

  GCM e não CBC: GCM autentica. Sem autenticação, um arquivo adulterado
  descriptografa em lixo que o `JSON.parse` aceitaria em parte, e dado
  financeiro corrompido em silêncio é pior do que dado perdido com erro.
*/

const IV_BYTES = 12; // o tamanho que o GCM espera; 16 degrada a segurança

function b64(buf: ArrayBuffer | Uint8Array): string {
  const u = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return btoa(Array.from(u, (b) => String.fromCharCode(b)).join(''));
}

function unb64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function newKeyMaterial(): string {
  return b64(crypto.getRandomValues(new Uint8Array(new ArrayBuffer(32))));
}

async function importKey(material: string): Promise<CryptoKey> {
  const raw = unb64(material);
  if (raw.length !== 32) throw new Error('Chave de cifragem inválida.');
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

/** Formato do arquivo: `v1.<iv em base64>.<corpo em base64>`. */
export async function seal(material: string, plain: string): Promise<string> {
  const key = await importKey(material);
  const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(IV_BYTES)));
  const body = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain));
  return `v1.${b64(iv)}.${b64(body)}`;
}

export async function open(material: string, sealed: string): Promise<string> {
  const [version, iv, body] = sealed.split('.');
  if (version !== 'v1' || !iv || !body) throw new Error('Arquivo de dados em formato desconhecido.');
  const key = await importKey(material);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, key, unb64(body));
  return new TextDecoder().decode(plain);
}
