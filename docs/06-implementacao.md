# OAZE 2 — Plano de implementação

Status: 06/10/2026 · ✅ feito e verificado · 🟨 escrito, não verificado aqui ·
🟡 próximo · ⛔ bloqueia publicação

## Fatias

| # | Fatia | Estado | Prova |
|---|---|---|---|
| 1 | Motor em centavos (porte do calc) + automações | ✅ | 19 testes de regra contábil |
| 2 | Estado, PIN, bloqueio, desfazer | ✅ | fluxo no navegador |
| 3 | Todas as telas do mockup, celular e desktop | ✅ | navegador 375 px e 1024 px |
| 4 | Coco no aparelho (Agora, Conversa, Memória) | ✅ | 4 testes + fluxo no navegador |
| 5 | Migração OAZE 1 → 2 | ✅ | 4 testes de paridade + Chrome limpo |
| 6 | Projetos nativos gerados | ✅ gerados · 🟨 não compilados | `android/`, `ios/`, `src-tauri/` |
| 7 | CI: verificação, Android, iOS, desktop | ✅ escrito · 🟨 nunca rodou | `.github/workflows/app-*.yml` |
| 8 | ⛔ Armazenamento cifrado no nativo | ✅ desenho e web · 🟨 nativo | `core/storage` + 9 testes de cifragem |
| 9 | Biometria nativa | 🟨 | `platform/native.ts` + `src-tauri/src/biometrics.rs` |
| 10 | ⛔ Conta + sincronização Supabase | ✅ cliente e fusão · 🟨 banco | `core/sync` + 13 testes de fusão; migração SQL escrita |
| 11 | Coco com IA via `oaze-assistant` | ✅ cliente | `core/ai` — agregado, nunca descrição |
| 12 | Assinatura (Stripe/Asaas; regra 3.1.1 no iOS) | 🟡 | decisão pendente |
| 13 | Site de apresentação | outra sessão, em `site/` | conflitos em `12-PUBLICACAO.md` |
| 14 | Idiomas en/es/fr | 🟡 | |
| **15** | **Design system** (tokens, 20 componentes, dois temas) | ✅ | `design-system/` + 12 testes |
| **16** | **Campo de partículas da inteligência** | ✅ | `design-system/intelligence/` + 13 testes |
| **17** | **Quatro faixas de largura e duas cascas** | ✅ | `shell/` + 8 testes |
| **18** | **Paleta de comandos e atalhos** | ✅ | verificada em tela, 16 comandos |
| **19** | **Lembretes de verdade** | ✅ planejador · 🟨 agendamento nativo | `core/notifications` + 10 testes |
| **20** | **Relatório de erro sem dado financeiro** | ✅ | `core/telemetry` + 6 testes |
| **21** | **Divisão do pacote** | ✅ | 115 KB gzip no primeiro carregamento |
| **22** | **Regra de camadas verificada** | ✅ | `src/architecture.test.ts` |
| **23** | **Varredura de segurança no CI** | ✅ | `tools/verificar-seguranca.mjs` |
| **24** | **Testes de componente, autenticação, integração e fluxo** | ✅ | 26 + 19 + 13 + 8 testes |
| **25** | **Design system em uso nas telas** | ✅ | `ui/bits` delega; 15 regras duplicadas removidas |
| **26** | **Escala de texto (acessibilidade)** | ✅ | tipografia em `rem`, verificada a 150 % |
| **27** | **Câmera, galeria, arquivos e salvar** | ✅ código · 🟨 plugins | `platform/files.ts` + `oaze_save_file` |
| **28** | **Arrastar e soltar (desktop)** | ✅ | `ui/DropZone.tsx`, ligado ao restaurar backup |
| **29** | **Push: arquitetura e tabela** | ✅ cliente · ⛔ função de servidor | `core/notifications/push.ts` + `oaze2_push_tokens` |

## Comandos

```
cd app
npm ci
npm run check       # tipos + testes + build + segurança
npm run dev         # http://localhost:5188  (?demo abre o exemplo)
npx cap sync        # copia dist/ para android/ e ios/
npx tauri build     # precisa de Rust (CI)
```

## Publicação

`docs/12-PUBLICACAO.md` tem o caminho por loja, o que falta e a ordem segura.

## Volta atrás

Nada do OAZE 1 é apagado pela migração; o repositório antigo tem tags
(`v2.0.0`, `backup-pre-saas`), e a tabela nova não toca no documento `dados`. Se
o v2 falhar no ar, voltar o deploy para o commit anterior devolve o OAZE 1 com
os dados de todo mundo intactos.
