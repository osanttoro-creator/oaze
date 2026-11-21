# Investimentos: as regras, os padrões, e o que falta no OAZE

Pesquisa de 24/10/2026. A leitura do código é do commit `adc0dad` (a árvore de
trabalho estava em meio a um refactor — ver nota no fim).

---

## Parte 1 · O mapa dos investimentos

### Renda fixa

**Tabela regressiva de IR**, sobre o rendimento, retida na fonte:

| Prazo | Alíquota |
|---|---|
| até 180 dias | 22,5% |
| 181 a 360 | 20% |
| 361 a 720 | 17,5% |
| acima de 720 | **15%** |

**Isentos de IR para pessoa física:** LCI, LCA, CRI, CRA, debêntures incentivadas,
poupança, e rendimentos de FII que cumpram os requisitos.

⚠️ **O ponto que quase todo material de 2025 errou:** a **MP 1.303/2025** — que
unificaria a renda fixa em 17,5% e cobraria 5% de LCI/LCA emitidas a partir de
01/01/2026 — **caducou em 8 de outubro de 2025** sem ser votada, depois de sair da
pauta da Câmara. **As isenções continuam valendo.** Qualquer texto que diga "LCI vai
ser tributada" está desatualizado.

### Renda variável

| Operação | Alíquota | Observação |
|---|---|---|
| Ações, swing trade | 15% | **isento se as vendas do mês somarem até R$ 20.000** |
| Day trade | 20% | sem isenção |
| FII, venda de cotas | 20% | o *rendimento* mensal distribuído é isento se cumprir requisitos |

Recolhimento por **DARF, código 6015**, mínimo de R$ 10 — e aqui está a pegadinha
que nenhum app brasileiro resolve bem: **a apuração é do investidor, mês a mês, com
compensação de prejuízo**, e quem erra paga multa.

### Fundos

**Come-cotas**: antecipação semestral de IR em fundos de renda fixa e multimercado,
nos últimos dias úteis de **maio e novembro**, reduzindo a quantidade de cotas.

### Dividendos — mudou em 2026

**Lei 15.270/2025**, sancionada em 26/11/2025, em vigor desde **01/01/2026**,
encerrou quase 30 anos de isenção:

- **10% de IRRF** quando a mesma pessoa jurídica paga **mais de R$ 50 mil no mês** à
  mesma pessoa física residente. A retenção incide sobre **o valor total**
  distribuído no mês, não só o excedente.
- Remessa ao exterior: **10% sem o limite** de R$ 50 mil.
- **IRPFM**, imposto mínimo anual para renda alta: alíquota cresce linearmente até
  **10%**, atingindo esse patamar a partir de **R$ 1,2 milhão**.
- Lucros aprovados até dez/2025 ficam protegidos, se pagos nos termos originais.

### Fora do Brasil — Lei 14.754/2023

- **Alíquota única de 15%** sobre rendimentos de aplicações financeiras no exterior,
  **paga uma vez por ano na Declaração de Ajuste Anual** — não há DARF mensal.
- Ganho de capital na venda de ações, ETFs e bonds entra no **mesmo regime anual de
  15%**.
- **Dupla tributação:** os EUA retêm 30% sobre dividendos; como é maior que os 15%
  brasileiros, dá para compensar — **declarando a retenção**.
- **Offshore**: lucro de controlada no exterior é tributado a 15% em 31/12 **mesmo
  sem distribuição**, com opção de tratar como entidade transparente.
- Bens declarados pelo **valor de aquisição** em 31/12.
- 🔎 Não achei fonte boa sobre o **W-8BEN** (o formulário que reduz a retenção
  americana em país com tratado — e o Brasil **não tem** tratado com os EUA, o que
  é justamente por que a retenção fica em 30%).

### Nomeação e identificação — o padrão da B3

| Sufixo | O que é |
|---|---|
| 3 | ação ordinária (ON) — `VALE3` |
| 4 | preferencial (PN) — `PETR4` |
| 5–8 | classes preferenciais A, B, C, D |
| 9, 10 | direitos de subscrição |
| **11** | **ambíguo**: *unit* em ação (`SANB11` = ON + PN), **ou** FII, **ou** ETF (`BOVA11`) |
| 34 | BDR de ação — `AAPL34` |
| 39 | BDR de ETF (4 letras + 39) |

**O sufixo 11 é o problema de modelagem.** Ele não diz a classe do ativo — só a
categoria diz. Um sistema que deduza tipo a partir do ticker vai classificar FII
como unit e ETF como FII. **Tipo tem de ser campo, não dedução.**

E o ticker **muda**: `APXM11` passa a `VIML11` em 30/10/2026. Ticker não é chave
estável; **ISIN** é (padrão ISO 6166, prefixo `BR` para emissão brasileira, ex.
`BRBTFLBDR003`).

