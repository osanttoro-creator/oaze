-- 02/11/2026: leitor de QR da nota fiscal e importação de extrato,
-- comprovante e PDF passam a ser do Oásis. Recursos sim-ou-não,
-- lidos por meus_direitos() como os outros.
insert into public.plan_entitlements (plan_id, chave, tipo, limite, ativo)
select p.id, r.chave, 'recurso', null, p.id <> 'free'
  from public.plans p
 cross join (values ('leitor_qr_nfce'), ('importar_extrato')) as r(chave)
 where p.id in ('free', 'basic', 'pro')
   and not exists (select 1 from public.plan_entitlements e where e.plan_id = p.id and e.chave = r.chave);
