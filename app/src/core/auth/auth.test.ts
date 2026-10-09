// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
  Autenticação.

  O cliente Supabase é substituído por um dublê — o que precisa estar certo aqui
  não é o SDK deles, é o nosso contrato: que estado a interface enxerga depois de
  cada passo, e que mensagem a pessoa lê quando dá errado.

  A tradução de erro tem teste próprio porque é o único texto do app que vem de
  fora: deixar vazar "Invalid login credentials" numa tela em português é a
  falha mais fácil de cometer e a mais constrangedora de ver em produção.
*/

type Listener = (event: string, session: unknown) => void;

const fake = {
  session: null as { access_token: string; user: { id: string; email: string; user_metadata: Record<string, unknown> } } | null,
  listener: null as Listener | null,
  erro: null as string | null,
  chamadas: [] as string[],
};

function sessaoDe(email: string, name?: string) {
  return {
    access_token: 'token-de-teste',
    user: { id: 'u1', email, user_metadata: name ? { name } : {} },
  };
}

vi.mock('../api/client', () => ({
  hasAccountBackend: () => true,
  primeSessionCache: async () => {},
  callFunction: vi.fn(async () => ({ ok: true })),
  api: async () => ({
    auth: {
      getSession: async () => ({ data: { session: fake.session }, error: null }),
      onAuthStateChange: (cb: Listener) => {
        fake.listener = cb;
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      signInWithPassword: async ({ email }: { email: string }) => {
        fake.chamadas.push('signInWithPassword');
        if (fake.erro) return { data: null, error: { message: fake.erro } };
        fake.session = sessaoDe(email);
        fake.listener?.('SIGNED_IN', fake.session);
        return { data: { session: fake.session }, error: null };
      },
      signUp: async ({ email, options }: { email: string; options?: { data?: { name?: string } } }) => {
        fake.chamadas.push('signUp');
        if (fake.erro) return { data: null, error: { message: fake.erro } };
        /* confirmação de e-mail ligada: cria sem sessão */
        if (email.includes('confirmar')) return { data: { session: null }, error: null };
        fake.session = sessaoDe(email, options?.data?.name);
        fake.listener?.('SIGNED_IN', fake.session);
        return { data: { session: fake.session }, error: null };
      },
      signInWithOtp: async () => {
        fake.chamadas.push('signInWithOtp');
        return fake.erro ? { error: { message: fake.erro } } : { error: null };
      },
      resetPasswordForEmail: async () => {
        fake.chamadas.push('resetPasswordForEmail');
        return fake.erro ? { error: { message: fake.erro } } : { error: null };
      },
      signInWithOAuth: async ({ provider }: { provider: string }) => {
        fake.chamadas.push(`oauth:${provider}`);
        return fake.erro ? { error: { message: fake.erro } } : { error: null };
      },
      signOut: async ({ scope }: { scope: string }) => {
        fake.chamadas.push(`signOut:${scope}`);
        fake.session = null;
        fake.listener?.('SIGNED_OUT', null);
        return { error: null };
      },
      updateUser: async () => {
        fake.chamadas.push('updateUser');
        return fake.erro ? { error: { message: fake.erro } } : { error: null };
      },
      setSession: async () => ({ error: null }),
      exchangeCodeForSession: async () => ({ error: null }),
    },
  }),
}));

vi.mock('../../platform', () => ({ platform: () => 'web' }));

const {
  authState,
  deleteAccount,
  sendMagicLink,
  sendPasswordReset,
  signInWithPassword,
  signInWithProvider,
  signOut,
  signUp,
  startAuth,
  updateName,
} = await import('./index');
const { callFunction } = await import('../api/client');

beforeEach(() => {
  fake.session = null;
  fake.erro = null;
  fake.chamadas = [];
});

describe('estado da sessão', () => {
  it('começa deslogado quando não há sessão guardada', async () => {
    await startAuth();
    expect(authState().status).toBe('signed-out');
    expect(authState().user).toBeNull();
  });

  it('entrar leva o estado a signed-in e resolve o nome', async () => {
    await startAuth();
    await signInWithPassword('ana@exemplo.com', 'uma-senha-boa');
    expect(authState().status).toBe('signed-in');
    expect(authState().email).toBe('ana@exemplo.com');
    /* sem nome nos metadados, cai para a parte antes do @ */
    expect(authState().name).toBe('ana');
  });

  it('o nome dos metadados ganha do e-mail', async () => {
    await startAuth();
    await signUp('ana@exemplo.com', 'uma-senha-boa', 'Ana Souza');
    expect(authState().name).toBe('Ana Souza');
  });

  it('sair volta para signed-out e esquece o usuário', async () => {
    await startAuth();
    await signInWithPassword('ana@exemplo.com', 'uma-senha-boa');
    await signOut();
    expect(authState().status).toBe('signed-out');
    expect(authState().user).toBeNull();
  });

  it('sair de todos usa escopo global', async () => {
    await startAuth();
    await signInWithPassword('ana@exemplo.com', 'uma-senha-boa');
    await signOut(true);
    expect(fake.chamadas).toContain('signOut:global');
  });
});

describe('cadastro', () => {
  it('avisa quando a conta precisa de confirmação por e-mail', async () => {
    await startAuth();
    const { needsConfirmation } = await signUp('confirmar@exemplo.com', 'uma-senha-boa', 'Ana');
    expect(needsConfirmation).toBe(true);
    expect(authState().status).toBe('signed-out');
  });

  it('o nome é aparado em 40 caracteres antes de subir', async () => {
    await startAuth();
    await signUp('ana@exemplo.com', 'uma-senha-boa', ' '.repeat(3) + 'A'.repeat(80));
    expect(authState().name.length).toBeLessThanOrEqual(40);
  });
});

describe('mensagens que a pessoa lê', () => {
  const casos: [string, RegExp][] = [
    ['Invalid login credentials', /não conferem/i],
    ['Email not confirmed', /confirme seu e-mail/i],
    ['User already registered', /já existe conta/i],
    ['Email rate limit exceeded', /muitas tentativas/i],
    ['Password should be at least 8 characters', /8 caracteres/i],
    ['TypeError: Failed to fetch', /sem conexão/i],
  ];

  it.each(casos)('traduz "%s"', async (bruto, esperado) => {
    await startAuth();
    fake.erro = bruto;
    await expect(signInWithPassword('ana@exemplo.com', 'x')).rejects.toThrow(esperado);
  });

  it('erro desconhecido chega inteiro, em vez de virar "algo deu errado"', async () => {
    await startAuth();
    fake.erro = 'provider unavailable in region';
    await expect(signInWithPassword('ana@exemplo.com', 'x')).rejects.toThrow('provider unavailable in region');
  });

  it('a falha de rede diz onde os dados estão', async () => {
    await startAuth();
    fake.erro = 'network request failed';
    await expect(signInWithPassword('a@b.com', 'x')).rejects.toThrow(/salvos aqui/i);
  });
});

describe('caminhos sem senha', () => {
  it('link mágico e recuperação chamam o provedor certo', async () => {
    await startAuth();
    await sendMagicLink('ana@exemplo.com');
    await sendPasswordReset('ana@exemplo.com');
    expect(fake.chamadas).toContain('signInWithOtp');
    expect(fake.chamadas).toContain('resetPasswordForEmail');
  });

  it('Google e Apple existem os dois — a diretriz 4.8 exige o par', async () => {
    await startAuth();
    await signInWithProvider('google');
    await signInWithProvider('apple');
    expect(fake.chamadas).toContain('oauth:google');
    expect(fake.chamadas).toContain('oauth:apple');
  });
});

describe('conta', () => {
  it('trocar o nome recusa vazio antes de chamar o servidor', async () => {
    await startAuth();
    await expect(updateName('   ')).rejects.toThrow(/escreva seu nome/i);
    expect(fake.chamadas).not.toContain('updateUser');
  });

  it('excluir a conta passa pela Edge Function e depois desconecta de tudo', async () => {
    await startAuth();
    await signInWithPassword('ana@exemplo.com', 'uma-senha-boa');
    await deleteAccount('EXCLUIR');
    expect(callFunction).toHaveBeenCalledWith('oaze-conta', { acao: 'excluir', confirmacao: 'EXCLUIR' });
    expect(fake.chamadas).toContain('signOut:global');
    expect(authState().status).toBe('signed-out');
  });
});
