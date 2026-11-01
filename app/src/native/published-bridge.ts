import { Capacitor, registerPlugin } from '@capacitor/core';
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
    status(): Promise<'granted' | 'denied' | 'prompt'>;
    schedule(items: Array<NativeNotice>): Promise<void>;
    cancel(): Promise<void>;
  };
  OAZE_NATIVE_WIDGET?: {
    atualizar(dados: { titulo: string; destaque: string; linha1: string; linha2: string; linha3: string; rodape: string }): Promise<void>;
    limpar(): Promise<void>;
  };
  OAZE_NATIVE_PUSH?: {
    registrar(topicos: string[]): Promise<boolean>;
  };
  OAZE_NATIVE_ADS?: {
    mostrar(options: { userId: string }): Promise<{ recompensado: boolean }>;
  };
  OAZE_NATIVE_OPEN_EXTERNAL?: (url: string) => Promise<void>;
  OAZE_NATIVE_BANK_NOTIFS?: {
    status(): Promise<boolean>;
    pendentes(): Promise<Array<{ id: string; app: string; pacote?: string; texto: string; quando: number }>>;
    remover(id: string): Promise<void>;
    abrirAjustes(): Promise<void>;
  };
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

/* Um aviso do sistema. Título e texto vêm do painel; sem eles, o texto
   genérico de sempre (nada de valor na tela bloqueada). */
interface NativeNotice { id: number; at: string; title?: string; body?: string; channel?: 'contas' | 'insights' }

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
      await auth?.cliente()?.auth.signOut({ scope: 'local' });
      location.replace('/entrar.html');
    });
    unlock.focus();
    void unlock.click();
  });
}

/* Quem sai para o navegador por um caminho do próprio app (entrar com
   Google, pagar, portal) não está "abandonando" o aparelho: a volta não
   pede biometria. Antes, voltar de um pagamento de mais de 15 s abria o
   Windows Hello por cima da janela que ainda recarregava, e o app parecia
   travado. A janela vale 15 minutos. */
const externalFlowKey = 'oaze.native.external-flow';
function markExternalFlow(): void {
  try { sessionStorage.setItem(externalFlowKey, String(Date.now())); } catch { /* sem armazenamento */ }
}
function inExternalFlow(): boolean {
  try {
    const at = Number(sessionStorage.getItem(externalFlowKey)) || 0;
    return at > 0 && Date.now() - at < 15 * 60_000;
  } catch { return false; }
}
function endExternalFlow(): void {
  try { sessionStorage.removeItem(externalFlowKey); } catch { /* sem armazenamento */ }
}

let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenAt = Date.now(); return; }
  if (hiddenAt && Date.now() - hiddenAt > 15_000 && !inExternalFlow()) void unlockApp();
  hiddenAt = 0;
});

if (android || desktop) {
  nativeWindow.OAZE_NATIVE_OPEN_EXTERNAL = async (url) => {
    if (!/^https:\/\/(checkout|billing)\.stripe\.com\//.test(url)) {
      throw new Error('Endereço de cobrança inválido.');
    }
    markExternalFlow();
    if (android) await Browser.open({ url });
    else await openUrl(url);
  };
}

/* Widget da tela inicial (plugin nativo OazeWidget, MainActivity). */
interface OazeWidgetPlugin {
  atualizar(dados: { titulo: string; destaque: string; linha1: string; linha2: string; linha3: string; rodape: string }): Promise<void>;
  limpar(): Promise<void>;
}
if (android) {
  const widget = registerPlugin<OazeWidgetPlugin>('OazeWidget');
  nativeWindow.OAZE_NATIVE_WIDGET = {
    atualizar: (dados) => widget.atualizar(dados).catch(() => {}),
    limpar: () => widget.limpar().catch(() => {}),
  };
}

/* Avisos dos apps de banco (OazeBancoListener): ficam no aparelho e viram
   sugestão de lançamento em "Avisos do banco". Só Android. */
interface OazeBancoPlugin {
  status(): Promise<{ ligado: boolean }>;
  pendentes(): Promise<{ itens: Array<{ id: string; app: string; pacote?: string; texto: string; quando: number }> }>;
  remover(options: { id: string }): Promise<void>;
  abrirAjustes(): Promise<void>;
}
if (android) {
  const banco = registerPlugin<OazeBancoPlugin>('OazeBanco');
  nativeWindow.OAZE_NATIVE_BANK_NOTIFS = {
    status: async () => (await banco.status()).ligado,
    pendentes: async () => (await banco.pendentes()).itens || [],
    remover: (id) => banco.remover({ id }),
    abrirAjustes: () => banco.abrirAjustes(),
  };
}

