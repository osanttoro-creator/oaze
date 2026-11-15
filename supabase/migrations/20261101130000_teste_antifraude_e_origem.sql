-- =============================================================
-- Teste grátis de 30 dias com nota de risco + origem da assinatura
-- (01/11/2026)
--
-- 1. SINCRONIZAÇÃO ENTRE APARELHOS
--    O plano mora em public.subscriptions, uma linha por user_id.
--    Web, Windows e Android leem a MESMA linha por meus_direitos(),
--    então quem paga em um aparelho tem o plano em todos, desde que
--    entre com a mesma conta. A coluna "origem" só diz ONDE foi pago
--    (para saber quem cancela e quem reembolsa), nunca ONDE vale.
--
-- 2. NOTA DE RISCO DO TESTE GRÁTIS
--    Pontos somados por sinais de que a mesma pessoa já usou o teste
--    com outra conta: mesmo aparelho, mesma rede (IP), mesmo e-mail
--    canônico e mesmo cartão. Tudo é guardado só como hash com sal
--    (o servidor nunca grava IP, cartão ou id de aparelho em claro).
--      0–29  baixa  → teste sem pedir cartão
--      30–59 média  → teste só com cartão
--      60+   alta   → sem teste (pode assinar normalmente)
--    O navegador não lê nem escreve nada aqui: só a service_role.
-- =============================================================

-- ---------- 1 · origem da assinatura ----------
alter table public.subscriptions
  add column if not exists origem text not null default 'nenhuma',
  add column if not exists teste_ate timestamptz,
  add column if not exists play_token_hash text,
  add column if not exists play_produto text;

alter table public.subscriptions drop constraint if exists subscriptions_origem_ck;
alter table public.subscriptions add constraint subscriptions_origem_ck
  check (origem in ('nenhuma', 'stripe', 'google_play', 'app_store', 'asaas', 'manual'));

update public.subscriptions set origem = 'stripe'
  where origem = 'nenhuma' and stripe_subscription_id is not null;
update public.subscriptions set origem = 'asaas'
  where origem = 'nenhuma' and asaas_subscription_id is not null;

create unique index if not exists subscriptions_play_token_uk
  on public.subscriptions (play_token_hash) where play_token_hash is not null;

comment on table public.subscriptions is
  'Plano por usuário (uma linha por user_id). Vale em TODOS os aparelhos da conta: web, Windows e Android leem esta linha por meus_direitos(). Só os webhooks/funções de servidor escrevem; o cliente apenas lê a própria linha.';
comment on column public.subscriptions.origem is
  'Onde a assinatura foi paga: stripe (site/Windows/Android fora da Play), google_play, app_store, asaas (legado) ou manual. Não limita onde o plano vale.';
comment on column public.subscriptions.teste_ate is
  'Fim do teste grátis, quando a assinatura começou em teste. Nulo fora do teste.';
comment on column public.subscriptions.play_token_hash is
  'SHA-256 do purchaseToken da Google Play. Impede que um mesmo token libere duas contas.';

