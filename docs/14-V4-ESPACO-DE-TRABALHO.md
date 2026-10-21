# OAZE V4 — direção de trabalho (18/10/2026)

## Decisão em avaliação

O usuário identificou a opção **“abrir versão teste”** dentro do aplicativo Windows como entrada para o layout preferido. No código atual, essa entrada é **“Ver com dados de exemplo”**. Ela foi retirada dos builds distribuídos e permanece visível apenas no ambiente de desenvolvimento; espaços de exemplo que alguém já criou localmente não são apagados pela atualização. Usar esse layout como base visual da V4 e portar os fluxos reais da V3. A V4 deve viver neste repositório canônico, com o mesmo projeto Supabase; abrir outro app ou outra base de dados criaria mais divergência.

## O que a inspeção mostrou

| Área | `/app` V3, publicada | App instalado, espaço de exemplo | Consequência para V4 |
| --- | --- | --- | --- |
| Visual | Sidebar, carteira, gráfico, navegação mobile, identidade Night Ocean | Sidebar, carteira em bolso, ações rápidas, comando de busca e mais telas nativas | Aproveitar a composição do app e corrigir o transbordamento observado na carteira desktop antes de promovê-la |
| Conta | Supabase Auth e dados financeiros em `public.dados` | Mesma conta Supabase, sessão em cofre próprio; importação explícita de `public.dados` | Login web não transfere sessão para o app; o retorno OAuth precisa chegar por `oaze://auth` |
| Dados | Escrita V3 por perfil com revisão esperada | Modelo `oaze2_*`, fila offline e sincronização financeira desativada | Definir uma única fonte de verdade e validar conflito/retomada offline antes de ligar sync |
| Funções | Perfis compartilhados, quatro idiomas, Coco Realtime, agenda, carteira, investimentos e checkout | Motor financeiro, agenda, metas, relatórios, Coco texto, PIN/cofre e componentes nativos; não há paridade completa | Portar funções por fluxo, mantendo regras de autorização e cobrança existentes |
| Demonstração | Prévia separada sem dados reais em `/preview-v3/` | Espaço local marcado `demo`; nunca sincroniza | Decidir como oferecer demonstração sem confundi-la com conta de produção |

## Ordem técnica

1. **Entrada confiável:** configurar o retorno `oaze://auth` no Supabase, usar PKCE e testar Google/e-mail em Windows instalado e Android. Confirmar que o usuário volta à tela nativa e encontra o botão para importar seus dados.
2. **Contrato de dados:** documentar campos e regras da V3 em `public.dados`, perfis, revisões e RPCs; comparar com o modelo do app. Não fazer dupla gravação nem transformar um importador pontual em suposta sincronização.
3. **Espaço V4:** manter React/TypeScript compartilhado, Tauri no desktop e Capacitor no mobile. Evoluir componentes e layouts que já existem; separar diferenças de interação por plataforma. Corrigir o transbordamento de carteira visto em 1280 px e verificar também 390, 768 e 1440 px.
4. **Paridade funcional:** portar primeiro lançamentos, contas/cartões, faturas, recorrências e metas; depois perfis compartilhados, investimentos, idiomas, voz e pagamento. Cada fluxo só troca a V3 após leitura, escrita, erro, permissão e retorno offline verificados.
5. **Sincronização e corte:** testar a mesma conta em Windows e Android, inclusive alterações concorrentes e reinstalação. Só então escolher a migração transacional da fonte de verdade, ligar a sincronização e retirar caminhos antigos.

## Critérios para chamar de V4 utilizável

- Login concluído dentro do aplicativo instalado; nenhuma sessão fica presa no navegador.
- Dados reais da conta aparecem sem misturar os dados de exemplo.
- Criar, editar e excluir um lançamento em um dispositivo aparece no outro; conflitos preservam o que o usuário produziu.
- Ações financeiras e permissões produzem os mesmos resultados da V3.
- Windows e Android instalados passam pelos fluxos principais; builds verdes isolados não substituem esse teste.

## Primeiro incremento no app

Na tela Início, tocar um cartão agora abre e recolhe o plástico dentro da própria carteira; o bolso mostra o saldo da conta ou a fatura do cartão selecionado. Tocar no bolso alterna a exposição dos cartões, inclusive por teclado, e cartões ocultos deixam de receber foco. A grade desktop passa a permitir encolhimento das colunas e empilha os painéis internos nas larguras intermediárias. No celular, a entrada da Coco usa as partículas dentro do conteúdo para não cobrir o resumo financeiro. A prévia local com dados de exemplo foi inspecionada em 390 e 1280 px; testes, tipagem e build passaram. Isso não valida dados reais nem ativa sincronização financeira.

**Estado:** a tela de exemplo do aplicativo Windows foi identificada como referência visual; o acesso novo a ela foi retirado da interface de produção. A paridade funcional e a migração dos dados V3 para o espaço V4 ainda estão em implementação.
