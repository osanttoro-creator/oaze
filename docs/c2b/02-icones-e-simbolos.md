# Ícones e símbolos para a interface C2b

Lista do que **falta construir** para a interface C2b. O que já existe aparece só para mostrar onde será usado.

Já existem **100 ícones 3D** em `app/live-site/assets/turma/icones/` (e iguais em `site institucional/assets/turma/icones/`).

## Padrão de todo ícone novo

- Mesmo estilo dos 100 que já existem: 3D "massinha", luz vindo do alto à esquerda, câmera levemente de cima, sombra curta e cores da paleta (teal, tangerina, creme, tinta e as cores da turma).
- Arquivo: **WebP com fundo transparente, 256 x 256 px**, com um PNG de 512 x 512 como original.
- Nome em minúsculo, sem acento, com hífen (exemplo: `cafe.webp`, `boleto.webp`).
- Precisa ser reconhecível em **24 px**, porque o menu e as listas usam de 24 a 56 px. Teste reduzido antes de aprovar.

---

## 1. Logo e símbolos da marca (prioridade alta)

| # | Arquivo | Tamanho e formato | Onde entra |
| --- | --- | --- | --- |
| 1 | Símbolo OAZE 3D, original | 1024 x 1024 PNG transparente | base de todos os outros |
| 2 | Ícone do app (símbolo sobre quadrado teal arredondado) | 1024 x 1024 PNG | lojas, atalhos, abertura |
| 3 | Android: ícone adaptável, frente | 432 x 432 PNG transparente, desenho dentro do círculo central de 264 px | `app android` (mipmap-anydpi-v26) |
| 4 | Android: ícone adaptável, fundo | cor sólida teal `#2F6E62` ou 432 x 432 PNG | `app android` |
| 5 | Android: ícone monocromático (Android 13+) | silhueta de uma cor, 432 x 432 | ícone "temático" do Android |
| 6 | Android: ícone de notificação | silhueta **branca** sobre transparente: 24, 36, 48, 72 e 96 px | notificações push e lembretes |
| 7 | Google Play: ícone | 512 x 512 PNG, sem transparência | ficha da Play |
| 8 | Google Play: banner | 1024 x 500 PNG ou JPG | ficha da Play |
| 9 | Windows/MSIX: Square44x44Logo | 44 px + versões 16, 24, 32, 48 e 256 ("targetsize", sem fundo) | barra de tarefas e menu Iniciar |
| 10 | Windows/MSIX: Square71x71, Square150x150, Square310x310, StoreLogo (50) | PNG | blocos do Iniciar e Microsoft Store |
| 11 | Windows/MSIX: Wide310x150Logo | 310 x 150 PNG | bloco largo (com ele o 310x310 volta a ser aceito no manifesto) |
| 12 | Windows: `icon.ico` | 16, 24, 32, 48, 64 e 256 dentro do mesmo .ico | instalador e janela |
| 13 | Palavra "oaze" em Fredoka | SVG, versões clara e escura | cabeçalho do app, site, e-mail |
| 14 | **Selo OAZE do cartão** (símbolo pequeno + "oaze") | SVG (palavra) + símbolo WebP 96 px | canto de todo cartão da carteira |
| 15 | Símbolo do bolso da carteira | WebP 128 px | bolso do saldo |
| 16 | Favicon | 16, 32 e 48 px, PNG ou SVG | site e app web |
| 17 | Selo da turma (OAZE com os 4 amigos) | PNG 1600 px | campanhas, redes, tela de abertura |

> O ícone atual, com o "o" e três antenas, fica como alternativa. Os itens 2 a 12 substituem os arquivos de `app desktop/icons` e `app android/app/src/main/res/mipmap-*`.

---

## 2. Ícones 3D de categoria que faltam

O app oferece 60 ícones de categoria (lista `Icons.PICKER` em `assets/js/icons.js`). A tabela mostra qual ícone 3D cada um usa. Os marcados **NOVO** precisam ser desenhados.

