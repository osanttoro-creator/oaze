# OAZE nos aplicativos

iPhone e iPad, Android (Samsung incluído) e computador, com a mesma conta sincronizada.
Levantamento de **17/09/2026**. Preços e regras foram conferidos nas páginas oficiais nesse
dia (links na aba **Fontes** da planilha). Nada foi comprado, publicado ou alterado no site,
no Supabase ou nas lojas.

## Comece por aqui

1. **`OAZE-apps-custos-e-cronograma.xlsx`**: quanto custa, quando pagar e quanto de cada
   assinatura fica com você em cada loja.
2. **`00-comum-a-todas/01-o-que-voce-vai-precisar.md`**: a lista completa, em ordem.
3. Na hora de montar uma plataforma, abra a pasta dela e siga o `CHECKLIST.md`. Os outros
   arquivos da pasta são o que você cola em cada tela da loja. `arquivos/` guarda o que vai
   para o projeto nativo ou para o site.

| Pasta | O que tem |
|---|---|
| `00-comum-a-todas/` | O que vale para as três: lista de necessidades, conta e sincronização, novas funções, privacidade e o que muda no site e no Supabase |
| `01-apple-iphone-ipad-mac/` | App Store: iPhone, iPad e o mesmo app nos Macs com chip Apple |
| `02-android-samsung/` | Google Play, que já chega a todo celular Samsung, e a Galaxy Store como opção |
| `03-desktop-windows-mac/` | Microsoft Store no Windows e os caminhos para o Mac |

## Quanto e quando

| Quando | O que pagar | Valor | Em R$ * |
|---|---|---|---|
| Agora | Número D-U-N-S da LTDA | grátis | R$ 0 |
| Antes do primeiro app público | Supabase Pro | US$ 25 por mês | R$ 139,92 por mês |
| Antes do primeiro app público | SMTP próprio para os e-mails de login | cotar | — |
| Começo do Android | Google Play Console | US$ 25, uma vez | R$ 139,92 |
| App do iPhone pronto para teste | Apple Developer Program | US$ 99 por ano | R$ 554,08 por ano |
| Publicar no Windows | Microsoft Store | grátis | R$ 0 |
| Só se um dia vender dentro do app | RevenueCat | grátis até US$ 2.500 de receita por mês; depois, 1% | R$ 0 |

\* Dólar a R$ 5,15 (16/09/2026), IOF de 3,5% e 5% de margem de segurança: R$ 5,5968 por dólar.
Os três números mudam na aba **Premissas**.

- **Primeiro ano com as três lojas no ar: R$ 2.373,03.** Depois disso, **R$ 186,09 por mês**
  (Supabase Pro mais a anuidade da Apple dividida por 12).
- **O mínimo obrigatório é R$ 694,00** (Google e Apple). O resto é o Supabase Pro, que é
  recomendado e não obrigatório.
- Fora da conta, porque ainda não têm preço: SMTP próprio, celular Android para teste e Mac,
  se você não tiver um.

## A decisão de base: um código só

O OAZE continua HTML, CSS e JavaScript puro. Nada é reescrito.

| Plataforma | Como vira app | Por quê |
|---|---|---|
| iPhone, iPad e Android | O **Capacitor 8** embrulha o mesmo `app.html` e a pasta `assets/` num app nativo. Plugins trazem biometria, notificações, atalhos e login nativo | Aproveita o código inteiro, e o app abre sem internet porque os arquivos vão dentro dele |
| Windows | O site, que já é instalável, vai para a **Microsoft Store** empacotado pelo PWABuilder | Custo zero. Login, sincronização e atualização continuam os do site |
| Mac | O app do iPad roda nos Macs com chip Apple, pela mesma conta Apple | Custo zero a mais. O Safari também põe o site no Dock |

### Caminhos comparados

| Caminho | Código aproveitado | Custo extra | Risco na revisão da Apple | Funções nativas | Manutenção |
|---|---|---|---|---|---|
| **Capacitor com os arquivos dentro do app** (escolhido) | Quase todo | R$ 0 | Baixo, com as funções nativas da v1 | Por plugins | Um código |
| App que só abre o site pela internet | Todo | R$ 0 | Alto: a diretriz 4.2 recusa "site reempacotado" | Poucas | Um código |
| React Native ou Flutter | Quase nenhum: reescrever `calc.js`, `sync.js` e as páginas | Meses de trabalho | Baixo | Todas | Dois códigos |
| Só o "Adicionar à Tela de Início" que já existe | Todo | R$ 0 | Não passa por loja | Poucas, e o iOS limita | Um código |
| Tauri (app nativo de desktop) | Todo | Certificado, se for fora da loja | — | Bandeja e atalho global | Mais um build |

