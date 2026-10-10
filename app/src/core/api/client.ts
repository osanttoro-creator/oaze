import type { SupabaseClient } from '@supabase/supabase-js';
import { store } from '../storage';

/*
  O único cliente Supabase do app.

  Duas coisas que não podem variar:

  1. **Nenhum segredo aqui.** Só a URL do projeto e a chave publicável, que são
     públicas por definição. Chave de serviço, OpenAI, Stripe e Asaas vivem em
     Edge Function. Quem precisa de privilégio chama função, não banco.
  2. **A sessão usa o cofre da plataforma**, não `localStorage` direto. No app
     instalado, token de acesso em arquivo simples é a mesma falha do P2 com
     outro nome.
*/

export interface ApiConfig {
  url: string;
  publishableKey: string;
}

/** Vem de `.env` em build. Faltando, o app funciona local e diz que está sem conta. */
export function readConfig(): ApiConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;
  if (!/^https:\/\/[\w-]+\.supabase\.co\/?$/.test(url)) {
    throw new Error('VITE_SUPABASE_URL fora do formato esperado.');
  }
  return { url: url.replace(/\/+$/, ''), publishableKey };
}

/* Ponte entre o cofre assíncrono e a interface síncrona que o supabase-js quer.
   O cache em memória é preenchido no arranque (`primeSessionCache`), antes de o
   cliente existir — sem isso o primeiro `getSession()` devolveria vazio e o app
   pediria login a quem já estava dentro. */
const cache = new Map<string, string>();
let priming: Promise<void> | null = null;

const bridge = {
  getItem: (key: string) => cache.get(key) ?? null,
  setItem: (key: string, value: string) => {
    cache.set(key, value);
    void store().set(key, value);
  },
  removeItem: (key: string) => {
    cache.delete(key);
    void store().remove(key);
  },
};

/** A mesma gaveta de sessão do OAZE 1: entrar no site é estar dentro no app. */
export const SESSION_KEY = 'oaze.supabase.auth';

export function primeSessionCache(): Promise<void> {
  priming ??= store().get(SESSION_KEY).then((raw) => {
    if (raw) cache.set(SESSION_KEY, raw);
  });
  return priming;
}

let client: SupabaseClient | null = null;
let loading: Promise<SupabaseClient | null> | null = null;

/**
 * O cliente, carregado sob demanda.
 *
 * O `import()` é dinâmico de propósito: o supabase-js pesa ~55 KB comprimidos, e
 * quem usa o OAZE sem conta — que é um caminho legítimo do produto, não um
 * acidente — não deve baixar o cliente de um servidor que nunca vai chamar.
 */
export async function api(): Promise<SupabaseClient | null> {
  if (client) return client;
  if (loading) return loading;
  const cfg = readConfig();
  if (!cfg) return null;
  loading = primeSessionCache().then(() => import('@supabase/supabase-js')).then(({ createClient }) => {
    client = createClient(cfg.url, cfg.publishableKey, {
      auth: {
        storage: bridge,
        storageKey: SESSION_KEY,
        persistSession: true,
        autoRefreshToken: true,
        /* no app instalado não existe redirecionamento de URL para ler: o fluxo
           OAuth volta por deep link e é tratado em core/auth */
        detectSessionInUrl: typeof location !== 'undefined' && location.protocol.startsWith('http'),
      },
      global: { headers: { 'x-oaze-client': 'app-2' } },
    });
    return client;
  }).catch((error: unknown) => {
    loading = null;
    throw error;
  });
  return loading;
}

/** O cliente já carregado, ou `null`. Para quem não pode esperar por `await`. */
export function apiIfReady(): SupabaseClient | null {
  return client;
}

/** `true` quando existe conta configurada. Local-primeiro continua valendo. */
export function hasAccountBackend(): boolean {
  return readConfig() !== null;
}

/**
 * O SQL do OAZE 2 está no projeto compartilhado, com RLS e RPC testadas.
 * A sincronização permanece desligada até validar o fluxo autenticado em
 * dois aparelhos, inclusive a recuperação de alterações offline.
 */
export function hasSyncBackend(): boolean {
  return hasAccountBackend() && import.meta.env.VITE_OAZE_SYNC_ENABLED === 'true';
}

/**
 * Chama uma Edge Function com a sessão do usuário. Toda operação sensível passa
 * por aqui — é o único caminho até um segredo, e o segredo fica do outro lado.
 */
export async function callFunction<T>(name: string, body: unknown, timeoutMs = 12_000): Promise<T> {
  const c = await api();
  const cfg = readConfig();
  if (!c || !cfg) throw new Error('Esta função precisa de conta e de conexão.');
  const { data, error } = await c.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('Sua sessão expirou. Entre novamente.');

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeoutMs);
  try {
    const res = await fetch(`${cfg.url}/functions/v1/${name}`, {
      method: 'POST',
      cache: 'no-store',
      signal: abort.signal,
      headers: {
        'content-type': 'application/json',
        apikey: cfg.publishableKey,
        authorization: `Bearer ${data.session.access_token}`,
      },
      body: JSON.stringify(body),
    });
    const parsed = (await res.json().catch(() => ({}))) as { erro?: string; mensagem?: string } & T;
    if (!res.ok || parsed.erro) throw new Error(parsed.mensagem || parsed.erro || 'A operação não foi concluída.');
    return parsed;
  } finally {
    clearTimeout(timer);
  }
}

/** Só para teste. */
export function resetApiForTest(): void {
  client = null;
  loading = null;
  priming = null;
  cache.clear();
}
