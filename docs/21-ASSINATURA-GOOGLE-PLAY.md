# Assinatura OAZE no Google Play

Atualizado em 12/11/2026 (versão 2.5.0).

## O que já está pronto

- **App (pacote da Play, `VITE_OAZE_DISTRIBUTION=play`):** plugin nativo `OazePlay`
  (`app/android/app/src/main/java/site/oaze/app/OazePlayPlugin.java`, Play Billing
  Library 8.3.0) e a ponte `OAZE_NATIVE_PLAY` em `app/src/native/published-bridge.ts`.
  A tela Plano mostra o preço da Google, o botão "Assinar pela Google Play",
  "Restaurar compra" e "Gerenciar ou cancelar na Google Play".
- **Servidor:** função `oaze-play` (publicada). Confere a compra na Google Play
  Developer API, exige que `obfuscatedAccountId` seja o SHA-256 do id do usuário,
  grava em `public.subscriptions` com `origem = 'google_play'` e confirma
  (acknowledge) a compra. Renovação, cancelamento e estorno chegam pelas
  notificações em tempo real (RTDN) com `?segredo=` na URL.

## IDs dos produtos (Play Console → Monetizar → Assinaturas)

| Produto | Plano básico | Renovação | Preço Brasil |
| --- | --- | --- | --- |
| `oaze_oasis_mensal` | `mensal` | mensal, automática | R$ 35,90 |
| `oaze_oasis_anual` | `anual` | anual, automática | R$ 279,90 |

O ID do produto não muda depois de criado. Os do servidor e do app são estes.
Sem ofertas nem teste grátis nesta fase: o app usa só o plano básico.

## O que falta fazer, nesta ordem

1. Enviar o AAB 2.5.0 para **Teste interno** (a Play só libera criar assinatura
   depois de receber um pacote com a biblioteca de cobrança).
2. Criar os dois produtos acima e ativar os planos básicos.
3. Google Cloud: criar uma conta de serviço, gerar a chave JSON e, no Play Console
   (Usuários e permissões), dar a ela "Ver dados financeiros" e "Gerenciar pedidos
   e assinaturas". Gravar a chave no Supabase: secret `GOOGLE_PLAY_SERVICE_ACCOUNT`.
   A chave nunca vai para o repositório nem para o app.
4. RTDN: criar um tópico Pub/Sub, dar permissão de publicação a
   `google-play-developer-notifications@system.gserviceaccount.com`, criar uma
   assinatura push para
   `https://gxwatircdhhetvzzlwwq.supabase.co/functions/v1/oaze-play?segredo=<valor>`
   e gravar o mesmo valor no secret `OAZE_PLAY_RTDN_SEGREDO`. No Play Console,
   Monetização → Configuração, informar o tópico.
5. Testadores de licença: a primeira compra é com conta de teste.
