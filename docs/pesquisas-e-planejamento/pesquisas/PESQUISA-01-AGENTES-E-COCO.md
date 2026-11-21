# Como funcionam Claude Code, ChatGPT, Gemini (e o Jarvis) — e o que a Coco pode virar

Pesquisa de 24/10/2026. Feita com a skill `research` do My Brain. Cada afirmação
sobre a Coco veio do código no commit `adc0dad`; cada afirmação sobre os outros
sistemas veio da fonte citada. Onde a fonte é análise de terceiro e não
documentação oficial, está dito.

---

## Parte 1 · O que esses sistemas realmente são

### O laço, que é a única coisa que todos têm em comum

Os três são a mesma estrutura de cinco linhas:

```
enquanto verdadeiro:
    monta o contexto
    chama o modelo
    se a resposta é só texto → termina
    executa as ferramentas que ele pediu
    devolve os resultados ao contexto
```

O artigo do arXiv que dissecou o Claude Code chama isso literalmente de *"a simple
while-loop that calls the model, runs tools, and repeats"*. O Gemini CLI é descrito
como laço ReAct no mesmo formato. O que distingue os três **não é o laço** — é o
que cerca o laço.

Essa é a primeira conclusão útil: inteligência de agente não está no prompt nem no
modelo. Está no harness. O artigo nomeia o princípio: **"scaffolding mínimo e
harness operacional máximo"**.

### Claude Code

| Peça | Como é |
|---|---|
| Ferramentas | até 54 embutidas (19 incondicionais, 35 condicionais), mais as de servidores MCP; as de leitura rodam em paralelo, as que escrevem são serializadas |
| Contexto | pipeline de **cinco estágios** antes de cada chamada, do mais barato ao mais caro: redução de orçamento dos resultados → *snip* do histórico antigo → *microcompact* → *context collapse* → *auto-compact* (resumo pelo modelo) |
| Memória | hierarquia `CLAUDE.md` de quatro níveis, carregada de forma preguiçosa, mais memória automática escrita pelo próprio agente — tudo em **arquivos transparentes** |
| Skills | descrição carregada no início, conteúdo completo só na invocação |
| Subagentes | janela de contexto isolada; **só um resumo volta** ao pai (1–2 mil tokens de algo que pode ter sido muito maior) |
| Permissão | regras com precedência de negação, sete modos, classificador no modo automático, hooks e sandbox como camadas independentes |
| Hooks | 27 tipos de evento, cinco deles dentro do fluxo de permissão |
| Persistência | transcrições JSONL, basicamente *append-only* |

Treze princípios de design saem do artigo. Quatro valem para a Coco quase sem
tradução:

1. **Contexto é recurso escasso** — e por isso existe um pipeline inteiro só para
   decidir o que entra.
2. **Risco ponderado pela reversibilidade** — ação fácil de desfazer passa; ação
   difícil de desfazer escala para o humano.
3. **Configuração e memória em arquivos transparentes** — o usuário pode ler e
   editar o que o agente "sabe" sobre ele.
4. **Fronteiras isoladas para subagentes** — exploração custa contexto, então
   isola e devolve só a conclusão.

### ChatGPT

A camada que importa aqui é a **memória em dois níveis**: *saved memories* (lista
explícita, editável, que o usuário vê) e *reference chat history* (implícita, não
é lista). Mais **Custom Instructions** (texto fixo, estático, sob controle direto
do usuário) e **Projects** (escopo isolado — memória do chat principal não entra
no Project, e Project não vaza para outro Project).

A lição de produto não é técnica: é que a memória de um assistente pessoal precisa
ser **visível, editável e com escopo**. Memória que o usuário não enxerga nem
desliga é passivo jurídico num produto financeiro.

### Gemini CLI

O núcleo (`packages/core`) concentra laço, ferramentas, construção de prompt,
roteamento de modelo e política; a casca é só terminal. Ferramentas embutidas de
arquivo, shell, fetch e busca; o resto entra por MCP. Contexto em `GEMINI.md`
carregado em cascata (global → projeto, subindo os diretórios → subpastas), e o
**nome do arquivo é configurável** (aceita `AGENTS.md`, `CONTEXT.md`…). Sandbox em
Seatbelt do macOS ou container.

A lição: **separar o motor da interface**. O que a Coco tem hoje é o oposto — o
"motor" dela está espalhado entre o cliente (que monta o resumo) e a Edge
Function (que repassa). Não há um núcleo que se possa testar sozinho.

### Jarvis, e por que ele não é fantasia inútil

O Jarvis é ficção, então aqui não há fonte a citar — mas vale como especificação
de produto, porque o público já viu e já entendeu. Ele faz quatro coisas que
nenhum assistente financeiro brasileiro faz:

1. **Fala primeiro.** Não espera pergunta. "Senhor, os níveis de energia estão em
   15%" é monitoramento proativo com limiar.
2. **Tem estado do mundo.** Sabe onde as coisas estão sem perguntar, porque está
   ligado nos sensores — não num resumo que alguém montou para ele.
3. **Discorda.** "Não recomendo isso" é a parte que mais falta nos assistentes
   reais, que são todos obsequiosos.
4. **Tem continuidade.** Lembra do que aconteceu ontem e cobra o que ficou
   pendente.

Note que **nenhuma das quatro exige modelo melhor.** Todas exigem harness: gatilho
agendado, ferramenta de leitura, política de recusa e memória.

---

## Parte 2 · Engenharia reversa da Coco

### O que ela é hoje, em uma frase

**Uma única chamada de modelo sobre um pacote de dados que o navegador montou,
com duas ferramentas que só escrevem e nenhuma que lê.**

Caminho do texto (`supabase/functions/oaze-assistant/index.ts`):

```
navegador monta o resumo agregado
  → Edge Function valida, confere plano e cota
  → 1 chamada à Responses API (gpt-4o-mini, store:false)
  → texto de volta
```

O que entra na chamada (linhas 630–772):
- o resumo agregado do mês exibido, cortado pelo perfil do plano
- memórias confirmadas de `coco_memories`
- análises salvas de `coco_analyses`, **rotuladas no próprio prompt como
  `<analises_automaticas_nao_confiaveis>`**
- a conversa anterior
- a pergunta

As duas ferramentas (linha 737 em diante):
- `propor_lancamento` — prepara uma despesa/receita para o usuário revisar
- `propor_memoria` — propõe lembrar uma regra, só se o aprendizado não estiver
  pausado

O perfil por plano (`PERFIL`, linha 60) controla profundidade de verdade: Semente
recebe 3 meses, 6 categorias, 3 metas, resposta de 120 palavras, sem comparar e
sem simular; Oásis recebe 60 meses, 40 categorias, 20 metas, 350 palavras, compara
e simula.

### O diagnóstico: por que ela é rasa

**Ela não tem ferramenta de leitura.** Tudo que a Coco sabe chega pré-mastigado
num bloco único. Se o dado não veio no pacote, ela não tem como ir buscar. Pergunte
"quanto gastei em mercado em março do ano passado?" e, se aquele mês não estava no
recorte, ela só pode dizer que não sabe — ou, pior, inferir.

É o oposto da arquitetura dos três sistemas acima, em que **o modelo pede o que
precisa**. O `docs/ia-backend.md` já nomeia essa lacuna: "consultas autoritativas
no servidor com RLS e escopo por perfil". É o item número um da lista do que falta.

### A descoberta que inverte tudo

**A voz já tem o que o texto não tem.**

`supabase/functions/oaze-coco-realtime/prompts.ts` define `COCO_TOOLS` com três
ferramentas de leitura:

- `consultar_financas` — resumos autorizados do perfil ativo: receitas, despesas,
  saldo, categorias, metas, períodos
- `analisar_dividas` — retrato estruturado de obrigações, faturas, parcelas, caixa
  e fluxo passado/futuro
- `navegar_oaze` — abre uma tela sem alterar dado

E o `index.ts` da voz delega o raciocínio a `gpt-6-luna` com `reasoning: medium`,
enquanto o texto roda `gpt-4o-mini` sem raciocínio.

Ou seja: **a Coco falada é um agente; a Coco escrita é um resumidor.** A peça que
falta no texto já existe, testada, ao lado. Não é pesquisa nova — é fiação.

---

## Parte 3 · O caminho de atualização, em quatro degraus

Ordenados por "quanto muda a experiência dividido por quanto custa construir".

### Degrau 1 — Dar olhos à Coco escrita (o de maior retorno)

Mover `consultar_financas` e `analisar_dividas` do caminho da voz para o
`oaze-assistant`. Consequências:

- o pacote gigante de contexto pode encolher: em vez de enviar 14 mil tokens de
  resumo "por garantia", envia-se o mês corrente e deixa-se a Coco **pedir** o
  resto. Isso **reduz** custo por pergunta ao mesmo tempo que aumenta a capacidade
- as perguntas sobre períodos que hoje falham passam a funcionar
- o cálculo continua fora do modelo, como já está — a ferramenta devolve número
  pronto, e o modelo só narra. Esse é o princípio que o `INVESTIMENTOS-APIS` já
  escreveu: "cálculo determinístico fora do modelo"