## O que precisa estar resolvido antes das lojas

Cada app é mais um aparelho escrevendo na mesma conta. O que hoje é frágil na sincronização
do site fica mais visível neles, e o revisor da Apple testa num aparelho novo.

1. **Sincronização com uma fonte da verdade só**, e aparelho novo abrindo nos dados da conta.
   O `docs/o-que-falta.md` do site ainda lista as duas fontes (documento `dados` e tabelas
   normalizadas) e o perfil local vazio que continua ativo.
2. **Consentimento antes da UGLEZ e botão para denunciar resposta.** Desde 13/11/2025 a Apple
   exige permissão explícita antes de mandar dados pessoais a uma IA de terceiros (diretriz
   5.1.2(i)). A Google exige denúncia dentro do app para conteúdo gerado por IA. Hoje existe a
   tela "O que é enviado", mas nenhum consentimento.
3. **Termos e Privacidade finais**, com razão social, CNPJ e os fornecedores (Supabase, OpenAI e
   Stripe). As lojas pedem o link e comparam com o que você declara.
4. **SMTP próprio e Supabase Pro.** O SMTP padrão do Supabase manda 2 e-mails por hora, e o
   projeto está no plano Free (conferido no conector em 17/09/2026).
5. **LTDA e D-U-N-S**, se as contas de loja forem da empresa. É o recomendado; veja abaixo.

O pagamento pela Stripe não trava os apps, porque eles não vendem nada no lançamento. Mas
continua sendo o que transforma instalação em receita.

## Decisões que são suas

| Decisão | Recomendo | Por quê |
|---|---|---|
| Conta das lojas: empresa ou pessoa física | **Empresa (LTDA)** | Na App Store, a conta pessoal mostra o seu nome civil como vendedor. É o mesmo motivo que tirou o Asaas do OAZE. Na Google Play, conta de organização dispensa o teste com 12 pessoas por 14 dias. O custo é esperar o CNPJ e o D-U-N-S |
| Vender assinatura dentro dos apps | **Não, no lançamento** | Sem venda no app, a Apple aceita o app como companheiro de um serviço web (3.1.3(f)) e nenhuma comissão vai para as lojas. A condição é não ter botão nem texto chamando para assinar fora. No Windows, a venda pela Stripe pode continuar sem comissão |
| Identificador do app | **`site.oaze.app`** | É o endereço oaze.site ao contrário. **Não muda depois de publicado** na Google Play |
| Ordem | **Base, núcleo nativo, Android e depois iPhone. Windows em paralelo** | Android e iPhone saem do mesmo código. A Google é mais barata, e o teste fechado vira beta. O Windows não depende do app nativo |
| Funções novas na v1 | **Só as que a loja exige ou que fazem o app valer mais que o site** | Detalhe em `00-comum-a-todas/03-novas-funcoes.md` |

## Onde o app nativo vai morar

Quando for montar, crie o projeto Capacitor em `oaze mobile/app-nativo/`. O script
`00-comum-a-todas/arquivos/montar-www.ps1` copia o app de `o site` para `app-nativo/www/` por
lista explícita, igual ao `montar-pacote.ps1`. Ele troca o Chart.js do CDN pela cópia local,
põe a CSP do app e anota de qual commit do site saiu o build. O site continua sendo a fonte, e
nada dentro de `www/` é editado à mão.

## O que foi e o que não foi conferido

**Conferido:** preços, taxas e regras das lojas nas fontes oficiais; plano Free do Supabase,
pelo conector; no código do site, a leitura de origens das Edge Functions, a CSP, as rotas, o
carregamento do Chart.js e o empacotamento da Hostinger; limites de caracteres dos textos de
loja, contados por script; todas as fórmulas da planilha, calculadas na geração.

**Não conferido:**
- se o Mac que aparece nas sessões do OAZE é seu, e com qual chip e macOS;
- se o e-mail de oaze.site permite SMTP;
- o estado atual das chaves da Stripe;
- os rótulos exatos de cada formulário das lojas, que mudam sem aviso;
- a exigência de vendedor comercial da Galaxy Store para app gratuito.

Nenhum build foi feito ainda.
