# Conta, sincronização e arquitetura

Como um código só vira app de iPhone, de Android e de Windows, todos na mesma conta, e o que
muda no OAZE para isso funcionar sem perder dado.

## O desenho

```text
                 o site  (repositório, HTML + CSS + JS puro)
                 app.html + assets/
                   │                               │
      montar-www.ps1                               push em main → Hostinger
                   ▼                               ▼
      oaze mobile/app-nativo/www             https://oaze.site/app
      Capacitor 8                              ├─ navegador (celular e computador)
       ├─ iOS (Xcode)        → App Store       └─ Windows: Microsoft Store (PWA)
       │    └─ o mesmo app no Mac com chip Apple
       └─ Android (Studio)   → Google Play
                   │                               │
                   └───────────────┬───────────────┘
                                   ▼
          Supabase gxwatircdhhetvzzlwwq
          Auth · Postgres com RLS · Edge Functions (oaze-assistant, oaze-conta, oaze-pagamento)
```

Cada app é só mais um aparelho da mesma conta. Não existe "conta do app": quem entra no iPhone
com o mesmo e-mail vê o que lançou no site, e o contrário também.

## Como a conta sincroniza hoje

Resumo do código e do cartão de operação, publicado em 15 e 16/09/2026:

- A sincronização é por conta, não por aparelho, e roda no Supabase.
- O estado sobe como documento e é mesclado espaço a espaço pela RPC `mesclar_dados`, com as
  exclusões registradas em `removidos`.
- Nada sobe antes da primeira leitura. O app relê ao voltar para a aba, ao recuperar o foco ou
  a rede, e a cada minuto. O tempo real só acorda essa releitura.
- `fila.js` guarda o que ainda não subiu, para não ser sobrescrito.
- Sem conta, o app funciona inteiro, isolado no aparelho.

## O que os apps mudam nesse cenário

- **Mais aparelhos escrevendo ao mesmo tempo.** Um descompasso que hoje é raro passa a ser
  comum.
- **O iOS congela a WebView em segundo plano.** O "a cada minuto" para de rodar. A releitura
  precisa acontecer quando o app volta.
- **Uso sem internet mais longo.** Metrô, avião, sinal fraco: a fila cresce mais.
- **Versões antigas continuam instaladas por meses.** No site, cada push atualiza todo mundo.
  Na loja, não. Um app antigo que grava no formato velho repete o problema corrigido em
  15/09/2026, quando um aparelho atrasado apagava a gravação do outro.

## Fechar antes do primeiro build

Os três itens abaixo vêm de `docs/o-que-falta.md` e do cartão de operação do OAZE:

1. **Uma fonte da verdade só.** O documento `dados` e as tabelas normalizadas ainda convivem.
2. **Aparelho novo abre nos dados da conta.** O perfil local vazio não pode continuar ativo
   depois que os perfis da conta chegam.
3. **Dados do aparelho só sobem com confirmação.** Num aparelho compartilhado, a pessoa decide
   se leva os dados locais para a conta.

## O que muda no app nativo

