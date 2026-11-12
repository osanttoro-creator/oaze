---
title: OAZE — site institucional com vidro, assinatura no site, Play Billing e Windows só Oásis — 2026-11-12
tipo: base-de-sessao
status: em-validacao
updated: 2026-11-12
tags: [oaze, site, app, android, windows, google-play, stripe, widgets]
---

# Base da sessão — 12/11/2026

Projeto: OAZE (site `oaze.site` + app Android/Windows). Pedido de Jonatham: site com cabeçalho em vidro (Apple), inspiração Duolingo e Pierre, apagar o app web do site, pagamento do Windows pela Stripe, Play Billing e anúncios no Android grátis, revisar o app (padrão, fold e flip), widgets, apagar arquivos desnecessários, **salvar só no Drive, sem deploy no GitHub**.

## Onde está cada coisa

- **Site final (cópia limpa, pronta para publicar):** `G:\Meu Drive\oaze\website\site-final-2026-11-12\`. Branch `site/excluir-conta` do repositório `osanttoro-creator/dashboard`, último commit `0ed7e97`. O PR #8 existe no GitHub desde cedo, **sem merge**; a parte de hoje (vidro) não foi enviada ao GitHub, por pedido.
- **App:** `G:\Meu Drive\oaze\app multmidia`, branch `codex/oaze-multiplatform-foundation`, commits `cfa88bc` (2.5.0: Play Billing + Windows só Oásis), `cb57d8d` (Actions) e `829cfb1` (revisão visual). Não enviados hoje.
- **Servidor:** função `oaze-pagamento` v17 publicada no Supabase (canal `site` → `/pronto` ou `/assinar`). `oaze-play` já existia.
- **Pasta travada:** `G:\Meu Drive\oaze\website\o site` está no meio de uma junção com conflitos (branch `codex/oaze-app-round-20261028`). Abortar essa junção foi bloqueado pela proteção da ferramenta; precisa de OK explícito. Por isso a cópia limpa foi salva ao lado.

## Site

- ✅ `assets/css/vidro.css` em todas as páginas: cabeçalho de vidro (desfoque 22px + saturação 180%, luz especular, fio de refração, fecha ao rolar), menu em pílulas, menu do celular em vidro com cantos de 28px.
- ✅ Botões "tecla" (Duolingo): borda inferior sólida que desce ao pressionar. Secundários em vidro.
- ✅ Mascote flutuando na abertura.
- ✅ App web apagado do site: `entrar`, `cadastro` e o painel saem do pacote; `/app`, `/onboarding`, `/entrar`, `/cadastro`, `/app-v3.html` → 301 para `/#baixar`; `assets/app/` responde 410 (arquivos antigos no servidor).
- ✅ `/assinar` (conta por e-mail ou Google + aceite + mensal/anual + Stripe) e `/pronto` (links das lojas). Topo, rodapé e botões apontam para `/assinar`. Conflito com o redesign de 11/11 (outra sessão) resolvido: ficou o visual novo, com os botões para `/assinar`.
- ✅ 49 de 49 verificações (`node tools/verificar-tudo.js`). Conferido no navegador em 1009 px e 375 px: sem rolagem lateral; menu aberto ok.
- 🟡 `/assinar` é só em português e cobra em real; en/fr/es caem nela.
- 🟡 Prazo de 15 dias em `/excluir-conta` e o nome "Ekunori Conecta" foram escolhas minhas, sem confirmação.

## App (2.5.0, ainda sem compilar)

- ✅ Android (pacote da Play): plugin `OazePlay` (Play Billing 8.3.0), ponte `OAZE_NATIVE_PLAY`, tela Plano com "Assinar pela Google Play", "Restaurar compra" e "Gerenciar na Google Play". Produtos: `oaze_oasis_mensal`, `oaze_oasis_anual`. Anúncio premiado segue no Semente.
- ✅ Windows: quem não tem Oásis vê a tela de assinatura (Stripe no navegador) no lugar do painel; sem anúncio.
- ✅ Revisão visual na demonstração (360, 280 fold fechado, 720 fold aberto, 1280 Windows): corrigido erro real na carteira ("Algo não funcionou nesta tela"), rótulo COCO → OAZE, atalhos da OAZE em 2 colunas no fold fechado. Flip (dobra horizontal) só por CSS em `telas.css`; não há como emular no navegador.
- ✅ Widgets de tela inicial já existiam (resumo 3x2, atalhos 4x1, lançar 1x1); ganharam `previewLayout` (Android 12+) e "OAZE" no lugar de "Coco".
- ⛔ Nada foi testado em aparelho: GitHub Actions bloqueado (2.000 minutos grátis do repositório privado acabaram em 05/11). Gatilho de PR das compilações pesadas removido. Tag `app-v2.5.0` aponta para `cfa88bc`, anterior à revisão visual.
- Passo a passo da Play em `docs/21-ASSINATURA-GOOGLE-PLAY.md` do repositório do app.

## Limpeza feita

Apagados em `app multmidia`: `app/node_modules (1)` (duplicata do Drive), `app/src-tauri/capabilities/default (1).json` (versão antiga), `site/` (cópia do site da era Coco), `.claude-flow/`, `supabase/.temp/`, `app/live-site/demo-local.html` (cópia temporária). Não apaguei a pasta `o site` nem branches.

## Pendente de Jonatham

1. Merge do PR #8 ou publicação manual da cópia do Drive (o site é público no GitHub; a publicação não gasta cota).
2. GitHub: orçamento de Actions > US$ 0 ou esperar 01/12; depois gerar 2.5.0 (mover a tag para `829cfb1`).
3. Play: enviar AAB ao teste interno, criar as duas assinaturas, conta de serviço no secret `GOOGLE_PLAY_SERVICE_ACCOUNT`, RTDN.
4. Autorizar abortar a junção travada em `o site`, se quiser a pasta de volta ao normal.
5. Avaliar o visual (vidro, botões, mascote): sem avaliação explícita ainda.
