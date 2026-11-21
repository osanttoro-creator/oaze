# Privacidade e dados: o inventário

Base para responder à Apple (Privacidade do app), à Google (Segurança dos dados) e à Microsoft,
e para revisar a Política de Privacidade. As respostas de cada loja estão na pasta dela; este
arquivo é a verdade de onde elas saem.

**Regra:** declarar a mais, nunca a menos. A Apple e a Google comparam o formulário com a
política e com o comportamento do app. Uma declaração que falta pode derrubar o app da loja;
uma a mais não derruba.

## Sem conta

Nada sai do aparelho. Lançamentos, contas, cartões, metas e preferências ficam no armazenamento
local do app. A UGLEZ exige conta, porque passa por uma Edge Function autenticada.

## Com conta

| Dado | Onde nasce | Para onde vai | Fica guardado? | Ligado à pessoa? | Finalidade |
|---|---|---|---|---|---|
| E-mail | Cadastro, Google ou Apple | Supabase Auth (região us-west-2) | Sim, até excluir a conta | Sim | Conta e login |
| Nome | Cadastro, perfil ou o nome que o Google e a Apple enviam | Supabase (Auth e perfil) | Sim | Sim | Saudação e perfil |
| Endereço da foto do Google | O Google envia no login | Metadados da conta no Supabase Auth, gravados automaticamente | Sim | Sim | Nenhuma no app hoje. Dá para apagar logo depois do login; senão, declarar |
| Lançamentos, contas, cartões com os 4 últimos dígitos opcionais, faturas, orçamentos, metas, investimentos, categorias e espaços | Digitados pela pessoa | Supabase (documento `dados` e tabelas) | Sim | Sim | Sincronizar entre aparelhos |
| Preferências (tema, espaço ativo, onboarding, consentimento da UGLEZ) | Uso do app | Supabase (`user_settings`, `onboarding_progress`) | Sim | Sim | Funcionamento do app |
| Plano e estado da assinatura | Comprado no site | Supabase (`subscriptions`) | Sim | Sim | Liberar os recursos do plano |
| Identificador da conta (UUID) | Supabase Auth | Supabase | Sim | Sim | Funcionamento e segurança (RLS) |
| Pergunta à UGLEZ, as 3 últimas trocas e o resumo agregado do período | Uso da UGLEZ | Edge Function `oaze-assistant` e, dali, OpenAI | O OAZE não guarda. A chamada vai com `store: false`, mas a OpenAI tem retenção própria para monitorar abuso, conforme a política dela | Não: nenhum e-mail ou ID é enviado | Responder à pergunta |
| Contagem de uso da UGLEZ (modelo, tokens, estado, `request_id`) | Cada pergunta | Supabase (`ai_usage`) | Sim | Sim | Cota do plano |
| Resposta denunciada, motivo e comentário | Botão "Denunciar" | Supabase (`uglez_denuncias`) | Sim | Sim | Moderação da UGLEZ |
| Hash do identificador para limite de uso | Chamadas às Edge Functions | Supabase (tabela de limites, somente servidor) | Sim, por janela | Hash, não o dado em claro | Segurança contra abuso |

## O que nunca é coletado

- **Número completo de cartão:** o app não tem campo para isso.
- **Senha em claro:** o Supabase Auth guarda só o hash.
- **Biometria:** o app recebe só "passou" ou "não passou".
- **Localização, contatos, fotos, câmera e microfone:** nenhum é usado.
- **Anúncios e rastreamento entre apps:** não existem. O OAZE não usa App Tracking
  Transparency nem ID de publicidade.
- **Dados de cartão para pagar o plano:** ficam na Stripe, no site, e nunca passam pelo app.
- **Lembretes:** são calculados e agendados no próprio aparelho.

## Quando entrar o push do servidor (v2)

O token de notificação do aparelho passa a ser guardado, ligado à conta. Nesse dia:

- **Apple:** declarar "Identificadores → ID do dispositivo" (Funcionalidade do app).
- **Google:** declarar "Identificadores do dispositivo ou outros".
- **Política de Privacidade:** atualizar.

## Quando entrar monitoramento de erros

O `docs/o-que-falta.md` já prevê um serviço de monitoramento. No dia em que ele entrar:

- **Apple:** declarar "Diagnóstico → Dados de falhas" e "Dados de desempenho".
- **Google:** declarar "Informações e desempenho do app".
- **Política de Privacidade:** nomear o fornecedor.

## Fornecedores que a Política de Privacidade precisa nomear

| Fornecedor | Recebe | Onde |
|---|---|---|
| Supabase | Conta, dados financeiros e preferências | Estados Unidos (us-west-2) |
| OpenAI | Pergunta e resumo agregado, sem identificador | Estados Unidos |
| Stripe | Nome, e-mail e cartão de quem assina, no site | Conforme a Stripe |
| Hostinger | Arquivos do site e registros de acesso do servidor | Conforme a Hostinger |
| Apple e Google | E-mail e nome, quando a pessoa entra por eles; token de notificação na v2 | Conforme cada um |
