import { isDesktopShell, platform, registerBiometrics, type Biometrics } from './index';
import { completeOAuthFromUrl } from '../core/auth';
import { reportHandled } from '../core/telemetry';

/*
  Ligar o que é nativo — P3 e P12 da auditoria.

  Nenhum `import` estático de pacote nativo: este arquivo entra no build da web,
  onde esses pacotes não existem. Os plugins do Capacitor são lidos de
  `Capacitor.Plugins`, que é onde o próprio Capacitor os registra; o Tauri
  responde por `invoke`. Quando o plugin não está instalado, a capacidade fica
  indisponível e a interface ESCONDE o interruptor — melhor do que oferecer um
  botão que não faz nada, que é exatamente o defeito que estamos corrigindo.
*/

type Invoke = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

interface BiometricAuthPlugin {
  checkBiometry(): Promise<{ isAvailable: boolean; biometryType?: number; strongBiometryIsAvailable?: boolean }>;
  authenticate(o: { reason?: string; cancelTitle?: string; allowDeviceCredential?: boolean }): Promise<void>;
}

interface LocalNotificationsPlugin {
  requestPermissions(): Promise<{ display: string }>;
  checkPermissions(): Promise<{ display: string }>;
  schedule(o: { notifications: ScheduledNotification[] }): Promise<void>;
  cancel(o: { notifications: { id: number }[] }): Promise<void>;
  getPending(): Promise<{ notifications: { id: number }[] }>;
}

interface SharePlugin {
  share(o: { title?: string; text?: string; url?: string; dialogTitle?: string }): Promise<void>;
}

interface ClipboardPlugin {
  write(o: { string?: string; url?: string }): Promise<void>;
  read(): Promise<{ value: string; type: string }>;
}

interface AppPlugin {
  addListener(event: 'appUrlOpen', cb: (data: { url: string }) => void): Promise<{ remove: () => void }>;
}

interface HapticsPlugin {
  impact(o: { style: 'LIGHT' | 'MEDIUM' | 'HEAVY' }): Promise<void>;
  notification(o: { type: 'SUCCESS' | 'WARNING' | 'ERROR' }): Promise<void>;
}

interface CapPlugins {
  BiometricAuth?: BiometricAuthPlugin;
  LocalNotifications?: LocalNotificationsPlugin;
  Share?: SharePlugin;
  Clipboard?: ClipboardPlugin;
  App?: AppPlugin;
  Haptics?: HapticsPlugin;
}

function caps(): CapPlugins {
  return ((globalThis as { Capacitor?: { Plugins?: CapPlugins } }).Capacitor?.Plugins ?? {}) as CapPlugins;
}

function invoker(): Invoke | null {
  return (globalThis as { __TAURI_INTERNALS__?: { invoke?: Invoke } }).__TAURI_INTERNALS__?.invoke ?? null;
}

/* ----------------------------------------------------------------- biometria */

function mobileBiometrics(p: BiometricAuthPlugin, label: string): Biometrics {
  return {
    async info() {
      try {
        const r = await p.checkBiometry();
        return { available: !!r.isAvailable, label };
      } catch {
        return { available: false, label };
      }
    },
    async verify(reason) {
      try {
        /* `allowDeviceCredential: false` de propósito: a biometria aqui desbloqueia
           a chave local, e cair para o padrão do aparelho esvaziaria o PIN do app */
        await p.authenticate({ reason, cancelTitle: 'Usar o PIN', allowDeviceCredential: false });
        return true;
      } catch {
        /* cancelar é `false`, nunca exceção: para quem chamou, "não confirmou" */
        return false;
      }
    },
  };
}

function desktopBiometrics(invoke: Invoke, label: string): Biometrics {
  return {
    async info() {
      try {
        return { available: await invoke<boolean>('oaze_biometrics_available'), label };
      } catch {
        return { available: false, label };
      }
    },
    async verify(reason) {
      try {
        return await invoke<boolean>('oaze_biometrics_verify', { reason });
      } catch {
        return false;
      }
    },
  };
}

/* ------------------------------------------------------------- notificações */

export interface ScheduledNotification {
  id: number;
  title: string;
  body: string;
  schedule: { at: Date; allowWhileIdle?: boolean };
}

export interface Notifier {
  available: boolean;
  /** Pedido de permissão. Só chamar DEPOIS de explicar para quê. */
  request(): Promise<boolean>;
  granted(): Promise<boolean>;
  schedule(items: ScheduledNotification[]): Promise<void>;
  cancelAll(): Promise<void>;
}

const noNotifier: Notifier = {
  available: false,
  request: async () => false,
  granted: async () => false,
  schedule: async () => {},
  cancelAll: async () => {},
};

let notifier: Notifier = noNotifier;

export function notifications(): Notifier {
  return notifier;
}

function mobileNotifier(p: LocalNotificationsPlugin): Notifier {
  return {
    available: true,
    async request() {
      const r = await p.requestPermissions();
      return r.display === 'granted';
    },
    async granted() {
      const r = await p.checkPermissions();
      return r.display === 'granted';
    },
    async schedule(items) {
      await this.cancelAll();
      if (items.length) await p.schedule({ notifications: items });
    },
    async cancelAll() {
      const { notifications: pendingItems } = await p.getPending();
      if (pendingItems.length) await p.cancel({ notifications: pendingItems.map((n) => ({ id: n.id })) });
    },
  };
}

