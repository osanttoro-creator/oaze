# Informações para a revisão da Apple

Campos da seção **Informações para a revisão do app** (App Review Information), na página da
versão. As notas vão em inglês porque a equipe de revisão é internacional; o app segue em
português.

## Conta de teste

A Apple precisa entrar sem receber e-mail, então a conta de teste usa **e-mail e senha**, não
código.

- [ ] Criar uma conta só para a revisão, por exemplo `revisao.apple@oaze.site`, com senha forte
      guardada no seu gerenciador. Não use a sua conta nem a da Google Play.
- [ ] Preencher um espaço com **dados de demonstração** coerentes: 3 contas, 2 cartões com
      fatura aberta, 2 meses de lançamentos, 1 orçamento e 2 metas. Nada de dado real.
- [ ] Liberar o plano Oásis nessa conta, sem cobrança. É o mesmo tipo de escrita em
      `subscriptions` feita na conta do dono em 15/09/2026 (cartão de operação). É uma escrita
      no banco e pede confirmação explícita.
- [ ] Registrar o consentimento da UGLEZ **desligado**, para o revisor ver a folha de
      autorização.
- [ ] Entrar uma vez no app com essa conta e conferir que tudo abre.
- [ ] Depois da aprovação, trocar a senha, e trocar de novo antes de cada nova versão.

| Campo | Valor |
|---|---|
| Login obrigatório | Marcar, porque sincronização e UGLEZ exigem conta |
| Nome de usuário | o e-mail da conta de teste |
| Senha | a senha da conta de teste, digitada direto no App Store Connect |
| Nome, sobrenome, telefone e e-mail de contato | Seus, ou de quem vai responder à Apple em até 24 horas |
| Anexo | Opcional: vídeo curto mostrando um lembrete chegando e o atalho do ícone, que o revisor pode não esperar para ver |

## Notas

Confira os caminhos de menu contra o build antes de colar: as telas de Segurança, Notificações
e UGLEZ são novas.

```text
OAZE is a personal finance organizer for people in Brazil. The interface is in Portuguese.

HOW TO REVIEW
1. The app works without an account. Data then stays only on the device.
2. To review account sync and the AI assistant, sign in with the demo account provided:
   Configurações > Entrar ou criar conta > e-mail e senha.
   The account has sample data and the top plan enabled on the server for this review.

NATIVE FEATURES IN THIS VERSION
- Face ID / Touch ID lock: Configurações > Segurança.
- Due-date reminders for credit card bills and planned expenses. They are local
  notifications computed and scheduled on the device: Configurações > Notificações.
- Home Screen quick actions (long-press the app icon): Nova despesa, Nova receita,
  Perguntar à UGLEZ.
- Sign in with Apple and Google Sign-In.

BUSINESS MODEL (Guideline 3.1.3(f))
The app is free and acts as a companion to the OAZE web service (oaze.site). There is no
purchasing inside the app and no call to action to purchase outside of it. Paid features
visible in the demo account were enabled on our server for this review.

AI ASSISTANT "UGLEZ" (Guideline 5.1.2(i))
Before the first question, the app shows a consent sheet that explains what is sent (the
question plus aggregated totals and categories, never transaction descriptions, account or
card names, email or identifiers), who receives it (our server, which forwards it to OpenAI)
and asks for explicit permission. Permission can be revoked in Configurações > UGLEZ. Every
answer has a "Denunciar" (report) button.

ACCOUNT DELETION (Guideline 5.1.1(v))
Configurações > Excluir a conta. It deletes the account and all server data on every device
and cancels any active subscription.

DATA
Stored in Supabase (United States), encrypted in transit. No ads and no tracking.
Privacy policy: https://oaze.site/privacidade
```

## Se a Apple recusar

- Responda pela **Central de Resoluções** do App Store Connect, em inglês, citando a diretriz e
  o ponto das notas que já trata dela.
- Se o motivo for 4.2 (funcionalidade mínima), mande o vídeo do lembrete e do atalho e descreva
  o uso sem internet.
- Se o motivo for 3.1.1 (pedindo compra no app), mostre que não há botão nem texto de compra e
  cite a 3.1.3(f).
- Só mude o app depois de entender o motivo. Reenviar igual raramente passa.
