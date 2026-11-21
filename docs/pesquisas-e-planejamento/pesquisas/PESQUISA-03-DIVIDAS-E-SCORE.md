# O brasileiro endividado, e os sistemas de pontuação

Pesquisa de 24/10/2026. Dados mais recentes que encontrei; onde o número mais novo
é projeção e não medição, está dito.

---

## Parte 1 · Quanto e no que o brasileiro gasta

### Composição do orçamento (POF/IBGE)

A edição mais recente que localizei é a **POF 2017-2018** — não há nada mais novo
publicado, e isso em si é um dado: qualquer app que fale em "média do brasileiro"
está usando números de oito anos atrás.

| Grupo | % do consumo |
|---|---|
| **Habitação** | **36,6%** ← maior grupo |
| Transporte | 18,1% |
| Alimentação | 17,5% |
| *soma dos três* | *72,2% do consumo, 58,4% da despesa total* |

Despesa média mensal de consumo: R$ 4.020,98 no urbano, R$ 2.158,83 no rural.

Dois movimentos históricos que importam para o produto:

1. **Transporte passou alimentação pela primeira vez** (era 19,6%, caiu para 18,1%;
   alimentação era 19,8%, caiu para 17,5%).
2. **A desigualdade muda a conta inteira.** Famílias de até ~R$ 1,9 mil gastam
   **61,2%** em alimentação + habitação (22,0% + 39,2%); as de maior renda gastam
   **30,2%** (7,6% + 22,6%).

→ **Consequência direta para o OAZE:** comparar o usuário com "a média do
brasileiro" é quase sempre inútil e às vezes cruel. Quem ganha dois salários e
gasta 39% em moradia não está errado — está no padrão da sua faixa. Se um dia
houver comparação, tem de ser **por faixa de renda**, nunca com a média nacional.

### Endividamento e inadimplência (Peic/CNC, ~18 mil famílias/mês)

| Momento | Endividadas | Inadimplentes |
|---|---|---|
| Fev/2026 | recorde histórico | — |
| Jun/2026 | 81,6% | 29,9% |
| Jul/2026 | **82,0%** (6º mês de recorde) | 29,8% |
| Ago/2026 | — | **29,9%** |
| Set/2026 (*projeção* da CNC) | 82,6% | 30,3% |

Em agosto, **12,5%** das famílias disseram **não ter condições de quitar** os
atrasos — o maior nível desde fevereiro. Entre quem ganha até 3 salários mínimos, a
inadimplência chegou a **38,8%**.

### Negativados (Serasa)

- **83,98 milhões** de brasileiros com dívida em atraso em ago/2026 (contra 83,93
  mi no mês anterior — alta de 0,06%, a menor do ano).
- ⚠️ **Conflito de fontes:** uma página da própria Serasa fala em **91,3 milhões**
  no início de 2026. Não resolvi a divergência; pode ser metodologia diferente
  (CPF negativado × CPF com dívida em atraso). Não usar nenhum dos dois sem
  conferir na fonte.
- **Dívida média: R$ 6.920** por negativado (jun/2026) — quase 4 salários mínimos,
  com cerca de 4 dívidas por pessoa.
- Por setor: **bancos e financeiras 46,9%** (cartão + empréstimo + cheque especial
  juntos), **contas básicas 21,3%** (água, luz, gás). Não achei a fatia isolada do
  cartão — a categoria vem agregada.

### Como as pessoas saem (meios de quitação mais usados)

- **Serasa Limpa Nome** é o canal dominante: **19,7 milhões de acordos entre maio e
  agosto de 2026**, +36% sobre o mesmo período de 2025.
- O **Feirão** (35ª edição, 23/02 a 01/04/2026) juntou **2.200+ empresas**, com
  desconto de **até 99%** e parcelamento em até **72×** com parcela mínima de
  **R$ 9,90**. Entre jan e ago/2026, mais de **680 mil negociações fechadas com 99%
  de desconto**.
- Fora do feirão, o Limpa Nome fica aberto o ano todo com desconto de até 90%.
- **Pix é o meio de pagamento do acordo** — o nome limpa logo após a primeira
  parcela paga por Pix; à vista por Pix ou boleto.
- **Desenrola Brasil 3.0**: a Serasa afirma que a **MP nº 1.393, de 25/09/2026**, o
  instituiu, com desconto mínimo de 90% nas carteiras ofertadas. 🔎 Não confirmei em
  fonte oficial, e a Serasa é parte interessada.

### O que isso diz sobre o produto

1. **82% das famílias têm dívida.** Um app que trata dívida como exceção está
   desenhado para a minoria. A tela de dívidas da Coco não é recurso secundário.
2. **O desconto é a regra, não a sorte.** Até 99% em feirão, até 90% fora. Um
   usuário que não sabe disso paga muito mais. "Essa dívida provavelmente tem
   desconto; vale consultar o Limpa Nome" é conselho de alto valor e custo zero.
