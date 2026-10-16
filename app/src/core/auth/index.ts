import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { api, callFunction, hasAccountBackend } from '../api/client';
import { platform } from '../../platform';

/*
  Conta OAZE: a mesma em Android, iPhone, Windows e Mac (requisito 9 e 10 do
  briefing). Supabase Auth, como no OAZE 1 — e com a MESMA gaveta de sessão, de
  modo que entrar em `oaze.site/entrar` é estar dentro em `/app`.

  Regra do produto que sobrevive: **sem conta o app funciona inteiro**, só fica
  isolado no aparelho. Conta é sincronização, não licença de uso.
*/

export type AuthStatus = 'offline' | 'signed-out' | 'signed-in';

export interface AuthState {
  status: AuthStatus;
  user: User | null;
  /** Nome amigável, já resolvido. */
  name: string;
  email: string | null;
}

const listeners = new Set<() => void>();
let state: AuthState = { status: hasAccountBackend() ? 'signed-out' : 'offline', user: null, name: '', email: null };

function nameOf(u: User | null): string {
  if (!u) return '';
  const meta = u.user_metadata as { name?: string; full_name?: string } | undefined;
  return String(meta?.name || meta?.full_name || u.email?.split('@')[0] || '').slice(0, 40);
}

function publish(session: Session | null): void {
  const user = session?.user ?? null;
  state = {
    status: !hasAccountBackend() ? 'offline' : user ? 'signed-in' : 'signed-out',
    user,
    name: nameOf(user),
    email: user?.email ?? null,
  };
  listeners.forEach((l) => l());
}

export function authState(): AuthState {
  return state;
}

export function onAuthChange(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useAuth(): AuthState {
  const [snap, setSnap] = useState(state);
  useEffect(() => onAuthChange(() => setSnap(authState())), []);
  return snap;
}

let started = false;

/** Chamado uma vez no arranque, depois de `storage.boot()`. */
export async function startAuth(): Promise<void> {
  if (started) return;
  started = true;
  const c = await api();
  if (!c) return;
  const { data } = await c.auth.getSession();
  publish(data.session);
  c.auth.onAuthStateChange((_event, session) => publish(session));
}

/* ------------------------------------------------------------------ entrada */

export async function signInWithPassword(email: string, password: string): Promise<void> {
  const c = await must();
  const { error } = await c.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw friendly(error.message);
}

export async function signUp(email: string, password: string, name: string): Promise<{ needsConfirmation: boolean }> {
  const c = await must();
  const { data, error } = await c.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { name: name.trim().slice(0, 40) } },
  });
  if (error) throw friendly(error.message);
  return { needsConfirmation: !data.session };
}

export async function sendMagicLink(email: string): Promise<void> {
  const c = await must();
  const { error } = await c.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectTo() } });
  if (error) throw friendly(error.message);
}

export async function sendPasswordReset(email: string): Promise<void> {
  const c = await must();
  /* A troca da senha tem formulário próprio no site. O app instalado ainda não
     possui essa tela; mandar o link a oaze://auth deixaria a pessoa sem campo. */
  const resetUrl = platform() === 'web' ? `${location.origin}/redefinir-senha` : 'https://oaze.site/redefinir-senha';
  const { error } = await c.auth.resetPasswordForEmail(email.trim(), { redirectTo: resetUrl });
  if (error) throw friendly(error.message);
}

/**
 * Google e Apple. A diretriz 4.8 da App Store pede Entrar com a Apple quando há
 * login social — então os dois andam juntos, não um sem o outro.
 */
export async function signInWithProvider(provider: 'google' | 'apple'): Promise<void> {
  const c = await must();
  const p = platform();
  const { data, error } = await c.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectTo(),
      /* Nativo: não mandar o WebView para o provedor. O URL é aberto pelo
         navegador do sistema e retorna por oaze://auth. */
      skipBrowserRedirect: p !== 'web',
    },
  });
  if (error) throw friendly(error.message);
  if (p === 'web') return;
  if (!data.url) throw new Error('Não consegui abrir o login. Tente novamente.');
  if (p === 'android' || p === 'ios') {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url: data.url });
  } else {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(data.url);
  }
}

/**
 * Deep link de volta do OAuth (`oaze://auth?...`). Chamado pelo ouvinte de
 * `appUrlOpen` do Capacitor e pelo `deep-link` do Tauri.
 */
export async function completeOAuthFromUrl(url: string): Promise<boolean> {
  let callback: URL;
  try { callback = new URL(url); } catch { return false; }
  if (callback.protocol !== 'oaze:' || callback.hostname !== 'auth') return false;
  const c = await api();
  if (!c) return false;
  const params = new URLSearchParams(callback.hash.slice(1) || callback.search.slice(1));
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  const code = params.get('code');
  if (access_token && refresh_token) {
    const { error } = await c.auth.setSession({ access_token, refresh_token });
    return !error;
  }
  if (code) {
    const { error } = await c.auth.exchangeCodeForSession(code);
    return !error;
  }
  return false;
}

export async function signOut(everywhere = false): Promise<void> {
  const c = await api();
  if (!c) return;
  const { disablePush } = await import('../notifications/push');
  await disablePush();
  await c.auth.signOut({ scope: everywhere ? 'global' : 'local' });
}

/**
 * Exclusão de conta dentro do app — exigência da App Store e da LGPD. A conta é
 * apagada pela Edge Function `oaze-conta`, que também cancela a assinatura; o
 * cliente não tem privilégio para isso, e é correto que não tenha.
 */
export async function deleteAccount(confirmation: string): Promise<void> {
  await callFunction('oaze-conta', { acao: 'excluir', confirmacao: confirmation });
  await signOut(true);
}

export async function updateName(name: string): Promise<void> {
  const c = await must();
  const clean = name.trim().slice(0, 40);
  if (!clean) throw new Error('Escreva seu nome.');
  const { error } = await c.auth.updateUser({ data: { name: clean } });
  if (error) throw friendly(error.message);
}

/* ------------------------------------------------------------------ apoio */

async function must() {
  const c = await api();
  if (!c) throw new Error('Conta indisponível: este build não foi configurado com o servidor.');
  return c;
}

function redirectTo(path = '/app'): string {
  /* app instalado volta por esquema próprio; navegador volta para a origem */
  return platform() === 'web' ? `${location.origin}${path}` : 'oaze://auth';
}

/** Mensagem do provedor traduzida para algo que a pessoa possa agir. */
function friendly(raw: string): Error {
  const m = raw.toLowerCase();
  if (m.includes('invalid login')) return new Error('E-mail ou senha não conferem.');
  if (m.includes('email not confirmed')) return new Error('Confirme seu e-mail antes de entrar.');
  if (m.includes('already registered')) return new Error('Já existe conta com esse e-mail.');
  if (m.includes('rate limit') || m.includes('too many')) return new Error('Muitas tentativas. Espere um minuto.');
  if (m.includes('password')) return new Error('A senha precisa de pelo menos 8 caracteres.');
  if (m.includes('network') || m.includes('fetch')) return new Error('Sem conexão agora. Seus dados estão salvos aqui.');
  return new Error(raw);
}
