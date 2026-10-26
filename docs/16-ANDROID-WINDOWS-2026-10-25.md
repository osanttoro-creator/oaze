# OAZE app — rodada Android e Windows (25/10/2026)

## Fonte e decisão

O site em `G:\Meu Drive\sites\OAZE\o site` está no commit `234270f`. O aplicativo usa o núcleo React/TypeScript existente com Capacitor para Android e Tauri para Windows. O site público continua separado: a tela `/` apresenta o produto e a experiência financeira fica em `/app`. Esta rodada não usa o site remoto como interface embutida.

As lojas desta rodada são **Google Play** e **Microsoft Store**. Os projetos iOS e macOS continuam no repositório e o núcleo compila para eles, mas não são compilados nem preparados para loja agora.

A proposta de cartões em `assets/conceitos/` do site permanece **em definição**; seus logos bancários gerados não foram portados. O cartão do app foi alinhado ao código já implementado no site: mostra apenas os quatro dígitos finais e a marca oficial OAZE. A tela Início permite alternar entre despesas e receitas por categoria, usando o cálculo financeiro compartilhado e apenas lançamentos confirmados. O controle funciona em larguras móveis e desktop.

## O que a segunda parte desta rodada acrescentou

**Botão voltar do Android.** O app não tinha ouvinte de `backButton`, e isso não era neutro. Sem ouvinte, o Capacitor volta no histórico do webview quando pode e, quando não pode, **consome a tecla e não faz nada**: na tela inicial o voltar virava botão morto e o app só saía pelo gesto de início. Agora `state/route.ts` mantém uma trilha de telas e `backIntent()` decide na ordem que a pessoa espera — fecha o lançamento aberto, fecha a Coco, devolve o cartão à carteira, recua uma tela, e só na raiz sai. Quem sai é a camada de plataforma; a rota não sabe em qual loja o app está. Coberto por `state/route.test.ts`.

**Caminho da Microsoft Store.** Trocado de "instalador assinado" para **MSIX**: no caminho empacotado a Microsoft assina e hospeda sem custo, enquanto o caminho do instalador exige certificado comprado de uma CA e hospedagem própria. O Tauri não gera MSIX, então `app/tools/empacotar-msix.mjs` monta o pacote a partir do binário que ele compila, e o workflow `App · Windows (Microsoft Store)` roda isso. A decisão, os três valores de identidade do Partner Center e os dois efeitos do contêiner (esquema `oaze://` pelo manifesto, WebView2 não declarável) estão em `12-PUBLICACAO.md`.

**Canal de envio.** Os workflows de loja passaram a perguntar `teste` ou `producao`. Antes, qualquer AAB de loja exigia `OAZE_SYNC_ENABLED=true`, o que impedia até um envio ao canal de testes. Sem conta o app funciona inteiro, isolado no aparelho, e isso é promessa do produto: `teste` aceita a sincronização desligada, `producao` continua exigindo o teste real entre dois aparelhos.

**Conserto no workflow Android.** A etapa `xcodebuild` do antigo job iOS tinha ficado solta dentro do job Android, que roda em Ubuntu. Qualquer execução falharia na última etapa. Removida.

**Tags de publicação.** A tag `app-v*` passa a disparar os dois pacotes de loja — o AAB do Play e o MSIX da Microsoft — e deixou de disparar o iOS, que agora só roda quando alguém pede. Mantê-lo na tag faria cada publicação gastar um runner macOS e falhar por falta de credencial Apple, ruído que esconde o resultado que importa.

**Fichas de loja.** `17-FICHAS-DE-LOJA.md` traz os textos, o formulário de Segurança de dados do Play respondido a partir do que o código faz, a classificação de conteúdo e os requisitos de captura de tela — com o que depende de decisão marcado, não preenchido por suposição.

## Pacotes

- Versão de teste: `2.0.1` no Android e Windows; código da versão Android cresce a cada execução do workflow. No MSIX a versão vira `2.0.1.0`, porque a Store reserva a última parte.
- O workflow `App · Android` gera um APK **debug** com identificador `site.oaze.app.teste`, instalável para avaliação, e compila um AAB release ainda sem assinatura de loja.
- O workflow `App · Windows` gera MSI e EXE Tauri sem assinatura de código. Eles são instaladores de teste para download direto, não pacotes de loja.
- O workflow `App · Windows (Microsoft Store)` gera o MSIX de envio. Ele exige as três variáveis de identidade do Partner Center e **ainda não foi executado**: elas não existem enquanto o produto não for criado no painel.

## O que foi verificado e o que não foi

Verificado nesta rodada, numa cópia local do projeto — o `node_modules` não funciona na pasta do Drive, os arquivos chegam com zero byte:

- `npm run check` completo: typecheck, **241 testes em 25 arquivos**, build Vite e scanner de segurança, todos passando. O scanner reporta 3 avisos de CSP pré-existentes, sobre domínios citados em texto de teste.
- Os cinco workflows abrem como YAML válido, e o job Android não tem mais a etapa de iOS solta.
- O manifesto MSIX é gerado com os três valores substituídos, a versão em quatro partes e o protocolo `oaze` declarado; o XML foi validado.

**Não verificado**, e não dá para verificar nesta máquina:

- `makeappx` não existe aqui (sem Windows SDK instalado), então o empacotamento MSIX nunca rodou até o fim. O que rodou foi tudo até ele: layout, ícones e manifesto.
- Instalação e uso em aparelho Android e máquina Windows reais.
- Login com Google voltando por `oaze://auth` dentro do pacote MSIX.
- O botão voltar num aparelho Android de verdade. A lógica está em teste unitário; o laço com o Capacitor, não.

## Limites antes de liberar dados reais

`VITE_OAZE_SYNC_ENABLED=false` continua deliberadamente: não há comprovação ponta a ponta de login, escrita e conflito entre Android e Windows instalados. O Supabase é o mesmo do site, mas a conta autenticada não prova que todo o histórico financeiro já está sincronizado. Validar login com retorno `oaze://auth`, importação explícita, uma alteração em cada aparelho, reconciliação offline e logout antes de ativar a sincronização.

Também faltam assinatura do AAB, chave de distribuição Android, identidade do produto no Partner Center, testes de instalação reais e revisão da paridade com as funções mais recentes do site (perfis compartilhados, planejamento percentual, rendimentos de metas, voz da Coco e os quatro idiomas).

## Como obter os testes

Depois que o PR passar nos workflows, abrir a execução `App · Android` no GitHub Actions e baixar o artefato `oaze-android-teste-*`; para Windows, abrir `App · Windows` e baixar `oaze-windows-teste-*`. O APK de debug instala em paralelo ao futuro app da loja. Os instaladores Windows desta rodada são próprios para teste e não têm assinatura.