| Ícone do app (Lucide) | Ícone 3D | Status |
| --- | --- | --- |
| house | casa | existe |
| building | aluguel | existe |
| key | chave | existe |
| sofa | moveis | **NOVO** |
| zap | energia | existe |
| droplet | agua | existe |
| flame | gas | **NOVO** (botijão / gás de cozinha) |
| wifi | internet | existe |
| receipt | recibo | existe |
| wrench, hammer | manutencao | **NOVO** (um ícone para os dois: caixa de ferramentas) |
| utensils | alimentacao | existe |
| shopping-cart | mercado | existe |
| shopping-bag | compras | existe |
| coffee | cafe | **NOVO** |
| cake | festa | **NOVO** (bolo com vela) |
| shirt | roupas | **NOVO** |
| scissors | beleza | **NOVO** (tesoura e pente) |
| package | encomenda | **NOVO** (caixa de entrega) |
| tag | etiqueta | **NOVO** (etiqueta de preço / promoção) |
| car | carro | existe |
| fuel | combustivel | existe |
| bus | transporte | existe |
| plane | aviao | existe |
| truck | frete | **NOVO** (caminhão de mudança) |
| map-pin | bussola | existe |
| heart-pulse | saude | existe |
| pill | remedio | **NOVO** (caixa de remédio, sem marca) |
| stethoscope | consulta | **NOVO** |
| dumbbell | exercicio | existe |
| glasses | otica | **NOVO** |
| cigarette | — | fica com o ícone de linha (não fazer em 3D) |
| gamepad-2 | jogos | **NOVO** (controle de videogame genérico) |
| film | cinema | existe |
| music | fones | existe |
| ticket | ingresso | **NOVO** |
| book-open | livros | **NOVO** |
| graduation-cap | formatura | existe |
| gift | presente | existe |
| dog | cachorro | existe |
| baby | bebe | **NOVO** (mamadeira ou carrinho) |
| sparkles, star | estrela | existe |
| church | doacao | **NOVO** (mãos com coração, neutro, sem símbolo religioso) |
| tv | streaming | **NOVO** (TV com botão de play) |
| banknote | dinheiro | existe |
| wallet | carteira | existe |
| coins | moedas | existe |
| piggy-bank | cofrinho | existe |
| hand-coins | saco-dinheiro | existe |
| credit-card | cartao | existe |
| circle-dollar-sign | dinheiro | existe |
| badge-dollar-sign | salario | **NOVO** (holerite / contracheque) |
| trending-up | crescimento | existe |
| chart-line | progresso | existe |
| percent | juros | **NOVO** (selo de %) |
| landmark | banco | existe |
| arrow-left-right | transferencias | existe |
| briefcase | trabalho | existe |
| laptop | computador | **NOVO** (notebook, para freela) |
| smartphone | celular | existe |
| building-2 | condominio | **NOVO** (prédio) |
| users | parceria | existe |
| heart-handshake | coracao | existe |
| shield | protecao | existe |
| umbrella | seguro | **NOVO** (guarda-chuva) |
| repeat | recorrencia | existe |
| calendar | calendario | existe |
| clock | tempo | existe |
| folder | pasta | existe |
| list | lista | **NOVO** |
| circle-help | duvida | existe |
| circle-ellipsis (outros) | outros | **NOVO** (três bolinhas / caixa surpresa) |

**Total de categoria: 30 ícones novos.**

## 3. Ícones de dinheiro no Brasil que faltam

| Ícone 3D | Uso | Observação |
| --- | --- | --- |
| transferencia-instantanea | lançamentos por Pix | **não usar o logo oficial do Pix** (a marca é do Banco Central e tem regras de uso). Fazer um raio/seta genérico. |
| boleto | contas pagas por boleto | código de barras num papel |
| imposto | IR, IPVA, IPTU, taxas | documento com selo, sem leão |
| emprestimo | dívidas e financiamentos | mão entregando moedas com relógio |
| cashback | estorno, reembolso, cashback | moeda voltando com seta circular |
| cripto | criptomoedas | moeda genérica, sem logo de Bitcoin |
| tesouro | Tesouro Direto | cofre/título com faixa verde-amarela discreta |
| dividendos | proventos de ações e FIIs | árvore pequena com moedas |

**Total: 8 ícones novos.**

## 4. Navegação e telas que faltam

| Ícone 3D | Onde entra |
| --- | --- |
| lancamentos | item "lançamentos" no menu (lista com + e −) |
| mais | item "mais" (grade de 4 quadradinhos) |
| categorias | tela de categorias (etiquetas empilhadas) |
| plano-oasis | selo do plano Oásis (coroa ou gota de oásis) |
| sair | sair da conta (porta) |
| aparencia | Configurações → Aparência e o interruptor do vidro (paleta) |
| privacidade | olho fechado, para "esconder valores" (hoje é ícone de linha) |
| pin | cadeado com 6 pontinhos, para o PIN |
| sincronizar | nuvem com setas, para a sincronização |
| sem-internet | aviso de sem conexão |

**Total: 10 ícones novos.** Os já existentes `casa`, `carteira`, `calendario`, `investimento`, `meta`, `configuracoes` e `conversa` cobrem o resto do menu.

## 5. Estados e comemorações

| Arquivo | Onde entra |
| --- | --- |
| confete | meta concluída, desafio da semana cumprido |
| status-pago, status-pendente, status-cancelado | marcadores de lançamento (podem ser 2D, como selos) |
| vazio-carteira | carteira sem conta (pode usar o corpo da OAZE "curiosa" segurando um cartão) |
| vazio-lancamentos | mês sem lançamento (Tico "mostra") |
| vazio-metas | sem metas (Bia "acolhe") |
| erro | erro de conexão (OAZE "preocupada") |

Os quatro "vazio" e o "erro" podem sair das poses que já existem em `assets/turma/` e não precisam de desenho novo. **Novos de verdade: 1 (confete) e, se quiser em 3D, os 3 selos de status.**

---

## Resumo

| Grupo | Novos |
| --- | --- |
| Logo e símbolos da marca | 17 arquivos (a maioria são exportações do mesmo símbolo) |
| Categorias | 30 |
| Dinheiro no Brasil | 8 |
| Navegação e telas | 10 |
| Estados | 1 a 4 |
| **Total de ícones 3D novos** | **cerca de 50**, mais os 17 arquivos de marca |

**Ordem sugerida:**
1. Símbolo 3D e ícones do app (itens 1 a 12): eles destravam as lojas.
2. Selo do cartão (14 e 15).
3. Os 10 ícones de navegação.
4. As categorias mais comuns: cafe, roupas, remedio, streaming, salario, transferencia-instantanea, boleto, outros.
5. O resto.