/** Desktop: notificação do sistema pelo Rust, sem plugin de celular no meio. */
function desktopNotifier(invoke: Invoke): Notifier {
  return {
    available: true,
    request: () => invoke<boolean>('oaze_notify_request'),
    granted: () => invoke<boolean>('oaze_notify_granted'),
    async schedule(items) {
      await invoke('oaze_notify_schedule', {
        items: items.map((i) => ({ id: i.id, title: i.title, body: i.body, at: i.schedule.at.toISOString() })),
      });
    },
    cancelAll: () => invoke('oaze_notify_cancel_all'),
  };
}

/** Navegador: Notification API, sem agendamento — e a interface diz isso. */
function webNotifier(): Notifier {
  const ok = typeof Notification !== 'undefined';
  return {
    available: ok,
    async request() {
      if (!ok) return false;
      return (await Notification.requestPermission()) === 'granted';
    },
    async granted() {
      return ok && Notification.permission === 'granted';
    },
    /* Sem Service Worker não existe agendamento real no navegador: avisar que
       "está agendado" seria mentira. Fica como aviso imediato quando a hora
       chega com o app aberto. */
    async schedule() {},
    async cancelAll() {},
  };
}

/* ------------------------------------------------- compartilhar, área, toque */

export async function share(payload: { title?: string; text?: string; url?: string }): Promise<boolean> {
  const { Share } = caps();
  try {
    if (Share) {
      await Share.share({ ...payload, dialogTitle: payload.title });
      return true;
    }
    const invoke = invoker();
    if (invoke) return await invoke<boolean>('oaze_share', payload);
    if (navigator.share) {
      await navigator.share(payload);
      return true;
    }
  } catch {
    /* cancelar a folha de compartilhamento não é erro */
  }
  return false;
}

export async function copyText(text: string): Promise<boolean> {
  const { Clipboard } = caps();
  try {
    if (Clipboard) {
      await Clipboard.write({ string: text });
      return true;
    }
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function readClipboard(): Promise<string | null> {
  const { Clipboard } = caps();
  try {
    if (Clipboard) return (await Clipboard.read()).value;
    return await navigator.clipboard.readText();
  } catch {
    /* sem permissão: ler a área de transferência é opcional em todo lugar */
    return null;
  }
}

export type HapticKind = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

/** Vibração curta na confirmação. Silencioso onde não existe. */
export async function haptic(kind: HapticKind = 'light'): Promise<void> {
  const { Haptics } = caps();
  if (!Haptics) return;
  try {
    if (kind === 'success' || kind === 'warning' || kind === 'error') {
      await Haptics.notification({ type: kind.toUpperCase() as 'SUCCESS' | 'WARNING' | 'ERROR' });
    } else {
      await Haptics.impact({ style: kind.toUpperCase() as 'LIGHT' | 'MEDIUM' | 'HEAVY' });
    }
  } catch {
    /* aparelho sem motor de vibração */
  }
}

/* ------------------------------------------------------------- deep links */

/**
 * `oaze://` e `https://oaze.site/app/...`. Serve a duas coisas: abrir o app
 * numa tela específica e fechar o laço do OAuth, que volta por aqui no app
 * instalado.
 */
async function installDeepLinks(): Promise<void> {
  const handle = async (url: string) => {
    try {
      if (url.includes('access_token') || url.includes('code=')) {
        await completeOAuthFromUrl(url);
        return;
      }
      const screen = url.split('/app/')[1]?.split(/[?#]/)[0];
      if (screen && /^[a-z-]{1,24}$/.test(screen)) location.hash = `/${screen}`;
    } catch (err) {
      reportHandled(err, 'deep link');
    }
  };

  const { App } = caps();
  if (App) {
    await App.addListener('appUrlOpen', ({ url }) => void handle(url));
    return;
  }
  const invoke = invoker();
  if (invoke) {
    /* o Rust reencaminha o `deep-link` para o webview como evento de janela */
    window.addEventListener('oaze:deep-link', (e) => void handle((e as CustomEvent<string>).detail));
    await invoke('oaze_deep_link_ready').catch(() => {});
  }
}

/* ------------------------------------------------------------------ arranque */

let done = false;

/** Chamado por `core/boot.ts`. Nunca lança: falha aqui não impede o app abrir. */
export async function installNative(): Promise<void> {
  if (done) return;
  done = true;
  const p = platform();
  const label = p === 'ios' ? 'Face ID' : p === 'macos' ? 'Touch ID' : p === 'windows' ? 'Windows Hello' : 'biometria';

  try {
    const { BiometricAuth, LocalNotifications } = caps();
    const invoke = invoker();

    if (BiometricAuth) registerBiometrics(mobileBiometrics(BiometricAuth, label));
    else if (isDesktopShell() && invoke) registerBiometrics(desktopBiometrics(invoke, label));

    if (LocalNotifications) notifier = mobileNotifier(LocalNotifications);
    else if (isDesktopShell() && invoke) notifier = desktopNotifier(invoke);
    else notifier = webNotifier();

    await installDeepLinks();
  } catch (err) {
    reportHandled(err, 'recursos nativos');
  }
}