/* Push do Firebase (projeto oaze-finance). O token vai para
   oaze2_push_tokens por registrar_push(), com os tópicos que a pessoa
   ligou. O servidor só manda dado público (dólar do dia). */
if (android) {
  nativeWindow.OAZE_NATIVE_PUSH = {
    async registrar(topicos) {
      const client = auth?.cliente();
      if (!client) return false;
      const { data } = await client.auth.getSession();
      if (!data.session) return false;
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const perm = await PushNotifications.checkPermissions();
      if (perm.receive !== 'granted') return false;
      let device = '';
      try { device = localStorage.getItem('oaze.push.device') || ''; } catch { /* sem armazenamento */ }
      if (!/^[A-Za-z0-9_-]{8,80}$/.test(device)) {
        device = crypto.randomUUID().replace(/-/g, '');
        try { localStorage.setItem('oaze.push.device', device); } catch { /* segue sem guardar */ }
      }
      const token = await new Promise<string | null>((resolve) => {
        const parar = setTimeout(() => resolve(null), 15_000);
        void PushNotifications.addListener('registration', (t) => { clearTimeout(parar); resolve(t.value); });
        void PushNotifications.addListener('registrationError', () => { clearTimeout(parar); resolve(null); });
        void PushNotifications.register().catch(() => { clearTimeout(parar); resolve(null); });
      });
      await PushNotifications.removeAllListeners().catch(() => {});
      if (!token) return false;
      const { error } = await client.rpc('registrar_push', { p_device: device, p_token: token,
        p_topicos: topicos.filter((t) => t === 'dolar') });
      return !error;
    },
  };
}

/* Anúncio premiado do plano Semente (só Android; AdMob não existe no
   Windows). Quem libera os lançamentos é o servidor, quando o Google
   chama oaze-anuncio com a verificação assinada (SSV) — por isso o id do
   usuário vai junto. Bloco real "Semente - liberar lancamentos", com a
   URL de callback verificada na AdMob em 31/10/2026. Para testar no
   próprio celular, cadastre-o como dispositivo de teste na AdMob
   (clicar em anúncio real próprio viola a política). VITE_OAZE_ADMOB_REWARDED_ID
   troca o bloco; o valor do bloco de teste do Google ainda é aceito. */
const ADMOB_TESTE = 'ca-app-pub-3940256099942544/5224354917';
const ADMOB_PREMIADO = 'ca-app-pub-3943764788328980/5294953962';
if (android && import.meta.env.VITE_OAZE_DISTRIBUTION !== 'sem-anuncios') {
  const adId = String(import.meta.env.VITE_OAZE_ADMOB_REWARDED_ID || '') || ADMOB_PREMIADO;
  const teste = adId === ADMOB_TESTE;
  let iniciado: Promise<void> | null = null;
  nativeWindow.OAZE_NATIVE_ADS = {
    async mostrar({ userId }) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
        throw new Error('Entre na sua conta para liberar lançamentos.');
      }
      const { AdMob, RewardAdPluginEvents } = await import('@capacitor-community/admob');
      iniciado ??= AdMob.initialize({ initializeForTesting: teste });
      await iniciado;
      /* Formulário de consentimento do Google onde a lei exige (UMP). */
      try {
        const info = await AdMob.requestConsentInfo();
        if (info.isConsentFormAvailable && String(info.status) === 'REQUIRED') await AdMob.showConsentForm();
      } catch { /* sem formulário disponível: segue com anúncio não personalizado */ }
      let recompensado = false;
      const ouvintes = [await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => { recompensado = true; })];
      try {
        const fechado = new Promise<void>((resolve) => {
          void AdMob.addListener(RewardAdPluginEvents.Dismissed, () => resolve()).then((h) => ouvintes.push(h));
          void AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => resolve()).then((h) => ouvintes.push(h));
        });
        await AdMob.prepareRewardVideoAd({ adId, isTesting: teste, ssv: { userId } });
        try { await AdMob.showRewardVideoAd(); } catch { /* fechado antes do fim */ }
        await Promise.race([fechado, new Promise((resolve) => setTimeout(resolve, 120_000))]);
      } finally {
        for (const h of ouvintes) void h.remove().catch(() => {});
      }
      return { recompensado };
    },
  };
}