---

## Parte 2 · Como a área de investimentos do OAZE está hoje

### O que existe

**12 tipos** (`assets/js/store.js:188`): Porquinho, Renda fixa, Tesouro Direto,
CDB, Fundo de investimento, Ações, FIIs, ETF, Criptomoeda, Previdência, Poupança,
Outro.

**Campos do formulário:** nome, tipo, valor aportado, data do aporte, taxa estimada
(% a.a.), valor atual informado, `accountId` (debitar de uma conta), observações.
Condicionais: **ticker + quantidade** só para Ações/FIIs/ETF; **vencimento +
liquidez** só para CDB.

**O que já está bem feito, e é raro:**
- a cotação vem da brapi pelo servidor, com **ticker + quantidade obrigatórios** —
  e, sem eles, a tela diz "o valor aportado sozinho não revela quantas cotas você
  possui" em vez de inventar
- **cotação nunca se transforma em "valor atual"** sozinha; o valor informado pelo
  usuário prevalece
- fonte, horário e caráter estimado aparecem na tela
- "Porquinho" vinculado a conta sai do saldo disponível e continua no patrimônio,
  **sem contagem dupla** — é um detalhe que muitos apps erram
- CDB em % do CDI usa a série do BCB, e o número é rotulado **estimativa bruta**

### O que falta — e o mais grave primeiro

**1. 🔴 Quatro campos existem no formulário e não existem no banco.**

A tabela `public.investments` (conferida no banco real) tem: `id, workspace_id,
legacy_id, name, tipo, valor, data, taxa, valor_atual, account_id, notas,
created_at, updated_at, deleted_at, origem, versao`.

**Não há `ticker`, `quantity`, `maturity_date` nem `liquidity`.** Nenhuma migração
menciona `ticker`. Esses quatro campos vivem hoje **só no documento JSON
`public.dados`**. O `docs/o-que-falta.md` lista como bloqueio nº 3 "definir uma
única fonte da verdade", com os dois modelos coexistindo — e quando essa migração
acontecer, **ticker e quantidade são descartados em silêncio e a cotação para de
funcionar**. É o tipo de perda que só aparece depois.

**2. Sem quantidade acumulada, não há posição.** O modelo é de *aporte*: cada linha
é um evento de compra. Não há conceito de **posição consolidada** — 10 cotas de
PETR4 compradas em três datas são três linhas, e o preço médio não existe. Sem
preço médio não há ganho de capital, e sem ganho de capital não há como ajudar no
imposto.

**3. Nenhuma camada tributária.** Nada no sistema conhece:
   - a tabela regressiva (os campos `maturityDate` e `data` já dariam o prazo)
   - a **isenção de R$ 20 mil/mês** em venda de ações — que é a conta que mais
     importa para o investidor pessoa física brasileiro
   - come-cotas em maio e novembro
   - os 10% de dividendos acima de R$ 50 mil/mês (Lei 15.270)
   - compensação de prejuízo
   
   E não há **evento de venda**: só aporte. Sem venda registrada, imposto é
   impossível por construção.

**4. Proventos não existem.** Dividendos, JCP e rendimento de FII não têm onde ser
registrados. Para quem investe em FII — público grande e exatamente o que busca app
de controle — o rendimento mensal é o ponto principal, e ele não cabe no modelo.

**5. Desdobramento, grupamento e bonificação.** O próprio
`INVESTIMENTOS-APIS-2026-10-15.md` já avisa: "a cotação atual não reconstrói o
histórico patrimonial". Um split de 1:4 quadruplica a quantidade e divide o preço;
sem tratar isso, o patrimônio fica errado e parece erro de cotação.

**6. Só real.** Contas e cartões já suportam moeda estrangeira — investimento não.
Quem tem ação nos EUA não tem onde pôr, e a Lei 14.754 fez disso um caso comum.

**7. Ticker como identificador instável.** Sem ISIN, a troca `APXM11 → VIML11`
quebra o histórico do usuário silenciosamente.

**8. Tipo ambíguo no 11.** Os três tipos que aceitam ticker (Ações/FIIs/ETF) usam
sufixo 11 de maneiras diferentes. Hoje o usuário escolhe o tipo à mão, o que na
verdade **está certo** — vale registrar que é decisão, não acidente, para ninguém
"melhorar" isso deduzindo pelo ticker depois.

**9. B3 continua fora.** Posição real exige licença B2B, mTLS, OAuth 2.0 e
autorização individual, com posição em D-1. Já está documentado e corretamente
marcado como futuro.

### A ordem que eu recomendaria pensar

