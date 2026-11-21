import { createClient } from 'jsr:@supabase/supabase-js@2';

// The portal is created server-side. Neither a Stripe key nor a customer ID
// is accepted from the app. The authenticated user's subscription is the
// only source for the Stripe subscription ID.
const allowedOrigins = new Set([
  'https://oaze.site',
  'https://www.oaze.site',
  'https://localhost',
  'http://localhost',
  'http://tauri.localhost',
  'tauri://localhost',
]);

function headers(origin: string | null): HeadersInit {
  return {
    'access-control-allow-origin': origin && allowedOrigins.has(origin) ? origin : 'null',
    'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
    'access-control-allow-methods': 'POST, OPTIONS',
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
    vary: 'Origin',
  };
}

function reply(origin: string | null, status: number, mensagem: string, url?: string): Response {
  return new Response(JSON.stringify(url ? { url } : { mensagem }), { status, headers: headers(origin) });
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin');
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers(origin) });
  if (request.method !== 'POST' || (origin && !allowedOrigins.has(origin))) {
    return reply(origin, 403, 'Origem não permitida.');
  }
  if (Number(request.headers.get('content-length') || '0') > 256) {
    return reply(origin, 413, 'Solicitação inválida.');
  }
  let payload: unknown;
  try { payload = await request.json(); } catch { return reply(origin, 400, 'Solicitação inválida.'); }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return reply(origin, 400, 'Solicitação inválida.');
  const fields = Object.keys(payload);
  if (fields.some((field) => field !== 'canal') ||
      (fields.includes('canal') && ((payload as { canal?: unknown }).canal !== 'windows' ||
        !['http://tauri.localhost', 'tauri://localhost'].includes(origin || '')))) {
    return reply(origin, 400, 'Canal de retorno inválido.');
  }
  const retornoWindows = fields.includes('canal');
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return reply(origin, 401, 'Entre na sua conta novamente.');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!supabaseUrl || !anonKey || !stripeKey) return reply(origin, 503, 'Cobrança indisponível no momento.');

  try {
    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: auth, error: authError } = await client.auth.getUser(token);
    if (authError || !auth.user) return reply(origin, 401, 'Entre na sua conta novamente.');

    const { data: subscription, error: subscriptionError } = await client
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', auth.user.id)
      .maybeSingle();
    if (subscriptionError) return reply(origin, 503, 'Não foi possível consultar sua assinatura.');
    const id = subscription?.stripe_subscription_id;
    if (typeof id !== 'string' || !/^sub_[a-zA-Z0-9]+$/.test(id)) {
      return reply(origin, 400, 'Esta assinatura não usa a Stripe. Consulte o suporte.');
    }

    const stripeHeaders = { authorization: `Bearer ${stripeKey}` };
    const subResponse = await fetch(`https://api.stripe.com/v1/subscriptions/${id}`, {
      headers: stripeHeaders,
    });
    const stripeSubscription = await subResponse.json();
    if (!subResponse.ok || typeof stripeSubscription.customer !== 'string' ||
        !/^cus_[a-zA-Z0-9]+$/.test(stripeSubscription.customer)) {
      return reply(origin, 503, 'Não foi possível consultar a cobrança na Stripe.');
    }

    const body = new URLSearchParams({
      customer: stripeSubscription.customer,
      return_url: retornoWindows ? 'https://oaze.site/retorno-app.html?resultado=portal' : 'https://oaze.site/app/planos',
    });
    const portalResponse = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: { ...stripeHeaders, 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    const portal = await portalResponse.json();
    if (!portalResponse.ok || typeof portal.url !== 'string' ||
        !/^https:\/\/billing\.stripe\.com\//.test(portal.url)) {
      return reply(origin, 503, 'Portal de cobrança indisponível. Tente novamente.');
    }
    return reply(origin, 200, '', portal.url);
  } catch {
    return reply(origin, 503, 'Não foi possível abrir suas cobranças agora.');
  }
});