Risco: cada ferramenta é uma superfície nova de RLS. A ferramenta precisa receber
`profile_id` e deixar o Postgres decidir, nunca o modelo.

### Degrau 2 — Trocar o modelo do texto

`gpt-4o-mini` custa US$ 0,15/1M entrada e US$ 0,60/1M saída. `gpt-6-luna` custa
US$ 0,10/1M e US$ 0,50/1M — **mais barato e muito melhor**, e já é o modelo que a
voz usa para raciocinar. Trocar `OPENAI_MODEL` é uma variável de ambiente. Isso
está na seção de custo do documento de precificação: a conta cai ~30%.

### Degrau 3 — Memória visível, no padrão do ChatGPT

`coco_memories` já tem `kind`, `label`, `value`, `source` e `coco_settings` já tem
`learning_paused`. A estrutura está pronta; o que falta é a **tela**: uma lista que
o usuário lê, edita e apaga, com a origem de cada item ("você me pediu isso em
12/09"). Sem essa tela, memória automática num app financeiro é risco, não
recurso — e o ChatGPT mostra que a lista editável é o padrão que o público já
espera.

### Degrau 4 — O lado Jarvis: monitoramento proativo

É o degrau que muda a categoria do produto, e o único que precisa de infra nova
(agendador). O desenho que o `open-finance...` já propôs — sugerir, nunca executar
— vale aqui:

- limiar em vez de relatório: "a fatura do Nubank fechou 40% acima da média dos
  três meses anteriores"
- *opt-in* com frequência e horário silencioso
- cada alerta carrega o cálculo que o gerou, para o usuário poder discordar
- **e a Coco precisa poder discordar dele**: "você pediu para eu lembrar de cortar
  o streaming, e você assinou outro ontem" é o Jarvis, e é a coisa que nenhum
  concorrente brasileiro faz

### O que NÃO fazer

- **Não** dar à Coco ferramenta que escreve sozinha. O contrato atual — "o modelo
  interpreta e propõe; o backend confere, e a pessoa aprova qualquer escrita
  financeira" — é o ativo mais valioso do produto e é exatamente o
  "risco ponderado pela reversibilidade" do artigo. Agente financeiro que
  movimenta dinheiro sozinho é um processo judicial esperando acontecer.
- **Não** usar IA generativa como primeira camada de categorização. Já está
  decidido e escrito na pesquisa de Open Finance, e continua certo: categoria
  precisa ser barata, rápida, auditável e consistente.
- **Não** subagentes aqui. O padrão existe para explorar espaços grandes de código;
  o espaço financeiro de uma pessoa cabe numa consulta SQL.

---

## O que permanece incerto

- Os detalhes internos do Claude Code vêm de engenharia reversa publicada, não de
  documentação da Anthropic. As fontes divergem, por exemplo, no gatilho da
  compactação (uma diz ~50% da janela, outra ~92%).
- O limite de 1.500 caracteres das Custom Instructions do ChatGPT vem de um blog,
  não da OpenAI.
- Não achei nada sobre a arquitetura do Antigravity do Google; só o Gemini CLI.
- Preço de `gpt-6-luna` e `gpt-live-1` vem de agregadores de terceiros. Conferir na
  página oficial antes de orçar.

## Fontes

- [Dive into Claude Code: The Design Space of Today's and Future AI Agent Systems (arXiv)](https://arxiv.org/html/2604.14228v1)
- [Claude Code Architecture (Reverse Engineered)](https://vrungta.substack.com/p/claude-code-architecture-reverse)
- [Inside Claude Code: Tools, Memory, Hooks, and MCP](https://www.penligent.ai/hackinglabs/inside-claude-code-the-architecture-behind-tools-memory-hooks-and-mcp/)
- [Extend Claude Code — documentação oficial](https://code.claude.com/docs/en/features-overview)
- [ChatGPT Memory & Custom Instructions: 2026 Setup Guide](https://www.inkeybit.com/blog/chatgpt-memory-custom-instructions)
- [ChatGPT Features 2026: Projects, Memory, Agent](https://suprmind.ai/hub/chatgpt/features/)
- [gemini-cli no GitHub](https://github.com/google-gemini/gemini-cli)
- [Gemini CLI: Google's Open Agent Harness](https://innfactory.ai/en/ai-harness/gemini-cli/)
- [Gemini CLI — visão de arquitetura](https://zread.ai/google-gemini/gemini-cli/6-architecture-overview)
- [LLM Agent Architectures in 2026: Core Components and Patterns](https://futureagi.com/blog/llm-agent-architectures-core-components/)
- [Agent Architecture Patterns: 2026 Taxonomy](https://www.digitalapplied.com/blog/agent-architecture-patterns-taxonomy-2026)