3. **Parcela mínima de R$ 9,90 em 72×** é um laço: cabe no bolso e dura seis anos.
   O OAZE tem os números para mostrar o custo total do parcelamento contra o à
   vista — e isso é exatamente o que `analisar_dividas` já se propõe a fazer.
4. **R$ 6.920 e 4 dívidas** é o retrato típico. É esse o caso de uso, não a
   carteira de investimentos.

---

## Parte 2 · Sistemas de pontuação

### Serasa Score — os pesos oficiais

Escala **0 a 1.000**, em quatro faixas: baixo 0–300, regular 301–500, bom 501–700,
excelente 701–1.000. (Vários blogs usam cortes diferentes — 801, 901; os
cortes acima são da página da própria Serasa.)

Os **seis fatores com peso**, publicados pela Serasa:

| Fator | Peso |
|---|---|
| Pagamentos | **29%** |
| Experiência no mercado | **24%** |
| Dívidas | **21%** |
| Busca por crédito | **12%** |
| Informações cadastrais | **8%** |
| Contratos | **6%** |

Observações: o Cadastro Positivo não aparece como fator separado — entra dentro de
"pagamentos" e "experiência no mercado". Fontes secundárias dizem que desde
jan/2025 o score é recalculado **no momento da consulta**, e não em ciclos; não
confirmei em fonte oficial.

Não encontrei material sobre o **SPC Score** (que é da Boa Vista, não da Serasa).

### Os três scores que um banco realmente usa

A literatura de risco separa por **estágio do cliente**, e isso é a parte mais
aproveitável de toda a pesquisa:

| Score | Quando | Usa o quê | Pergunta que responde |
|---|---|---|---|
| **Application** | cliente novo, no pedido | dados cadastrais + bureau externo | "posso emprestar?" |
| **Behavior** | cliente que já tem relação | **dados do próprio credor**: saldo médio, saldo máximo, **tendência do saldo**, histórico de atraso, desempenho de pagamento | "aumento o limite?" |
| **Collection** | cliente já em atraso | cadastro + financeiro + renda estimada | "qual a chance de ele pagar nos próximos Z dias?" |

A distinção que importa: o **behavior score usa dados que só o credor tem**,
enquanto o score de bureau usa o histórico espalhado por várias relações de
crédito. Um é íntimo, o outro é agregado.

### O OAZE Score como ele é hoje

Oito perguntas, pesos somando 100, **todas verificáveis a partir dos próprios
lançamentos, nenhuma dependendo de opinião nem de dado de fora** (`assets/js/calc.js`):

| # | Pergunta | Peso | Medida |
|---|---|---|---|
| 1 | Sobra dinheiro? | 16 | poupança de 3 meses |
| 2 | O crédito está sob controle? | 14 | fatura sobre receita |
| 3 | Há reserva? | 16 | disponível sobre gasto |
| 4 | O patrimônio cresce? | 12 | variação em 6 meses |
| 5 | As contas estão em dia? | 14 | nada vencido nem negativo |
| 6 | O gasto é previsível? | 10 | oscilação em torno da média |
| 7 | Os tetos foram respeitados? | 10 | orçamentos do mês |
| 8 | As metas andam? | 8 | aportes no mês |

E ele devolve `pesoAplicado` — ou seja, **não julga o que não sabe**. Isso é melhor
desenho que o da maioria dos bureaus, que entregam um número sem dizer sobre quanta
informação ele se apoia.

### A conclusão que evita o erro mais tentador

**O OAZE Score não é um score de crédito, e tentar fazer ele parecer um seria o
erro.** São objetos diferentes:

| | Serasa Score | OAZE Score |
|---|---|---|
| Para quem | o credor | a pessoa |
| Prevê | risco de inadimplência | saúde financeira |
| Dados | bureau, várias relações | os próprios lançamentos |
| Acionável? | pouco — você não controla os fatores | **sim, cada ponto tem uma ação** |

O OAZE Score é, na taxonomia bancária, um **behavior score** — e um behavior score
bom, porque roda sobre o dado íntimo que só quem tem o extrato possui. Essa é a
vantagem estrutural dele, e ela se perde no instante em que ele tenta imitar um
número de bureau.

### O que dá para pegar emprestado, de verdade

1. **Pesos publicados.** A Serasa diz "pagamentos 29%". O OAZE já tem os pesos no
   código; **mostrá-los na tela** é diferencial direto contra o bureau, que explica
   o fator mas não a conta.
2. **Os três estágios.** Hoje o OAZE Score é um só, e por isso é injusto com quem
   acabou de chegar (sem 6 meses de histórico, a pergunta 4 não tem resposta). O
   desenho em estágios resolve:
   - **chegada** (< 3 meses de dado): só as perguntas respondíveis, com
     `pesoAplicado` baixo e dito na tela — "estou avaliando 46 dos 100 pontos
     porque só tenho 1 mês do seu histórico"
   - **regime** (≥ 6 meses): os oito pesos
   - **em dívida** (há atraso ou negativo): **os pesos deveriam mudar**. Para quem
     está inadimplente, "as metas andam" com peso 8 é ruído; "as contas estão em
     dia" deveria dominar. É o *collection score* aplicado para o bem da pessoa:
     prioridade em vez de cobrança
