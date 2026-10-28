import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { LocalNotifications } from '@capacitor/local-notifications';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
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
  OAZE_NATIVE_DESKTOP?: boolean;
  OAZE_NATIVE_SAVE_PDF?: (fileName: string, base64: string) => Promise<void>;
  OAZE_BILLING_READONLY?: boolean;
  OAZE_NATIVE_BIOMETRICS?: {
    isEnabled(): boolean;
    available(): Promise<boolean>;
    verify(): Promise<boolean>;
    setEnabled(value: boolean): Promise<boolean>;
  };
};

const nativeWindow = window as NativeWindow;
const android = Capacitor.getPlatform() === 'android';
const desktop = !!nativeWindow.__TAURI_INTERNALS__;
nativeWindow.OAZE_NATIVE_DESKTOP = desktop;
const auth = nativeWindow.SiteAuth;
const biometricKey = 'oaze.native.biometric-lock.v1';
nativeWindow.OAZE_BILLING_READONLY = android && import.meta.env.VITE_OAZE_DISTRIBUTION === 'play';

if (android || desktop) {
  const biometrics = {
    isEnabled: () => localStorage.getItem(biometricKey) === '1',
    async available() {
      try {
        if (android) return (await BiometricAuth.checkBiometry()).isAvailable;
        return await nativeWindow.__TAURI_INTERNALS__!.invoke<boolean>('oaze_biometrics_available');
      } catch { return false; }
    },
    async verify() {
      try {
        if (android) {
          await BiometricAuth.authenticate({ reason: 'Confirme que é você para abrir o OAZE',
            cancelTitle: 'Cancelar', allowDeviceCredential: true });
          return true;
        }
        return await nativeWindow.__TAURI_INTERNALS__!.invoke<boolean>('oaze_biometrics_verify',
          { reason: 'Confirme que é você para abrir o OAZE.' });
      } catch { return false; }
    },
    async setEnabled(value: boolean) {
      if (!(await this.available()) || !(await this.verify())) return false;
      if (value) localStorage.setItem(biometricKey, '1');
      else localStorage.removeItem(biometricKey);
      return true;
    },
  };
  nativeWindow.OAZE_NATIVE_BIOMETRICS = biometrics;
}

async function unlockApp(): Promise<void> {
  const biometrics = nativeWindow.OAZE_NATIVE_BIOMETRICS;
  if (!(location.pathname === '/' || location.pathname.endsWith('/index.html')) || !biometrics?.isEnabled()) return;
  if (document.getElementById('oaze-native-lock')) return;
  const gate = document.createElement('div');
  gate.id = 'oaze-native-lock';
  gate.setAttribute('role', 'dialog');
  gate.setAttribute('aria-modal', 'true');
  gate.setAttribute('aria-label', 'Desbloquear OAZE');
  gate.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#080d10;color:#f0e5cf;display:grid;place-items:center;padding:24px;text-align:center;font:16px system-ui';
  gate.innerHTML = '<div><img src="/assets/brand/oaze-logo-mono-milk.svg" alt="OAZE" width="148"><h1 style="font-size:23px;margin:32px 0 8px">Seu espaço está protegido</h1><p>Confirme sua identidade no aparelho para continuar.</p><button id="oaze-native-unlock" style="min-height:48px;margin:20px 8px;padding:12px 22px;border:0;border-radius:24px;background:#5fa99b;color:#071822;font-weight:700">Desbloquear</button><button id="oaze-native-signout" style="min-height:48px;margin:20px 8px;padding:12px 22px;border:1px solid #5fa99b;border-radius:24px;background:transparent;color:#f0e5cf">Sair da conta</button><p id="oaze-native-lock-message" role="status"></p></div>';
  document.body.appendChild(gate);
  await new Promise<void>((resolve) => {
    const unlock = gate.querySelector<HTMLButtonElement>('#oaze-native-unlock')!;
    const message = gate.querySelector<HTMLElement>('#oaze-native-lock-message')!;
    unlock.addEventListener('click', async () => {
      unlock.disabled = true;
      if (await biometrics.verify()) { gate.remove(); resolve(); }
      else { message.textContent = 'Não foi possível confirmar. Tente novamente ou saia da conta.'; unlock.disabled = false; }
    });
    gate.querySelector<HTMLButtonElement>('#oaze-native-signout')!.addEventListener('click', async () => {
      localStorage.removeItem(biometricKey);
      await auth?.cliente()?.auth.signOut();
      location.replace('/entrar.html');
    });
    unlock.focus();
    void unlock.click();
  });
}

