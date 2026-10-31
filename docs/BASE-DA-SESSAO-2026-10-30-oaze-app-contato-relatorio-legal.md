# Base da sessão — 30/10/2026 — OAZE app: contato, Seja Pro, Estado do OAZE, política/LGPD/acessibilidade

**Pedido de Jonatham:** concluir no app mobile (painel `/app` empacotado) o que faltava — Contato e "Seja Pro", "Estado do OAZE", Política/LGPD/acessibilidade —, analisar o site e limpar a pasta `oaze app` do Drive.

**Branch:** `codex/oaze-multiplatform-foundation` (base `cda8357`).

## Diagnóstico: por que pareciam "faltando"

O código dessas funções já existia em `app/live-site/`, mas no app não era alcançável ou quebrava:

1. **Estado do OAZE sem entrada.** O único botão vivia na tela `reports`, e `go('reports')` redireciona para o início. Ninguém chegava ao relatório.
2. **Links internos quebrados no pacote.** O painel aponta para `/suporte`, `/privacidade`, `/termos`; o pacote nativo só tem `suporte.html` etc. Sem a extensão, o Capacitor cai no `index.html` e o usuário volta ao painel ou ao login. O empacotador só corrigia links dentro dos `.html`, não no `app.js`/`live-backend.js`. A tela de consentimento (LGPD) linkava a política com o mesmo defeito.
3. **Sem Política, Termos, Direitos LGPD nem Acessibilidade nas Configurações.** O contato ficava no fim da página, depois do crédito de ícones.
4. **Páginas de leitura com o menu do site.** Suporte/Política/Termos dentro do app mostravam Recursos, Preços, Criar conta e seletor de idioma, todos levando a páginas que não existem no pacote.
5. **Windows:** a permissão `opener` só liberava o login do Supabase; o checkout Stripe do "Seja Pro" e o portal de cobrança seriam recusados. `mailto:` e links externos navegariam a própria janela do app. O PDF dependia do download do WebView2, sem destino garantido.
6. **Android:** o botão voltar nas páginas de leitura mandava para `entrar.html`.
7. **Relatório:** em modo demonstração os campos de mês/ano apareciam juntos com "Últimos 30 dias" (escondidos só depois da checagem de conta).

## O que foi alterado

- `app/live-site/assets/app/app.js` — Configurações: "Fale com a gente · info@oaze.site" junto de Ajuda e suporte; nova seção **Relatórios** (Estado do OAZE · PDF; Exportar lançamentos · CSV); nova seção **Privacidade e acessibilidade** (Política, Seus direitos LGPD, Canal de privacidade, Termos, Acessibilidade); idioma em seção própria. "Mais": bloco **Estado do OAZE — relatório em PDF**; descrição de Configurações virou "privacidade, ajuda e contato".
- `app/live-site/assets/app/estado-oaze.js` — campos de mês/ano escondidos antes da checagem de conta.
- `app/tools/build-published-app.mjs` — reescreve `/suporte|/privacidade|/termos(#âncora)` para `.html` também nos JS e remove `target=_blank` desses links; logo `/app` → `/index.html`; páginas de leitura trocam cabeçalho/rodapé do site por barra **"‹ Voltar ao OAZE"** (`/index.html#settings`) e perdem o seletor de idioma; links só do site viram `https://oaze.site/...`; a ponte nativa entra em todas as páginas. O build falha se alguma troca não acontecer.
- `app/src/native/published-bridge.ts` — Windows: links externos permitidos (oaze.site, flaticon, `mailto:info@oaze.site`) abrem no sistema; os demais são ignorados. Windows: PDF via "Salvar como" nativo. Android: voltar nas páginas de leitura volta ao painel.
- `app/src-tauri/src/share.rs` + `lib.rs` — comando `oaze_save_pdf` (confere `%PDF-`, até 20 MB, nome `estado-oaze-*.pdf`, diálogo do sistema).
- `app/src-tauri/capabilities/default.json` — opener libera `checkout.stripe.com`, `billing.stripe.com`, `oaze.site`, `www.flaticon.com`, `mailto:info@oaze.site`.

