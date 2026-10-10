# Teste mobile e preparação para lojas

Estado verificado em 09/10/2026. Código em `G:\Meu Drive\sites\oaze app`. O identificador `site.oaze.app` ainda é uma proposta: confirmar antes de cadastrar o aplicativo nas lojas.

## Testar no Android

O workflow `.github/workflows/app-mobile-test.yml` gera um **APK de depuração** no GitHub Actions a cada alteração do app na branch `main` e também por execução manual. O APK usa o pacote `site.oaze.app.teste`, separado do futuro app de loja. O fluxo não precisa de keystore de publicação.

1. Abra `https://github.com/osanttoro-creator/oaze/actions/workflows/app-mobile-test.yml` no celular com acesso ao repositório.
2. Abra a execução mais recente que tenha os jobs verdes.
3. Em **Artifacts**, baixe `oaze-android-teste-<número>`, extraia o ZIP e instale `app-debug.apk`.
4. Se o Android solicitar permissão para instalar este arquivo, conceda apenas para o aplicativo usado no download. O APK vem do workflow do próprio repositório, não de um site de terceiros.
5. Abra o OAZE e escolha **Ver com dados de exemplo**. Teste navegação, PIN, lançamentos, cartões, metas, tela bloqueada e uso sem rede.

Se as variáveis públicas `OAZE_SUPABASE_URL` e `OAZE_SUPABASE_PUBLISHABLE_KEY` estiverem cadastradas em **Settings → Secrets and variables → Actions → Variables**, o APK também oferece login na mesma conta Supabase do site. Sem ambas, ele é um teste local sem conta. `VITE_OAZE_SYNC_ENABLED` fica `false` no APK de teste: dados financeiros não aparecem automaticamente no outro aparelho. Não use o APK para validar sincronização antes da ativação controlada.

Um APK de depuração não é o pacote da Play Store. A Google Play recebe um AAB de lançamento, assinado com a chave de upload.

## Testar no iPhone

O mesmo workflow compila o projeto iOS com Xcode 26 ou superior e **sem assinatura**, para detectar falhas de build. Esse resultado não pode ser instalado num iPhone. Para testar no aparelho, é preciso cadastrar `site.oaze.app` na conta Apple Developer, configurar assinatura e distribuir um build pelo TestFlight. O workflow `app-ios.yml` já contém a etapa de arquivo e upload, mas ainda não foi executado com credenciais Apple verificadas.

## Preparação da Google Play

- Android usa `targetSdkVersion 36`, exigido para novos envios no período atual.
- `app-android.yml` gera AAB assinado quando as variáveis públicas do Supabase, a flag de sync validada e os quatro segredos da chave de upload estiverem configurados.
- Segredos: `ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. Nunca gravar a chave ou senhas no Git.
- Confirmar identificador, nome, política de privacidade, exclusão de conta, formulários de dados financeiros e de segurança de dados. Cadastrar o app na Play Console e fazer primeiro envio pelo canal de testes.

## Preparação da App Store

- `app-ios.yml` usa `macos-26` e requer URL/chave pública Supabase, sync validada, `APPLE_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID` e `ASC_KEY_P8` para assinar e enviar. Sem credenciais, apenas compila sem assinatura.
- Confirmar Bundle ID `site.oaze.app` e criar o registro correspondente em App Store Connect antes do upload.
- Configurar Google/Apple Login, URLs de retorno, Associated Domains, APNs, política de privacidade, rótulos de privacidade, classificação etária e exclusão de conta. Confirmar regras de assinatura dentro do app antes de oferecer pagamento.
- TestFlight exige build assinado, processamento da Apple e convite/adição de testadores.

## Bloqueios de lançamento público

1. A sincronização financeira segue desativada. Testar Auth, importação, conflitos e retorno do offline em dois aparelhos reais antes de definir `OAZE_SYNC_ENABLED=true` nas variáveis do GitHub.
2. Builds nativos, instalação em aparelhos e fluxos de loja ainda precisam de execução observada. `cap sync` e testes web não provam compilação nativa.
3. Push requer configuração FCM/APNs e função de envio no backend.
4. ID nas lojas, preço/plano e conformidade de compras no iOS ainda precisam de decisão. Não criar cadastros irreversíveis por suposição.
5. Capturar screenshots reais do app e preencher as declarações com base no comportamento final. Material promocional não substitui telas reais.

A migração SQL `20261010010249_oaze2_multiplatform_sync.sql` já foi aplicada no mesmo Supabase do OAZE 1. As tabelas novas estão vazias; o importador do app apenas lê `public.dados` da própria conta por escolha explícita.