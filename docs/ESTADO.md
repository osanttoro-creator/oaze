# OAZE 2 — estado (28/09/2026)

Local apenas. Nada foi enviado ao Drive nem ao GitHub: a regra é só publicar quando estiver todo pensado.

## Decisões

- **Stack:** um núcleo React 19 + TypeScript + Vite; Capacitor para iOS/Android, Tauri 2 para Windows/macOS (docs/02-TRD.md).
- **Open Finance:** fora do v1, entra numa atualização futura (Jonatham, 28/09/2026).
- **Dinheiro em centavos**; regras contábeis do `calc.js` portadas sem mudança e cobertas por testes.
- **Coco grava só com confirmação** (rascunho → "Lançar"), com desfazer. O mockup lança direto; trocar é uma linha.
- **Espaço de exemplo** isolado; `?demo` abre o exemplo só em aparelho vazio.
- **Migração OAZE 1 → 2** sem apagar o original.

## Pendente de decisão de Jonatham

1. **Plano:** o briefing diz plano único (R$ 29,90/mês ou R$ 249,90/ano); o site feito na sessão `oaze` oferece "grátis" + "completo". O app segue o briefing. Os preços ainda constam como pendentes no cofre.
2. **Site × app:** o site da sessão `oaze` promete voz na Coco e extrato "na moeda dela" — o v1 não tem nenhum dos dois — e aponta para `/criar-conta`, rota que não existe no `.htaccess` atual (lá é `/cadastro`).
3. **Identificador nas lojas:** proposta `site.oaze.app` (não dá para trocar depois de criar o app nas lojas).
4. **Microsoft Store:** instalador MSI assinado com certificado próprio ou MSIX.

## Pronto e verificado

- `app/`: 27 testes (motor, Coco, migração), tipos limpos, build de produção (115 KB de JS comprimido).
- Todas as telas do mockup, celular e desktop, verificadas no navegador em 375 px e 1440 px.
- Migração verificada de ponta a ponta num Chrome limpo.
- Projetos nativos gerados: `app/android`, `app/ios` (Swift Package Manager, sem CocoaPods), `app/src-tauri`; ícones do kit nas quatro plataformas; backup do Android desligado.
- CI escrito: `.github/workflows/app-ci|app-android|app-ios|app-desktop.yml`.
- Capturas reais do app para o site em `site/assets/img/*.webp`.

## Não verificado

- Nenhum build nativo rodou: esta máquina não tem Rust, Android SDK nem macOS. Os workflows nunca rodaram.
- Biometria nativa, notificações do sistema e tela segura estão na interface, mas sem implementação nativa.
- Os dados do web ficam em `localStorage` (como no OAZE 1); **o nativo precisa de armazenamento cifrado antes das lojas.**

## Bloqueia publicação

1. Armazenamento cifrado no nativo.
2. Conta + sincronização (sem isso, trocar `/app` do site deixaria quem usa o OAZE 1 em mais de um aparelho sem sincronização).
3. Adaptar o deploy da Hostinger para `site/` + `app/dist` em `/app`.

## Avisos

- `npm audit`: 3 avisos moderados no `uuid` usado pelo CLI do Capacitor (ferramenta, não vai no app). A correção sugerida rebaixa o CLI; deixado como está.
- `frame-ancestors` não vale em `<meta>`: precisa ir no cabeçalho HTTP, como já está no `.htaccess` do OAZE 1.

## Próximos passos, em ordem

1. Decidir as pendências acima.
2. Fatias 8 e 10 de `06-implementacao.md` (cifragem nativa, conta + sync).
3. Rodar os workflows no GitHub para produzir os primeiros binários.
4. Unificar o site da sessão `oaze` com o app (plano, promessas, rotas) e adaptar o deploy.