| Prioridade | O que | Por quê |
|---|---|---|
| **1** | Levar `ticker`, `quantity`, `maturity_date`, `liquidity` para a tabela | é perda de dado esperando a migração acontecer |
| **2** | Evento de venda + posição consolidada com preço médio | destrava imposto, ganho de capital e patrimônio correto |
| **3** | Proventos (dividendo, JCP, rendimento de FII) | é o que o investidor de FII olha todo mês |
| **4** | Isenção de R$ 20 mil e tabela regressiva como *informação*, não cálculo oficial | valor imediato, risco baixo se rotulado como estimativa |
| **5** | ISIN ao lado do ticker | barato agora, caro depois |
| **6** | Moeda estrangeira | paridade com contas e cartões |

E o limite que não deve ser cruzado: **nada disso é consultoria de investimento.**
O regime do `INVESTIMENTOS-APIS` já está certo — "nenhuma ordem de compra/venda,
nenhuma promessa de retorno" — e informar alíquota não é recomendar aplicação.
Calcular imposto, porém, é terreno de responsabilidade: tudo rotulado como
estimativa, com a conta à vista, e nunca como apuração oficial.

## O que permanece incerto

- **W-8BEN**: sem fonte confiável nesta pesquisa.
- **Estrutura completa do ISIN** (ISO 6166): não achei a especificação; só exemplos.
- **BDR nível III terminando em 33**: uma fonte cita, as outras não.
- Status de novas propostas de tributação depois da queda da MP 1.303: o tema deve
  voltar, e qualquer coisa construída aqui precisa de alíquota **configurável**, não
  constante no código.
- As alíquotas acima vêm de guias e de material da B3, não da Receita Federal
  diretamente. Antes de calcular imposto para alguém, confirmar na fonte oficial.

## Nota sobre a leitura do código

A pasta `preview-v3/` **não estava na árvore de trabalho** no momento desta
pesquisa (21 arquivos deletados, 48 modificados, por algo fora desta sessão). Li
tudo de `git show HEAD:...`, ou seja, do commit `adc0dad`. Se o refactor em curso
mexeu na área de investimentos, este diagnóstico precisa ser refeito sobre o novo
código.

## Fontes

- [Tabela de IR em investimentos](https://renovainvest.com.br/blog/guia-definitivo-tabelas-ir-investimentos/) · [IR sobre investimentos 2026](https://valorfinal.com.br/guia/imposto-de-renda-sobre-investimentos) · [como declarar investimentos — CNN](https://www.cnnbrasil.com.br/economia/money/macroeconomia/imposto-de-renda-2026-veja-como-declarar-investimentos/)
- [LCI e LCA no IR 2026 — B3 Bora Investir](https://borainvestir.b3.com.br/tipos-de-investimentos/renda-fixa/lci-lca-e-lc/investimentos-isentos-como-declarar-lci-e-lca-corretamente-no-imposto-de-renda-2026/) · [MP 1.303 perde validade](https://tiagojuvencio.com.br/blog/mp-1303-perde-validade-e-regras-antigas-sobre-investimentos-continuam-valendo) · [MPV 1303/2025 no Congresso](https://www.congressonacional.leg.br/materias/medidas-provisorias/-/mpv/169059) · [setores reagem à queda da MP](https://bmcnews.com.br/mercados/setores-reagem-a-queda-da-mp-1-303-e-apontam-vitoria-do-dialogo-e-da-seguranca-juridica/)
- [Lei 15.270/2025 — Trench Rossi (EN)](https://www.trenchrossi.com/en/legal-alerts/brazil-enacts-law-15270-2025-which-taxes-dividends-and-amend-personal-income-tax-rules/) · [tributação de dividendos 2026](https://dootax.com.br/tributacao-de-dividendos-lei-15270/)
- [Lei 14.754 — Receita Federal, perguntas e respostas (PDF)](https://www.gov.br/fazenda/pt-br/acesso-a-informacao/perguntas-frequentes/tributacao-offshore/29-4-24-perguntas-e-respostas-offshores-lei-14-754-e-in-rfb-2-180.pdf) · [Ministério da Fazenda — Q&A Lei 14.754 (PDF)](https://www.gov.br/fazenda/pt-br/assuntos/noticias/2023/dezembro/20-12-2023-mf-qa-lei-14754-offshores-limpo.pdf) · [como declarar investimentos no exterior](https://connection.avenue.us/educacional/tributacao/como-declarar-investimentos-no-exterior/)
- [Tickers ON, PN e unit — Inter](https://ajuda.inter.co/investimentos/o-que-sao-acoes-on-pn-e-unit-e-como-ler-tickers-na-b3) · [units na B3](https://www.b3.com.br/pt_br/market-data-e-indices/servicos-de-dados/market-data/consultas/mercado-a-vista/units/) · [BDRs de ETF — B3](https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/renda-variavel/brazilian-depositary-receipts-bdrs-de-etf.htm) · [APXM11 passa a VIML11](https://www.fundsexplorer.com.br/noticias/apxm11-muda-para-viml11)
