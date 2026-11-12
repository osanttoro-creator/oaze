# Apple: iPhone, iPad e Mac

Passo a passo para publicar o OAZE na App Store. O mesmo app roda nos Macs com chip Apple.

**Custo desta plataforma:** US$ 99 por ano (R$ 554,08 com dólar, IOF e margem da planilha).
**Quando pagar:** quando o app do iPhone estiver pronto para o TestFlight. Dá para desenvolver
e testar no seu iPhone antes disso, com um Apple ID gratuito.

## O que postar e onde

| Tela | Arquivo desta pasta |
|---|---|
| App Store Connect → Informações do app, Preços, página da versão | `1-ficha-app-store-connect.md` |
| App Store Connect → Privacidade do app | `2-privacidade-app-store.md` |
| Página da versão → Informações para a revisão do app | `3-notas-para-a-revisao.md` |
| Projeto no Xcode (`ios/App/App/`) | `arquivos/Info.plist-trecho.xml`, `arquivos/App.entitlements`, `arquivos/PrivacyInfo.xcprivacy` |
| Site: `o site/.well-known/` | `arquivos/apple-app-site-association` |

## Antes de começar

- [ ] Fases 0 e 1 do cronograma concluídas (planilha, aba **Cronograma**).
- [ ] `00-comum-a-todas/05-site-e-supabase-o-que-mudar.md` aplicado: origens, provedores do
  Auth, e-mails com código, SMTP e migrações.
- [ ] Roteiro de teste da sincronização (`00-comum-a-todas/02-...`) passando no simulador.

## A. Sem pagar nada

1. **Tipo de conta.** Recomendo **organização**, com a LTDA. Numa conta individual, o seu nome
   civil aparece como vendedor em todas as fichas.
2. **D-U-N-S da LTDA.** A Apple tem consulta e pedido gratuitos na página de inscrição. Pode
   levar até 30 dias: peça assim que o CNPJ sair.
3. **Apple ID do OAZE.** Use um e-mail do domínio, com verificação em duas etapas. A Apple
   confere se quem se inscreve pode representar a empresa e pode ligar para confirmar.
4. **Mac.** Precisa ter chip Apple e macOS Sequoia 15.6 ou mais novo para o Xcode 26 (o Xcode
   26.4 já pede macOS Tahoe 26.2). Sem Mac, use o Codemagic, que dá 500 minutos grátis por mês.
5. **Projeto nativo.** Em `oaze mobile/app-nativo/`:
   ```bash
   npm init -y
   npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
   ```
   - Copie `00-comum-a-todas/arquivos/capacitor.config.json` e `montar-www.ps1` para a pasta.
   - Rode o `montar-www.ps1`.
   - `npx cap add ios`
   - `npx cap open ios`
6. **Teste no seu iPhone** com o Apple ID gratuito. O perfil gratuito vence em 7 dias e não
   liga Sign in with Apple nem push, então essas duas funções esperam a conta paga.

## B. Inscrição (US$ 99 por ano)

7. `developer.apple.com/programs/enroll`: escolha organização e informe o D-U-N-S. Aguarde a
   verificação.
8. **App Store Connect → Acordos, impostos e bancos.** Para app gratuito, basta aceitar o acordo
   de apps gratuitos. Dados bancários e formulário fiscal só entram se um dia houver venda
   dentro do app.
9. **Small Business Program:** só se for vender dentro do app ou por link. A inscrição é grátis
   e baixa a comissão no Brasil para 10%.

## C. Identificadores

Em Certificates, Identifiers & Profiles:

10. **App ID explícito `site.oaze.app`**, com as capacidades:
    - **Sign in with Apple**;
    - **Associated Domains**;
    - **Push Notifications**, só quando entrar o push da v2.
11. **Team ID.** Anote-o, que aparece em Membership. Troque `TEAMID` em
    `arquivos/apple-app-site-association` e publique o arquivo no site (item 6.1 do documento
    do site).
12. **Supabase.** Confirme que `site.oaze.app` está em Authentication → Providers → Apple →
    Client IDs.
13. **Google Cloud.** Cliente OAuth do tipo iOS com o bundle `site.oaze.app`. O ID dele vai para
    o Supabase e para a configuração do `@capgo/capacitor-social-login`.

## D. Projeto no Xcode

14. **Signing & Capabilities:** o Team da empresa, o bundle `site.oaze.app` e as capacidades
    Sign in with Apple e Associated Domains. Confira contra `arquivos/App.entitlements`.
15. **`Info.plist`:** acrescente o que está em `arquivos/Info.plist-trecho.xml`. São o texto do
    Face ID, a declaração de criptografia, os atalhos do ícone e o esquema `site.oaze.app://`.
