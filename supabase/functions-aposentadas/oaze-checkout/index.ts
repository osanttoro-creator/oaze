/* oaze-checkout - comeca uma compra.
   O navegador manda { plano, ciclo } e nada mais: o valor e lido de
   plan_prices aqui dentro. Esta funcao NAO ativa plano; quem ativa
   e o webhook, depois de conferir assinatura e reconsultar. */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const MP_API = 'https://api.mercadopago.com';

function origensPermitidas(): string[] {
  return (Deno.env.get('OAZE_ALLOWED_ORIGINS') ?? '')
    .split(',').map((o) => o.trim()).filter(Boolean);
}

function cors(origem: string | null): Record<string, string> {
  const ok = origem && origensPermitidas().includes(origem);
  return {
    'Access-Control-Allow-Origin': ok ? origem! : 'null',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin'
  };
}

function json(corpo: unknown, status: number, origem: string | null) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cors(origem), 'content-type': 'application/json; charset=utf-8' }
  });
}

Deno.serve(async (req: Request) => {
  const origem = req.headers.get('Origin');
  const requestId = crypto.randomUUID();

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origem) });
  if (req.method !== 'POST') {
    return json({ erro: 'metodo', mensagem: 'Metodo nao permitido.' }, 405, origem);
  }
  if (origem && !origensPermitidas().includes(origem)) {
    return json({ erro: 'origem', mensagem: 'Origem nao autorizada.' }, 403, origem);
  }

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const servico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const mpToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') ?? '';
  const siteUrl = Deno.env.get('OAZE_SITE_URL') ?? '';

  if (!url || !servico) {
    return json({ erro: 'indisponivel', mensagem: 'Operacao indisponivel no momento.' }, 503, origem);
  }

  if (!mpToken) {
    return json({
      erro: 'nao_configurado',
      mensagem: 'O pagamento ainda nao esta disponivel. Nenhuma cobranca foi feita.'
    }, 503, origem);
  }

  const autorizacao = req.headers.get('Authorization') ?? '';
  if (!autorizacao.startsWith('Bearer ')) {
    return json({ erro: 'sem_sessao', mensagem: 'Entre na sua conta para assinar.' }, 401, origem);
  }

  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: autorizacao } },
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: auth, error: erroAuth } = await userClient.auth.getUser();
  if (erroAuth || !auth?.user) {
    return json({ erro: 'sem_sessao', mensagem: 'Sua sessao expirou. Entre novamente.' }, 401, origem);
  }
  const usuario = auth.user;

  let corpo: any = null;
  try { corpo = await req.json(); } catch { /* segue nulo */ }

  const plano = String(corpo?.plano || '');
  const ciclo = String(corpo?.ciclo || 'monthly');

  if (!['basic', 'pro'].includes(plano)) {
    return json({ erro: 'plano', mensagem: 'Plano invalido.' }, 400, origem);
  }
  if (!['monthly', 'annual'].includes(ciclo)) {
    return json({ erro: 'ciclo', mensagem: 'Ciclo invalido.' }, 400, origem);
  }
  if (corpo && (corpo.centavos !== undefined || corpo.valor !== undefined || corpo.preco !== undefined)) {
    return json({
      erro: 'preco_no_corpo',
      mensagem: 'O valor nao e enviado pelo navegador. Ele e determinado no servidor.'
    }, 400, origem);
  }

  const admin = createClient(url, servico, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: preco, error: erroPreco } = await admin.from('plan_prices')
    .select('id, centavos, moeda, versao')
    .eq('plan_id', plano).eq('ciclo', ciclo).eq('vigente', true)
    .maybeSingle();

  if (erroPreco || !preco || !preco.centavos) {
    return json({ erro: 'preco', mensagem: 'Nao foi possivel calcular o valor. Nada foi cobrado.' }, 500, origem);
  }

  const { data: assinatura } = await admin.from('subscriptions')
    .select('plan_id, billing_cycle, status').eq('user_id', usuario.id).maybeSingle();

  if (assinatura?.status === 'active' &&
      assinatura.plan_id === plano && assinatura.billing_cycle === ciclo) {
    return json({ erro: 'ja_assinante', mensagem: 'Voce ja assina este plano neste ciclo.' }, 409, origem);
  }

  const { data: intencao, error: erroInt } = await admin.from('checkout_intencoes')
    .insert({
      user_id: usuario.id,
      plan_id: plano,
      billing_cycle: ciclo,
      price_id: preco.id,
      centavos: preco.centavos,
      price_version: preco.versao,
      moeda: preco.moeda,
      provider: 'mercadopago'
    })
    .select('id').single();

  if (erroInt || !intencao) {
    return json({ erro: 'indisponivel', mensagem: 'Nao foi possivel iniciar a compra agora.' }, 503, origem);
  }

  const titulo = plano === 'pro' ? 'OAZE Pro' : 'OAZE Basic';
  const periodo = ciclo === 'annual' ? 'anual' : 'mensal';

  const preferencia: Record<string, unknown> = {
    items: [{
      id: preco.id,
      title: titulo + ' - assinatura ' + periodo,
      quantity: 1,
      currency_id: preco.moeda,
      unit_price: preco.centavos / 100
    }],
    payer: { email: usuario.email },
    external_reference: intencao.id,
    statement_descriptor: 'OAZE'
  };

  if (siteUrl) {
    preferencia.back_urls = {
      success: siteUrl + '/app/assinatura?retorno=ok',
      pending: siteUrl + '/app/assinatura?retorno=pendente',
      failure: siteUrl + '/app/assinatura?retorno=falhou'
    };
    preferencia.notification_url = url + '/functions/v1/oaze-mp-webhook';
  }

  let resposta: Response;
  try {
    resposta = await fetch(MP_API + '/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + mpToken,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': intencao.id
      },
      body: JSON.stringify(preferencia)
    });
  } catch (e) {
    return json({ erro: 'provedor', mensagem: 'O pagamento esta indisponivel agora. Nada foi cobrado.' }, 502, origem);
  }

  if (!resposta.ok) {
    console.error(JSON.stringify({ request_id: requestId, evento: 'mp_recusou', status: resposta.status }));
    return json({
      erro: 'provedor', mensagem: 'Nao foi possivel iniciar o pagamento. Nada foi cobrado.',
      request_id: requestId
    }, 502, origem);
  }

  const pref = await resposta.json();

  await admin.from('checkout_intencoes')
    .update({ external_preference_id: String(pref.id) })
    .eq('id', intencao.id);

  return json({
    ok: true,
    intencao: intencao.id,
    plano, ciclo,
    centavos: preco.centavos,
    url: pref.init_point,
    url_sandbox: pref.sandbox_init_point,
    request_id: requestId
  }, 200, origem);
});
