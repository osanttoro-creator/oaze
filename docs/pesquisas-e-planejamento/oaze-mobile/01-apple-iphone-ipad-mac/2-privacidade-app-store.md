# Privacidade do app (App Store Connect)

Respostas do formulário que vira o "rótulo de privacidade" da ficha. Elas saem do inventário em
`00-comum-a-todas/04-privacidade-e-dados.md`: se o app mudar, atualize o inventário primeiro.

Os nomes estão como aparecem no App Store Connect em português, com o nome em inglês entre
parênteses, porque a tradução da tela pode variar.

## Perguntas iniciais

| Pergunta | Resposta |
|---|---|
| URL da Política de Privacidade | `https://oaze.site/privacidade` |
| Você ou seus parceiros coletam dados deste app? | **Sim** |

## Tipos de dados coletados

Para **todos** os tipos abaixo:

- **Rastreamento (Tracking):** não. O OAZE não cruza dados com outras empresas para anúncio nem
  os repassa a corretores de dados.
- **Finalidade:** só **Funcionalidade do app (App Functionality)**. Nenhum é usado para anúncio,
  marketing, análise de terceiros ou personalização.

| Categoria | Tipo | Vinculado à identidade? | Por quê |
|---|---|---|---|
| Informações de contato (Contact Info) | Nome (Name) | Sim | Perfil e saudação da conta |
| Informações de contato | Endereço de e-mail (Email Address) | Sim | Login e contato da conta |
| Informações financeiras (Financial Info) | Outras informações financeiras (Other Financial Info) | Sim | Lançamentos, saldos, contas, cartões com os 4 últimos dígitos opcionais, metas e investimentos sincronizados na conta |
| Conteúdo do usuário (User Content) | Outro conteúdo do usuário (Other User Content) | Sim | Perguntas à UGLEZ, que seguem sem identificador para a OpenAI, e respostas denunciadas, que ficam gravadas com a conta. Como um tipo só pode ter uma resposta, vale a mais conservadora |
| Identificadores (Identifiers) | ID do usuário (User ID) | Sim | Identificador da conta no Supabase |
| Compras (Purchases) | Histórico de compras (Purchase History) | Sim | O app lê o plano e o estado da assinatura comprada no site |
| Dados de uso (Usage Data) | Interação com o produto (Product Interaction) | Sim | Contagem de perguntas à UGLEZ, para a cota do plano |
| Outros dados (Other Data) | Outros tipos de dados (Other Data Types) | Sim | Preferências (tema, espaço ativo, consentimento da UGLEZ) e o endereço da foto que o Google envia no login, se ele não for apagado |

## O que não marcar, porque não é coletado

- **Informações de pagamento:** o cartão de quem assina fica na Stripe, no site. O app não tem
  campo para número de cartão.
- **Localização, contatos, fotos ou vídeos, áudio, histórico de navegação e de busca:** nenhum é
  usado.
- **Dados de saúde, dados sensíveis e dados de publicidade:** não existem no OAZE.
- **Dados de falhas e de desempenho:** o app ainda não tem monitoramento de erros.
- **ID do dispositivo:** só com o push da v2.
- **Biometria:** o app recebe só "passou" ou "não passou".
- **Lembretes:** calculados e agendados no aparelho, sem envio.

> "Coletar", para a Apple, é tirar o dado do aparelho de um jeito que você ou um parceiro possa
> acessar por mais tempo que o necessário para responder na hora. Sem conta, nada é coletado,
> mas o rótulo descreve o app com conta.

## Quando atualizar este formulário

| Mudança no app | O que acrescentar |
|---|---|
| Push do servidor (v2) | Identificadores → ID do dispositivo, para Funcionalidade do app |
| Monitoramento de erros | Diagnóstico → Dados de falhas e Dados de desempenho |
| Venda dentro do app | Compras continua; revisar Informações financeiras |
| Qualquer novo fornecedor que receba dados | Revisar a Política de Privacidade antes de enviar a versão |
