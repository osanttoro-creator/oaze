# Assinatura OAZE no Google Play — configuração pendente

Em 26/10/2026, Jonatham confirmou que ainda não criou os produtos de assinatura no Play Console. O AAB destinado à loja deixa a compra Stripe indisponível; isso evita oferecer cobrança externa de uma assinatura digital dentro do app da Play.

## Criar no Play Console

1. Abra o app de pacote `site.oaze.app` no [Play Console](https://play.google.com/console/) e conclua o perfil de pagamentos do desenvolvedor, se for solicitado.
2. Em **Monetizar com o Google Play > Produtos > Assinaturas**, crie **uma assinatura** para Oásis. ID sugerido: `oaze_oasis`; nome visível: `OAZE Oásis`. O ID não pode ser alterado depois de criado, então confira antes de salvar.
3. Dentro da assinatura, crie dois **planos básicos** de renovação automática: `monthly` (período mensal) e `annual` (período anual). Para Brasil, use como referência os preços OAZE vigentes no backend em 26/10/2026: R$ 35,90 por mês e R$ 279,90 por ano. Confira impostos e o preço final mostrado pelo Console antes de ativar.
4. Salve e ative os dois planos. Não crie ofertas ou período grátis nesta fase; o OAZE ainda não anuncia nenhum desses benefícios.
5. Configure testadores de licença e um canal de teste do app. A primeira compra deve ser feita com conta de teste, nunca por uma cobrança real para descobrir se a integração funciona.
6. Forneça ao backend acesso à Google Play Developer API para consultar e confirmar compras. A credencial de serviço fica só no Supabase, jamais no APK ou no repositório. O app deve enviar o `purchaseToken` ao backend; o backend verifica produto, plano, estado e usuário, atualiza a assinatura da mesma conta OAZE e confirma a compra. Renovação, cancelamento, atraso e reembolso precisam refletir no acesso.

**Ainda não implementado:** cliente Play Billing, endpoint de verificação, notificações de tempo real do Google e associação dos produtos ao plano OAZE. Criar os produtos no Console por si só não liga a cobrança. A implementação e o teste integrado seguem após existirem os IDs finais e o acesso de API.

Referências oficiais: [criação de assinatura e planos básicos](https://support.google.com/googleplay/android-developer/answer/140504?hl=pt-BR), [política de pagamentos](https://support.google.com/googleplay/android-developer/answer/10281818?hl=pt-BR), [segurança e verificação de compras](https://developer.android.com/google/play/billing/security?hl=pt-br).
