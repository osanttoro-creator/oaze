# Teste mobile e preparação para lojas

Estado atualizado em 16/10/2026. Código em `G:\Meu Drive\sites\oaze app`. O identificador `site.oaze.app` ainda é uma proposta: confirmar antes de cadastrar o aplicativo nas lojas.

O domínio raiz `https://oaze.site/` é a apresentação do produto; a experiência financeira web fica em `https://oaze.site/app`. O site publicado encaminha retornos de autenticação que chegarem à raiz para `/app`. No Android e Windows instalados, o fluxo de login por provedor abre o navegador do sistema e usa `oaze://auth` para voltar ao aplicativo. Cadastrar `oaze://auth` nas URLs de redirecionamento autorizadas do Supabase e testar retorno com o aplicativo fechado antes de promover builds de teste para as lojas. O navegador do usuário precisa permanecer fora da interface do app durante a autenticação.

O [workflow mobile desta revisão](https://github.com/osanttoro-creator/oaze/actions/runs/38976818155)
passou nos três jobs: web, Android e iOS. Também compilou o AAB Android sem assinatura de loja. O APK com a agenda foi copiado para
`builds/oaze-android-teste-10.apk` dentro da pasta canônica, com SHA-256
`0716F298DDDF76E6345EF439048A477A48A563F3CBEA05F4518FEEDB244EE555`.
O arquivo foi aberto como pacote ZIP/APK e contém os assets web apontando para o
mesmo projeto Supabase. A instalação e os fluxos em aparelhos reais ainda não
foram testados.

## Arquivos de teste no Google Drive

No celular ou computador, abra **Meu Drive → sites → oaze app → builds**. Arquivos verificados:

- Android: `oaze-android-teste-10.apk` — SHA-256 `0716F298DDDF76E6345EF439048A477A48A563F3CBEA05F4518FEEDB244EE555`.
- Windows x64: `oaze-windows-teste-10.msi` — SHA-256 `400832E538C24110BF8838C190F2202A2B66B8B0E72F6B4FCDAFAC483AEFB684`; alternativa `oaze-windows-teste-10.exe` — SHA-256 `00DA87541C1B5DB9CD7441B549F3B9DB93AB44215DFBC274C80997BD0578177D`.
- macOS Apple Silicon: `oaze-macos-teste-7.dmg` — SHA-256 `06B0C940B13752619FEA0AFACDEB5FE6ED8A9C69D58F16BA0ED8B483124236B2`.

O [workflow desktop desta revisão](https://github.com/osanttoro-creator/oaze/actions/runs/38976818160) passou em Windows e macOS. Os instaladores Windows desta revisão são builds de teste sem assinatura de distribuição. O DMG listado acima é anterior a esta revisão e apenas para Macs Apple Silicon. No iPhone ainda não há pacote instalável: a compilação iOS passou sem assinatura, mas TestFlight requer credenciais Apple.

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

- Android usa `targetSdkVersion 36` — Android 16, exigido pelo Google para novos envios desde 31/08/2026.
- `app-android.yml` gera AAB assinado quando as variáveis públicas do Supabase e os quatro segredos da chave de upload estiverem configurados.
- **Canal.** O workflow pergunta `teste` ou `producao`. `teste` aceita a
  sincronização desligada: sem conta o app funciona inteiro, isolado no
  aparelho, e isso é promessa do produto — não há por que impedir um envio ao
  canal de testes por causa dela. `producao` exige `OAZE_SYNC_ENABLED=true`,
  que só deve existir depois do teste real entre dois aparelhos. A mesma
  escolha existe no workflow da Microsoft Store.
- **A chave de upload é criada uma vez e nunca entra no Git.** Perder essa chave
  sem ter o Play App Signing configurado significa não poder mais atualizar o
  app. Gerar com o `keytool` do JDK:

  ```
  keytool -genkeypair -v -keystore oaze-upload.jks -alias oaze-upload \
    -keyalg RSA -keysize 4096 -validity 10000
  ```

  Depois converter para base64 e colar nos segredos do repositório, guardando o
  arquivo e as senhas num cofre de senhas — não na pasta do projeto:

  ```
  base64 -w0 oaze-upload.jks > oaze-upload.jks.b64
  ```
- O CI fornece `versionCode` crescente a cada execução do workflow de loja. O APK de teste usa um identificador próprio e não substitui o app de produção.
- Segredos: `ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. Nunca gravar a chave ou senhas no Git.
- **App Links de `https://oaze.site/app` não estão verificados.** O
  `AndroidManifest.xml` declara `android:autoVerify="true"` para esse endereço,
  mas `https://oaze.site/.well-known/assetlinks.json` **não existe** — conferido
  em 25/10/2026 na pasta do site. Sem esse arquivo o Android ignora a
  verificação e abre o seletor de aplicativo em vez do app. O arquivo depende da
  impressão SHA-256 da chave que o Play usa para assinar, que só existe depois de
  criar o app no Play Console (**Configuração → Integridade do app → Assinatura
  de apps**). Publicar o arquivo é trabalho no repositório do site, não neste.
- Confirmar identificador, nome, exclusão de conta, formulários de dados financeiros e de segurança de dados. As URLs públicas `https://oaze.site/privacidade`, `https://oaze.site/termos` e `https://oaze.site/suporte` responderam com páginas próprias em 09/10/2026; revisar seu conteúdo final antes de informar às lojas. Cadastrar o app na Play Console e fazer primeiro envio pelo canal de testes.

## Preparação da App Store

- `app-ios.yml` usa `macos-26` e requer URL/chave pública Supabase, sync validada, `APPLE_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID` e `ASC_KEY_P8` para assinar e enviar. Sem credenciais, apenas compila sem assinatura.
- Confirmar Bundle ID `site.oaze.app` e criar o registro correspondente em App Store Connect antes do upload.
- Configurar Google/Apple Login, URLs de retorno, Associated Domains, APNs, política de privacidade, rótulos de privacidade, classificação etária e exclusão de conta. Confirmar regras de assinatura dentro do app antes de oferecer pagamento.
- TestFlight exige build assinado, processamento da Apple e convite/adição de testadores.

## Preparação da Microsoft Store

Em 13/10/2026, o painel **Apps & Games** da conta do usuário abriu e mostrou **0 produtos**. O menu da conta mostrou apenas o nome do perfil; não exibiu o editor jurídico. Portanto o nome OAZE ainda não aparece reservado nesse painel e nenhum pacote foi enviado.

### Decisão de 25/10/2026: o caminho é MSIX, não o instalador assinado

A Microsoft aceita duas vias, e elas custam coisas diferentes:

| | Empacotado (MSIX) | Instalador como está (EXE/MSI) |
| --- | --- | --- |
| Assinatura de código | **da Microsoft, sem custo** | do editor, certificado comprado de uma CA do programa de raízes confiáveis |
| Hospedagem do binário | **da Microsoft** | do editor, em URL estável que não pode mudar |
| Atualização | o Windows verifica sozinho | responsabilidade do app |
| Instalação silenciosa | não se aplica | exigida, e precisa ser declarada no painel |

O Tauri gera MSI e NSIS/EXE, não MSIX — e era isso que antes empurrava este
projeto para a via do certificado pago. O MSIX é montado a partir do binário que
o Tauri já compila, e é o que `app/tools/empacotar-msix.mjs` faz: layout,
manifesto e `makeappx pack`. O workflow é
[`App · Windows (Microsoft Store)`](../.github/workflows/app-windows-store.yml).

O pacote sai **sem assinatura**, de propósito: quem assina é a Store ao aceitar
o envio. A consequência prática é que ele não instala numa máquina qualquer sem
um certificado de teste confiado localmente — o teste de instalação antes do
envio exige esse passo a mais.

Três valores entram no manifesto e **nenhum deles é escolha nossa**: o Partner
Center os atribui ao produto e compara o manifesto caractere por caractere.
Ficam em variáveis do repositório: `MSSTORE_IDENTITY_NAME`,
`MSSTORE_IDENTITY_PUBLISHER`, `MSSTORE_PUBLISHER_DISPLAY_NAME`, copiados de
**o produto → Product management → Product identity**. Sem eles o script para
antes de gerar qualquer coisa, em vez de produzir um pacote que seria recusado.

A versão do pacote tem quatro partes e a última é sempre `0`: a Store reserva a
revisão para si. `2.0.1` em `tauri.conf.json` vira `2.0.1.0` no manifesto.

Duas coisas que o MSIX muda no comportamento do app e que precisam de teste
observado na primeira instalação:

- **O esquema `oaze://` passa a ser registrado pelo manifesto**, não pelo
  registro do Windows em tempo de execução — dentro do contêiner essa escrita é
  virtualizada. Está declarado em `src-tauri/msix/AppxManifest.template.xml`. É
  por aí que o login com Google volta para o app; se o retorno falhar no pacote
  e funcionar no MSI, é aqui que se olha.
- **O WebView2 não pode ser declarado como dependência** do pacote. O app conta
  com o WebView2 Evergreen, que já vem no Windows 11 e chega ao Windows 10 pelo
  Edge. Num Windows 10 sem ele, o app abre e fecha sem mensagem. Se isso
  aparecer em teste, a saída é embutir o WebView2 de versão fixa no pacote.

A via do instalador assinado continua possível e o workflow `App · Windows`
continua gerando MSI e EXE para download direto. Se um dia ela for escolhida,
duas coisas voltam a importar: o modo `offlineInstaller` em
`app/src-tauri/tauri.microsoftstore.conf.json` (o `embedBootstrapper` dos builds
de teste não satisfaz a exigência de instalador offline) e o `bundle.publisher`,
hoje igual ao `productName` — combinação que a documentação do Tauri aponta como
inválida para a Store. Para o MSIX nenhuma das duas se aplica: o editor vem do
`PublisherDisplayName` do Partner Center.

Fontes: [Tauri — Microsoft Store](https://v2.tauri.app/distribute/microsoft-store/), [Microsoft — distribuir Win32](https://learn.microsoft.com/en-us/windows/apps/distribute-through-store/how-to-distribute-your-win32-app-through-microsoft-store), [Microsoft — assinatura](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options).

## Bloqueios de lançamento público

1. A sincronização financeira segue desativada. Testar Auth, importação, conflitos e retorno do offline em dois aparelhos reais antes de definir `OAZE_SYNC_ENABLED=true` nas variáveis do GitHub.
2. Os builds nativos Android e iOS passaram no CI. Instalação em aparelhos, assinatura e fluxos de loja ainda precisam de execução observada.
3. Push requer configuração FCM/APNs e função de envio no backend.
4. ID nas lojas, preço/plano e conformidade de compras no iOS ainda precisam de decisão. Não criar cadastros irreversíveis por suposição.
5. Capturar screenshots reais do app e preencher as declarações com base no comportamento final. Material promocional não substitui telas reais.

A migração SQL `20261010010249_oaze2_multiplatform_sync.sql` já foi aplicada no mesmo Supabase do OAZE 1. As tabelas novas estão vazias; o importador do app apenas lê `public.dados` da própria conta por escolha explícita.
