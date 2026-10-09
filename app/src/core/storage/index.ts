import { isDesktopShell, platform } from '../../platform';

/*
  Uma porta, três implementações (decisão D5, docs/11-ARQUITETURA.md).

  No navegador os dados ficam em `localStorage`, como no OAZE 1 — e a tela diz
  isso, porque é verdade e porque o PIN ali protege a interface, não o arquivo.
  No app instalado, qualquer coisa menos que cifrado é inaceitável: um painel
  financeiro não deixa saldo legível no sistema de arquivos. P2 da auditoria.

  As implementações nativas entram por `register()`, carregadas sob demanda em
  `boot()`, para que o bundle da web não carregue plugin que nunca vai usar.
*/

export interface SecureStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  /** Como os dados estão guardados agora — a interface mostra isto ao usuário. */
  readonly kind: 'browser' | 'keystore' | 'keychain-file';
}

const web: SecureStore = {
  kind: 'browser',
  async get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* cota cheia ou modo privado: o app segue em memória nesta sessão */
    }
  },
  async remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* nada a limpar */
    }
  },
};

let impl: SecureStore = web;

export function register(store: SecureStore): void {
  impl = store;
}

export function store(): SecureStore {
  return impl;
}

export function storageKind(): SecureStore['kind'] {
  return impl.kind;
}

/** Frase curta para a tela de Configurações. Verdade, não marketing. */
export function storageLabel(): string {
  if (impl.kind === 'browser') return 'Guardado neste navegador, sem cifragem — como no OAZE 1.';
  if (impl.kind === 'keystore') return 'Guardado cifrado no aparelho, com a chave no cofre do sistema.';
  return 'Guardado cifrado neste computador, com a chave no cofre do sistema.';
}

let booted: Promise<void> | null = null;

/**
 * Liga a implementação certa para a plataforma. Idempotente: chamar duas vezes
 * não carrega o módulo duas vezes.
 *
 * Se o cofre nativo falhar, o app NÃO cai silenciosamente para `localStorage`:
 * `failed` fica verdadeiro e a camada acima decide — um painel financeiro que
 * degrada a proteção sem avisar é pior do que um que avisa.
 */
export function boot(): Promise<void> {
  if (booted) return booted;
  booted = (async () => {
    const p = platform();
    try {
      if (p === 'ios' || p === 'android') {
        const m = await import('./native');
        register(await m.create());
      } else if (isDesktopShell()) {
        const m = await import('./desktop');
        register(await m.create());
      }
    } catch (err) {
      failure = err instanceof Error ? err : new Error(String(err));
    }
  })();
  return booted;
}

let failure: Error | null = null;

/** `null` quando o cofre certo para esta plataforma está ativo. */
export function bootFailure(): Error | null {
  return failure;
}

/** Só para teste: volta ao estado de fábrica. */
export function resetForTest(): void {
  impl = web;
  booted = null;
  failure = null;
}
