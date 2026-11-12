# Inteligência fora da Coco: o sistema entendendo o que o usuário digita

Pesquisa de 24/10/2026. O pedido: o usuário escreve "netflix" e o sistema entende
que é assinatura recorrente, dá o logo e a categoria; o usuário cria um cartão
"outros" e escreve "99", e o sistema entende que é o app de corridas, põe o logo e
escolhe a cor.

Isto **não é a Coco**. É uma camada diferente, com requisito diferente: tem de
responder em menos de 100 ms, custar perto de zero, funcionar offline e **nunca
travar o formulário**. A Coco pode demorar 3 segundos e pedir confirmação; o
autocompletar de um campo não pode.

---

## A arquitetura certa: cascata, não IA

A pesquisa de Open Finance do próprio projeto já cravou o princípio — *"não usar IA
generativa como primeira camada; categoria financeira precisa ser barata, rápida,
auditável e consistente"*. Vale igual aqui. A cascata, do mais barato ao mais caro:

| # | Camada | Latência | Custo | Cobre |
|---|---|---|---|---|
| 1 | Correção que o usuário já fez para aquele nome | 0 ms | 0 | o caso mais comum depois da primeira vez |
| 2 | Regra do usuário / do espaço financeiro | 0 ms | 0 | "mercado x" → Alimentação |
| 3 | **Dicionário local de marcas** (no bundle) | 0 ms | 0 | as ~300 marcas que cobrem a maioria das compras no Brasil |
| 4 | Normalização + heurística de texto | 1 ms | 0 | "PIX ENVIADO JOAO", "COMPRA DEBITO", ruído bancário |
| 5 | Consulta de CNPJ (quando houver CNPJ) | 300 ms | ~0 | nome fantasia e CNAE reais |
| 6 | API de enriquecimento/logo | 400 ms | pago | cauda longa internacional |
| 7 | Modelo de linguagem | 1–3 s | pago | só o que sobrou, e só com confirmação |

**O degrau 3 é o que resolve o pedido dele.** "Netflix" e "99" não precisam de IA
nenhuma: precisam de uma tabela.

### Por que o dicionário local ganha

O projeto **já tem a prova de conceito**: `Store.BANK_PRESETS` resolve banco →
cor → ícone sem rede e sem IA, e a decisão de que "o plástico do cartão segue a cor
da instituição (Itaú laranja, Nubank roxo), não a paleta do OAZE" está confirmada
no `CONTEXTO-SESSAO`. O que o pedido descreve é **o mesmo mecanismo estendido de
bancos para marcas em geral**.

Um registro por marca:

```
{
  chaves:    ["netflix", "netflix.com", "netflix brasil", "netflix entretenim"],
  nome:      "Netflix",
  categoria: "Streaming",
  cor:       "#E50914",
  icone:     "tv",
  recorrente: { frequencia: "mensal", confianca: 0.95 }
}
```

E para o caso do "99":

```
{
  chaves:    ["99", "99app", "99 pop", "99 taxi", "99pay"],
  nome:      "99",
  categoria: "Transporte",
  cor:       "#FFD400",
  icone:     "car"
}
```

Note o que o registro da Netflix carrega e o do 99 não: **`recorrente`**. É isso
que atende a segunda metade do pedido — o sistema não só categoriza, ele sabe que
streaming é assinatura e pode oferecer "quer acompanhar como recorrência?".

### O "99" é o caso que prova a regra

"99" é um teste difícil de propósito, e mostra por que texto puro falha e tabela
funciona:

- `"99"` sozinho pode ser valor, quantidade, dígito de cartão ou a empresa
- a desambiguação vem do **campo**: em "nome da instituição" de um cartão, "99" é a
  empresa; em "valor", é número
- **contexto do campo é parte da chave de busca.** Um resolvedor que ignore em que
  campo o texto foi digitado vai errar esse caso sempre

Isso tem uma consequência de desenho: a função não é `resolver(texto)`, é
`resolver(texto, campo)` — onde `campo` é `instituicao | lancamento | categoria |
investimento`.

---

## As fontes externas, quando a tabela não cobre

### Logos e marcas

