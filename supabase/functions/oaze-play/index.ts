/* =============================================================
   oaze-play — assinatura comprada na Google Play vale na conta toda

   Quem assina pelo app Android da Play paga à Google, não à Stripe.
   Sem esta função a compra ficaria presa no celular. Aqui ela vira a
   MESMA linha de public.subscriptions que a Stripe usa, então o plano
   aparece no navegador e no Windows assim que a pessoa entra com a
   mesma conta.

   Dois caminhos:
   1. POST com a sessão do app (acao 'verificar', produto, token):
      depois da compra, o app manda o purchaseToken. O servidor
      pergunta à Google (Play Developer API, subscriptionsv2) se a
      compra existe, confere que ela foi feita para ESTE usuário
      (obfuscatedExternalAccountId = SHA-256 do user_id, que o app
      passa ao abrir a compra) e só então libera o plano.
   2. POST da Google (Pub/Sub, notificações em tempo real — RTDN):
      renovação, cancelamento, estorno e pausa chegam aqui com o
      segredo na URL, e a linha é atualizada sem depender do app.

   Segredos (supabase secrets set):
     GOOGLE_PLAY_SERVICE_ACCOUNT  JSON da conta de serviço com acesso
                                   "Ver dados financeiros" no Play Console
     OAZE_PLAY_RTDN_SEGREDO        texto aleatório; vai na URL do push
     OAZE_PLAY_PACOTE              opcional, padrão oaze.site (pacote da Play desde 16/11/2026)
   ============================================================= */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { reservarRateLimit, corpoCabeNoLimite, sha256 } from '../_shared/security.ts';

const PACOTE = () => Deno.env.get('OAZE_PLAY_PACOTE') || 'oaze.site';
/* Produtos criados no Play Console (Monetizar › Assinaturas). */
const PRODUTOS: Record<string, { plano: string; ciclo: 'monthly' | 'annual' }> = {
  oaze_oasis_mensal: { plano: 'pro', ciclo: 'monthly' },
  oaze_oasis_anual: { plano: 'pro', ciclo: 'annual' }
};

const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), {
  status, headers: { 'content-type': 'application/json; charset=utf-8' }
});

/* ---------- token de acesso da Google (JWT RS256 da conta de serviço) ---------- */
const b64url = (b: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof b === 'string' ? new TextEncoder().encode(b) : new Uint8Array(b as ArrayBuffer);
  let s = ''; for (const x of bytes) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
let cacheToken: { valor: string; ate: number } | null = null;
async function tokenGoogle(): Promise<string> {
  if (cacheToken && cacheToken.ate > Date.now() + 60_000) return cacheToken.valor;
  const conta = JSON.parse(Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT') || '{}');
  if (!conta.client_email || !conta.private_key) throw new Error('play_nao_configurada');
  const agora = Math.floor(Date.now() / 1000);
  const cab = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const corpo = b64url(JSON.stringify({
    iss: conta.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token', iat: agora, exp: agora + 3600
  }));
  const pem = String(conta.private_key).replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const chave = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const assinatura = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', chave, new TextEncoder().encode(cab + '.' + corpo));
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: cab + '.' + corpo + '.' + b64url(assinatura) })
  });
  const d = await r.json();
  if (!r.ok || !d.access_token) throw new Error('play_token');
  cacheToken = { valor: d.access_token, ate: Date.now() + (Number(d.expires_in) || 3600) * 1000 };
  return cacheToken.valor;
}

async function play(metodo: string, caminho: string): Promise<any> {
  const r = await fetch('https://androidpublisher.googleapis.com/androidpublisher/v3/applications/'
    + encodeURIComponent(PACOTE()) + caminho, { method: metodo, headers: { Authorization: 'Bearer ' + await tokenGoogle() } });
  if (r.status === 404 || r.status === 410) return null;
  if (!r.ok) throw new Error('play_' + r.status);
  return r.status === 204 ? {} : r.json().catch(() => ({}));
}

