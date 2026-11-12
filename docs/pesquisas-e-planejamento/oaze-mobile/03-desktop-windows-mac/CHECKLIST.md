# Computador: Windows e Mac

**Custo desta plataforma:** R$ 0.

- **Windows:** o cadastro na Microsoft Store é grátis, e a loja assina o pacote de graça.
- **Mac:** o app do iPad roda nos Macs com chip Apple pela mesma conta Apple da pasta 01, sem
  cobrança a mais.

## A escolha: o próprio site como app

No computador, o OAZE já funciona inteiro no navegador. O app de desktop da **fase 1** é o
próprio site instalado como app (PWA), publicado na Microsoft Store:

| | PWA na Microsoft Store (fase 1) | App nativo com Tauri (fase 2, só se houver demanda) |
|---|---|---|
| Código | O site, sem cópia | O mesmo `www` do celular, dentro de um app nativo |
| Login e sincronização | Os do site, sem mudança nenhuma | Origem nova nas Edge Functions e login pelo navegador do sistema com retorno por link |
| Atualização | Cada push no site já atualiza o app | Instalador novo a cada versão |
| Assinatura digital | Grátis: a loja assina o MSIX | Grátis pela loja; fora dela, certificado pago. O Azure Artifact Signing não atende o Brasil |
| Vender o plano | **Pode**: app que não é jogo usa a própria cobrança (Stripe) e fica com 100% | Idem |
| Funções a mais | Janela própria, atalhos na barra de tarefas, capturas na instalação | Atalho de teclado global, ícone na bandeja com a sobra do mês, Windows Hello |

## O que postar e onde

| Tela | Arquivo |
|---|---|
| Partner Center → envio do app → Listagens da Store | `1-ficha-microsoft-store.md` |
| Site: `manifest.webmanifest` | `arquivos/manifest-trecho-desktop.json` |

## Windows, passo a passo

### A. No site, antes de empacotar

1. **Manifesto.** Acrescente ao `manifest.webmanifest` as chaves de
   `arquivos/manifest-trecho-desktop.json`, sem apagar as que existem:
   - `shortcuts`: atalhos da barra de tarefas;
   - `screenshots`: capturas na janela de instalação, reaproveitando `assets/img/telas/`;
   - `launch_handler`: reabre a janela que já está aberta em vez de abrir outra.
2. **Abrir por atalho.** No `app.js`, ler `?novo=despesa` e `?novo=receita` ao abrir e chamar a
   mesma função das teclas `D` e `R`. Depois, limpar o parâmetro da URL.
3. **Service worker (`/sw.js`).** É o que faz o app abrir sem internet e o PWABuilder aprovar o
   pacote.
   - guarda o `app.html` e `assets/` com o nome do cache ligado à versão do deploy;
   - HTML pela rede primeiro, para cada push chegar;
   - **nunca** guarda resposta do Supabase nem de outra origem;
   - avisa "Nova versão disponível" em vez de trocar o app no meio do uso.

   Entra em `montar-pacote.ps1`, com `Cache-Control: no-cache` para o `sw.js` no `.htaccess`, e
   ganha um teste em `tools/testes/`.
4. `node tools/verificar-tudo.js`, push em `main` e conferência no ar: no Edge, o ícone de
   instalar aparece na barra de endereço, e o app instalado abre em janela própria.

### B. Conta e identidade (grátis)

5. **Partner Center:** `partner.microsoft.com/dashboard`, com uma conta Microsoft com
   verificação em duas etapas. Empresa, com a LTDA, ou pessoa física: as duas são grátis. Empresa
   mostra a razão social.
6. **Reservar o nome.** Apps e jogos → Novo produto → "Aplicativo MSIX ou PWA" → reservar
   `OAZE — organize seu dinheiro`.
7. **Anotar a identidade** em Gerenciamento do produto → Identidade do produto:
   - Package ID;
   - Publisher ID;
   - Publisher display name.

### C. Empacotar com o PWABuilder

8. Em `pwabuilder.com`, informe `https://oaze.site/app`. O relatório mostra o que falta no
   manifesto e no service worker. Corrija no site, não no pacote.
9. **Package for stores → Windows**, com os três valores do passo 7. O download traz o
   `.msixbundle` e o `.classic.appxbundle` para enviar, e um pacote de teste.
10. **Testar no seu Windows** com o pacote de teste:
    - instalar e abrir;
    - entrar com Google e com e-mail;
    - lançar e ver aparecer no celular;
    - usar os atalhos da barra de tarefas;
    - fechar e abrir sem internet.

### D. Envio

11. **Preços e disponibilidade:** gratuito; mercado Brasil.
12. **Propriedades:**
    - categoria Finanças pessoais;
    - marcar que o app acessa, coleta ou transmite informação pessoal;
    - Política de Privacidade `https://oaze.site/privacidade`.
13. **Classificação etária:** questionário IARC, com as mesmas respostas da Google Play
    (`02-android-samsung/3-conteudo-do-app.md`).
14. **Pacotes:** envie o `.msixbundle` e o `.classic.appxbundle`.
15. **Listagem em português (Brasil):** cole `1-ficha-microsoft-store.md` e envie as capturas.
16. **Enviar para certificação.** Depois de aprovado, o app aparece na loja e na busca do Windows.

### E. Depois de publicado

- **Mudou só o site:** o app já está atualizado, nada a enviar.
- **Mudou nome, ícone, manifesto ou identidade:** pacote novo pelo PWABuilder e novo envio.

## Mac

Três caminhos, do mais simples ao mais trabalhoso:

| Caminho | Custo | Como | Limite |
|---|---|---|---|
| **Safari → Arquivo → Adicionar ao Dock** | R$ 0 | Qualquer pessoa faz isso hoje no macOS Sonoma ou mais novo, com o site | Não aparece em loja |
| **O app do iPad no Mac** (recomendado) | Incluído nos US$ 99 da Apple | App Store Connect → Preços e disponibilidade → deixar disponível nos Macs com chip Apple, depois de testar (item 20 da pasta 01) | Janela com cara de iPad. Só Macs com chip Apple |
| **App nativo com Tauri** (fase 2) | Incluído na conta Apple: Developer ID e notarização | Mesmo projeto do Windows nativo | Mais um build para manter |

## Fase 2: app nativo de desktop com Tauri (só se houver demanda)

Vale quando alguém pedir o que o PWA não faz: lançar de qualquer lugar com um atalho de teclado,
ver a sobra do mês na bandeja ou abrir com o Windows Hello.

- **Origens novas em `OAZE_ALLOWED_ORIGINS`:** `http://tauri.localhost` no Windows e
  `tauri://localhost` no macOS.
- **Login:** pelo navegador do sistema, com volta por link próprio (`site.oaze.app://`). O Google
  não aceita login dentro de WebView embutida.
- **Windows:** MSIX pela Microsoft Store, com assinatura grátis. Fora da loja, precisa de
  certificado comercial pago, porque o Azure Artifact Signing não atende o Brasil.
- **macOS:** Developer ID e notarização, incluídos na conta Apple. Ou a Mac App Store, com as
  regras de sandbox.
- **Mesmo `www`** do celular, montado pelo `montar-www.ps1`.
