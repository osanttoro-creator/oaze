# O painel de `/app` no Android e Windows

## Correção de produto

O APK de teste 16 e os instaladores Windows 13 exibiam a interface React de outro produto em andamento. Eles **não** representam o painel que o usuário acessa em `https://oaze.site/app`. Não distribuir esses arquivos como a versão atual do OAZE.

O pacote 2.0.2 passa a usar os arquivos do `/app` publicado: HTML, estilos, lógica financeira, agenda, carteira, Coco, fontes e marca. O snapshot fica em `app/live-site/`, copiado dos arquivos rastreados do site no commit `234270f`. Os arquivos não rastreados de conceitos e prévias não entraram. A comparação do HTML de origem com o que o servidor entregou em 25/10/2026 mostrou apenas os parâmetros `?v=` de cache gerados pelo deploy.

O build nativo copia esse painel para `app/dist-live/`. Ele não carrega `oaze.site` como URL remota: a interface é empacotada, e a conta continua apontando para o mesmo Supabase do site. A experiência visual do site permanece a mesma em desktop e mobile, com os breakpoints do próprio painel. O código React anterior continua no repositório para não perder trabalho, mas **não** é a entrada dos novos pacotes Android e Windows.

## Rotas e login

- `/index.html` abre o painel. Sem sessão válida, o backend leva a `/entrar.html`.
- Entrada por e-mail usa as telas do site. Google/Apple solicitam o código PKCE no Supabase, abrem o navegador do sistema e voltam por `oaze://auth`. A ponte troca o código por sessão no armazenamento do app.
- O Android declara o esquema no manifesto. O Tauri declara o esquema no instalador e no manifesto MSIX.
- O build move os scripts inline do HTML para arquivos locais, aplica CSP e confere todas as referências de CSS, JS e imagens.

## Como reproduzir

Na pasta `app`, rodar `npm ci` e `npm run build:published`. Android: `npx cap sync android` e Gradle. Windows: `npx tauri build`, que chama o build publicado antes de empacotar. As GitHub Actions `App · Android` e `App · Windows` executam isso em ambientes nativos.

## Evidência e limite

- `npm run build:published`, typecheck e scanner passaram na cópia local em 25/10/2026.
- Um servidor estático da saída abriu a tela de entrada sem sessão; as capturas demonstrativas estão em `docs/previews/painel-publicado-android-demo.png` e `painel-publicado-desktop-demo.png`.
- Ainda falta instalar o **novo** APK e o **novo** instalador Windows, entrar com uma conta real, validar OAuth de retorno e comparar dados em dois aparelhos. Captura demo e build CI não provam esses fluxos.
- O painel do site mantém dados financeiros em `localStorage` do aparelho. Antes de produção, é necessário avaliar proteção de dados em repouso e o fluxo de recuperação, inclusive após logout e troca de conta.
- Qualquer atualização futura do `/app` deve atualizar o snapshot em `app/live-site/`, validar o build e gerar novos binários. Esta versão não recebe mudanças de interface remotas automaticamente.
