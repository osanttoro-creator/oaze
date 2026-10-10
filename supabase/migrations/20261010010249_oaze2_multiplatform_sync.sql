-- ============================================================================
-- OAZE 2 — conta e sincronização entre Android, iPhone, Windows e Mac
--
-- Decisão D4 em oaze-app/docs/11-ARQUITETURA.md. Pontos que esta migração
-- resolve, e por que estão escritos assim:
--
--  * NÃO toca em `dados` nem nas tabelas normalizadas do OAZE 1. O OAZE 1
--    continua no ar com usuários reais; publicar o v2 não pode depender de
--    migrar o v1 primeiro. O `dados` passa a ser, para o v2, apenas origem de
--    migração.
--  * Um registro por espaço de trabalho, com `rev` que só cresce. A gravação é
--    por RPC, nunca por UPDATE direto: só assim a comparação de revisão e o
--    incremento acontecem na mesma transação.
--  * RLS em tudo, por `auth.uid()`. Nenhuma política permissiva, nenhum
--    `using (true)`.
-- ============================================================================

-- ------------------------------------------------------------------ espaços
create table if not exists public.oaze2_spaces (
  id          text        not null,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  -- começa em 0 e sobe de 1 em 1 a cada gravação aceita
  rev         bigint      not null default 0,
  payload     jsonb       not null,
  updated_at  timestamptz not null default now(),
  -- exclusão é marca, nunca DELETE: um aparelho offline ressuscitaria o espaço
  deleted_at  timestamptz,
  primary key (user_id, id)
);

comment on table public.oaze2_spaces is
  'Um espaço de trabalho do OAZE 2 por registro. payload é o envelope { format, space, tomb }.';
comment on column public.oaze2_spaces.rev is
  'Revisão otimista. O cliente manda a que tem em mão; divergência devolve a versão do servidor em vez de sobrescrever.';

create index if not exists oaze2_spaces_user_updated
  on public.oaze2_spaces (user_id, updated_at desc)
  where deleted_at is null;

alter table public.oaze2_spaces enable row level security;

drop policy if exists oaze2_spaces_select on public.oaze2_spaces;
create policy oaze2_spaces_select on public.oaze2_spaces
  for select to authenticated using ((select auth.uid()) = user_id);

-- Impede escrita direta: toda alteração de rev precisa passar pela RPC.
drop policy if exists oaze2_spaces_insert on public.oaze2_spaces;
drop policy if exists oaze2_spaces_update on public.oaze2_spaces;
revoke all on public.oaze2_spaces from public, anon, authenticated;
grant select on public.oaze2_spaces to authenticated;

-- Sem policy de DELETE de propósito: apagar é marcar `deleted_at`.

-- ----------------------------------------------------------------- aparelhos
create table if not exists public.oaze2_devices (
  id          text        not null,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  platform    text        not null check (platform in ('ios', 'android', 'windows', 'macos', 'web')),
  label       text,
  last_seen   timestamptz not null default now(),
  primary key (user_id, id)
);

comment on table public.oaze2_devices is
  'Aparelhos que entraram nesta conta. Serve a "sair dos outros aparelhos" e ao desempate de carimbo.';

alter table public.oaze2_devices enable row level security;

drop policy if exists oaze2_devices_all on public.oaze2_devices;
create policy oaze2_devices_all on public.oaze2_devices
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.oaze2_devices from public, anon, authenticated;
grant select, insert, update, delete on public.oaze2_devices to authenticated;