O código do site (`G:\Meu Drive\sites\OAZE\o site`) **não** foi alterado: as mudanças de `app.js` usam rotas limpas e servem ao site quando forem sincronizadas.

## Verificação

- Cópia local (Drive não comporta `node_modules`): `npm run check` — typecheck, **243 testes**, build web, build do painel empacotado e scanner de segurança passaram (3 avisos pré-existentes).
- Navegador em 375 px, pacote `dist-live` servido como o Capacitor serve (rota inexistente → `index.html`), modo demonstração:
  - Mais mostra "Estado do OAZE"; Configurações mostram todas as seções novas com links `.html` corretos.
  - Relatório com dados de demonstração (contexto forçado como logado): "Ano de 2026 · Receitas R$ 7.850,00 · Despesas R$ 2.359,50"; PDF gerado, `application/pdf`, cabeçalho `%PDF-1.3`, 263 KB, 5 categorias.
  - `privacidade.html#direitos` abre sem menu do site, com "Voltar ao OAZE", que leva às Configurações. Console sem erros.
  - "Seja Pro" abre a tela de planos.
- **Não verificado:** compilação Rust (sem toolchain local; fica para o CI); app instalado em Android/Windows; checkout real; `mailto` e "Salvar como" no Windows instalado; leitor de tela.

## Análise do site oaze.site (achados, nada publicado)

1. **Checkout no Windows quebrado em produção.** A função `oaze-pagamento` publicada (v12) aceita só `acao, plano, ciclo, moeda, cupom`; o app Windows envia `canal: 'windows'` → "Ação inválida". A versão com retorno ao Windows está no repositório do site, não publicada.
2. **`https://oaze.site/retorno-app.html` dá 404.** O empacotador Hostinger já o inclui, mas não foi publicado.
3. **Voz da Coco no navegador bloqueada pelo servidor.** `.htaccess` envia `Permissions-Policy: microphone=()` (bloqueia ditado e conversa em tempo real) e a CSP não tem `media-src`, então o áudio `blob:` da Coco cai em `default-src 'self'`.
4. CSP do site ainda libera `api.openai.com` no `connect-src` e `'unsafe-inline'` em scripts; HSTS sem `includeSubDomains`.
5. `/.well-known/assetlinks.json` 404: o retorno Android por `https://oaze.site/app/planos` não reabre o app (só o esquema `oaze://`).
6. `privacidade.html`/`termos.html` continuam minutas sem razão social/CNPJ; a política diz "Configurações → Exportar… sai tudo"; no app o caminho é "Configurações → Relatórios → Exportar lançamentos (CSV)" — conferir se o CSV cobre "tudo" antes de manter a frase.

## Limpeza do Drive (aprovada por Jonatham nesta sessão)

- `builds/`: de ~794 MB para ~42 MB. Ficaram APK `e94f568` e Windows 2.0.6 `41ccffb`. Ver `builds/LEIA-ME.md`.
- `app/node_modules` do Drive (quebrado) apagado.
- `site/` (protótipo antigo de landing do OAZE 2, não o site no ar) removido do repositório.
- Itens apagados foram para a lixeira do Google Drive.

## Próximos passos

1. CI desta branch gerar APK e Windows; instalar e percorrer Configurações, relatório, páginas legais, voltar no Android, `mailto`, "Salvar como" e checkout de teste no Windows.
2. Publicar no site, com autorização: `oaze-pagamento` nova, `retorno-app.html`, correção de `Permissions-Policy`/`media-src`; sincronizar `app.js` do app com o site.
3. Traduções en/fr/es dos novos rótulos das Configurações (hoje em português).
4. Pendências jurídicas e de loja da rodada anterior continuam abertas.