-- meus_direitos() passa a contar também de onde veio e se é teste.
create or replace function public.meus_direitos()
returns jsonb language sql stable set search_path = '' as $function$
  with assinatura as (
    select
      case when s.status in ('active', 'past_due', 'canceled')
         and (s.current_period_end is null or s.current_period_end > now())
        then s.plan_id else 'free' end as plano,
      s.plan_id as plano_contratado, s.status, s.billing_cycle,
      s.current_period_end, s.cancel_at_period_end, s.origem, s.teste_ate
    from public.subscriptions s
    where s.user_id = (select auth.uid())
  ), efetivo as (
    select coalesce((select plano from assinatura), 'free') as plano
  ), anuncios as (
    select
      coalesce(sum(r.lancamentos) filter (where r.mes = to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM')), 0)::int as liberados_mes,
      count(*) filter (where r.dia = (now() at time zone 'America/Sao_Paulo')::date)::int as hoje
    from public.anuncio_recompensas r
    where r.user_id = (select auth.uid())
  ), base as (
    select coalesce((select jsonb_object_agg(e.chave, e.limite) from public.plan_entitlements e
      where e.tipo = 'limite' and e.plan_id = (select plano from efetivo)), '{}'::jsonb) as limites
  )
  select jsonb_build_object(
    'plano',            (select plano from efetivo),
    'plano_contratado', (select plano_contratado from assinatura),
    'status',           coalesce((select status from assinatura), 'free'),
    'ciclo',            (select billing_cycle from assinatura),
    'fim_periodo',      (select current_period_end from assinatura),
    'cancela_no_fim',   coalesce((select cancel_at_period_end from assinatura), false),
    'origem',           coalesce((select origem from assinatura), 'nenhuma'),
    'em_teste',         coalesce((select teste_ate > now() from assinatura), false),
    'teste_ate',        (select teste_ate from assinatura),
    'limites', case
      when (select limites from base) ? 'transactions_per_month'
       and (select limites from base)->>'transactions_per_month' is not null
      then jsonb_set((select limites from base), '{transactions_per_month}',
        to_jsonb(((select limites from base)->>'transactions_per_month')::int + (select liberados_mes from anuncios)))
      else (select limites from base) end,
    'recursos', coalesce((select jsonb_object_agg(e.chave, e.ativo) from public.plan_entitlements e
      where e.tipo = 'recurso' and e.plan_id = (select plano from efetivo)), '{}'::jsonb),
    'anuncios', jsonb_build_object(
      'hoje', (select hoje from anuncios),
      'max_dia', coalesce((select (limites->>'anuncios_por_dia')::int from base), 0),
      'por_anuncio', coalesce((select (limites->>'lancamentos_por_anuncio')::int from base), 0),
      'liberados_mes', (select liberados_mes from anuncios))
  );
$function$;

-- ---------- 2 · sinais do teste grátis ----------
create table if not exists public.teste_sinais (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  aparelho_hash text,
  tracos_hash   text,
  ip_hash       text,
  email_hash    text,
  pontos        int  not null default 0,
  nota          text not null check (nota in ('baixa', 'media', 'alta')),
  decisao       text not null check (decisao in ('sem_cartao', 'com_cartao', 'negado', 'cartao_repetido')),
  motivos       text[] not null default '{}',
  created_at    timestamptz not null default now()
);
create index if not exists teste_sinais_aparelho_ix on public.teste_sinais (aparelho_hash) where aparelho_hash is not null;
create index if not exists teste_sinais_tracos_ix   on public.teste_sinais (tracos_hash)   where tracos_hash is not null;
create index if not exists teste_sinais_ip_ix       on public.teste_sinais (ip_hash, created_at) where ip_hash is not null;
create index if not exists teste_sinais_email_ix    on public.teste_sinais (email_hash)    where email_hash is not null;
create index if not exists teste_sinais_user_ix     on public.teste_sinais (user_id, created_at desc);

comment on table public.teste_sinais is
  'Uma linha por pedido de teste grátis: hashes (com sal) de aparelho, traços do navegador, IP e e-mail canônico, e a nota de risco. Só a service_role acessa. Linhas com mais de 400 dias são apagadas por pontuar_teste().';

-- Cartões já vistos em qualquer assinatura (teste ou paga), por hash
-- do fingerprint da Stripe. Um cartão = uma pessoa para fins de teste.
create table if not exists public.teste_cartoes (
  cartao_hash text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);
comment on table public.teste_cartoes is
  'Hash do card.fingerprint da Stripe → primeira conta que usou o cartão. Um cartão já visto em outra conta encerra o teste grátis.';

alter table public.teste_sinais  enable row level security;
alter table public.teste_cartoes enable row level security;
revoke all on public.teste_sinais  from anon, authenticated;
revoke all on public.teste_cartoes from anon, authenticated;

-- ---------- 3 · a nota ----------
-- Soma os pontos contra os pedidos de OUTRAS contas. A pessoa que
-- pede de novo do mesmo aparelho não pontua contra si mesma, mas uma
-- nota alta anterior dela continua valendo (limpar o navegador não
-- zera a nota).
create or replace function public.pontuar_teste(
  p_user uuid, p_aparelho text, p_tracos text, p_ip text, p_email text
) returns jsonb
language plpgsql security definer set search_path = '' as $function$
declare
  v_pontos int := 0;
  v_motivos text[] := '{}';
  v_n int;
  v_nota text;
begin
  delete from public.teste_sinais where created_at < now() - interval '400 days';

  if p_aparelho is not null then
    select count(distinct user_id) into v_n from public.teste_sinais
      where aparelho_hash = p_aparelho and user_id <> p_user;
    if v_n >= 2 then v_pontos := v_pontos + 60; v_motivos := array_append(v_motivos, 'aparelho_varias_contas');
    elsif v_n = 1 then v_pontos := v_pontos + 40; v_motivos := array_append(v_motivos, 'aparelho_repetido'); end if;
  end if;

  if p_tracos is not null then
    select count(distinct user_id) into v_n from public.teste_sinais
      where tracos_hash = p_tracos and user_id <> p_user
        and created_at > now() - interval '90 days';
    if v_n >= 1 then v_pontos := v_pontos + 15; v_motivos := array_append(v_motivos, 'navegador_igual'); end if;
  end if;

  -- IP pesa menos: rede de celular e Wi-Fi de empresa juntam muita gente.
  if p_ip is not null then
    select count(distinct user_id) into v_n from public.teste_sinais
      where ip_hash = p_ip and user_id <> p_user
        and created_at > now() - interval '30 days';
    if v_n >= 3 then v_pontos := v_pontos + 40; v_motivos := array_append(v_motivos, 'ip_varias_contas');
    elsif v_n = 2 then v_pontos := v_pontos + 25; v_motivos := array_append(v_motivos, 'ip_repetido');
    elsif v_n = 1 then v_pontos := v_pontos + 15; v_motivos := array_append(v_motivos, 'ip_repetido'); end if;
  end if;

  if p_email is not null then
    select count(*) into v_n from public.teste_sinais
      where email_hash = p_email and user_id <> p_user;
    if v_n >= 1 then v_pontos := v_pontos + 40; v_motivos := array_append(v_motivos, 'email_variacao'); end if;
  end if;

  if exists (select 1 from public.teste_sinais
             where user_id = p_user and nota = 'alta') then
    v_pontos := greatest(v_pontos, 60); v_motivos := array_append(v_motivos, 'nota_alta_anterior');
  end if;

  v_nota := case when v_pontos >= 60 then 'alta' when v_pontos >= 30 then 'media' else 'baixa' end;
  return jsonb_build_object('pontos', v_pontos, 'nota', v_nota, 'motivos', to_jsonb(v_motivos));
end;
$function$;

revoke all on function public.pontuar_teste(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.pontuar_teste(uuid, text, text, text, text) to service_role;