-- --------------------------------------------------------------- preferências
create table if not exists public.oaze2_prefs (
  user_id     uuid        primary key references auth.users (id) on delete cascade,
  payload     jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

comment on table public.oaze2_prefs is
  'Preferências e consentimentos que acompanham a conta. Nunca guarda PIN nem material de chave.';

alter table public.oaze2_prefs enable row level security;

drop policy if exists oaze2_prefs_all on public.oaze2_prefs;
create policy oaze2_prefs_all on public.oaze2_prefs
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.oaze2_prefs from public, anon, authenticated;
grant select, insert, update, delete on public.oaze2_prefs to authenticated;

-- ============================================================================
-- Gravação com revisão otimista
--
-- Devolve sempre { ok, rev, payload }:
--   ok = true   gravou; `rev` é a nova e `payload` é o que ficou valendo
--   ok = false  a revisão não bate; `payload` é a versão DO SERVIDOR, para o
--               cliente reaplicar as operações pendentes em cima dela
--
-- `security definer` com `search_path` fixo: sem fixar, um schema no caminho do
-- chamador poderia sombrear `public` e a função passaria a escrever em outro
-- lugar. O filtro por `auth.uid()` continua dentro da função, então definer não
-- afrouxa nada.
-- ============================================================================
create or replace function public.oaze2_save_space(
  p_id           text,
  p_expected_rev bigint,
  p_payload      jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_rev  bigint;
  v_cur  jsonb;
begin
  if v_user is null then
    raise exception 'sem sessão';
  end if;

  if p_id is null or length(p_id) = 0 or length(p_id) > 64 then
    raise exception 'identificador de espaço inválido';
  end if;

  -- teto de tamanho: um envelope absurdo é bug do cliente, e aceitar derruba o
  -- banco em vez de derrubar o bug
  if pg_column_size(p_payload) > 12 * 1024 * 1024 then
    raise exception 'espaço grande demais para sincronizar';
  end if;

  if p_payload->>'format' is distinct from '2' then
    raise exception 'formato de envelope desconhecido';
  end if;
  if p_payload->'space'->>'id' is distinct from p_id then
    raise exception 'envelope não corresponde ao espaço';
  end if;

  -- A trava por chave também serializa a criação, quando ainda não há linha.
  perform pg_advisory_xact_lock(hashtextextended(v_user::text || ':' || p_id, 0));

  -- A trava de linha cobre as versões já existentes.
  select rev, payload into v_rev, v_cur
    from public.oaze2_spaces
   where user_id = v_user and id = p_id
     for update;

  if not found then
    if coalesce(p_expected_rev, 0) <> 0 then
      -- o cliente acha que existe e não existe: devolver vazio deixa ele
      -- decidir, e é melhor do que criar silenciosamente com revisão errada
      return jsonb_build_object('ok', false, 'rev', 0, 'payload', null);
    end if;
    insert into public.oaze2_spaces (id, user_id, rev, payload)
    values (p_id, v_user, 1, p_payload);
    return jsonb_build_object('ok', true, 'rev', 1, 'payload', p_payload);
  end if;

  if v_rev <> coalesce(p_expected_rev, -1) then
    return jsonb_build_object('ok', false, 'rev', v_rev, 'payload', v_cur);
  end if;

  update public.oaze2_spaces
     set payload    = p_payload,
         rev        = v_rev + 1,
         updated_at = now(),
         deleted_at = null
   where user_id = v_user and id = p_id;

  return jsonb_build_object('ok', true, 'rev', v_rev + 1, 'payload', p_payload);
end;
$$;

revoke all on function public.oaze2_save_space(text, bigint, jsonb) from public, anon;
grant execute on function public.oaze2_save_space(text, bigint, jsonb) to authenticated;

-- ---------------------------------------------------------- apagar um espaço
create or replace function public.oaze2_delete_space(p_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'sem sessão';
  end if;
  update public.oaze2_spaces
     set deleted_at = now(), rev = rev + 1, updated_at = now()
   where user_id = v_user and id = p_id;
end;
$$;

revoke all on function public.oaze2_delete_space(text) from public, anon;
grant execute on function public.oaze2_delete_space(text) to authenticated;

-- ------------------------------------------------------- registrar o aparelho
create or replace function public.oaze2_touch_device(
  p_id       text,
  p_platform text,
  p_label    text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'sem sessão';
  end if;
  insert into public.oaze2_devices (id, user_id, platform, label, last_seen)
  values (p_id, v_user, p_platform, left(coalesce(p_label, ''), 60), now())
  on conflict (user_id, id)
    do update set last_seen = now(), label = excluded.label, platform = excluded.platform;
end;
$$;

revoke all on function public.oaze2_touch_device(text, text, text) from public, anon;
grant execute on function public.oaze2_touch_device(text, text, text) to authenticated;

-- ---------------------------------------------------- tokens de push
-- Um token por aparelho. O aviso em si é disparado por função de servidor com a
-- chave do FCM e o certificado da APNs — segredos que nunca chegam ao cliente.
--
-- O push do OAZE não carrega valor nem nome: leva tipo e identificador, e o
-- aparelho lê o dado dele mesmo. Mandar o saldo pronto exporia o número ao
-- provedor de push, que é um terceiro fora do acordo de tratamento de dados.
create table if not exists public.oaze2_push_tokens (
  device_id   text        not null,
  user_id     uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  platform    text        not null check (platform in ('ios', 'android')),
  token       text        not null,
  updated_at  timestamptz not null default now(),
  primary key (user_id, device_id)
);

create index if not exists oaze2_push_tokens_user on public.oaze2_push_tokens (user_id);

alter table public.oaze2_push_tokens enable row level security;

drop policy if exists oaze2_push_tokens_all on public.oaze2_push_tokens;
create policy oaze2_push_tokens_all on public.oaze2_push_tokens
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.oaze2_push_tokens from public, anon, authenticated;
grant select, insert, update, delete on public.oaze2_push_tokens to authenticated;
