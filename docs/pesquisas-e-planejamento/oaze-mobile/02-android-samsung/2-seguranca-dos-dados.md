# Segurança dos dados (Play Console)

Respostas do formulário **Política → Conteúdo do app → Segurança dos dados**. Elas saem do
inventário em `00-comum-a-todas/04-privacidade-e-dados.md`: se o app mudar, atualize o
inventário primeiro. A Google compara estas respostas com a Política de Privacidade publicada e
com o que o app faz.

Os rótulos da Play Console mudam de nome de vez em quando. Aqui vai a intenção de cada resposta,
com o rótulo mais provável.

## 1. Coleta e segurança

| Pergunta | Resposta |
|---|---|
| O app coleta ou compartilha algum dos tipos de dados do usuário exigidos? | **Sim** |
| Todos os dados coletados são criptografados em trânsito? | **Sim**. Tudo passa por HTTPS até o Supabase |
| Como é criada a conta? | E-mail e senha; e-mail com código; e OAuth, com Google e Apple |
| Link para pedir a exclusão da conta | `https://oaze.site/excluir-conta`, página a criar (item 6.2 de `05-site-e-supabase-o-que-mudar.md`) |
| Dá para pedir a exclusão de alguns dados sem excluir a conta? | **Sim**. Cada lançamento, conta, cartão, meta e espaço pode ser apagado no próprio app |

## 2. Tipos de dados

Para **todos** os tipos abaixo:

- **Compartilhado com terceiros:** não. Supabase e OpenAI processam os dados em nome do OAZE, e
  a Google não conta prestador de serviço como compartilhamento.
- **Coleta obrigatória ou opcional:** opcional. O app funciona inteiro sem conta, e sem conta
  nada sai do aparelho.

| Categoria | Tipo | Processado só de forma temporária? | Finalidades |
|---|---|---|---|
| Informações pessoais | Nome | Não | Funcionalidade do app; Gerenciamento da conta |
| Informações pessoais | Endereço de e-mail | Não | Funcionalidade do app; Gerenciamento da conta |
| Informações pessoais | IDs de usuário | Não | Funcionalidade do app; Gerenciamento da conta; Prevenção de fraudes, segurança e conformidade |
| Informações pessoais | Outras informações | Não | Funcionalidade do app. É o endereço da foto que o Google envia no login, se não for apagado, e as preferências da conta |
| Informações financeiras | Outras informações financeiras | Não | Funcionalidade do app. São lançamentos, saldos, contas, cartões com os 4 últimos dígitos opcionais, metas e investimentos |
| Informações financeiras | Histórico de compras | Não | Funcionalidade do app. É o plano e o estado da assinatura comprada no site |
| Atividade no app | Interações com o app | Não | Funcionalidade do app. É a contagem de perguntas à UGLEZ, para a cota do plano |
| Atividade no app | Outro conteúdo gerado pelo usuário | **Não**. A OpenAI tem retenção própria para monitorar abuso, e as denúncias ficam gravadas | Funcionalidade do app. São as perguntas à UGLEZ e as respostas denunciadas |

## 3. O que não marcar, porque não é coletado

- **Localização, contatos, agenda, fotos e vídeos, arquivos, áudio, mensagens e SMS:** nenhum é
  usado.
- **Informações de pagamento do usuário:** o cartão de quem assina fica na Stripe, no site, e o
  app não tem campo para número de cartão.
- **Saúde e condicionamento físico:** não existe no OAZE.
- **Histórico de navegação e de pesquisa na web:** não existe.
- **Informações e desempenho do app:** ainda não há monitoramento de erros.
- **Identificadores do dispositivo:** só com o push da v2.
- **Biometria:** o app recebe só "passou" ou "não passou".
- **Lembretes:** calculados e agendados no aparelho.

## 4. Quando atualizar

| Mudança no app | O que acrescentar |
|---|---|
| Push do servidor (v2) | Identificadores do dispositivo ou outros, para Funcionalidade do app |
| Monitoramento de erros | Informações e desempenho do app: registros de falhas e diagnóstico |
| Qualquer fornecedor novo que receba dados | Revisar a Política de Privacidade antes do envio |

A Google pode suspender um app com declaração que não bate com o comportamento. Na dúvida,
declare.