16. **`PrivacyInfo.xcprivacy`:** arraste para o alvo App, marcando "Copy items if needed".
17. **Ícone de 1024 × 1024 sem transparência** em `Assets.xcassets/AppIcon`, exportado do
    medalhão aprovado (`assets/img/oaze-mark.svg`), sem redesenhar.
18. **Orientação:**
    - iPhone: só retrato, como o manifesto do site;
    - iPad: todas, porque o layout do OAZE já responde à largura.
19. **Versão e build:** comece em `1.0.0` e build `1`. Cada envio precisa de um build maior que
    o anterior.
20. **Mac.** Rode no destino "My Mac (Designed for iPad)" e confira login, Touch ID, lembretes
    e layout.

## E. TestFlight

21. Product → Archive → Distribute App → App Store Connect.
22. **TestFlight interno**, com até 100 pessoas da equipe e sem revisão. Rode:
    - o roteiro de sincronização;
    - login com Apple, com Google e com código;
    - Face ID;
    - um lembrete agendado para daqui a 2 minutos;
    - os três atalhos do ícone;
    - consentimento e denúncia na UGLEZ;
    - excluir conta;
    - o app sem internet.
23. **TestFlight externo** (opcional): até 10.000 pessoas, com uma revisão beta rápida antes.

## F. Ficha e envio

24. **App Store Connect → Apps → + → Novo app:**
    - Plataformas: iOS;
    - Nome: `OAZE — organize seu dinheiro`;
    - Idioma principal: Português (Brasil);
    - Bundle ID: `site.oaze.app`;
    - SKU: `oaze-ios`;
    - Acesso: completo.
25. Cole os campos de `1-ficha-app-store-connect.md` e envie as capturas.
26. Responda `2-privacidade-app-store.md` e informe `https://oaze.site/privacidade`.
27. **Classificação etária:** responda o questionário. Nada no OAZE deve levar acima de 4+,
    mas confirme cada resposta: o questionário mudou em 2025.
28. **Preço:** gratuito. **Disponibilidade:** comece só pelo Brasil, onde o app, a moeda e as
    regras fazem sentido.
29. **Revisão:** copie `3-notas-para-a-revisao.md` e informe a conta de teste.
30. **Lançamento:** manual. Você decide a hora depois da aprovação.
31. Enviar para revisão.

## G. Depois de aprovado

- **Links universais:** `https://oaze.site/app` aberto no iPhone precisa abrir o app.
- **Acompanhamento semanal:** falhas no Xcode → Organizer e avaliações no App Store Connect.
- **Cada mudança no site:** `montar-www.ps1`, `npx cap sync ios`, build novo e envio.
- **Mudou o formato do que sobe para a conta:** suba a versão mínima em `app_versoes`.
- **Anuidade:** anote a data de renovação da conta Apple. Se vencer, o app sai da loja.

## Motivos comuns de recusa, e como este plano evita cada um

| Diretriz | O problema | Como o OAZE evita |
|---|---|---|
| 4.2 Funcionalidade mínima | "Site reempacotado" | Arquivos dentro do app, funciona sem internet, Face ID, lembretes, atalhos e login nativo |
| 4.8 Serviços de login | Login com Google sem uma opção equivalente | Sign in with Apple ao lado do Google |
| 3.1.3(f) App gratuito ligado a serviço web | Botão ou texto chamando para assinar fora | Nenhum botão "Assinar", nenhum preço e nenhum "assine no site" nos apps nem na ficha |
| 5.1.2(i) Dados para IA de terceiros | Enviar dados à OpenAI sem permissão explícita | Folha de consentimento antes da primeira pergunta, revogável |
| 5.1.1(v) Exclusão de conta | App cria conta, mas não deixa excluir | Configurações → Excluir a conta, que já existe |
| 2.1 Completude | Revisor não consegue entrar ou vê app vazio | Conta de teste com dados de exemplo e plano Oásis |

> **Fim de ano:** na última semana de dezembro a revisão da Apple costuma ficar mais lenta, e
> em alguns anos pausou. Não planeje depender de aprovação nessa semana.

## Vender dentro do app, se um dia fizer sentido

No Brasil, desde junho de 2026, há três caminhos:

- **In-App Purchase:** 10% de comissão mais 5% de processamento, no Small Business Program.
- **Botão que leva ao site:** 10% das vendas feitas até 7 dias depois do toque, mais a taxa da
  Stripe.
- **Pagamento alternativo dentro do app:** exige oferecer o In-App Purchase ao lado.

A aba **Canais** da planilha mostra quanto sobra em cada um. Com as taxas de hoje, o botão para
o site rende menos que o In-App Purchase nos planos mensais.
