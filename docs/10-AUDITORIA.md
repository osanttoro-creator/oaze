# FASE 01–03 · Auditoria do OAZE

Levantamento feito em 06/10/2026 lendo o código, rodando os testes e compilando o
build. Nada foi alterado antes deste documento existir.

## 1. O que existe, de fato

O "projeto OAZE" não é um projeto: são **três bases** na mesma pasta, em estágios
diferentes, com identidades visuais diferentes.

| Base | Caminho | O que é | Estado |
|---|---|---|---|
| **OAZE 1** | `o site/` | site público + aplicativo web em HTML/CSS/JS clássico, sem build, com Supabase atrás | **no ar**, repositório Git próprio, deploy automático na Hostinger |
| **OAZE 2** | `oaze-app/` | núcleo React 19 + TypeScript + Vite, com Capacitor (iOS/Android) e Tauri 2 (Windows/macOS) já gerados | **local**, nunca publicado, 58 testes passando |
| **Dossiê de lojas** | `oaze mobile/` | fichas, checklists e trechos de manifesto para Play, App Store e Microsoft Store | documentação pronta, não aplicada |

Medidas verificadas nesta auditoria:

- OAZE 1: ~10.800 linhas de JavaScript, ~4.560 de CSS, ~3.000 de HTML em 15 páginas.
  Arquivo mais pesado: `preview-v3/app.js`, 245 KB — a interface inteira num só arquivo.
- OAZE 2: 6.204 linhas de TypeScript/TSX em 49 arquivos; o maior é `domain/calc.ts`
  com 696 linhas. `npm test` → **58 testes, 4 arquivos, todos passando**.
  `npm run typecheck` → limpo. `npm run build` → 392 KB de JS (120 KB gzip), 26 KB de CSS.

## 2. Mapa da arquitetura existente

### OAZE 1 (`o site/`)

```
index.html …… 15 páginas   landing, cadastro, entrar, preços, recursos, legal, 404
en/ es/ fr/                 traduções estáticas da parte pública
assets/js/
  store.js     48 KB  modelo de dados, perfis, persistência em localStorage, backup
  calc.js      59 KB  motor contábil: ocorrências, saldos, faturas, investimentos
  site-auth.js 23 KB  autenticação (e-mail/senha, link mágico, Google One Tap)
  planos.js limites.js   planos, direitos, cotas
  ai.js        16 KB  cliente da Edge Function oaze-assistant
  idioma.js utils.js icons.js onboarding.js automacoes/*
  i18n/app-{en,es,fr}.js   252 KB de strings do aplicativo
preview-v3/
  app.js      245 KB  TODA a interface do aplicativo (telas, formulários, Coco)
  live-backend.js 22 KB  sessão, leitura/gravação com revisão, Realtime
  carteira.js coco-import.js
  app.css 58 KB · wallet.css · calendar.css · icons.css
assets/vendor/    bancos (41 instituições), ícones Lucide, fontes em base64
supabase/
  migrations/   48 migrações aplicadas
  functions/    oaze-assistant · oaze-conta · oaze-contato · oaze-cofre ·
                oaze-pagamento · oaze-coco-media · webhooks Stripe e Asaas
tools/        verificar-tudo, auditoria de cliques, varredura de segredos, geradores
deploy/hostinger/   .htaccess (rotas SPA, CSP, cache) + montagem do pacote
```

**Autenticação:** Supabase Auth. E-mail e senha, link mágico, Google (inclusive One Tap).
A sessão fica numa única gaveta (`storageKey: 'oaze.supabase.auth'`) compartilhada entre
site e app — foi correção de um bug real registrado em comentário no código.

**Dados:** duas fontes convivem. O documento `dados` (jsonb, um registro por perfil,
gravado pela RPC `v3_salvar_perfil` com revisão otimista por `updatedAt`) **e** o esquema
normalizado (`workspaces`, `transactions`, `accounts`, `credit_cards`, `categories`,
`budgets`, `goals`, `investments`…). A V3 que está no ar usa o **documento**; o
normalizado está criado com RLS e praticamente não é lido.

**IA:** nenhum segredo no cliente. O navegador manda pergunta + agregados para a Edge
Function `oaze-assistant`, que fala com a OpenAI. Cota aplicada atomicamente no banco.

**Pagamento:** Stripe e Asaas via Edge Functions e webhooks. Código existe, chaves não
configuradas.

### OAZE 2 (`oaze-app/`)

