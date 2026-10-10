# FASE 19 · Publicação

O que já está pronto, o que depende de uma máquina que esta sessão não tem, e o
que depende de uma decisão de Jonatham. Nada aqui é marcado como feito sem prova.

## Versionamento e ambientes

| Ambiente | Onde | Como se marca |
|---|---|---|
| development | máquina de quem desenvolve | `VITE_OAZE_ENV=development` |
| staging | projeto Supabase separado | `VITE_OAZE_ENV=staging` |
| production | projeto Supabase de produção | `VITE_OAZE_ENV=production` |

Versão em `app/package.json` e em `app/src-tauri/tauri.conf.json` — **os dois
precisam bater**. A tag `app-v*` dispara os três workflows de loja.

**Antes de qualquer tag**, `npm run check` precisa passar: tipos, 137 testes,
build e a varredura de segurança. O CI repete tudo e ainda reprova o build se o
JavaScript do primeiro carregamento passar de 184 KB comprimidos.

## Android · Google Play

| Item | Estado |
|---|---|
| Projeto Capacitor gerado | ✅ |
| `AndroidManifest`: esquema `oaze://`, App Links de `https://oaze.site/app`, biometria, notificação | ✅ nesta sessão |
| Workflow que gera o AAB assinado | ✅ escrito · ⛔ nunca executado |
| `assetlinks.json` em `https://oaze.site/.well-known/` | ⛔ precisa ser publicado, senão o App Link não verifica |
| Keystore de upload nos segredos do GitHub | ⛔ |
| Formulário **Segurança dos dados** e **Declaração de recursos financeiros** | ⛔ · material em `oaze mobile/02-android-samsung/` |
| Plugins nativos instalados | ⛔ `npm i` + `npx cap sync` — lista abaixo |

**Plugins que o código já chama e que precisam entrar:**

```bash
npm i capacitor-secure-storage-plugin @capacitor/preferences \
      @aparajita/capacitor-biometric-auth @capacitor/share @capacitor/clipboard \
      @capacitor/camera @capawesome/capacitor-file-picker @capacitor/push-notifications
npx cap sync
```

Cada um é lido de `Capacitor.Plugins` e **nenhum é importado estaticamente**: sem o
plugin, a capacidade some da interface em vez de virar botão que não faz nada.
A exceção é o cofre — sem ele o app **não abre e explica**, de propósito.

**Push ainda não envia nada.** A tabela `oaze2_push_tokens` e o registro do
aparelho existem; falta a função de servidor com a chave do FCM e o certificado
da APNs. Até lá, os lembretes são locais e funcionam sem rede.

> Sem os plugins o app **abre e avisa** que o cofre do aparelho não respondeu —
> de propósito. Ele não cai para armazenamento sem cifragem em silêncio.

## iOS · App Store

| Item | Estado |
|---|---|
| Projeto Capacitor com Swift Package Manager | ✅ |
| `NSFaceIDUsageDescription` e `CFBundleURLTypes` no `Info.plist` | ✅ nesta sessão |
| Workflow de arquivo, assinatura e envio | ✅ escrito · ⛔ nunca executado |
| `apple-app-site-association` publicado | ⛔ · minuta em `oaze mobile/01-apple-iphone-ipad-mac/arquivos/` |
| Chave de API do App Store Connect nos segredos | ⛔ |
| **Entrar com a Apple** | ✅ no código — a diretriz 4.8 exige, e ela anda junto com o Google |
| Exclusão de conta dentro do app | ✅ `core/auth/deleteAccount` → Edge Function `oaze-conta` |
| Rótulos de privacidade | ⛔ · material em `oaze mobile/01-apple-iphone-ipad-mac/2-privacidade-app-store.md` |
| Assinatura vendida no app (regra 3.1.1) | ⛔ **decisão pendente** — ver abaixo |

## Windows · Microsoft Store

| Item | Estado |
|---|---|
| Tauri 2 com alvos MSI e NSIS | ✅ |
| Comandos Rust: cofre, Windows Hello, notificação agendada, compartilhar, deep link | ✅ escritos · ⛔ **nunca compilados** (esta máquina não tem Rust) |
| `capabilities/default.json` com permissão mínima | ✅ |
| Certificado de código **ou** MSIX | ⛔ **decisão pendente** |

## macOS · Mac App Store

| Item | Estado |
|---|---|
| Alvos `.app` e `.dmg` | ✅ |
| `Entitlements.plist` com App Sandbox e só rede de saída | ✅ |
| Touch ID por `LocalAuthentication` | ✅ escrito · ⛔ nunca compilado |
| Assinatura de distribuição e envio do `.pkg` | ⛔ |
| Fora da loja: DMG notarizado | ⛔ |

## Decisões que travam o envio

1. **Identificador nas lojas.** Proposto `site.oaze.app`, já escrito no Capacitor
   e no Tauri. **Não dá para trocar depois de criar o app nas lojas.**
2. **Plano.** O briefing do OAZE 2 diz plano único (R$ 29,90/mês ou R$ 249,90/ano);
   o site oferece "grátis" + "completo"; o app traz plano grátis com 10 coconutz.
   São três respostas para a mesma pergunta e só uma pode ir para a loja.
3. **Pagamento no iOS.** Assinatura vendida dentro do app cai na regra 3.1.1.
   Ligar Stripe/Asaas no iPhone sem resolver isso é reprovação na revisão.
4. **Windows: certificado próprio ou MSIX.**
5. **Promessas do site que o app não cumpre** (registradas em `ESTADO.md` e
   confirmadas na auditoria): voz na Coco e extrato em moeda estrangeira não
   existem; `/criar-conta` não é rota do `.htaccess`, lá é `/cadastro`.

## Ordem segura

1. Instalar os plugins nativos e rodar `npx cap sync`.
2. Rodar `app-ci` no GitHub — é o primeiro build que esta sessão **não** pôde
   executar, e é ele que prova que o CI fecha.
3. Rodar `app-android` e `app-desktop` sem segredos, só para ver compilar. O
   Rust nunca foi compilado: é aqui que erros de API aparecem, não antes.
4. A migração `supabase/migrations/20261010010249_oaze2_multiplatform_sync.sql`
   foi aplicada no projeto Supabase OAZE. As quatro tabelas novas estão vazias,
   com RLS e permissões verificadas. A RPC de escrita e a separação de leitura
   entre dois usuários passaram em transações revertidas. Ainda falta testar o
   fluxo autenticado no aplicativo com dois aparelhos, inclusive ambos offline.
5. Preencher os formulários de loja com o material de `oaze mobile/`.
6. Primeiro envio manual em cada loja; depois, tags `app-v*`.

## Volta atrás

Nada do OAZE 1 é apagado. O repositório antigo tem tags (`v2.0.0`,
`backup-pre-saas`). A importação do aplicativo apenas lê os dados legados;
a migração SQL cria tabelas e RPCs `oaze2_*` sem modificar `public.dados`.
Desligar a flag de sincronização suspende as novas trocas do OAZE 2 sem
interferir no site antigo.