let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenAt = Date.now(); return; }
  if (hiddenAt && Date.now() - hiddenAt > 15_000) void unlockApp();
  hiddenAt = 0;
});

if (android || desktop) {
  nativeWindow.OAZE_NATIVE_OPEN_EXTERNAL = async (url) => {
    if (!/^https:\/\/(checkout|billing)\.stripe\.com\//.test(url)) {
      throw new Error('Endereço de cobrança inválido.');
    }
    if (android) await Browser.open({ url });
    else await openUrl(url);
  };
}

if (android) {
  nativeWindow.OAZE_NATIVE_SAVE_PDF = async (fileName, base64) => {
    if (!/^estado-oaze-\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}\.pdf$/.test(fileName) ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length > 20_000_000) {
      throw new Error('Relatório inválido.');
    }
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'), import('@capacitor/share'),
    ]);
    const { uri } = await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache });
    await Share.share({ title: 'Estado do OAZE', url: uri, dialogTitle: 'Salvar ou compartilhar PDF' });
    // O arquivo é temporário; quem quiser guardá-lo escolhe um destino no compartilhamento.
    setTimeout(() => { void Filesystem.deleteFile({ path: fileName, directory: Directory.Cache }).catch(() => {}); }, 5 * 60_000);
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

async function handleAppUrl(url: string): Promise<void> {
  const incoming = new URL(url);
  if (incoming.protocol === 'oaze:' && incoming.hostname === 'billing') {
    if (!['sucesso', 'cancelado', 'portal'].includes(incoming.searchParams.get('resultado') || '')) return;
    if (android) await Browser.close().catch(() => {});
    try { sessionStorage.setItem('oaze.native.billing-return', '1'); } catch { /* storage indisponível */ }
    dispatchEvent(new Event('oaze:billing-return'));
    return;
  }
  if (android && incoming.origin === 'https://oaze.site' && incoming.pathname === '/app/planos') {
    await Browser.close().catch(() => {});
    try { sessionStorage.setItem('oaze.native.billing-return', '1'); } catch { /* storage indisponível */ }
    dispatchEvent(new Event('oaze:billing-return'));
    return;
  }
  await finishAuth(url);
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
      void handleAppUrl(url).catch(reportAuthFailure);
    });
    const launch = await App.getLaunchUrl();
    if (launch?.url) await handleAppUrl(launch.url);
  } else if (desktop) {
    window.addEventListener('oaze:deep-link', (event) => {
      void handleAppUrl((event as CustomEvent<string>).detail).catch(reportAuthFailure);
    });
    const current = await nativeWindow.__TAURI_INTERNALS__!.invoke<string[]>('oaze_deep_link_ready');
    for (const url of current) await handleAppUrl(url);
  }
  await unlockApp();
})().catch(reportAuthFailure);

const priorError = sessionStorage.getItem('oaze.native-auth-error');
if (priorError && location.pathname.endsWith('/entrar.html')) {
  sessionStorage.removeItem('oaze.native-auth-error');
  addEventListener('DOMContentLoaded', () => {
    const message = document.getElementById('recado');
    if (message) { message.textContent = priorError; message.setAttribute('role', 'alert'); }
  }, { once: true });
}
