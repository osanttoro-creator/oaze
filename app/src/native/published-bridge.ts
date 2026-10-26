import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { openUrl } from '@tauri-apps/plugin-opener';
import type { SupabaseClient } from '@supabase/supabase-js';

interface SiteAuth {
  cliente(): SupabaseClient | null;
  destino(): string;
  voltarPara(path: string): string;
  guardarAceitePendente(acceptance: unknown): void;
  umToque(callback: (error: Error | null) => void): Promise<boolean>;
  entrarCom(provider: string, path?: string, acceptance?: unknown): Promise<{ error: Error | null }>;
}

type NativeWindow = Window & {
  SiteAuth?: SiteAuth;
  OAZE_NATIVE_AUTH_READY?: Promise<void>;
  __TAURI_INTERNALS__?: { invoke: <T>(command: string) => Promise<T> };
};

const nativeWindow = window as NativeWindow;
const android = Capacitor.getPlatform() === 'android';
const desktop = !!nativeWindow.__TAURI_INTERNALS__;
const auth = nativeWindow.SiteAuth;

if (auth) {
  auth.destino = () => '/index.html';
  if (android || desktop) {
    auth.voltarPara = () => 'oaze://auth';
    // Google One Tap não oferece uma sessão confiável dentro de WebView2 ou
    // Android WebView. A entrada social passa pelo navegador do sistema.
    auth.umToque = async () => false;
    auth.entrarCom = async (provider, _path, acceptance) => {
      const client = auth.cliente();
      if (!client) throw new Error('Conta indisponível neste aparelho.');
      if (acceptance) auth.guardarAceitePendente(acceptance);
      const { data, error } = await client.auth.signInWithOAuth({
        provider: provider as 'google' | 'apple',
        options: {
          redirectTo: 'oaze://auth',
          skipBrowserRedirect: true,
          ...(provider === 'google' ? { queryParams: { prompt: 'select_account' } } : {}),
        },
      });
      if (error) return { error };
      if (!data.url || !/^https:\/\/[\w.-]+\.supabase\.co\/auth\/v1\/authorize\?/.test(data.url)) {
        throw new Error('Endereço de entrada inválido.');
      }
      if (android) await Browser.open({ url: data.url });
      else await openUrl(data.url);
      return { error: null };
    };
  }
}

async function finishAuth(url: string): Promise<void> {
  const callback = new URL(url);
  if (callback.protocol !== 'oaze:' || callback.hostname !== 'auth') return;
  const code = callback.searchParams.get('code');
  if (!code) throw new Error('O provedor não devolveu o código de entrada.');
  const client = auth?.cliente();
  if (!client) throw new Error('Conta indisponível neste aparelho.');
  const { error } = await client.auth.exchangeCodeForSession(code);
  if (error) throw error;
  if (android) await Browser.close().catch(() => {});
  location.replace('/index.html');
}

function reportAuthFailure(error: unknown): void {
  const message = error instanceof Error ? error.message : 'Não foi possível concluir a entrada.';
  sessionStorage.setItem('oaze.native-auth-error', message);
  location.replace('/entrar.html');
}

nativeWindow.OAZE_NATIVE_AUTH_READY = (async () => {
  if (android) {
    await App.addListener('backButton', () => {
      const sheet = document.getElementById('v3-overlay');
      if (sheet && !sheet.hidden) {
        (sheet.querySelector('[data-action="close"]') as HTMLElement | null)?.click();
        return;
      }
      if (location.pathname.endsWith('/index.html') && location.hash && location.hash !== '#home') {
        const home = document.querySelector('[data-go="home"]') as HTMLElement | null;
        if (home) { home.click(); return; }
      }
      if (!location.pathname.endsWith('/index.html') && !location.pathname.endsWith('/entrar.html')) {
        location.replace('/entrar.html');
        return;
      }
      void App.exitApp();
    });
    await App.addListener('appUrlOpen', ({ url }) => {
      void finishAuth(url).catch(reportAuthFailure);
    });
    const launch = await App.getLaunchUrl();
    if (launch?.url) await finishAuth(launch.url);
  } else if (desktop) {
    window.addEventListener('oaze:deep-link', (event) => {
      void finishAuth((event as CustomEvent<string>).detail).catch(reportAuthFailure);
    });
    const current = await nativeWindow.__TAURI_INTERNALS__!.invoke<string[]>('oaze_deep_link_ready');
    for (const url of current) await finishAuth(url);
  }
})().catch(reportAuthFailure);

const priorError = sessionStorage.getItem('oaze.native-auth-error');
if (priorError && location.pathname.endsWith('/entrar.html')) {
  sessionStorage.removeItem('oaze.native-auth-error');
  addEventListener('DOMContentLoaded', () => {
    const message = document.getElementById('recado');
    if (message) { message.textContent = priorError; message.setAttribute('role', 'alert'); }
  }, { once: true });
}
