# FASE 04 · Arquitetura multiplataforma do OAZE

Decidida em 06/10/2026, depois da auditoria em `10-AUDITORIA.md`. Este documento
justifica cada escolha antes de a migração começar, como o briefing pede.

## D1 · A casca: núcleo web + Capacitor + Tauri

**Mantida.** A decisão já estava tomada em `02-TRD.md` e a auditoria a confirma: o
motor contábil, as automações e as regras de fatura existem em TypeScript, com 58 testes,
e são a parte caríssima de refazer.

| Candidato | Veredito | Por quê |
|---|---|---|
| **Núcleo React 19 + TS + Vite · Capacitor (iOS/Android) · Tauri 2 (Windows/macOS)** | **escolhido** | 100 % do domínio compartilhado; um build serve às quatro lojas e ao navegador; desktop leve porque usa o webview do sistema; Rust disponível para o que só o sistema resolve (chaveiro, Windows Hello, Touch ID) |
| Flutter | descartado | reescreveria `domain/calc.ts` em Dart — 696 linhas de regra contábil madura e testada. Custo altíssimo, ganho nenhum numa interface que é lista, cartão e gráfico |
| React Native + camada desktop | descartado | celular bom, desktop fraco (RN-Windows/macOS são de segunda classe); dois empacotadores de qualquer jeito, e aí Capacitor+Tauri entregam mais |
| Nativo nas quatro linguagens | descartado | quatro bases para uma pessoa manter |
| WebView em volta do site atual | **proibido pelo briefing** e tecnicamente errado: o OAZE 1 não tem fila offline, armazenamento cifrado nem biometria |

**O que isso custa, dito na cara:** a interface é web em todas as plataformas. Gesto e
rolagem precisam ser trabalhados à mão para não "cheirar a site" — e é exatamente o que
as Fases 07 e 08 fazem. Tauri usa WebView2 no Windows e WebKit no macOS, então há duas
engines a testar no desktop, não uma.

## D2 · Um app, não um monorepo

O briefing sugere `apps/mobile`, `apps/desktop`, `packages/*`. **Não vamos fazer isso**,
e a razão é concreta: mobile e desktop **não são dois aplicativos**. São o mesmo bundle
`dist/` — `npx cap sync` copia para Android e iOS, e o Tauri aponta `frontendDist`
para a mesma pasta. Criar `apps/mobile` e `apps/desktop` produziria duas pastas com o
mesmo conteúdo e um gerenciador de workspaces para resolver um problema que não existe.

A separação que o briefing realmente quer — lógica compartilhada separada das interfaces
específicas — é obtida por **camadas dentro de `src/`**, com a regra de dependência
verificada por teste (`tests/architecture.test.ts`):

```
app/src/
  design-system/   tokens (cores, tipo, espaço, raio, sombra, blur, motion,
                   breakpoints, estados), primitivos de interface e o campo de
                   partículas — que mora aqui, e não em `ui/`, porque `Button`
                   e `Loading` dependem dele: deixá-lo acima criaria ciclo
  domain/          regras puras, centavos inteiros       ← não importa nada acima
  core/            api · auth · sync · storage · ai · notifications · telemetry
  platform/        a ÚNICA camada que sabe em qual loja está
    native/        adaptadores Capacitor e Tauri, carregados sob demanda
  state/           estado imutável, rotas, segurança, sessão
  coco/            inteligência no aparelho
  ui/              componentes compostos, incl. o campo de partículas
  shell/           cascas de navegação: phone · tablet · desktop
  screens/         telas
```

**Regra de dependência** (de baixo para cima, nunca o contrário):

```
design-system ← domain ← platform ← core ← state ← coco ← ui ← screens ← shell
```

`domain/` não importa de ninguém: é regra pura. `platform/` fica **abaixo** de `core/`,
porque é `platform()` que diz em qual loja o app está e é `core/storage` quem pergunta
para escolher o cofre. A casca fica no topo porque é ela que monta as telas — tela não
conhece casca. E **nada** importa de `platform/native` a não ser `platform/` e `core/`.

`import type` não conta como aresta: o TypeScript apaga esses imports na compilação,
então não geram dependência em execução nem ciclo, e proibi-los só duplicaria tipo.

Quem garante isso é `src/architecture.test.ts`, não este parágrafo. O teste também
recusa arquivo com mais de 700 linhas, segredo parecido com chave e `TODO` esquecido.
As exceções à regra estão declaradas lá, uma por uma, com motivo — e o teste falha se
uma exceção virar mentira por o import ter sido removido.