// No Windows, um link externo dentro do WebView2 tiraria a pessoa do app (ou
// abriria uma janela solta). No Android o Capacitor já entrega https e mailto
// ao sistema. Só endereços conhecidos saem; os demais são ignorados.
const externalLinks = /^(?:https:\/\/(?:oaze\.site|www\.flaticon\.com|www\.openstreetmap\.org)\/[^\s]*|mailto:info@oaze\.site)$/;
if (desktop) {
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    const link = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!link) return;
    let url: URL;
    try { url = new URL(link.getAttribute('href') || '', location.href); } catch { return; }
    if (url.origin === location.origin && url.protocol === location.protocol) return;
    event.preventDefault();
    if (externalLinks.test(url.href)) void openUrl(url.href).catch(() => {});
  });
}

if (desktop) {
  // O download do WebView2 não tem destino garantido no app instalado:
  // o relatório passa pelo "Salvar como" do Windows.
  nativeWindow.OAZE_NATIVE_SAVE_PDF = async (fileName, base64) => {
    if (!/^estado-oaze-\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}\.pdf$/.test(fileName) ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length > 20_000_000) {
      throw new Error('Relatório inválido.');
    }
    const binary = atob(base64);
    const bytes = new Array<number>(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    await nativeWindow.__TAURI_INTERNALS__!.invoke<boolean>('oaze_save_pdf', { name: fileName, bytes });
  };
}

const readingPage =/\/(privacidade|termos|suporte)\.html$/.test(location.pathname);

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

const textoAviso = (value: unknown, fallback: string, max: number) =>
  typeof value === 'string' && value.trim() ? value.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, max) : fallback;

let canaisCriados = false;
async function criarCanais(): Promise<void> {
  if (!android || canaisCriados) return;
  /* Visibilidade privada: com tela bloqueada segura, o Android mostra só
     "OAZE" e esconde o texto até a pessoa desbloquear. */
  await LocalNotifications.createChannel({ id: 'oaze-contas', name: 'Contas e faturas',
    description: 'Vencimentos de contas, faturas e metas', importance: 4, visibility: 0 }).catch(() => {});
  await LocalNotifications.createChannel({ id: 'oaze-insights', name: 'Insights e cotações',
    description: 'Orçamento, score, dólar e dicas do OAZE', importance: 3, visibility: 0 }).catch(() => {});
  canaisCriados = true;
}

