# Cores e logos das marcas: o que existe, o que falta, e o que é usável no escuro

Pesquisa de 24/10/2026. Complemento do `PESQUISA-02`. Aqui não há opinião sobre
cor: os hex foram **extraídos do simple-icons via CDN**, um por um, e o contraste
foi **calculado**, não estimado. A ferramenta que gerou a tabela está nesta pasta
(`ferramenta-contraste-marcas.js`) — dá para rodar de novo com `node`.

---

## 1 · A descoberta: o OAZE já resolveu isso, só não para marcas

Antes de propor qualquer coisa, o que já existe no repositório:

| Camada | Onde | O que guarda |
|---|---|---|
| **Cor real da marca** | `assets/vendor/bancos.js` | **41 bancos**, cada um com `cor` (frente), `fundo`, `formato`, `tamanho` — mais o **SVG inline** em `ICONES`. Nubank `#820AD1`, Itaú `#EC7000`, Inter `#FF7A00`, Bradesco `#CC092F` |
| **Correção para o plástico** | `CARD_PLASTIC`, em `preview-v3/app.js:234` | exceções onde a cor real não funciona no cartão: `itau:'#F3BC45'`, `bancodobrasil:'#F8D71A'`, `c6:'#242424'` |
| **Acento na paleta do OAZE** | `Store.BANK_PRESETS` | versões **dessaturadas**: Nubank `#7B5A8E`, Itaú `#9A5F35` — harmonizadas com a identidade |
| **Guarda de contraste** | `safeColor()` + a regra `preset.fundo === '#FFFFFF' ? preset.cor : preset.fundo` | se o fundo da marca é branco, usa a cor da frente no lugar |

E a origem do dado: `tools/gen-bancos.js` **vendoriza** o pacote npm
`@edusites/bancos-brasil` para `window.BancosBR = { ICONES, PRESETS }`, porque "o
app roda como HTML solto (file://) e como arquivo único no iPhone. Não há bundler
nem CDN em runtime."

**Então o pedido do item 2 não precisa de arquitetura nova.** Precisa de um
`assets/vendor/marcas.js` com a mesma forma, gerado pelo mesmo tipo de script, e
consumido pela mesma função de guarda. Três camadas, não uma: cor real, exceção de
uso, acento da paleta.

⚠️ **Contradição que encontrei e não resolvi:** o `CONTEXTO-SESSAO-2026-10-14.md`
diz que "o plástico dos cartões segue a cor da instituição (Itaú laranja, Nubank
roxo), não a paleta do OAZE — decisão confirmada". Mas `BANK_PRESETS` guarda cores
dessaturadas. As duas coisas só são compatíveis se `BANK_PRESETS` for usada para
outra coisa (acento, categoria) e o plástico vier de `bancos.js` + `CARD_PLASTIC`
— que é o que o código sugere. Vale confirmar antes de estender o padrão.

---

## 2 · A fonte de dados: simple-icons

