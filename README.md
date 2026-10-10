# OAZE 2

Base de um aplicativo para Android, iPhone, Windows, macOS e navegador. O núcleo
de código é compartilhado; os projetos nativos e a sincronização ainda precisam
de validação antes da publicação. Estado verificado em `docs/ESTADO.md`.

```
                       OAZE
                         │
            ┌────────────┴────────────┐
         MOBILE                    DESKTOP
      Capacitor 8                  Tauri 2
     Android · iOS            Windows · macOS
            └────────────┬────────────┘
                   núcleo React 19 + TypeScript
                         │
                     OAZE CLOUD
          Supabase · Auth · dados · Edge Functions
                         │
                   SINCRONIZAÇÃO
          fila offline + fusão por entidade
```

## Começar

```bash
cd app
npm ci
cp .env.example .env.local   # opcional: sem isso o app roda sem conta
npm run dev                  # http://localhost:5188  (?demo abre o exemplo)
```

## Testar no celular

O workflow [App · teste mobile](.github/workflows/app-mobile-test.yml) gera
um APK Android instalável em **Actions → Artifacts** após cada mudança na
`main`. No iPhone, o CI compila sem assinatura; instalação em aparelho exige
TestFlight. O passo a passo e os limites da sincronização estão em
[Teste mobile e lojas](docs/12-PUBLICACAO.md).

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm test` | regra contábil, interface, autenticação e lógica local de sincronização |
| `npm run typecheck` | tipos |
| `npm run build` | `dist/` — o mesmo pacote vai para web, Capacitor e Tauri |
| `npm run verificar:seguranca` | varre segredo e confere a CSP |
| `npm run check` | os quatro acima, na ordem |
| `npx cap sync` | copia `dist/` para `android/` e `ios/` |
| `npx tauri build` | instaladores de desktop (precisa de Rust) |

## Onde as coisas estão

```
app/src/
  design-system/   tokens, primitivos e o campo de partículas da inteligência
  domain/          regra contábil pura, centavos inteiros — o ativo mais valioso
  platform/        a única camada que sabe em qual loja o app está
    native.ts      biometria, notificação, compartilhar, área, deep link
  core/
    storage/       uma porta, três cofres (navegador · Keystore · Keychain)
    api/           cliente Supabase, carregado sob demanda
    auth/          conta: e-mail, link mágico, Google, Apple, exclusão
    sync/          fila offline, fusão por entidade, revisão otimista
    ai/            a Coco com modelo, via Edge Function — nenhum segredo aqui
    notifications/ lembrete de fatura e de lançamento fixo
    telemetry/     relatório de erro sem nada financeiro dentro
  state/           estado imutável, PIN, rota, trava automática
  coco/            inteligência no aparelho, determinística
  ui/              componentes compostos e o mapa de navegação
  screens/         as telas
  shell/           cascas: ilha inferior, barra lateral, paleta de comandos