/* Lê a compra na Google e devolve a linha de subscriptions. */
async function consultar(token: string) {
  const c = await play('GET', '/purchases/subscriptionsv2/tokens/' + encodeURIComponent(token));
  if (!c) return null;
  const item = (c.lineItems || [])[0] || {};
  const produto = PRODUTOS[String(item.productId || '')];
  if (!produto) return null;
  const estado = String(c.subscriptionState || '');
  const fim = item.expiryTime ? new Date(item.expiryTime).toISOString() : null;
  const ativo = ['SUBSCRIPTION_STATE_ACTIVE', 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD'].includes(estado);
  const atrasado = estado === 'SUBSCRIPTION_STATE_ON_HOLD';
  const cancelado = estado === 'SUBSCRIPTION_STATE_CANCELED';
  const testeAte = item.offerDetails?.offerTags?.includes('teste') || (c.lineItems || []).some((l: any) => l.offerPhase?.freeTrial)
    ? fim : null;
  return {
    compra: c, produto, ativo, atrasado, cancelado,
    conta: String(c.externalAccountIdentifiers?.obfuscatedExternalAccountId || ''),
    linha: {
      plan_id: ativo || atrasado || cancelado ? produto.plano : 'free',
      billing_cycle: produto.ciclo,
      status: ativo ? 'active' : atrasado ? 'past_due' : cancelado ? 'canceled' : 'expired',
      current_period_end: fim,
      cancel_at_period_end: cancelado || item.autoRenewingPlan?.autoRenewEnabled === false,
      canceled_at: cancelado ? new Date().toISOString() : null,
      teste_ate: testeAte,
      origem: 'google_play',
      play_produto: String(item.productId || ''),
      updated_at: new Date().toISOString()
    }
  };
}

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  const log = (evento: string, extra: Record<string, unknown> = {}) =>
    console.error(JSON.stringify({ request_id: requestId, evento, ...extra }));
  if (req.method !== 'POST') return json({ erro: 'metodo' }, 405);
  if (!corpoCabeNoLimite(req, 16_384)) return json({ erro: 'corpo' }, 413);

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const servico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!url || !servico) return json({ erro: 'indisponivel' }, 503);
  const admin = createClient(url, servico, { auth: { persistSession: false, autoRefreshToken: false } });
  const segredo = new URL(req.url).searchParams.get('segredo');

  try {
    /* ---------- 2. notificação da Google ---------- */
    if (segredo !== null) {
      const esperado = Deno.env.get('OAZE_PLAY_RTDN_SEGREDO') || '';
      if (!esperado || segredo.length !== esperado.length
          || (await sha256(segredo)) !== (await sha256(esperado))) return json({ erro: 'segredo' }, 401);
      const limite = await reservarRateLimit(admin, 'play:rtdn', 'google', 600, 60);
      if (!limite.permitido) return json({ erro: 'limite' }, 429);
      const envelope = await req.json().catch(() => ({}));
      const dados = JSON.parse(atob(String(envelope?.message?.data || '')) || '{}');
      if (dados.packageName && dados.packageName !== PACOTE()) return json({ ok: true });
      const token = String(dados.subscriptionNotification?.purchaseToken || dados.voidedPurchaseNotification?.purchaseToken || '');
      if (!token) return json({ ok: true });   // teste do console ou aviso sem compra
      const hash = await sha256(token);
      const { data: atual } = await admin.from('subscriptions').select('user_id').eq('play_token_hash', hash).maybeSingle();
      if (!atual) { log('rtdn_sem_conta'); return json({ ok: true }); }
      const r = await consultar(token);
      const linha = dados.voidedPurchaseNotification || !r
        ? { plan_id: 'free', status: 'free', current_period_end: new Date().toISOString(), teste_ate: null, updated_at: new Date().toISOString() }
        : r.linha;
      await admin.from('subscriptions').update(linha).eq('user_id', atual.user_id).eq('play_token_hash', hash);
      log('rtdn_aplicada', { status: linha.status });
      return json({ ok: true });
    }

    /* ---------- 1. o app confirma a compra ---------- */
    const autorizacao = req.headers.get('Authorization') ?? '';
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: autorizacao } }, auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: auth } = await userClient.auth.getUser();
    const usuario = auth?.user;
    if (!usuario?.id) return json({ erro: 'sem_sessao', mensagem: 'Sua sessão expirou. Entre novamente.' }, 401);
    const limite = await reservarRateLimit(admin, 'play:verificar', usuario.id, 10, 60);
    if (!limite.permitido) return json({ erro: 'limite', mensagem: 'Muitas tentativas seguidas.' }, 429);

    const corpo = await req.json().catch(() => ({}));
    const extras = Object.keys(corpo || {}).filter((k) => !['acao', 'produto', 'token'].includes(k));
    const token = typeof corpo?.token === 'string' ? corpo.token.trim() : '';
    if (corpo?.acao !== 'verificar' || extras.length || !PRODUTOS[corpo?.produto] || !/^[\w.\-:]{20,600}$/.test(token)) {
      return json({ erro: 'pedido', mensagem: 'Pedido inválido.' }, 400);
    }

    const r = await consultar(token);
    if (!r || r.compra.lineItems?.[0]?.productId !== corpo.produto) {
      return json({ erro: 'compra', mensagem: 'A Google não confirmou esta compra.' }, 400);
    }
    /* A compra tem de ter sido aberta por ESTA conta. Sem isso, um
       token de outra pessoa (ou o mesmo token em duas contas)
       liberaria o plano para quem não pagou. */
    if (r.conta !== await sha256(usuario.id)) {
      log('play_conta_divergente');
      return json({ erro: 'conta', mensagem: 'Esta compra pertence a outra conta do OAZE.' }, 403);
    }
    const hash = await sha256(token);
    const { data: dono } = await admin.from('subscriptions').select('user_id').eq('play_token_hash', hash).maybeSingle();
    if (dono && dono.user_id !== usuario.id) return json({ erro: 'conta', mensagem: 'Esta compra pertence a outra conta do OAZE.' }, 403);

    /* Uma conta não paga duas vezes: com Stripe ativa, a compra da
       Play é recusada aqui (a Google estorna se não for reconhecida
       em 3 dias). */
    const { data: atual } = await admin.from('subscriptions')
      .select('status,origem,current_period_end,stripe_subscription_id').eq('user_id', usuario.id).maybeSingle();
    if (atual?.origem === 'stripe' && atual.status === 'active'
        && (!atual.current_period_end || new Date(atual.current_period_end) > new Date())) {
      return json({ erro: 'ja_assina', mensagem: 'Você já assina o Oásis pelo site. Esta compra não foi confirmada e a Google devolve o valor.' }, 409);
    }

    await admin.from('subscriptions').upsert({
      user_id: usuario.id, ...r.linha, play_token_hash: hash,
      stripe_subscription_id: null, asaas_subscription_id: null,
      current_period_start: new Date().toISOString()
    }, { onConflict: 'user_id' });

    /* Reconhecer a compra: sem isso a Google estorna em 3 dias. */
    if (r.compra.acknowledgementState !== 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED') {
      await play('POST', '/purchases/subscriptions/' + encodeURIComponent(corpo.produto)
        + '/tokens/' + encodeURIComponent(token) + ':acknowledge');
    }
    log('play_liberado', { ciclo: r.produto.ciclo, status: r.linha.status });
    return json({ ok: true, plano: r.linha.plan_id, status: r.linha.status, fim_periodo: r.linha.current_period_end });
  } catch (e) {
    const codigo = e instanceof Error ? e.message.slice(0, 60) : 'interno';
    log('falhou', { codigo });
    return json({ erro: codigo === 'play_nao_configurada' ? 'indisponivel' : 'falhou',
      mensagem: 'Não foi possível confirmar a compra agora. Tente de novo em instantes.', request_id: requestId }, 503);
  }
});
