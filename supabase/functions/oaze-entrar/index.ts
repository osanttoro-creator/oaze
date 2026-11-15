/* =============================================================
   oaze-entrar — entrada por e-mail + PIN de 6 dígitos (14/11/2026)
   -------------------------------------------------------------
   Decisão de produto de 13/11/2026: a primeira entrada é pela conta
   Google, e nela a pessoa cria o PIN. Depois disso, entra com e-mail
   + PIN (ou com a biometria do aparelho, que só destrava a sessão já
   guardada). Esqueceu o PIN: entra pelo Google e cria outro.

   COMO FUNCIONA
     1. o app manda { email, pin };
     2. a função acha o usuário pelo e-mail (sem criar conta nova) e
        confere o PIN em oaze_cofre_verificar — a mesma rotina do
        cofre, com o mesmo bloqueio: 5 erros seguidos travam o PIN
        por 15 minutos;
     3. só com o PIN certo ela pede ao Supabase Auth um link mágico
        e devolve o token_hash dele; o app troca esse token por uma
        sessão com auth.verifyOtp. O token vale uma vez.

   O QUE ELA NÃO FAZ
     · não diz se o e-mail existe: a resposta de erro é sempre a mesma;
     · não cria conta nem PIN (isso é a primeira entrada, pelo Google);
     · não registra e-mail nem PIN em log.

   LIMITES, além do bloqueio do próprio PIN
     · por origem (IP): 20 tentativas a cada 15 minutos;
     · por e-mail: 10 tentativas a cada 15 minutos.

   verify_jwt = false: quem chama ainda não tem sessão. A proteção
   é a origem autorizada, os limites acima e o bloqueio do PIN.
   ============================================================= */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corpoCabeNoLimite, origemDoCliente, reservarRateLimit } from '../_shared/security.ts';

const origins = [...new Set([
  ...(Deno.env.get('OAZE_ALLOWED_ORIGINS') ?? '').split(',').map((x) => x.trim()).filter(Boolean),
  'http://tauri.localhost', 'tauri://localhost', 'http://localhost', 'https://localhost'
])];
const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && origins.includes(origin) ? origin : 'null',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', Vary: 'Origin'
});
const reply = (origin: string | null, status: number, body: unknown) => new Response(JSON.stringify(body), {
  status, headers: { ...cors(origin), 'content-type': 'application/json; charset=utf-8' }
});

/* Uma frase só para todo erro de credencial. Ela já ensina a saída
   (Google) sem revelar se o e-mail existe, se tem PIN ou se travou. */
const RECUSA = 'E-mail ou PIN incorretos. Depois de 5 erros o PIN fica bloqueado por 15 minutos. ' +
  'Se for sua primeira vez ou se esqueceu o PIN, entre com Google.';

/* Resposta de erro sempre depois de um tempo parecido, para o relógio
   não contar o que a mensagem esconde. */
async function recusar(origin: string | null, inicio: number) {
  const falta = 650 - (Date.now() - inicio);
  if (falta > 0) await new Promise((ok) => setTimeout(ok, falta));
  return reply(origin, 401, { mensagem: RECUSA });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin');
  const inicio = Date.now();
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) });
  if (req.method !== 'POST') return reply(origin, 405, { mensagem: 'Método não permitido.' });
  if (origin && !origins.includes(origin)) return reply(origin, 403, { mensagem: 'Origem não autorizada.' });
  if (!corpoCabeNoLimite(req, 2048)) return reply(origin, 413, { mensagem: 'Pedido inválido.' });

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!url || !service) return reply(origin, 503, { mensagem: 'Entrada por PIN indisponível agora. Use o Google.' });

  let email = '', pin = '';
  try {
    const raw = await req.text();
    if (new TextEncoder().encode(raw).length > 2048) return reply(origin, 413, { mensagem: 'Pedido inválido.' });
    const body = JSON.parse(raw);
    email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    pin = typeof body?.pin === 'string' ? body.pin : '';
  } catch { return reply(origin, 400, { mensagem: 'Pedido inválido.' }); }
  if (email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !/^\d{6}$/.test(pin))
    return reply(origin, 400, { mensagem: 'Informe o e-mail e o PIN de seis dígitos.' });

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const [porOrigem, porEmail] = await Promise.all([
      reservarRateLimit(admin, 'entrar:origem', origemDoCliente(req), 20, 900),
      reservarRateLimit(admin, 'entrar:email', email, 10, 900)
    ]);
    if (!porOrigem.permitido || !porEmail.permitido)
      return reply(origin, 429, { mensagem: 'Muitas tentativas. Aguarde 15 minutos ou entre com Google.' });
  } catch { return reply(origin, 503, { mensagem: 'Entrada por PIN indisponível agora. Use o Google.' }); }

  try {
    const { data: userId, error: buscaErro } = await admin.rpc('oaze_usuario_por_email', { p_email: email });
    if (buscaErro) throw buscaErro;
    if (!userId) return recusar(origin, inicio);

    const { data: confere, error: pinErro } = await admin.rpc('oaze_cofre_verificar', { p_user_id: userId, p_pin: pin });
    if (pinErro) throw pinErro;
    if (!confere) return recusar(origin, inicio);

    /* PIN certo: só agora nasce o token de entrada. */
    const { data: link, error: linkErro } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
    const tokenHash = link?.properties?.hashed_token;
    if (linkErro || !tokenHash || link?.user?.id !== userId) throw linkErro ?? new Error('link');
    return reply(origin, 200, { token_hash: tokenHash });
  } catch (error) {
    console.error(JSON.stringify({ evento: 'entrar_falhou', tipo: error instanceof Error ? error.name : 'desconhecido' }));
    return reply(origin, 503, { mensagem: 'Entrada por PIN indisponível agora. Use o Google.' });
  }
});
