/* oaze-asaas-webhook — APOSENTADA em 14/11/2026.
   Era o aviso de pagamento do Asaas. Nunca houve assinatura por ele:
   as tabelas asaas_* estão vazias. O OAZE cobra pela Stripe (site e
   Windows) e pela Google Play (Android). Esta rota responde 410 para
   deixar claro que o endereço acabou. O código antigo está guardado em
   supabase/functions-aposentadas/ no projeto. Pode ser apagada no painel. */
Deno.serve(() => new Response(JSON.stringify({ erro: 'aposentada', mensagem: 'Este endereço foi desativado.' }), {
  status: 410,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
}));
