# Conteúdo do app (Play Console)

As declarações de **Política → Conteúdo do app**, fora a Segurança dos dados, que tem arquivo
próprio. A Play não deixa enviar para produção com alguma pendente.

| Declaração | Resposta | Observação |
|---|---|---|
| Política de Privacidade | `https://oaze.site/privacidade` | Precisa estar na versão final, com razão social, CNPJ e os fornecedores |
| Anúncios | **Não**, o app não contém anúncios | — |
| Acesso ao app | **Algumas funcionalidades são restritas** | Ver "Acesso ao app" abaixo |
| Classificação do conteúdo | Questionário IARC | Ver "Classificação" abaixo |
| Público-alvo | **18 anos ou mais** | Ver "Público-alvo" abaixo |
| App de notícias | **Não** | — |
| Recursos financeiros | Ver "Recursos financeiros" abaixo | Obrigatória para todo app desde 31/08/2023 |
| App de saúde | **Não** | — |
| App governamental | **Não** | — |
| Exclusão de conta | `https://oaze.site/excluir-conta` | A página precisa existir antes do envio |
| Segurança dos dados | `2-seguranca-dos-dados.md` | — |
| Permissões sensíveis | Nenhuma a declarar | O OAZE não pede localização, SMS, registro de chamadas, acessibilidade, todos os arquivos nem alarme exato |

## Acesso ao app

A Google precisa entrar sem receber e-mail, então a conta de teste usa **e-mail e senha**.
Crie uma conta separada da usada na Apple, com os mesmos cuidados: dados de demonstração, plano
Oásis liberado no servidor e consentimento da UGLEZ desligado.

Texto para o campo de instruções (até 500 caracteres):

```text
O app funciona sem conta. Para testar a sincronização e a assistente UGLEZ, entre com a conta de teste: Configurações > Entrar ou criar conta > e-mail e senha. A conta tem dados de exemplo e o plano mais completo liberado para a revisão. Não há compra dentro do app.
```

Usuário e senha vão nos campos próprios da Play Console, nunca no texto.

## Classificação (questionário IARC)

- **Categoria do app:** utilitário, produtividade, comunicação ou outro.
- **Violência, sexo, linguagem imprópria, drogas, jogos de azar e apostas:** não.
- **Usuários interagem entre si ou trocam conteúdo:** não. A UGLEZ conversa com a pessoa, não
  junta pessoas.
- **Compartilha a localização:** não.
- **Compras digitais:** não.
- **Pergunta sobre IA ou chatbot, se aparecer:** responda que sim, uma assistente de IA que lê
  totais financeiros da própria pessoa, com botão de denúncia.

Resultado esperado: classificação livre. Confira o certificado que a Play emite.

## Público-alvo

- **Faixa etária: 18 anos ou mais.** É um app de finanças pessoais com assinatura no site e
  assistente de IA; não é feito para crianças.
- **"O app pode atrair crianças sem querer?"** Não.
- Escolher só 18+ mantém o OAZE fora das regras do programa Famílias, que não combinam com a
  UGLEZ nem com login social.

## Recursos financeiros

O OAZE **organiza** as finanças da pessoa. Ele não empresta dinheiro, não processa pagamento nem
transferência, não negocia nem custodia investimento, não mexe com cripto nem vende seguro.

- Se a lista da declaração tiver uma opção de **gestão financeira pessoal, orçamento ou
  planejamento**, marque só ela.
- Se não tiver, marque que o app **não oferece nenhum dos recursos da lista**.
- Nunca marque empréstimo, pagamento, carteira digital, investimento ou cripto: cada um pede
  licença e documentos que o OAZE não tem, e não precisa ter.

## Conteúdo gerado por IA

Não é um formulário, é a política da Google para apps de IA generativa, e a revisão confere.

- **Denúncia dentro do app:** cada resposta da UGLEZ tem o botão "Denunciar", sem sair do app.
- **Uso das denúncias:** a Google espera que elas sirvam para melhorar o filtro. Leia
  `uglez_denuncias` com regularidade.
- **Conteúdo proibido:** a UGLEZ não pode gerar o que as políticas proíbem. Ajudam os filtros do
  provedor e as regras do `SISTEMA` no `oaze-assistant`, que limitam a UGLEZ aos dados
  financeiros da própria pessoa, proíbem prometer retorno e tratam os dados como não
  confiáveis. Mesmo assim, a responsabilidade continua sendo do OAZE.
