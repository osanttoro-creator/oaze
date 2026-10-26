import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { LocalNotifications } from '@capacitor/local-notifications';
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
  __TAURI_INTERNALS__?: { invoke: <T>(command: string, args?: Record<string, unknown>) => Promise<T> };
  OAZE_NATIVE_NOTIFICATIONS?: {
    request(): Promise<boolean>;
    schedule(items: Array<{ id: number; at: string }>): Promise<void>;
    cancel(): Promise<void>;
  };
  OAZE_NATIVE_OPEN_EXTERNAL?: (url: string) => Promise<void>;
  OAZE_BILLING_READONLY?: boolean;
};

const nativeWindow = window as NativeWindow;
const android = Capacitor.getPlatform() === 'android';
const desktop = !!nativeWindow.__TAURI_INTERNALS__;
const auth = nativeWindow.SiteAuth;
nativeWindow.OAZE_BILLING_READONLY = android && import.meta.env.VITE_OAZE_DISTRIBUTION === 'play';

if (android || desktop) {
  nativeWindow.OAZE_NATIVE_OPEN_EXTERNAL = async (url) => {
    if (!/^https:\/\/(checkout|billing)\.stripe\.com\//.test(url)) {
      throw new Error('Endereço de cobrança inválido.');
    }
    if (android) await Browser.open({ url });
    else await openUrl(url);
  };
}

if (android || desktop) {
  nativeWindow.OAZE_NATIVE_NOTIFICATIONS = {
    async request() {
      if (android) return (await LocalNotifications.requestPermissions()).display === 'granted';
      return nativeWindow.__TAURI_INTERNALS__!.invoke<boolean>('oaze_notify_request');
    },
    async cancel() {
      if (android) {
        const pending = await LocalNotifications.getPending();
        const ours = pending.notifications.filter(({ id }) => id >= 3100000 && id < 4100000);
        if (ours.length) await LocalNotifications.cancel({ notifications: ours });
      } else {
        await nativeWindow.__TAURI_INTERNALS__!.invoke('oaze_notify_cancel_all');
      }
    },
    async schedule(items) {
      await this.cancel();
      if (android) {
        if (!items.length) return;
        await LocalNotifications.schedule({ notifications: items.map(({ id, at }) => ({
          id, title: 'Lembrete OAZE', body: 'Você tem um compromisso financeiro próximo. Abra o OAZE para conferir.',
          schedule: { at: new Date(at) },
        })) });
      } else {
        await nativeWindow.__TAURI_INTERNALS__!.invoke('oaze_notify_schedule', {
          items: items.map(({ id, at }) => ({ id,
            title: 'Lembrete OAZE', body: 'Abra o OAZE para conferir seus próximos compromissos.', at: new Date(at).toISOString() })),
        });
      }
    },
  };
}

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