if (android || desktop) {
  nativeWindow.OAZE_NATIVE_NOTIFICATIONS = {
    async request() {
      if (android) return (await LocalNotifications.requestPermissions()).display === 'granted';
      return nativeWindow.__TAURI_INTERNALS__!.invoke<boolean>('oaze_notify_request');
    },
    async status() {
      if (android) {
        const state = (await LocalNotifications.checkPermissions()).display;
        return state === 'granted' ? 'granted' : state === 'denied' ? 'denied' : 'prompt';
      }
      const ok = await nativeWindow.__TAURI_INTERNALS__!.invoke<boolean>('oaze_notify_granted').catch(() => false);
      return ok ? 'granted' : 'prompt';
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
      const validos = items.filter((item) => Number.isInteger(item.id) && item.id >= 3100000 && item.id < 4100000
        && Number.isFinite(new Date(item.at).getTime())).slice(0, 60);
      if (android) {
        if (!validos.length) return;
        await criarCanais();
        await LocalNotifications.schedule({ notifications: validos.map((item) => ({
          id: item.id,
          title: textoAviso(item.title, 'Lembrete OAZE', 80),
          body: textoAviso(item.body, 'Você tem um compromisso financeiro próximo. Abra o OAZE para conferir.', 180),
          channelId: item.channel === 'insights' ? 'oaze-insights' : 'oaze-contas',
          schedule: { at: new Date(item.at), allowWhileIdle: true },
        })) });
      } else {
        await nativeWindow.__TAURI_INTERNALS__!.invoke('oaze_notify_schedule', {
          items: validos.map((item) => ({ id: item.id,
            title: textoAviso(item.title, 'Lembrete OAZE', 80),
            body: textoAviso(item.body, 'Abra o OAZE para conferir seus próximos compromissos.', 180),
            at: new Date(item.at).toISOString() })),
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
      markExternalFlow();
      if (android) await Browser.open({ url: data.url });
      else await openUrl(data.url);
      return { error: null };
    };
  }
}

/* LINK DE VOLTA É LIDO UMA VEZ SÓ
   O Windows (get_current) e o Android (getLaunchUrl) devolvem o link que
   abriu o app a CADA carregamento de página, não só no primeiro. Depois de
   entrar, o app vai para /index.html, pergunta de novo e recebe o mesmo
   oaze://auth?code=…, já gasto: a troca falhava, a pessoa voltava para
   /entrar com erro e o ciclo se repetia — o "trava e tem que reabrir".
   Cada link tratado fica anotado nesta sessão da janela e é ignorado
   na próxima vez. */
const handledLinksKey = 'oaze.native.handled-links';
function alreadyHandled(url: string): boolean {
  try { return (JSON.parse(sessionStorage.getItem(handledLinksKey) || '[]') as string[]).includes(url); }
  catch { return false; }
}
function markHandled(url: string): void {
  try {
    const list = (JSON.parse(sessionStorage.getItem(handledLinksKey) || '[]') as string[]).filter((u) => u !== url);
    list.push(url);
    sessionStorage.setItem(handledLinksKey, JSON.stringify(list.slice(-20)));
  } catch { /* sem armazenamento: segue sem memória */ }
}

let authCallbackInFlight = false;
async function finishAuth(url: string): Promise<void> {
  const callback = new URL(url);
  if (callback.protocol !== 'oaze:' || callback.hostname !== 'auth') return;
  if (authCallbackInFlight) return;
  endExternalFlow();
  const client = auth?.cliente();
  if (!client) throw new Error('Conta indisponível neste aparelho.');
  if (android) await Browser.close().catch(() => {});
  const code = callback.searchParams.get('code');
  if (!code) {
    const motivo = callback.searchParams.get('error_description') || callback.searchParams.get('error');
    if (motivo) throw new Error('A entrada foi cancelada. Tente de novo.');
    throw new Error('O provedor não devolveu o código de entrada.');
  }
  authCallbackInFlight = true;
  try {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) {
      /* Código já usado (outra janela, clique duplo no "Abrir OAZE"): se a
         sessão existe, a pessoa já está dentro — segue sem erro. */
      const { data } = await client.auth.getSession();
      if (!data.session) throw error;
    }
    if (!location.pathname.endsWith('/index.html') && location.pathname !== '/') location.replace('/index.html');
    else authCallbackInFlight = false;
  } catch (error) {
    authCallbackInFlight = false;
    throw error;
  }
}

/* fromLaunch: o link veio de "o que abriu o app" (repete a cada página).
   Links que chegam com o app aberto são eventos novos e sempre valem. */
async function handleAppUrl(url: string, fromLaunch = false): Promise<void> {
  let incoming: URL;
  try { incoming = new URL(url); } catch { return; }
  if (fromLaunch && alreadyHandled(url)) return;
  markHandled(url);
  /* Atalhos do ícone e do widget: oaze://acao/novo | recibo | coco.
     Na abertura a frio o painel ainda está montando; o evento sai depois. */
  if (incoming.protocol === 'oaze:' && incoming.hostname === 'acao') {
    const acao = incoming.pathname.replace(/^\/+/, '');
    if (['novo', 'recibo', 'coco'].includes(acao)) {
      const emitir = () => dispatchEvent(new CustomEvent('oaze:acao', { detail: acao }));
      if (document.readyState === 'complete' && document.querySelector('#v3-view .v3-home-identity, #v3-view [data-oz-inicio]')) emitir();
      else setTimeout(emitir, 2500);
    }
    return;
  }
  if (incoming.protocol === 'oaze:' && incoming.hostname === 'billing') {
    if (!['sucesso', 'cancelado', 'portal'].includes(incoming.searchParams.get('resultado') || '')) return;
    endExternalFlow();
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
      if (readingPage) {
        // Política, termos e suporte são abertos de dentro do painel.
        if (history.length > 1) history.back();
        else location.replace('/index.html');
        return;
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
    if (launch?.url) await handleAppUrl(launch.url, true);
  } else if (desktop) {
    window.addEventListener('oaze:deep-link', (event) => {
      void handleAppUrl((event as CustomEvent<string>).detail).catch(reportAuthFailure);
    });
    const current = await nativeWindow.__TAURI_INTERNALS__!.invoke<string[]>('oaze_deep_link_ready');
    for (const url of current) await handleAppUrl(url, true);
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
