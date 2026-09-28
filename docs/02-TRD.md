# OAZE 2 — TRD

Status: **em revisão** · 28/09/2026

## Decisão de stack

Um núcleo em **TypeScript + React 19 + Vite**, empacotado por duas cascas nativas:

| Casca | Lojas | Por quê |
|---|---|---|
| **Capacitor** | Google Play, App Store | maduro no celular: biometria, notificação local, tela segura, armazenamento cifrado via plugins |
| **Tauri 2** | Microsoft Store, Mac App Store | app leve (usa o webview do sistema), Rust para o que precisa de sistema: chaveiro, Windows Hello, Touch ID |
| navegador | oaze.site/app | o mesmo build, para quem não quer instalar |

**Alternativas descartadas**

- *Flutter* (sugestão inicial da conversa): reescreveria do zero o motor de cálculo, a fila offline e a integração Supabase, que já existem em JS e têm regras contábeis maduras. Descartado depois de ler o código do OAZE 1.
- *React Native*: celular bom, desktop fraco; dois empacotadores de qualquer jeito.
- *Nativo em quatro linguagens*: quatro vezes o custo para um time pequeno.

## Camadas

```
src/domain/    regras puras, centavos inteiros, testadas (calc, categorize, recurrence, merchant, seed)
src/state/     estado imutável, persistência, PIN, ações desfazíveis, rota em hash
src/coco/      Coco no aparelho (sugestões e conversa determinística)
src/platform/  a única camada que sabe em qual loja está (biometria, cortina de privacidade)
src/ui, src/screens  interface — uma árvore, dois layouts (ilha < 900 px, barra lateral ≥ 900 px)
```

Regra: tela nunca calcula dinheiro; tudo passa por `domain/calc.ts`. O motor memoriza por objeto de espaço (imutável), então nunca devolve total velho.

## Segurança

| Risco | Controle | Estado |
|---|---|---|
| alguém pega o aparelho destravado | PIN de 6 dígitos (PBKDF2-SHA256, 210 mil iterações, sal aleatório); sequências óbvias recusadas; espera crescente após 5 erros | ✅ |
| saldo aparece no seletor de apps | cortina ao perder foco (web) · `FLAG_SECURE`/tela segura (nativo, plugin privacy-screen) | ✅ web · 🟡 nativo |
| volta do segundo plano | trava após 0/1/5/15 min | ✅ |
| arquivo de dados lido fora do app | **web:** localStorage, como no OAZE 1 · **nativo:** banco cifrado com chave no Keychain/Keystore/Credential Manager | 🟡 obrigatório antes das lojas |
| injeção de script | CSP estrita no `index.html`; nenhum HTML de dado do usuário é renderizado | ✅ |
| instrução escondida em documento/mensagem para a Coco | Coco v1 não executa nada sem toque; política do cofre vale para a Coco com IA | ✅ |
| segredo no cliente | nenhum; chaves de IA/pagamento só em Edge Functions | ✅ |
| biometria | Face ID/Touch ID (LocalAuthentication), Android BiometricPrompt, Windows Hello (UserConsentVerifier) — sempre desbloqueando a chave local, nunca substituindo o PIN | 🟡 |

`frame-ancestors` não vale em `<meta>`: o site precisa mandar por cabeçalho HTTP (Hostinger `.htaccess`).

## Conexão entre app, desktop e site

- **Mesma conta** (Supabase Auth) em todas as superfícies; dados nas tabelas normalizadas do OAZE 1 (ver 05-backend.md).
- **Offline primeiro:** cada aparelho funciona sem rede; a fila (portar `fila.js`) sobe as mudanças quando volta.
- **Links universais:** `https://oaze.site/app/...` abre o app instalado (iOS: `apple-app-site-association`; Android: `assetlinks.json`), senão abre a versão web.
- **Site:** apresenta, leva às lojas e à versão web; os links de loja só entram quando as páginas existirem.

## Por loja

Regras de loja mudam: cada item abaixo precisa ser conferido na documentação oficial no dia do envio.

### Google Play (Capacitor Android)
- Gerar **AAB** assinado (Play App Signing); `targetSdk` na exigência vigente do Play.
- Formulário **Segurança dos dados** e **Declaração de recursos financeiros** no Play Console.
- Biometria: plugin (candidato `@aparajita/capacitor-biometric-auth`); tela segura: `@capacitor/privacy-screen`.
- Build em CI (Ubuntu) — esta máquina não tem Android SDK nem Java.

### App Store — iPhone (Capacitor iOS)
- Build e envio só em macOS (Xcode) → CI com runner macOS e certificados nos segredos do GitHub.
- `NSFaceIDUsageDescription` no Info.plist; rótulos de **Privacidade do app**.
- Se houver login com Google, a diretriz 4.8 pede **Entrar com a Apple** também.
- Exclusão de conta dentro do app (o OAZE 1 já tem `oaze-conta`).
- Assinatura digital vendida no app: regra de compra dentro do app (3.1.1) e as regras vigentes para link de pagamento externo no Brasil — decidir antes de ligar Stripe/Asaas no iOS.

### Microsoft Store (Tauri Windows)
- Tauri gera **MSI** (WiX) e **NSIS**; a Store aceita instalador MSI/EXE assinado com certificado de código, ou MSIX. Decidir entre certificado próprio ou MSIX.
- Windows Hello via comando Rust (`UserConsentVerifier`).
- Build em CI (runner Windows) — esta máquina não tem Rust.

### Mac App Store (Tauri macOS)
- **App Sandbox** com entitlements mínimos (rede de saída); assinatura de distribuição Apple; envio do `.pkg`.
- Touch ID via comando Rust (`LocalAuthentication`).
- Fora da loja, o mesmo app pode sair como DMG notarizado.

## Ambiente desta máquina (27/09/2026)

Node 24, npm 11, git: sim. Rust, Java/Android SDK, macOS: não. Consequência: web, testes e geração dos projetos nativos aqui; binários só no CI.