```
app/src/
  domain/    calc · categorize · recurrence · merchant · seed · dates · money ·
             banks · migrate-v1 · types · ids       ← regras puras, centavos inteiros
  state/     store (imutável) · persist · actions (desfazíveis) · route (hash) ·
             security (PIN PBKDF2) · session (trava automática)
  coco/      engine — sugestões e conversa determinística, no aparelho
  platform/  platform() · biometrics (registrável) · cortina de privacidade
  ui/        Wallet · Cards · Wave · PinPad · Icon · bits · Merge
  screens/   14 telas
  styles/app.css    372 linhas, tokens do kit V2.1
app/android/    Capacitor 8, projeto gerado, ícones aplicados
app/ios/        Capacitor 8 com Swift Package Manager (sem CocoaPods)
app/src-tauri/  Tauri 2, alvos msi · nsis · app · dmg
.github/workflows/   app-ci · app-android · app-ios · app-desktop   (escritos, nunca executados)
```

Regra de camada que o código **cumpre**: tela nunca calcula dinheiro, tudo passa por
`domain/calc.ts`; o motor memoriza por objeto de espaço imutável, então nunca devolve
total velho.

## 3. Lista de problemas técnicos

Ordenados por gravidade. Cada item foi confirmado no código, não herdado de documento.

### Bloqueiam qualquer publicação

| # | Problema | Onde | Consequência |
|---|---|---|---|
| **P1** | **Não existe conta nem sincronização no OAZE 2.** Nenhuma dependência de rede no `package.json`; `state/persist.ts` grava só em `localStorage`. | `oaze-app/app` | o produto pedido ("mesma conta em Android → iPhone → Windows → Mac") hoje **não existe** |
| **P2** | **Armazenamento não cifrado no nativo.** `persist.ts` usa `localStorage` também dentro do Capacitor e do Tauri. | `state/persist.ts` | dado financeiro legível no sistema de arquivos do aparelho; reprovável em revisão de loja |
| **P3** | **Biometria é fachada.** `platform/index.ts` expõe `registerBiometrics()`, mas nenhuma implementação é registrada — `verify()` sempre devolve `false`. A interface oferece o interruptor. | `platform/index.ts`, `screens/Settings.tsx` | função anunciada e inexistente |
| **P4** | **Notificações são fachada.** `@capacitor/local-notifications` está instalado; nada o chama. A tela Lembretes configura horário e privacidade do aviso sem nada agendar. | `screens/Reminders.tsx` | idem |
| **P5** | **Nenhum build nativo jamais compilou.** Os quatro workflows existem e nunca rodaram; esta máquina não tem Rust, Android SDK nem macOS. | `.github/workflows/app-*.yml` | o caminho até a loja é desconhecido |

### Dívida estrutural

| # | Problema | Onde |
|---|---|---|
| **P6** | **Duas identidades visuais em produção.** OAZE 1 é deserto/oásis (areia `#E7D4B5`, terracota `#C9794A`, Newsreader + IBM Plex). OAZE 2 é *Night Ocean* (`#0D1821`, leite `#F0E5CF`, teal `#5FA99B`, Unbounded + Instrument Sans). O `PRODUCT.md` do OAZE 1 ainda cita Playfair Display. São três direções declaradas. | `o site/README.md`, `o site/PRODUCT.md`, `oaze-app/docs/04-ui-ux.md` |
| **P7** | **Duas fontes da verdade no banco.** Documento `dados` × esquema normalizado. Metade do OAZE 1 lê um lugar vazio até a migração manual rodar. Documentado como dívida conhecida em `o site/docs/o-que-falta.md`. | `o site/supabase/migrations` |
| **P8** | **`fila.js` não existe.** O TRD do OAZE 2 manda "portar `fila.js`" para a fila offline. Varredura em `o site/`: o arquivo nunca existiu. A fila offline precisa ser **escrita**, não portada. | `oaze-app/docs/02-TRD.md` |
| **P9** | **Monolito de interface no OAZE 1.** `preview-v3/app.js`, 245 KB, um arquivo. Não é reaproveitável peça por peça — só como referência de comportamento. | `o site/preview-v3/app.js` |
| **P10** | **Valores visuais espalhados.** O `app.css` do OAZE 2 mistura tokens e classes utilitárias em 372 linhas, e as telas usam `style={{...}}` inline em vários pontos (`Shell.tsx`, `More.tsx`). Não há camada de tokens separada nem escala de espaçamento declarada. | `oaze-app/app/src` |
| **P11** | **Responsividade em dois degraus.** `useDesktop()` é um único `matchMedia('(min-width: 900px)')`. Tablet e telas largas não existem como conceito. | `state/session.ts` |
| **P12** | **Sem recursos nativos reais.** Câmera, galeria, arquivos, compartilhamento, área de transferência, deep links, drag-and-drop e integração com o sistema: nada implementado em nenhuma das quatro plataformas. | — |
| **P13** | **Teclado e desktop subaproveitados.** Só `N` tem atalho. Não há paleta de comandos, menu de contexto, navegação por teclado entre regiões nem múltiplas colunas além do par barra-lateral/conteúdo. | `Shell.tsx` |
| **P14** | **Testes só no núcleo.** 58 testes cobrem `domain/` e `coco/`. Zero testes de componente, de integração e de fluxo. Não há `@testing-library` nem runner de ponta a ponta. | `app/src/**/*.test.ts` |
| **P15** | **Nenhum split de código.** Build único de 392 KB; as 14 telas entram todas no primeiro carregamento. Sem `lazy`, sem rota assíncrona. | `vite.config.ts` |
| **P16** | **Sem relatório de erro nem métrica.** Nenhum *crash reporting* em nenhuma das duas bases. | — |
| **P17** | **Conflitos de produto não resolvidos** (registrados em `ESTADO.md` e confirmados): plano único × grátis+completo; o site promete voz e moeda estrangeira na Coco que o v1 não tem; o site aponta `/criar-conta`, rota que o `.htaccess` não conhece (lá é `/cadastro`). | `oaze-app/docs/ESTADO.md` |

