import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const saved = vi.hoisted(() => new Map<string, string>());

vi.mock('../storage', () => ({
  store: () => ({
    get: async (key: string) => saved.get(key) ?? null,
    set: async (key: string, value: string) => { saved.set(key, value); },
    remove: async (key: string) => { saved.delete(key); },
  }),
}));

import { api } from './client';

describe('OAuth nativo com o cliente real do Supabase', () => {
  beforeAll(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'chave-publica-de-teste');
  });
  afterAll(() => vi.unstubAllEnvs());

  it('gera um desafio PKCE e devolve o código para o aplicativo', async () => {
    const client = await api();
    expect(client).not.toBeNull();
    const { data, error } = await client!.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'oaze://auth', skipBrowserRedirect: true },
    });
    expect(error).toBeNull();
    const url = new URL(data.url!);
    expect(url.searchParams.get('redirect_to')).toBe('oaze://auth');
    expect(url.searchParams.get('code_challenge')).toBeTruthy();
    expect(url.searchParams.get('code_challenge_method')).toBe('s256');
    expect([...saved.keys()].some((key) => key.endsWith('-code-verifier'))).toBe(true);
  });
});