[simple-icons](https://github.com/simple-icons/simple-icons) tem **3.400+ marcas**,
licença **CC0-1.0**, e cada ícone carrega **o hex oficial da marca** junto do path
SVG. É instalável por npm, serve por CDN, e é exatamente o formato que o
`gen-bancos.js` já sabe vendorizar.

⚠️ **CC0 cobre o arquivo do ícone, não a marca.** Logo continua sendo marca
registrada do dono. Usar para identificar a compra do usuário é uso nominativo e
razoável; usar em material de venda do OAZE é outra conversa.

### O teste de cobertura que eu rodei

Consultei **87 slugs** no CDN, um por um, e separei por resposta HTTP.

**Presentes (26, com hex oficial extraído):** Netflix, Spotify, YouTube, HBO Max,
Max, Apple Music, iFood, Uber, Shopee, AliExpress, Carrefour, Nubank, PicPay,
Mercado Pago, Vivo, Telefônica, Shell, McDonald's, Burger King, Starbucks, Google
Play, Notion, Udemy, Figma, Gemini, Anthropic.

**Ausentes (61).** Por grupo:

| Grupo | Ausentes |
|---|---|
| Streaming | Disney+, Prime Video, Globoplay |
| Varejo | **Mercado Livre**, **Amazon**, Magalu, Americanas, Casas Bahia, Dafiti, Netshoes, Centauro |
| Mercado | Assaí, Atacadão, Pão de Açúcar, Extra |
| Farmácia | Drogasil, Droga Raia, Panvel, Ultrafarma |
| Telecom | Claro, TIM, Oi |
| Utilities | Sabesp, Enel, CPFL, Copel, Comgás |
| Academia | Smart Fit, Gympass, TotalPass |
| Combustível | Ipiranga |
| Delivery | Rappi |
| Software | **Microsoft**, Adobe, Canva, OpenAI |
| Bancos | Itaú, Bradesco, Santander, BB, Caixa, Inter — *mas esses já estão no `bancos.js`* |

**Duas conclusões, e a segunda é a que importa:**

1. **O varejo, a telecom e as utilities brasileiras praticamente não existem no
   simple-icons.** São justamente os lançamentos mais frequentes de um brasileiro.
   Cobertura global boa, cobertura local ruim.
2. **Parte das ausências é jurídica, não técnica.** Amazon e Microsoft saíram do
   simple-icons após pedido dos donos da marca. Ou seja: há empresas que pediram
   para não ter o logo distribuído. Isso é informação de risco, não detalhe —
   shipar o logo de quem pediu para sair é decisão consciente, não descuido.

→ **Veredito:** simple-icons resolve a cauda global de graça e offline. A cauda
brasileira tem de ser feita à mão, como o `bancos-brasil` foi.

---

## 3 · A tabela: cor, texto e o que sobrevive no escuro

Calculado contra o painel do v3 (`#132633`) e a página (`#0d1821`), por WCAG 2.1 —
4,5:1 para texto normal, **3:1 para limite de componente de interface**.

Três colunas que importam:
- **Texto em cima**: branco ou preto, escolhido por contraste — é o par `cor`/`fundo`
  que o `bancos.js` já usa
- **Cru no painel**: se a cor da marca, usada como ponto ou aro fino sobre o painel
  escuro, é visível
- **Aro no painel**: quando reprova, a cor clareada até passar 3:1, mantendo o matiz

| Marca | Slug | Marca (hex) | Texto em cima | Contraste do texto | Cru no painel | Aro no painel (≥3:1) | Categoria | Recorrente |
|---|---|---|---|---|---|---|---|---|
| Netflix | `netflix` | `#E50914` | branco | 4.79:1 | 3.24:1 ✅ | `#E50914` (serve cru) | Streaming | assinatura |
| Spotify | `spotify` | `#1ED760` | preto | 10.94:1 | 8.09:1 ✅ | `#1ED760` (serve cru) | Streaming | assinatura |
| YouTube | `youtube` | `#FF0000` | preto | 5.25:1 | 3.88:1 ✅ | `#FF0000` (serve cru) | Streaming | assinatura |
| HBO Max | `hbomax` | `#000000` | branco | 21.00:1 | 1.35:1 ❌ | `#707070` (+44% branco) | Streaming | assinatura |
| Max | `max` | `#525252` | branco | 7.81:1 | 1.99:1 ❌ | `#6E6E6E` (+16% branco) | Streaming | assinatura |
| Apple Music | `applemusic` | `#FA243C` | preto | 5.38:1 | 3.98:1 ✅ | `#FA243C` (serve cru) | Streaming | assinatura |
| iFood | `ifood` | `#EA1D2C` | preto | 4.71:1 | 3.48:1 ✅ | `#EA1D2C` (serve cru) | Alimentação | — |
| Uber | `uber` | `#000000` | branco | 21.00:1 | 1.35:1 ❌ | `#707070` (+44% branco) | Transporte | — |
| Shopee | `shopee` | `#EE4D2D` | preto | 5.73:1 | 4.24:1 ✅ | `#EE4D2D` (serve cru) | Compras | — |
| AliExpress | `aliexpress` | `#FF4747` | preto | 6.24:1 | 4.62:1 ✅ | `#FF4747` (serve cru) | Compras | — |
| Carrefour | `carrefour` | `#004E9F` | branco | 8.11:1 | 1.91:1 ❌ | `#3371B2` (+20% branco) | Mercado | — |
| Nubank | `nubank` | `#820AD1` | branco | 7.21:1 | 2.15:1 ❌ | `#9E40DB` (+22% branco) | Banco | — |
| PicPay | `picpay` | `#21C25E` | preto | 8.94:1 | 6.61:1 ✅ | `#21C25E` (serve cru) | Banco | — |
| Mercado Pago | `mercadopago` | `#00B1EA` | preto | 8.48:1 | 6.27:1 ✅ | `#00B1EA` (serve cru) | Banco | — |
| Vivo | `vivo` | `#415FFF` | branco | 4.88:1 | 3.18:1 ✅ | `#415FFF` (serve cru) | Telefonia | assinatura |
| Telefônica | `telefonica` | `#0066FF` | branco | 4.83:1 | 3.21:1 ✅ | `#0066FF` (serve cru) | Telefonia | assinatura |
| Shell | `shell` | `#FFD500` | preto | 14.77:1 | 10.92:1 ✅ | `#FFD500` (serve cru) | Combustível | — |
| McDonald's | `mcdonalds` | `#FBC817` | preto | 13.38:1 | 9.89:1 ✅ | `#FBC817` (serve cru) | Alimentação | — |
| Burger King | `burgerking` | `#D62300` | branco | 5.12:1 | 3.03:1 ✅ | `#D62300` (serve cru) | Alimentação | — |
| Starbucks | `starbucks` | `#006241` | branco | 7.44:1 | 2.09:1 ❌ | `#297B5F` (+16% branco) | Café | — |
| Google Play | `googleplay` | `#414141` | branco | 10.21:1 | 1.52:1 ❌ | `#6F6F6F` (+24% branco) | Tecnologia | assinatura |
| Notion | `notion` | `#000000` | branco | 21.00:1 | 1.35:1 ❌ | `#707070` (+44% branco) | Tecnologia | assinatura |
| Udemy | `udemy` | `#A435F0` | branco | 4.83:1 | 3.21:1 ✅ | `#A435F0` (serve cru) | Educação | — |
| Figma | `figma` | `#F24E1E` | preto | 5.88:1 | 4.35:1 ✅ | `#F24E1E` (serve cru) | Tecnologia | assinatura |
| Gemini | `googlegemini` | `#8E75B2` | preto | 5.34:1 | 3.95:1 ✅ | `#8E75B2` (serve cru) | Tecnologia | assinatura |
| Anthropic | `anthropic` | `#191919` | branco | 17.58:1 | 1.13:1 ❌ | `#707070` (+38% branco) | Tecnologia | assinatura |

Painel #132633 · Página #0d1821

### O que a tabela revela

**9 das 26 reprovam (35%).** Carrefour, Nubank, Starbucks, Google Play, Max e
Anthropic reprovam por serem escuras; Uber, Notion e HBO Max reprovam por serem
**preto puro** — 1,35:1 contra o painel, praticamente invisível.

E aqui está o achado que muda o desenho: **todas as marcas de logo preto clareiam
para o mesmo cinza `#707070`.** Uber, Notion, HBO Max e Anthropic ficariam
idênticas. Ou seja:

> Para marca de identidade preta ou branca, **a cor não pode carregar a
> identificação — o ícone tem de carregar.** Qualquer interface que distinga marca
> só por bolinha colorida falha exatamente nas marcas mais famosas.

Segundo achado: **as cores que passam cru são as quentes e saturadas** (vermelho,
laranja, amarelo, verde-limão). As frias e escuras — azul institucional, verde
garrafa, roxo profundo — quase todas reprovam no escuro. É o oposto do que a
intuição sugere, porque num tema escuro o que importa é luminosidade, não matiz.

Terceiro: **Netflix passa raspando** (3,24:1) e **iFood também** (3,48:1). Num tema
ligeiramente mais claro, as duas cairiam. A conta tem de ficar no código, não numa
planilha — é por isso que a ferramenta vai nesta pasta.

---

## 4 · O formato de registro que eu recomendaria

Juntando o que o `bancos.js` já faz, o que o `PESQUISA-02` concluiu e o que a
tabela acima mostra:

```js
{
  chaves:     ['netflix', 'netflix.com', 'netflix brasil', 'netflix entretenim'],
  nome:       'Netflix',
  // as três cores, porque servem a três usos diferentes
  fundo:      '#E50914',   // preenchimento de chip, plástico, avatar
  cor:        '#FFFFFF',   // texto em cima do fundo — calculado, não escolhido
  aro:        '#E50914',   // ponto/borda sobre o painel escuro; clareado se reprovar
  icone:      'netflix',   // slug do simple-icons; o SVG vem vendorizado
  categoria:  'Streaming',
  recorrente: { frequencia: 'mensal', confianca: 0.95 },
  fonte:      'simple-icons@16'
}
```

Quatro regras que saem da pesquisa:

1. **`cor` é calculada, nunca digitada.** Branco ou preto, o que passar 4,5:1. O
   `bancos.js` já faz isso; a ferramenta desta pasta calcula para qualquer hex novo.
2. **`aro` é obrigatória e separada de `fundo`.** 35% das marcas precisam dela.
   Sem esse campo, a terça parte da tabela fica invisível no escuro.
3. **`fonte` fica no registro.** Quando um logo for retirado do simple-icons — como
   Amazon e Microsoft foram — dá para saber o que precisa ser substituído.
4. **`recorrente` só onde é verdade.** Streaming e telefonia sim; mercado e
   combustível não. É esse campo que faz o sistema oferecer "acompanhar como
   assinatura?" sem chutar.

### O que fazer com as 61 ausentes

Nenhuma IA resolve isso: é trabalho manual, uma vez, versionado. Para cada marca
brasileira que falta, o caminho honesto:

1. cor tirada do **material de marca oficial** da empresa, não de screenshot
2. `cor` e `aro` calculadas pela ferramenta
3. ícone: ou SVG próprio redesenhado, ou **nenhum ícone** com a inicial sobre o
   `fundo` — que é o que o `bancos.js` já faz com `formato`/`tamanho`
4. e, onde não houver direito claro de usar o logo, **inicial sobre a cor resolve**:
   identifica, não infringe

Prioridade pelas que mais aparecem em extrato brasileiro: **Mercado Livre, Magalu,
Americanas, Claro, TIM, Assaí, Atacadão, Pão de Açúcar, Drogasil, Droga Raia,
Rappi, Smart Fit, Ipiranga, Enel, Sabesp** — quinze marcas cobrem a maior parte do
que falta.

---

## O que permanece incerto

- **Cobertura real**: testei 87 slugs. Um slug 404 pode ser nome errado em vez de
  marca ausente — conferi alternativas para os principais (ex.: `disneyplus`,
  `disney`, `amazonprime`, `amazonprimevideo` todos 404), mas não para todos.
- **Por que Amazon e Microsoft saíram**: a remoção é fato observado no CDN; a
  atribuição a pedido do titular é o que se sabe publicamente, e não confirmei em
  fonte primária.
- **Licença de uso dos logos no produto**: CC0 é do arquivo. Uso da marca em app
  comercial é questão de marca registrada, e isso é pergunta para advogado, não
  para pesquisa técnica.
- **Hex das 61 ausentes**: não inventei nenhum. A tabela só tem o que foi extraído.
- **A contradição do `BANK_PRESETS`** descrita na seção 1 continua aberta.

## Fontes

- [simple-icons no GitHub](https://github.com/simple-icons/simple-icons) · [simple-icons no npm](https://www.npmjs.com/package/simple-icons) · [licença CC0 e versão, via jsDelivr](https://www.jsdelivr.com/package/npm/simple-icons) · [comparação de bibliotecas de ícone 2026](https://allsvgicons.com/blog/best-free-svg-icon-libraries-2026/)
- Hex de cada marca: extraídos de `https://cdn.simpleicons.org/<slug>` em 24/10/2026
- Contraste: WCAG 2.1, calculado por `ferramenta-contraste-marcas.js` nesta pasta
- Código do OAZE, commit `adc0dad`: `assets/vendor/bancos.js`, `tools/gen-bancos.js`, `assets/js/store.js`, `preview-v3/app.js`