### Sujeira

| # | Item | Veredito |
|---|---|---|
| **P18** | `o site/]*` — arquivo vazio de 0 byte, nome de glob não expandido pelo shell | lixo, apagar |
| **P19** | `o site/app.html` (0 byte), `OAZE/__pycache__/`, `OAZE/tmp/` | lixo |
| **P20** | Edge Functions `oaze-checkout`, `oaze-mp-webhook`, `oaze-assinatura` publicadas no projeto remoto sem código ativo | superfície de ataque, remover do painel |
| **P21** | `o site/.env`, `.env.local`, `.env.local.*.bak` — três backups de ambiente no disco | revisar e remover os `.bak` |

## 4. Classificação: aproveitar, refatorar, reconstruir

### Aproveitar sem tocar

- `oaze-app/app/src/domain/**` — motor contábil em centavos, 696 linhas, coberto por
  testes. É o ativo mais valioso do projeto. **Não refazer.**
- `oaze-app/app/src/state/security.ts` — PIN com PBKDF2-SHA256, 210 mil iterações, sal
  aleatório, comparação em tempo constante, espera crescente. Correto.
- `oaze-app/app/src/coco/engine.ts` — sugestões determinísticas no aparelho.
- `o site/supabase/functions/**` — as sete Edge Functions ativas, incluindo
  `oaze-assistant`. O desenho (segredo só no servidor) é o certo e serve às quatro lojas.
- `o site/supabase/migrations/**` — 48 migrações com RLS. A base do banco permanece.
- `o site/assets/vendor/bancos.js` — 41 bancos brasileiros com cor de marca, gerado.
- `oaze mobile/**` — fichas e checklists de loja: material pronto para a Fase 19.
- Marca: `oaze-app/site/assets/brand/*.svg` (8 arquivos) e os 20 WebP da Coco.

### Refatorar

- `app/src/styles/app.css` → extrair **tokens** para camada própria (P10).
- `app/src/state/session.ts` → `useDesktop()` vira sistema de breakpoints (P11).
- `app/src/platform/index.ts` → a interface está certa; faltam as implementações
  nativas por trás (P3, P12).
- `app/src/state/persist.ts` → mesma assinatura, armazenamento cifrado por baixo
  quando a plataforma for nativa (P2).
- `app/src/ui/**` → promover a componentes do design system com variantes e estados
  declarados (P10).
- `Shell.tsx` → separar navegação por plataforma: ilha inferior, barra lateral, painéis.

### Reconstruir

- **Camada de conta, API e sincronização** — não existe (P1, P8). Escrever.
- **Armazenamento seguro** (P2).
- **Notificações** (P4).
- **Recursos nativos** (P12).
- **Representação visual da inteligência** — hoje é a Coco, personagem em WebP. O
  briefing pede explicitamente *"não criar um mascote para isso"*: a inteligência deve
  aparecer como composição abstrata de partículas com seis estados. Isso é peça nova.
  Ver decisão D3 em `11-ARQUITETURA.md`.

### Descartar

- `preview-v3/app.js` como código (P9) — fica como referência de comportamento.
- `app-v3.html`, `]*`, `app.html`, `__pycache__/`, `tmp/`, `.env*.bak` (P18, P19, P21).
- As três Edge Functions mortas no projeto remoto (P20).

## 5. O que não foi possível verificar nesta máquina

Dito para não parecer verificado: **nenhum build nativo**. Não há Rust, Android SDK,
Java nem macOS aqui. Android e Windows dependem do CI; iOS e macOS dependem de runner
macOS com certificados. As quatro verificações ficam para as Fases 14–17, e o que esta
sessão entrega nelas é o pipeline e a configuração — não o binário assinado.
