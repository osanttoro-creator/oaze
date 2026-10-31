# OAZE — planos, comparação com Pierre e Mobills e próximos recursos (31/10/2026)

Fontes: código atual do app (`app/live-site`), banco de produção (`plan_entitlements`), página oficial do Pierre (lp.pierre.finance, lida em 31/10/2026) e página de planos do Mobills (mobills.com.br/planos). Recursos dos concorrentes são o que eles anunciam, não teste prático.

## 1. Semente × Oásis (vigente desde 31/10/2026)

| | Semente (grátis) | Oásis (R$ 35,90/mês ou R$ 279,90/ano) |
|---|---|---|
| Lançamentos por mês | 50 + 10 por anúncio assistido (até 5 por dia, só no app Android) | Ilimitados |
| Anúncios | Só quando a pessoa escolhe assistir para liberar lançamentos | Nenhum |
| Coco | 3 conversas por dia, 10 por semana, mostrado em % | 30 por dia, 120 por semana, mostrado em % |
| Leitura de foto ou áudio pela Coco | Custa 3 conversas | Custa 3 conversas |
| Coco flutuante, simulações e comparações | Não | Sim |
| Espaços, contas, cartões | 1 · 2 · 3 | 5 · 50 · ilimitados |
| Orçamentos, metas, recorrências | 1 · 1 · 3 | 100 · 50 · 150 |
| Histórico | 3 meses | Completo |
| Avisos de vencimento, orçamento, metas | Sim | Sim |
| Avisos complementares (score, dólar, dicas) | Sim | Sim |
| Estado do OAZE (PDF) e CSV | Sim no app; o direito `export_pdf/csv` do Semente está `false` no banco — decidir se o relatório fica livre | Sim |

Os números ficam em `plan_entitlements` e mudam sem código. Custo da Coco: com 30/dia no Oásis, o teto teórico é ~900 conversas/mês; o uso médio deve ficar muito abaixo, mas vale acompanhar `ai_usage` no primeiro mês.

**Decisão pendente:** o relatório PDF e o CSV aparecem para todos nas Configurações, mas o banco diz que o Semente não tem `export_pdf`/`export_csv`. Ou o Semente ganha os dois (recomendo: é o que o Mobills cobra e o OAZE pode usar como diferencial), ou a interface passa a pedir o Oásis.

## 2. O que Pierre e Mobills fazem que o OAZE ainda não faz

### Pierre (IA primeiro)
- Conversa como tela principal; insights chegam antes de a pessoa perguntar. → **Feito em 31/10:** barra "Pergunte à Coco", perguntas prontas e insights no Início.
- Agentes com funções fixas (gasto fora do padrão, cobrança duplicada, recategorização que aprende, alerta de limite). → O OAZE tem os dados para os três primeiros sem banco conectado.
- Open Finance (100+ bancos). → Não há no OAZE. Exige parceiro regulado (agregador como Pluggy/Belvo) e contrato; é o maior salto de valor e de custo.
- WhatsApp. → Não há.
- Cartão próprio, CDB e ações. → Não é caminho do OAZE (exige instituição autorizada).

### Mobills (gestor clássico)
- Integração bancária (Nubank, Santander) com confirmação manual. → depende de Open Finance.
- Orçamento por categoria com alerta. → **Feito em 31/10:** aviso ao passar de 80% e 100%.
- Lembretes de contas. → **Feito em 31/10:** véspera e dia do vencimento.
- Relatórios mensais e gráficos personalizáveis. → OAZE tem Estado do OAZE (PDF) e gráficos fixos.
- Planos: Premium anual ~R$ 99,90. O Oásis (R$ 279,90/ano) está bem acima; o argumento precisa ser a Coco.

## 3. Próximos recursos, em ordem

1. **Detecção automática no próprio aparelho (sem banco):** gasto fora do padrão por categoria, possível cobrança duplicada (mesmo valor e descrição em até 3 dias) e assinatura que subiu de preço. Entra como insight e aviso. Baixo custo, alto efeito "Pierre".
2. **Captura rápida:** registrar gasto pela notificação ("+ lançamento") e pela Coco com foto de recibo já preenchendo o formulário (a leitura existe; falta ligar ao formulário).
3. **Push pelo servidor (Firebase):** para o dólar e os insights chegarem com o app fechado. Exige criar o projeto Firebase e o `google-services.json`.
4. **Importação OFX/CSV com revisão e deduplicação** — ponte até o Open Finance.
5. **Open Finance** via agregador regulado — decisão de negócio (custo por conexão).
6. **Widgets Android** de saldo e próximos vencimentos.
7. **Desafios/missões** (estilo "Rita" do Pierre) e sequência de dias registrando — engajamento do Semente.
8. **Mapa de gastos** com o local da compra (já salvo, ~100 m).

## 4. O que não fazer
- Recomendar produto de investimento específico ("invista em X"): exige registro na CVM. As dicas do OAZE são educativas.
- Mover dinheiro ou comprar em nome da pessoa.
- Anúncio fora da escolha da pessoa (interstitial/banner): quebra a proposta e a confiança num app financeiro.