3. **Tendência, não só nível.** O behavior score usa *tendência do saldo* — não só
   o saldo. O OAZE tem seis meses de série e hoje só usa variação na pergunta 4. "O
   seu score caiu 40 pontos em dois meses" vale mais que o número absoluto.
4. **Busca por crédito como sinal (12% na Serasa).** O equivalente interno existe:
   abrir cartão novo, aumentar limite, parcelar mais. É um sinal que o OAZE pode
   ver e nenhum bureau vê em tempo real.

### O que não fazer

- **Não** importar o score da Serasa para dentro do OAZE sem ser bureau — não há
  API pública para isso, e exibir número de terceiro como se fosse seu é problema
  de licença e de verdade.
- **Não** prometer que o OAZE Score melhora o score da Serasa. Pode até ser
  verdade por consequência (pagar em dia melhora os dois), mas afirmar é vender
  resultado que não se controla.
- **Não** transformar score em julgamento. "Score 320" sem o que fazer é a prática
  dos bureaus e é a pior parte deles.

## O que permanece incerto

- Negativados: 83,98 mi (ago, Mapa da Inadimplência) × 91,3 mi (página Serasa,
  início de 2026). Divergência não resolvida.
- Peic de set/out 2026: só achei projeção, não medição.
- Desenrola 3.0 / MP 1.393: só em fonte interessada.
- SPC Score e modelos internos de bancos brasileiros (SCR do BC, Cadastro
  Positivo como insumo): sem fonte boa. As fontes de behavior/collection score são
  blogs de fornecedor, uma delas com mais de dez anos.
- POF: nada mais novo que 2017-2018.

## Fontes

- [POF 2017-2018 — release IBGE](https://agenciadenoticias.ibge.gov.br/agencia-sala-de-imprensa/2013-agencia-de-noticias/releases/25598-pof-2017-2018-familias-com-ate-r-1-9-mil-destinam-61-2-de-seus-gastos-a-alimentacao-e-habitacao) · [primeiros resultados (PDF)](https://biblioteca.ibge.gov.br/visualizacao/livros/liv101670.pdf) · [transporte supera alimentação](https://rn.abrasel.com.br/noticias/noticias/peso-do-transporte-no-orcamento-familiar-ultrapassa-o-da-alimentacao-pela-primeira-vez-aponta-ibge/)
- [Peic julho/2026 — Agência Brasil](https://agenciabrasil.ebc.com.br/economia/noticia/2026-08/cnc-endividamento-das-familias-sobe-para-82-mas-inadimplencia-cai) · [Peic agosto/2026 — Portal do Comércio](https://portaldocomercio.org.br/acoes-institucionais/cnc-mais-endividadas-do-que-a-media-familias-de-menor-renda-lideram-avanco-na-inadimplencia-em-agosto/) · [Peic junho/2026](https://www.panrotas.com.br/mercado/economia-e-politica/2026/07/endividamento-das-familias-fica-em-816-e-inadimplencia-se-mantem-em-299-em-junho_230200.html)
- [Serasa: 83,98 milhões de negativados](https://www.spacemoney.com.br/credito/serasa-negativados-renegociacao-dividas) · [Mapa da Inadimplência](https://www.serasa.com.br/limpa-nome-online/blog/mapa-da-inadimplencia-e-renogociacao-de-dividas-no-brasil/) · [dívida média R$ 6.920](https://www.supersim.com.br/blog/endividamento-no-brasil)
- [Feirão Limpa Nome 2026](https://www.serasa.com.br/limpa-nome-online/feirao/) · [feirão com 2.200 empresas](https://meutudo.com.br/blog/noticias/2026/02/25/serasa-lanca-nova-edicao-do-feirao-para-limpar-o-nome-com-grandes-descontos) · [descontos até 99% — Agência Brasil](https://agenciabrasil.ebc.com.br/radioagencia-nacional/economia/audio/2026-02/comeca-feirao-serasa-limpa-nome-descontos-podem-chegar-ate-99) · [Desenrola Brasil 3.0](https://www.serasa.com.br/limpa-nome-online/blog/desenrola-brasil/)
- [Serasa — cálculo do score](https://www.serasa.com.br/score/blog/calculo-score/) · [faixas do score](https://www.serasa.com.br/ajuda/serasa-score/o-que-significa-cada-faixa-do-score/)
- [Behavior, credit e collection scoring](https://www.televendasecobranca.com.br/forum/topico/diferencas-entre-behavior-scoring-credit-scoring-e-collection-scoring/) · [behavioral scorecard](https://www.finalyse.com/blog/banking/behavioral-scorecard-with-machine-learning-components) · [scoring por estágio do cliente](https://www.vskills.in/certification/tutorial/scoring-at-different-customer-stages/) · [credit scorecards](https://en.wikipedia.org/wiki/Credit_scorecards)