## D3 · A inteligência é um campo de partículas, não um personagem

O briefing é explícito: *"Não criar um mascote para isso. A inteligência deve aparecer
como uma composição abstrata de pequenas partículas."* O OAZE tem hoje a **Coco**, um
personagem em 20 arquivos WebP, usada como botão da IA, como rosto das notas e como
ilustração de telas vazias.

**Decisão.** A **representação do estado da inteligência** passa a ser um campo de
partículas (`ui/intelligence/`), com os seis estados pedidos — `idle`, `listening`,
`thinking`, `processing`, `success`, `error`. É ele que ocupa o botão da IA, o cabeçalho
do painel de conversa e qualquer lugar onde o sistema precise dizer "estou pensando".

A Coco **não é apagada**: continua como personagem de marca nas telas de boas-vindas e
de estado vazio, onde o papel é acolher, não indicar processamento. Apagá-la seria
destruir 20 ativos aprovados e a voz do produto, e o briefing manda preservar
identidade. O que ela deixa de ser é o *indicador de inteligência* — esse papel é das
partículas. Se Jonatham quiser a Coco fora também das ilustrações, é uma linha em
`ui/bits.tsx`.

**Como as partículas funcionam** (`design-system/intelligence/`):

- um `<canvas>` por campo, uma única `requestAnimationFrame` compartilhada entre todos
  os campos vivos — não uma por instância;
- pausa quando a aba perde visibilidade e quando o campo sai do viewport
  (`IntersectionObserver`): bateria é requisito, não detalhe;
- `prefers-reduced-motion` → o campo desenha um quadro estático e para o laço;
- movimento circular imperfeito, com ruído por partícula (fase e raio próprios), nunca
  uma órbita perfeita, para não ler como *spinner*;
- a troca de estado é interpolada, não um corte: cada partícula caminha para o novo
  alvo com mola amortecida.

## D4 · Sincronização: documento por espaço, fusão por entidade

O banco do OAZE 1 tem duas fontes da verdade (P7) e isso precisa terminar — mas sem
tocar no que está no ar com usuários reais.

**Decisão.** O OAZE 2 grava num par de objetos **novos**, versionados, que não colidem
com o `dados` do OAZE 1:

| Peça | Para quê |
|---|---|
| tabela `oaze2_spaces` (`id`, `user_id`, `rev`, `payload` jsonb, `updated_at`, `deleted_at`) | um registro por espaço de trabalho; `rev` é um inteiro que só cresce |
| RPC `oaze2_save_space(p_id, p_expected_rev, p_payload)` | gravação atômica com revisão otimista: se `rev` no banco ≠ `p_expected_rev`, devolve a versão do servidor em vez de sobrescrever |
| tabela `oaze2_devices` | "sair dos outros aparelhos", último uso por plataforma |
| tabela `oaze2_prefs` | preferências e consentimentos sincronizados |
| fila local `core/sync/queue.ts` | operações pendentes, idempotentes por `opId`, persistidas |

**Por que documento e não as tabelas normalizadas.** O espaço de um usuário de finanças
pessoais tem ordem de milhares de lançamentos — cabe folgado num jsonb, lê num *round
trip* e **o motor de cálculo já trabalha sobre o objeto inteiro em memória**. Normalizar
exigiria reescrever `calc.ts` para consultar, perder a memoização por objeto imutável e
inventar paginação para uma tela que soma o ano todo. O documento é a forma que o
domínio já tem.

**Por que isso não repete o erro do OAZE 1.** O erro lá não foi "usar documento": foi
manter **dois** lugares gravando o mesmo dado. Aqui existe um só, e o `dados` do OAZE 1
passa a ser exclusivamente **origem de migração** (`domain/migrate-v1.ts` já lê o
`financas.v1` local; `core/sync/import-v1.ts` passa a ler o remoto).

**Conflito, de verdade.** Revisão otimista sozinha é "o último que grava ganha" e perde
trabalho quando dois aparelhos editam no mesmo minuto. Então a fila não guarda estados,
guarda **operações por entidade** (`upsert transaction#abc`, `delete goal#def`). Ao
receber conflito, o cliente:

1. relê o `payload` do servidor e a `rev` nova;
2. **reaplica** as operações pendentes sobre esse payload, entidade por entidade;
3. grava de novo com a `rev` nova.

