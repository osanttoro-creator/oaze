-- =============================================================
-- Entrada por e-mail + PIN e redefinição do PIN (14/11/2026)
-- -------------------------------------------------------------
-- Decisão de produto de 13/11/2026:
--   · primeira vez: conta Google e criação do PIN de 6 dígitos;
--   · depois: e-mail + PIN, ou a biometria do aparelho;
--   · esqueceu o PIN: entra pelo Google e cria outro.
--
-- O bloqueio (5 erros seguidos travam o PIN por 15 minutos) já
-- existe em oaze_cofre_verificar, de 03/10/2026. Aqui entram só as
-- duas peças que faltavam, ambas restritas à service_role:
--   1. achar o usuário pelo e-mail sem criar conta nova;
--   2. trocar o PIN de quem acabou de provar a identidade no Google.
--
-- AINDA NÃO APLICADA NO BANCO. Aplicar junto com a publicação das
-- funções oaze-entrar e oaze-cofre.
-- =============================================================

create or replace function public.oaze_usuario_por_email(p_email text)
returns uuid
language sql stable security definer set search_path = pg_catalog, auth, public
as $$
  select u.id
  from auth.users u
  where lower(u.email) = lower(btrim(p_email))
    and u.email_confirmed_at is not null
    and u.deleted_at is null
  limit 1;
$$;

create or replace function public.oaze_cofre_redefinir(p_user_id uuid, p_pin text)
returns boolean
language plpgsql security definer set search_path = pg_catalog, public, extensions
as $$
begin
  if p_user_id is null or p_pin !~ '^[0-9]{6}$' then return false; end if;
  -- Só troca o PIN de quem já tem cofre. O conteúdo cifrado não muda:
  -- ele é protegido pela chave do servidor, não pelo PIN.
  update public.oaze_cofre
  set pin_hash = crypt(p_pin, gen_salt('bf', 12)),
      failed_attempts = 0,
      locked_until = null
  where user_id = p_user_id;
  return found;
end;
$$;

revoke all on function public.oaze_usuario_por_email(text) from public, anon, authenticated;
revoke all on function public.oaze_cofre_redefinir(uuid, text) from public, anon, authenticated;
grant execute on function public.oaze_usuario_por_email(text) to service_role;
grant execute on function public.oaze_cofre_redefinir(uuid, text) to service_role;