| Serviço | O que entrega | Observação |
|---|---|---|
| [Logo.dev — Transaction Enrichment](https://www.logo.dev/products/merchant-transaction-api) | descritor cru → nome, domínio, logo, categoria; índice de 50M+ empresas | **em beta privado**; sinaliza ambíguo em vez de chutar — comportamento certo |
| [Brandfetch — Transaction API](https://docs.brandfetch.com/docs/transaction-api) | texto de pagamento → domínio → nome, logo, indústria | indexa ao vivo o que não tem; 50M+ marcas |
| [Context.dev](https://www.context.dev/data/transaction-identification-api) | `by_transaction` com descritor + país, cidade, MCC, telefone opcionais | tem `high_confidence_only` |

**Lacuna confirmada na pesquisa:** nenhuma das três documenta cobertura de
comerciante brasileiro, descritor em português ou casamento por CNPJ. Antes de
contratar qualquer uma, o teste é obrigatório: pegar 200 descritores reais de
extrato brasileiro e medir a taxa de acerto. Se der menos de 70%, o dicionário
local faz mais pelo produto do que a API.

### CNPJ, que é a vantagem brasileira

Quando o lançamento vier com CNPJ (e vem, no Pix e no Open Finance), a resolução é
determinística — não estatística:

- [BrasilAPI](https://brasilapi.com.br) e ReceitaWS devolvem razão social, nome
  fantasia e CNAE principal e secundários
- **CNAE → categoria é um mapa fixo**: CNAE 5611-2/01 (restaurantes) → Alimentação.
  Isso é melhor que qualquer modelo, porque é a classificação oficial da atividade
- limites: ReceitaWS no gratuito gira em torno de 3 chamadas/minuto e 130 mil/mês;
  BrasilAPI é serviço comunitário, sem SLA. Ambos servem para **enriquecer em
  segundo plano e cachear**, nunca para bloquear um formulário
- e só dá para consultar **por CNPJ**, não por nome — as APIs públicas da Receita
  não fazem busca reversa

### A cor do cartão, que é o detalhe mais bonito do pedido

Três caminhos, em ordem de qualidade:

1. **cor na tabela** — é o que `BANK_PRESETS` já faz, e é o único que garante a cor
   certa da marca
2. **extrair do logo** — pegar a cor dominante do SVG/PNG e ajustar para passar em
   contraste. Funciona para a cauda longa, mas pode produzir cor feia ou ilegível
3. **paleta por categoria** — fallback honesto: transporte puxa um tom, alimentação
   outro

O passo 2 precisa de uma trava que o projeto já valoriza: **a cor escolhida tem de
passar no contraste** antes de ir para a tela — o repositório já tem
`tools/testes/contraste.js`, e uma cor vinda de logo de terceiro é exatamente o
tipo de entrada que quebraria a acessibilidade sem ninguém notar.

---

## O que isso muda em cada lugar do produto

| Onde | Hoje | Com a camada |
|---|---|---|
| Novo lançamento | digita descrição, escolhe categoria na lista | digita "netflix", já vem Streaming + logo + "acompanhar como assinatura?" |
| Novo cartão/conta | escolhe banco na lista; "Outros" fica sem cara | digita "99", vem logo e cor; `BANK_PRESETS` deixa de ser lista fechada |
| Importação de extrato | revisão linha por linha | linhas resolvidas vêm pré-categorizadas com a marca, e só as incertas pedem olho |
| Recorrências | usuário cria na mão | marca conhecida como assinatura sugere a recorrência na hora |
| Categorias | 53 ícones escolhidos à mão | ícone sugerido pela marca |
| Coco | recebe "descrição: compra 47,90" | recebe "Netflix · Streaming · assinatura" — **contexto melhor sem custo de token** |

A última linha é a que vale mais e é a menos óbvia: **enriquecer o dado antes
melhora a Coco mais do que trocar o modelo da Coco.** Ela deixa de raciocinar
sobre texto bancário sujo e passa a raciocinar sobre fatos limpos.

---

## As três regras que isso não pode quebrar

1. **Confiança explícita, igual à da categorização.** A pesquisa de Open Finance já
   fixou os cortes e eles valem aqui: ≥ 0,92 aplica e mostra "sugerido pelo OAZE";
   0,65–0,91 sugere e pede confirmação; < 0,65 não chuta. "Sem categoria" é
   resposta melhor que categoria errada.
2. **Nunca bloquear o formulário.** A resolução local é síncrona; a de rede é
   oportunista, com *debounce* e cancelamento. Se a rede falhar, o campo continua
   manual — é exatamente o padrão que a prévia de aporte já adota ("sem a chave, o
   formulário continua manual").
3. **Não mandar texto de lançamento para fora sem consentimento.** O
   `docs/ia-backend.md` é explícito: hoje a OpenAI recebe **só resumo agregado**, e
   "o aceite atual para resumos agregados não autoriza uma ampliação silenciosa do
   conteúdo enviado". Mandar "Netflix" para uma API de logo é mandar um descritor
   de compra para um terceiro. Isso exige atualizar privacidade e fornecedores
   **antes**, e é mais um argumento a favor do dicionário local: ele resolve as
   marcas comuns **sem nenhuma requisição sair do aparelho**.

---

## Recomendação

Construir o degrau 3 e parar. Uma tabela de ~300 marcas brasileiras com nome,
categoria, cor, ícone e flag de recorrência — montada à mão, versionada no repo,
no mesmo formato de `BANK_PRESETS` — resolve a quase totalidade dos casos que o
usuário vai digitar, custa zero por consulta, funciona offline, é auditável e não
manda nada para ninguém.

API de enriquecimento e modelo de linguagem entram depois, só para a cauda longa, e
só depois de medir com descritores reais quanto eles realmente acrescentam.

## O que permanece incerto

- Cobertura das três APIs para comerciante brasileiro: **não documentada**. Precisa
  de teste com dados reais.
- Limites exatos de BrasilAPI e ReceitaWS: os números encontrados são de terceiros.
- Se a licença das APIs de logo permite cachear a imagem localmente — isso muda a
  arquitetura (cachear é obrigatório para latência) e precisa ser lido no contrato.