Entidades diferentes se fundem sem perda. Na mesma entidade, vence a operação mais
recente por relógio lógico (`opId` carrega o carimbo do aparelho), e o descarte vira
aviso visível — nunca silencioso. Exclusão é *tombstone* (`deletedAt`), nunca remoção:
sem isso, um aparelho offline ressuscita o que outro apagou.

## D5 · Armazenamento: uma porta, três implementações

`core/storage` expõe uma interface só (`get`/`set`/`remove`), resolvida por plataforma:

| Plataforma | Implementação | Chave |
|---|---|---|
| navegador | `localStorage` | sem chave; o PIN protege a interface, não o arquivo — e a tela diz isso |
| iOS / Android | banco cifrado via plugin, chave no **Keychain / Keystore** | gerada no primeiro uso, nunca sai do aparelho |
| Windows / macOS | arquivo cifrado em AES-GCM, chave no **Credential Manager / Keychain** por comando Rust | idem |

Nenhuma camada acima de `core/storage` sabe qual das três está rodando. É isso que
permite marcar P2 como resolvido sem tocar em `state/`.

## D6 · Breakpoints como contrato, não como número solto

Quatro faixas, nomeadas, com uma casca de navegação cada:

| Faixa | Largura | Navegação |
|---|---|---|
| `phone` | < 600 px | ilha inferior flutuante + botão "+" ao alcance do polegar |
| `tablet` | 600–1024 px | ilha inferior com rótulos + conteúdo em duas colunas |
| `desktop` | 1024–1440 px | barra lateral + conteúdo + painel de contexto sob demanda |
| `wide` | ≥ 1440 px | barra lateral + conteúdo + painel de contexto fixo |

Os números são o degrau padrão, não a regra: cada componente responde ao **espaço que
recebeu** (`container queries` onde o navegador suporta), não à janela. O que o
breakpoint decide é a **casca**, porque casca é escolha de interação, não de largura.

## D7 · Segurança: nada sensível no cliente, nunca

Mantido o desenho do OAZE 1, que está certo:

- chave da OpenAI, Stripe e Asaas **só** em Edge Functions;
- o cliente envia pergunta + agregados, nunca descrição de lançamento, nome de conta,
  e-mail ou identificador interno;
- RLS em toda tabela nova, com teste de isolamento por usuário;
- CSP estrita nas quatro superfícies (`index.html` + `.htaccess` + `tauri.conf.json`);
- nenhum HTML vindo de dado do usuário é renderizado;
- a Coco não executa nada sem toque — proposta vira rascunho, gravar exige confirmação.
  Isso vale também para texto que chegue de documento ou mensagem: instrução escondida
  em dado não é instrução.

## D8 · Metas de performance

Números, não adjetivos. Verificados na Fase 12.

| Meta | Valor | Como medir |
|---|---|---|
| JS no primeiro carregamento | ≤ 180 KB gzip | `vite build` |
| telas fora do caminho crítico | carregadas sob demanda | `React.lazy` + `manualChunks` |
| tempo até interativo, celular médio | ≤ 2,0 s | throttle 4× no DevTools |
| quadros de animação | 60 fps no celular, sem queda ao abrir folha | gravação de performance |
| campo de partículas | ≤ 3 % de CPU em `idle`, zero quando escondido | Performance monitor |
| memória em uso, desktop | ≤ 180 MB | Gerenciador de Tarefas / Monitor de Atividade |

## D9 · Identidade: *Night Ocean* é a direção única

P6 aponta três direções declaradas. Uma tem de vencer, e a escolhida é a do kit **V2.1**
já implementada no OAZE 2 — `#0D1821` noite, `#F0E5CF` leite, `#5FA99B` teal, Unbounded
+ Instrument Sans + IBM Plex Mono — por quatro razões:

1. é a mais nova e a única que existe como código verificado em tela;
2. tem contraste medido (leite/noite 14,4:1; teal/noite 6,5:1);
3. os 8 SVG de marca e os 20 WebP da Coco foram produzidos para ela;
4. a paleta do deserto, por admissão do próprio README do OAZE 1, não distingue dez
   categorias sem apoio de ícone — faixa de matiz estreita demais.

O tema claro entra como **variante de tokens** no design system (Fase 05), não como
segunda identidade. A paleta do deserto fica registrada no histórico e sai do código.
