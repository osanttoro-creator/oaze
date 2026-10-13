# Teste mobile e preparação para lojas

Estado verificado em 10/10/2026. Código em `G:\Meu Drive\sites\oaze app`. O identificador `site.oaze.app` ainda é uma proposta: confirmar antes de cadastrar o aplicativo nas lojas.

O workflow [de teste #4](https://github.com/osanttoro-creator/oaze/actions/runs/38061380060)
passou nos três jobs: web, Android e iOS. Também compilou o AAB Android sem assinatura de loja. O APK foi copiado para
`builds/oaze-android-teste-4.apk` dentro da pasta canônica, com SHA-256
`711B473226FD72DB6EE4D498E4840900805287F37319541E0D8CD5ECBC0BB701`.
O arquivo foi aberto como pacote ZIP/APK e contém os assets web apontando para o
mesmo projeto Supabase. A instalação e os fluxos em aparelhos reais ainda não
foram testados.

## Arquivos de teste no Google Drive

No celular ou computador, abra **Meu Drive → sites → oaze app → builds**. Arquivos verificados:

- Android: `oaze-android-teste-4.apk` — SHA-256 `711B473226FD72DB6EE4D498E4840900805287F37319541E0D8CD5ECBC0BB701`.
- Windows x64: `oaze-windows-teste-3.msi` — SHA-256 `6D9AB268ADBCF22D274A0D813174CA2171F8D03C698B24D2ADE277E055E32D98`; alternativa `oaze-windows-teste-3.exe` — SHA-256 `E1568A18541578CBD4EC354B29F60D0D3E1C796152A05455896D0A01D9B320B2`.
- macOS Apple Silicon: `oaze-macos-teste-3.dmg` — SHA-256 `C249712E0A90B5C91F9012C9472E2604927882CE1FF337CF697450D037C86D02`.

O [workflow desktop #3](https://github.com/osanttoro-creator/oaze/actions/runs/38063044007) passou em Windows e macOS. Os instaladores desktop são builds de teste sem assinatura de distribuição, e o DMG desta execução é apenas para Macs Apple Silicon. No iPhone ainda não há pacote instalável: a compilação iOS passou sem assinatura, mas TestFlight requer credenciais Apple.

## Testar no Android

O workflow `.github/workflows/app-mobile-test.yml` gera um **APK de depuração** no GitHub Actions a cada alteração do app na branch `main` e também por execução manual. O APK usa o pacote `site.oaze.app.teste`, separado do futuro app de loja. O fluxo não precisa de keystore de publicação.

1. Abra `https://github.com/osanttoro-creator/oaze/actions/workflows/app-mobile-test.yml` no celular com acesso ao repositório.
2. Abra a execução mais recente que tenha os jobs verdes.
3. Em **Artifacts**, baixe `oaze-android-teste-<número>`, extraia o ZIP e instale `app-debug.apk`.
4. Se o Android solicitar permissão para instalar este arquivo, conceda apenas para o aplicativo usado no download. O APK vem do workflow do próprio repositório, não de um site de terceiros.
5. Abra o OAZE e escolha **Ver com dados de exemplo**. Teste navegação, PIN, lançamentos, cartões, metas, tela bloqueada e uso sem rede.

Se as variáveis públicas `OAZE_SUPABASE_URL` e `OAZE_SUPABASE_PUBLISHABLE_KEY` estiverem cadastradas em **Settings → Secrets and variables → Actions → Variables**, o APK também oferece login na mesma conta Supabase do site. Sem ambas, ele é um teste local sem conta. `VITE_OAZE_SYNC_ENABLED` fica `false` no APK de teste: dados financeiros não aparecem automaticamente no outro aparelho. Não use o APK para validar sincronização antes da ativação controlada.

Um APK de depuração não é o pacote da Play Store. A Google Play recebe um AAB de lançamento, assinado com a chave de upload.
Cada runner de teste pode gerar uma assinatura de depuração diferente; para instalar
um APK de outra execução pode ser necessário desinstalar o anterior, o que apaga
os dados locais daquela instalação. Exporte um backup antes de fazer isso.

## Testar no iPhone

O mesmo workflow compila o projeto iOS com Xcode 26 ou superior e **sem assinatura**, para detectar falhas de build. Esse resultado não pode ser instalado num iPhone. Para testar no aparelho, é preciso cadastrar `site.oaze.app` na conta Apple Developer, configurar assinatura e distribuir um build pelo TestFlight. O workflow `app-ios.yml` já contém a etapa de arquivo e upload, mas ainda não foi executado com credenciais Apple verificadas.

## Preparação da Google Play

- Android usa `targetSdkVersion 36`, exigido para novos envios no período atual.
- `app-android.yml` gera AAB assinado quando as variáveis públicas do Supabase, a flag de sync validada e os quatro segredos da chave de upload estiverem configurados.
- O CI fornece `versionCode` crescente a cada execução do workflow de loja. O APK de teste usa um identificador próprio e não substitui o app de produção.
- Segredos: `ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. Nunca gravar a chave ou senhas no Git.
- Confirmar identificador, nome, exclusão de conta, formulários de dados financeiros e de segurança de dados. As URLs públicas `https://oaze.site/privacidade`, `https://oaze.site/termos` e `https://oaze.site/suporte` responderam com páginas próprias em 09/10/2026; revisar seu conteúdo final antes de informar às lojas. Cadastrar o app na Play Console e fazer primeiro envio pelo canal de testes.

## Preparação da App Store

- `app-ios.yml` usa `macos-26` e requer URL/chave pública Supabase, sync validada, `APPLE_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID` e `ASC_KEY_P8` para assinar e enviar. Sem credenciais, apenas compila sem assinatura.
- Confirmar Bundle ID `site.oaze.app` e criar o registro correspondente em App Store Connect antes do upload.
- Configurar Google/Apple Login, URLs de retorno, Associated Domains, APNs, política de privacidade, rótulos de privacidade, classificação etária e exclusão de conta. Confirmar regras de assinatura dentro do app antes de oferecer pagamento.
- TestFlight exige build assinado, processamento da Apple e convite/adição de testadores.

## Preparação da Microsoft Store

O usuário informou em 13/10/2026 que abriu o painel **Apps & Games** no Partner Center. Isso não confirma que o nome do produto foi reservado nem que o pacote foi aceito.

O Tauri 2 gera MSI e NSIS/EXE. Para a via **EXE ou MSI** da Store, a Microsoft exige instalador offline, instalação silenciosa, hospedagem do binário numa URL estável e assinatura do instalador e dos executáveis internos por certificado confiável. O NSIS aceita `/S`; o MSI aceita `msiexec /quiet`. O modo `embedBootstrapper` usado nos builds de teste não satisfaz a exigência de instalador offline. A configuração `app/src-tauri/tauri.microsoftstore.conf.json` altera somente esse modo para `offlineInstaller`; ela não assina nem publica o pacote.

Antes do build de submissão: confirmar o **nome jurídico do editor** exibido no Partner Center. O `bundle.publisher` atual é `OAZE`, igual ao `productName`, combinação que a documentação do Tauri aponta como inválida para a Store. Não substituir esse campo por um nome presumido. Após confirmar o editor e obter o certificado, gerar um novo bundle com a configuração da Store, testar instalação/remoção em Windows limpo, login, cofre e sincronização, e só então enviar pelo Partner Center. O caminho MSIX pode evitar o custo de certificado, mas o Tauri não o gera diretamente; conversão e teste do MSIX são um trabalho separado.

Fontes: [Tauri — Microsoft Store](https://v2.tauri.app/distribute/microsoft-store/), [Microsoft — distribuir Win32](https://learn.microsoft.com/en-us/windows/apps/distribute-through-store/how-to-distribute-your-win32-app-through-microsoft-store), [Microsoft — assinatura](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options).

## Bloqueios de lançamento público

1. A sincronização financeira segue desativada. Testar Auth, importação, conflitos e retorno do offline em dois aparelhos reais antes de definir `OAZE_SYNC_ENABLED=true` nas variáveis do GitHub.
2. Os builds nativos Android e iOS passaram no CI. Instalação em aparelhos, assinatura e fluxos de loja ainda precisam de execução observada.
3. Push requer configuração FCM/APNs e função de envio no backend.
4. ID nas lojas, preço/plano e conformidade de compras no iOS ainda precisam de decisão. Não criar cadastros irreversíveis por suposição.
5. Capturar screenshots reais do app e preencher as declarações com base no comportamento final. Material promocional não substitui telas reais.

A migração SQL `20261010010249_oaze2_multiplatform_sync.sql` já foi aplicada no mesmo Supabase do OAZE 1. As tabelas novas estão vazias; o importador do app apenas lê `public.dados` da própria conta por escolha explícita.