app/android · app/ios · app/src-tauri     projetos nativos
docs/                                      auditoria, arquitetura, publicação
```

A ordem acima é a **regra de dependência**: cada camada só importa valor das que
estão acima dela nesta lista. Quem garante é `src/architecture.test.ts`, não a
boa vontade — e o mesmo teste recusa arquivo acima de 700 linhas, segredo
parecido com chave e `TODO` esquecido.

## A inteligência é um campo de partículas

Onde o sistema precisa dizer "estou trabalhando", quem fala é
`design-system/intelligence/` — uma composição abstrata de partículas com seis
estados: `idle`, `listening`, `thinking`, `processing`, `success`, `error`.
Não há *spinner* no produto; o `Loading` do design system **é** o campo.

O desenho segue duas regras, e `field.test.ts` trava as duas: nenhuma órbita é
perfeita (o raio de cada partícula soma dois senos incomensuráveis, com fase
própria — senão trinta pontos em círculo leem como barra de progresso), e trocar
de estado move o alvo, não corta a cena.

Custo: um `requestAnimationFrame` **compartilhado** por todos os campos vivos,
nada anima fora da tela ou com a aba escondida, e `prefers-reduced-motion`
recebe um quadro parado — não um retângulo vazio.

A **Coco** continua: ela é personagem de marca nas boas-vindas e nos estados
vazios, onde o papel é acolher. O que ela deixou de ser é o indicador de
processamento.

## Conta e sincronização

O cliente está configurado para usar o mesmo projeto Supabase do OAZE 1. A
sessão e a sincronização entre plataformas ainda exigem validação real. Por
segurança, `VITE_OAZE_SYNC_ENABLED` permanece `false` até validar o fluxo
autenticado entre dois aparelhos. O estado, a fila e as revisões já são
separados por conta; a migração SQL foi aplicada e as políticas RLS e RPCs
passaram em testes transacionais.

**Sem conta o app funciona inteiro**, só fica isolado no aparelho. Isso é
promessa do produto, não limitação.

A sincronização não guarda estados: guarda **operações por entidade**. Quando
dois aparelhos editam o mesmo mês, o segundo relê a versão do servidor, reaplica
o que fez item por item e grava de novo. Entidades diferentes se fundem sem
perda; na mesma entidade vence o carimbo mais novo, **e o descarte vira aviso na
tela** — nunca silêncio. Exclusão deixa lápide, senão um aparelho offline
ressuscita o que o outro apagou.

Detalhe e decisões: `docs/11-ARQUITETURA.md`, seção D4. O comportamento está
coberto por `core/sync/merge.test.ts`.

## Onde os dados dormem

| Plataforma | Como | Chave |
|---|---|---|
| navegador | `localStorage`, como no OAZE 1 — **e a tela diz isso** | não há |
| Android · iOS | corpo cifrado em AES-GCM | Keystore / Keychain |
| Windows · macOS | arquivo cifrado em AES-GCM | Credential Manager / Keychain |

Se o cofre nativo não abrir, o app **não** cai em silêncio para armazenamento
sem cifragem: ele para e explica. Num painel financeiro, degradar a proteção sem
avisar é pior do que não abrir.

## Acessibilidade

Navegação por teclado em tudo; foco visível em `--accent`; `aria-label` em todo
ícone; `role="switch"` nos interruptores; diálogos com foco preso, Esc e
devolução do foco; alvo de toque nunca abaixo de 44 px; `prefers-reduced-motion`,
`prefers-reduced-transparency` e `prefers-contrast: more` respeitados nos tokens,
não caso a caso. Estado nunca depende só de cor: receita vem com ▲ e sinal,
débito e crédito vêm com ícone e palavra.

**Escala de texto.** A tipografia é em `rem`, então aumentar a fonte no Android,
no iPhone ou no navegador aumenta o app. Altura de botão, raio e espaçamento
continuam em px de propósito — o que a configuração escala é o texto, e deixar o
layout inteiro crescer junto quebraria a carteira e a grade. Limite honesto:
acima de ~150 % o texto começa a apertar dentro dos controles antes de quebrar.

## Desempenho

Metas em `docs/11-ARQUITETURA.md` (D8), e o CI reprova quem passar do teto.

| | |
|---|---|
| JS do primeiro carregamento | **123 KB** comprimidos no build de 09/10/2026 (teto do CI: 184 KB) |
| cliente Supabase | pedaço separado, 55 KB — só baixa quem tem conta |
| telas fora do caminho principal | sob demanda, uma por pedaço |

## Documentos

| Arquivo | O que tem |
|---|---|
| `docs/10-AUDITORIA.md` | o que existia, medido, com a lista de problemas (P1–P21) |
| `docs/11-ARQUITETURA.md` | as nove decisões, com a razão de cada uma |
| `docs/12-PUBLICACAO.md` | o caminho até cada loja, e o que falta |
| `docs/ESTADO.md` | onde o projeto está hoje |
| `docs/02-TRD.md` · `04-ui-ux.md` · `05-backend.md` | material da etapa anterior |