| Assunto | No site hoje | No app nativo | Onde mexer |
|---|---|---|---|
| Origem das chamadas | `https://oaze.site` | `capacitor://localhost` no iOS e `https://localhost` no Android | Segredo `OAZE_ALLOWED_ORIGINS`, lido por `oaze-assistant`, `oaze-conta` e `oaze-pagamento` |
| CSP | Cabeçalho no `.htaccess` | Não há `.htaccess`: vai numa `<meta>` do `index.html` | `montar-www.ps1` injeta |
| Chart.js | CDN, com a cópia local de reserva | Só a cópia local, para o app abrir sem internet | `montar-www.ps1` troca |
| Login com Google | Botão com redirecionamento e "entrar num toque" | O Google bloqueia login dentro de WebView. O SDK nativo devolve um ID token e o app chama `signInWithIdToken` | Ramo nativo em `supabase-auth.js`, plugin `@capgo/capacitor-social-login`, clientes OAuth de iOS e de Android |
| Login com Apple | Botão pronto e escondido | Obrigatório no iPhone, porque há login com Google (4.8). Folha nativa, ID token e `signInWithIdToken` | Idem, mais o App ID com Sign in with Apple |
| Link mágico, confirmação e troca de senha | Link no e-mail volta ao site | O link abriria o navegador, não o app. No app, o e-mail traz um **código de 6 dígitos** (`verifyOtp`) | Modelos de e-mail no Supabase e tela de código no app |
| Sessão | `localStorage`, chave `oaze.supabase.auth` | Keychain no iOS e Keystore no Android, por um adaptador de armazenamento do supabase-js, com a mesma chave | `supabase-config.js` e `supabase-auth.js` |
| Dados sem conta | `localStorage` | A documentação do Capacitor avisa que o sistema pode limpar o `localStorage` da WebView. Espelhar o estado local em armazenamento nativo | `store.js`, com adaptador |
| Assinar plano | "Assinar" abre o Checkout da Stripe | No iPhone e no Android, nenhum botão nem texto de compra. Mostra só o plano atual | `pages/precos.js`, `limites.js` e `pages/settings.js`, lendo `window.OAZE_PLATAFORMA` |
| UGLEZ | Botão "O que é enviado" | Consentimento explícito antes da primeira pergunta e botão "Denunciar resposta" | `ai.js`, `pages/uglez.js` e duas migrações |
| Voltar ao app | Foco, rede, aba e a cada minuto | Reler também no evento `resume` do Capacitor | `sync.js` e `estado-sync.js` |
| Links para oaze.site | Navegação normal | Termos, Privacidade e Suporte abrem no navegador interno. `oaze.site/app` abre o app pelos links universais | `@capacitor/browser` e `/.well-known/` no site |
| Rotas `/app/...` | O `.htaccess` entrega `app.html` | O app carrega `index.html` na raiz. Conferir que o mapa de rotas de `app.js` trata `/` como Início | `app.js` |
| Atualização | Cada push publica para todos | Cada mudança exige build novo nas lojas, e a versão antiga continua instalada | Processo de release e trava de versão |

`window.OAZE_PLATAFORMA` vale `'ios'`, `'android'` ou `'web'`.

- **No build nativo:** o `montar-www.ps1` põe no `index.html` uma linha que pergunta a
  plataforma ao próprio Capacitor, então um único `www` serve para iPhone e Android.
- **No site:** essa linha não existe, e o código trata a ausência como `'web'`.
- **No Windows:** o app é o próprio site, então pode vender pela Stripe sem comissão da loja.

## Trava de versão mínima

**Para quê:** impedir que um app desatualizado grave num formato que a conta não entende mais.

- Tabela `app_versoes`, com `plataforma` (`ios` ou `android`), `minima`, `recomendada` e
  `mensagem`. Leitura liberada para todos, escrita só pelo servidor. O SQL está em
  `05-site-e-supabase-o-que-mudar.md`.
- O app consulta ao abrir e ao voltar do segundo plano.
- **Abaixo da mínima:** tela "Atualize o OAZE para continuar sincronizando", com o botão da
  loja. O uso local continua, mas a sincronização pausa.
- **Abaixo da recomendada:** aviso que dá para fechar.
- **Quando subir a mínima:** toda vez que o formato do que sobe para a conta mudar.

## Roteiro de teste da sincronização

Rodar antes de cada envio às lojas, com o site, um iPhone e um Android.

| # | Faça | Tem que acontecer |
|---|---|---|
| 1 | Sem conta no iPhone, lance 3 despesas, feche o app e abra de novo | As 3 continuam lá |
| 2 | Crie conta no iPhone com código por e-mail | O app pergunta se leva os dados do aparelho para a conta. Com "sim", os 3 lançamentos aparecem no site |
| 3 | Entre com a mesma conta no Android, pelo Google | Abre nos dados da conta, não num perfil vazio |
| 4 | Ponha o Android em modo avião, lance 1 receita e edite 1 despesa. Tire do modo avião | Sobe sozinho e aparece no site |
| 5 | Edite a mesma despesa no site e no iPhone quase ao mesmo tempo | Nenhuma das duas edições some sem aviso |
| 6 | Exclua um espaço no site | Some no iPhone e no Android e não volta depois de sincronizar |
| 7 | Deixe o iPhone 10 minutos em segundo plano enquanto lança no site | Ao voltar, o lançamento aparece sem puxar para atualizar |
| 8 | Saia da conta no Android | Os dados da conta saem do aparelho |
| 9 | Use "Sair dos outros aparelhos" no site | iPhone e Android pedem login de novo |
| 10 | Exclua a conta no Android | Site e iPhone perdem o acesso, e a assinatura, se houver, é cancelada antes |
| 11 | Suba a versão mínima acima da instalada | O app avisa, pausa a sincronização e o uso local continua |
| 12 | Revogue o consentimento da UGLEZ em Configurações | A próxima pergunta pede autorização de novo |
