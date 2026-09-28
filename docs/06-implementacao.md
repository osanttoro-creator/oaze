# OAZE 2 — Plano de implementação

Status: 28/09/2026 · ✅ feito e verificado · 🟡 próximo · ⛔ bloqueia publicação

## Fatias

| # | Fatia | Estado | Prova |
|---|---|---|---|
| 1 | Motor em centavos (porte do calc) + automações | ✅ | 19 testes de regra contábil |
| 2 | Estado, PIN, bloqueio, desfazer | ✅ | fluxo no navegador |
| 3 | Todas as telas do mockup, celular e desktop | ✅ | navegador 375 px e 1440 px, sem erro no console |
| 4 | Coco no aparelho (Agora, Conversa, Memória) | ✅ | 4 testes + categorizar/desfazer e lançar pela conversa no navegador |
| 5 | Migração OAZE 1 → 2 | ✅ | 4 testes de paridade + fluxo completo no Chrome limpo |
| 6 | Projetos nativos: Android, iOS (Capacitor 8), Windows/macOS (Tauri 2), ícones do kit | ✅ gerados · 🟡 não compilados (sem SDKs aqui) | pastas `android/`, `ios/`, `src-tauri/` |
| 7 | CI: verificação, Android AAB, iOS, desktop | ✅ escrito · 🟡 nunca rodou | `.github/workflows/app-*.yml` |
| 8 | ⛔ Armazenamento cifrado no nativo (chave no Keychain/Keystore/Credential Manager) | 🟡 | obrigatório antes das lojas |
| 9 | Biometria nativa (plugins mobile + comando Rust no desktop) | 🟡 | |
| 10 | ⛔ Conta + sincronização Supabase (tabelas normalizadas) | 🟡 | 05-backend.md |
| 11 | Coco com IA via `oaze-assistant` + consentimento | 🟡 | |
| 12 | Assinatura (Stripe/Asaas; regra de compra no app do iOS) | 🟡 | 02-TRD.md |
| 13 | Site de apresentação | outra sessão (`oaze`) em `site/` | conflitos em ESTADO.md |
| 14 | Idiomas en/es/fr | 🟡 | |

## Comandos

```
cd app
npm ci
npm test            # regras contábeis, Coco, migração
npm run typecheck
npm run dev         # http://localhost:5188  (?demo abre o exemplo)
npm run build       # dist/ — o mesmo build vai para web, Capacitor e Tauri
npx cap sync        # copia dist/ para android/ e ios/
npx tauri build     # precisa de Rust (CI)
```

## Publicação — ordem segura

1. Fatias 8 e 10 prontas; versão web no ar em `/app` só depois da migração testada com dados reais de alguém (em `/app` o endereço é o mesmo do OAZE 1, então a migração lê o `financas.v1` direto).
2. Site novo e app no mesmo repositório; o workflow de deploy da Hostinger precisa ser adaptado para `site/` + `app/dist` em `/app` (e o `.htaccess` apontar `/app` para `app/index.html`).
3. Lojas: primeiro envio de cada uma é manual; depois, tags `app-v*` disparam os builds.

## Volta atrás

Nada do OAZE 1 é apagado pela migração; o repositório antigo tem tags (`v2.0.0`, `backup-pre-saas`). Se o v2 falhar no ar, voltar o deploy para o commit anterior do repositório antigo devolve o OAZE 1 com os dados de todo mundo intactos.
