# Entrada, cobrança, avisos e aparelhos dobráveis

## O que esta revisão entrega

- Entrada: apresentação breve na primeira visita da sessão e indicador enquanto a conta existente é conferida ou a senha é validada. A opção de pular evita bloquear a entrada. Redução de movimento desliga a animação.
- Área superior: o painel e a entrada respeitam os recortes e barras do sistema. A interface reorganiza colunas quando a janela de um aparelho fold/flip muda de tamanho; a folha considera segmentos de viewport quando o navegador os oferece.
- Assinatura: a tela mostra ciclo, fim do período e provedor da cobrança. Preços exibidos em BRL foram comparados aos preços vigentes em `public.plan_prices` em 26/10/2026. A Stripe confirma o valor final antes da compra.
- Cartão e histórico de cobranças: assinantes Stripe do APK distribuído diretamente e do Windows abrem o portal da Stripe via função autenticada `oaze-billing-portal`. A função obtém o cliente a partir da assinatura do usuário; o app nunca recebe chave secreta nem número completo do cartão. O portal padrão da Stripe precisa estar configurado para permitir as ações desejadas.
- Google Play: o workflow de AAB define `VITE_OAZE_DISTRIBUTION=play`. Este pacote consulta o plano, mas não oferece checkout ou portal externo da Stripe. A venda dentro da versão Play requer integração de Google Play Billing ou programa permitido aplicável. O APK distribuído fora da Play continua com Stripe.
- Avisos: o sino abre lembretes dos próximos 30 dias. Android e Windows oferecem ativação contextual de notificações do sistema; o texto no sistema omite valores financeiros. A preferência é deste aparelho. No desktop, avisos programados só aparecem com o app aberto. Android pode atrasá-los por economia de bateria.
- Permissões: a tela de configurações explica microfone, arquivos, biometria e notificações. A permissão de notificações é solicitada apenas ao tocar em ativar.
- Fundo: a animação WebGL ganhou menos ruído visual e teto de atualização mais fluido. Ela pausa fora de vista e respeita reduzir movimento. Não há arquivo de vídeo usado no fundo atual.

## Fluxo Adobe para mídia do OAZE

Os arquivos de marca oficiais permanecem a referência. A busca por ativos OAZE na Creative Cloud conectada não encontrou vídeo fonte nesta sessão. Para um futuro vídeo de apresentação ou um loop exportado, a produção seguirá: localizar/receber o master no Adobe, editar no Adobe Express ou Premiere, revisar licença e enquadramentos de celular/desktop, exportar versões leves sem áudio para fundo, comparar visualmente no app e manter alternativa estática para reduzir movimento. O efeito WebGL atual é código em tempo real; transformá-lo num vídeo não traria a mesma resposta ao tamanho da janela e gastaria espaço no pacote.

## Verificação ainda necessária

1. Instalar o APK atualizado e testar login, permissões e avisos num Android com recorte de câmera.
2. Testar o mesmo APK num fold/flip fechado, aberto e em multitarefa. CSS e build não comprovam essas posturas reais.
3. Usar uma conta assinante real, sem informar cartão ao desenvolvedor, e confirmar que o portal permite atualizar o cartão e consultar faturas.
4. Instalar o Windows e verificar retorno ao app após fechar a janela externa da Stripe.
5. Se a compra dentro do app da Play for necessária, implementar Play Billing e validação do recibo no backend antes de liberar o botão.

O código da função de cobrança está em `supabase/functions/oaze-billing-portal/index.ts`; a implantação nova não substituiu `oaze-pagamento`.
