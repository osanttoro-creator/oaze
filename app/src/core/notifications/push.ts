import { api } from '../api/client';
import { platform } from '../../platform';
import { deviceId } from '../sync/engine';
import { reportHandled } from '../telemetry';

/*
  Notificação push — a arquitetura, ligada ao que já existe.

  O que isto faz hoje: pede permissão, registra o aparelho no FCM/APNs pelo
  plugin do Capacitor, guarda o token em `oaze2_push_tokens` com RLS, e apaga o
  token ao sair. O aviso em si é disparado pelo servidor.

  O que isto NÃO faz, e é importante dizer: **nenhum aviso push é enviado
  enquanto não existir a função de servidor que o dispara.** Ela precisa da
  chave do FCM e do certificado da APNs, que são segredos e ficam em Edge
  Function — nunca aqui. Enquanto isso, os lembretes do OAZE são locais
  (`core/notifications/index.ts`), funcionam sem rede e não dependem de nada
  disso.

  Regra de privacidade que vale desde já: **o push não carrega valor nem nome.**
  Ele carrega um tipo e um identificador; o aparelho abre o app e lê o dado dele
  mesmo. Um aviso que trouxesse o saldo pronto exporia o número ao provedor de
  push, que é um terceiro fora do acordo de tratamento de dados do produto.
*/

export type PushTopic = 'fatura' | 'sincronizacao' | 'conta';

interface PushPlugin {
  requestPermissions(): Promise<{ receive: string }>;
  checkPermissions(): Promise<{ receive: string }>;
  register(): Promise<void>;
  addListener(
    event: 'registration' | 'registrationError' | 'pushNotificationActionPerformed',
    cb: (data: unknown) => void,
  ): Promise<{ remove: () => void }>;
}

function plugin(): PushPlugin | null {
  const p = (globalThis as { Capacitor?: { Plugins?: { PushNotifications?: PushPlugin } } }).Capacitor?.Plugins
    ?.PushNotifications;
  return p ?? null;
}

/** Push só existe no celular. No desktop e na web, o lembrete é local. */
export function pushAvailable(): boolean {
  const p = platform();
  return (p === 'ios' || p === 'android') && !!plugin();
}

export async function pushGranted(): Promise<boolean> {
  const p = plugin();
  if (!p) return false;
  try {
    return (await p.checkPermissions()).receive === 'granted';
  } catch {
    return false;
  }
}

/**
 * Pede permissão e registra. Chamar **depois** de explicar para quê — pedir no
 * primeiro arranque é como se perde a permissão para sempre.
 */
export async function enablePush(): Promise<boolean> {
  const p = plugin();
  if (!p) return false;
  try {
    const { receive } = await p.requestPermissions();
    if (receive !== 'granted') return false;

    await p.addListener('registration', (data) => {
      const token = (data as { value?: string })?.value;
      if (token) void saveToken(token);
    });
    await p.addListener('registrationError', (err) => {
      reportHandled(err, 'registro de push');
    });

    await p.register();
    return true;
  } catch (err) {
    reportHandled(err, 'ativar push');
    return false;
  }
}

async function saveToken(token: string): Promise<void> {
  const c = await api();
  if (!c) return;
  try {
    await c.from('oaze2_push_tokens').upsert(
      {
        device_id: await deviceId(),
        platform: platform(),
        token,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'device_id' },
    );
  } catch (err) {
    reportHandled(err, 'guardar token de push');
  }
}

/** Sair do aparelho tira o token: senão ele continua recebendo aviso da conta. */
export async function disablePush(): Promise<void> {
  const c = await api();
  if (!c) return;
  try {
    await c.from('oaze2_push_tokens').delete().eq('device_id', await deviceId());
  } catch (err) {
    reportHandled(err, 'remover token de push');
  }
}
