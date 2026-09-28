# OAZE 2 — PRD

Status: **em revisão** · 28/09/2026 · fonte do design: `Oaze App motion/png/PROMPT_CONTEXTO_OAZE_APP.md` + kit V2.1.

## Problema

Quem organiza a vida financeira no Brasil tem o dinheiro espalhado em contas, cartões de crédito e faturas de bancos diferentes. Os apps dos bancos mostram um banco por vez; planilhas exigem disciplina diária. O OAZE 1 resolveu a visão única no navegador, mas não acompanha a pessoa no celular, não tem segurança de app (biometria, bloqueio) e a assistente (UGLEZ) só respondia perguntas.

## Público

Pessoa física no Brasil, que usa dois ou mais bancos e pelo menos um cartão de crédito, quer clareza sem virar contador. Referências citadas no briefing: Pierre (IA no centro) e Mobills (controle de lançamentos, cartões e faturas).

## Promessa

Todos os seus cartões em um só lugar. Você mostra ou conta o que aconteceu; a Coco organiza, confere e deixa pronto para você confirmar.

## Escopo do v1

Um app com a mesma organização em quatro lojas — Google Play, App Store (iPhone), Microsoft Store e Mac App Store — e um site de apresentação.

| Área | Entra no v1 |
|---|---|
| Entrada | animação dos cartões → cartão COCO OAZE; PIN de 6 números; biometria nos apps nativos; bloqueio após 0/1/5/15 min |
| Início | saudação, olho de esconder valores, carteira com saldo total, atalhos, sobra do mês com a onda, onde foi o mês, até o fim do mês |
| Lançamentos | lista do mês, filtros Pix/Cartões/Débito/Crédito, busca, confirmar/desconfirmar, previsto tracejado |
| Novo lançamento | despesa, receita, transferência, aporte; como pagou/recebeu; cartão ou conta em miniatura; parcelas; já pago; fixo mensal |
| Carteira | cartões no bolso; fatura (pagar, parcial, limite) e extrato; adicionar conta ou cartão |
| Coco | Agora (sugestões com desfazer), Conversa (rascunho confirmado), Memória (esquecer, pausar) |
| Mais | investimentos + simulador, categorias, metas e orçamentos, lembretes + calendário, relatórios + OAZE Score + CSV, configurações, plano |
| Dados | espaços financeiros (até 5), backup e restauração em JSON, espaço de exemplo isolado |

## Fora do v1 (com motivo)

- **Conexão com bancos (Open Finance):** ✅ decidido em 28/09/2026 — fica para uma atualização futura. O caminho (direto no BC ou agregador) será decidido quando essa atualização começar.
- **Coco com modelo de IA, voz, foto e PDF:** fase Coco 2 da nota do cofre; o v1 roda regras explicáveis no aparelho.
- **WhatsApp:** fase Coco 4.
- **Movimentar dinheiro:** só com parceiro regulado e consentimento específico.

## Mapa OAZE 1 → OAZE 2

Nada foi descartado sem registro. ✅ no app · 🟡 próxima etapa · 🔁 mudou de lugar.

| OAZE 1 | OAZE 2 |
|---|---|
| Painel (home.js) | ✅ Início |
| Lançamentos, confirmação por ocorrência | ✅ Lançamentos (mesma regra do calc) |
| Carteira com cartões desenhados | ✅ Carteira com bolso e cartão que sai |
| Faturas, pagamento, adiantamento de compra | ✅ pagar e parcial · 🟡 adiantamento item a item |
| Categorias | ✅ Categorias com anel e variação |
| Orçamento | 🔁 Metas e orçamentos |
| Metas | ✅ com ritmo ideal e mensagem da Coco |
| Investimentos + projeção | ✅ + simulador |
| Recorrentes / assinaturas | 🔁 fixo no novo lançamento + Coco detecta padrão |
| Calendário semana/mês/ano | 🔁 Lembretes (30 dias) + calendário do mês · 🟡 semana/ano |
| Relatórios anuais, CSV | ✅ Relatórios |
| OAZE Score | ✅ Relatórios |
| UGLEZ (chat) | 🔁 Coco (Agora/Conversa/Memória) |
| Automações (categorizar, recorrência, metas) | ✅ portadas, com testes |
| Onboarding em 7 etapas | 🔁 3 etapas (nome, primeira conta, PIN); categorias padrão; resto na carteira |
| Vários espaços | ✅ até 5 |
| Backup JSON | ✅ formato 2 |
| Dados locais do OAZE 1 (`financas.v1`) e backup v1 | ✅ migração com relatório; o original não é apagado |
| Conta, login Google/e-mail, sync entre aparelhos | 🟡 etapa 2 (Supabase normalizado) |
| Planos, Stripe/Asaas | 🟡 etapa 2; preço do v1 = plano único do mockup |
| Contas em moeda estrangeira | 🟡 o calc 2 ainda não converte moeda |
| Contas "fora dos totais" | ✅ no motor · 🟡 sem interruptor na tela |
| i18n en/es/fr | 🟡 v1 só em português |
| Tema claro | ⛔ v1 só Night Ocean (o mockup não tem claro) |

## Sucesso

- Lançar uma despesa em menos de 10 segundos no celular.
- Zero divergência entre os totais do OAZE 2 e as regras do calc 1 (garantido por testes).
- 70% das sugestões da Coco aceitas sem edição (métrica da nota do cofre).
- Nenhum dado financeiro legível com o app bloqueado ou na troca de apps.

## Pendências — decisão de Jonatham

1. **Plano grátis:** o site feito na outra sessão oferece "grátis" + "completo"; o briefing do mockup diz plano único. O app segue o briefing.
2. **Preços:** o mockup define plano único R$ 29,90/mês ou R$ 249,90/ano; o cofre marca preços como pendentes.
3. **Coco grava direto ou pede confirmação:** o mockup mostra "Lancei… desfazer"; o app segue a política do cofre (rascunho + "Lançar"). Trocar é uma linha.
4. **Identificador do app nas lojas:** proposta `site.oaze.app`.
