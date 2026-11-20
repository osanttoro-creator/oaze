# Prompt para o Claude Fable 5.2: construir a interface C2b no app OAZE

Cole o bloco abaixo numa sessão nova do Claude (modelo `claude-fable-5-2`) aberta na pasta `G:\Meu Drive\oaze\app multmidia`.

---

```text
Você vai aplicar no app OAZE a interface aprovada "C2b" (vidro, carteira giratória com o logo novo e barra lateral retrátil). Trabalhe em português do Brasil em tudo: respostas, comentários no código e mensagens de commit.

FONTE DA VERDADE VISUAL
- Página aprovada: propostas/2026-11-18-interface-c/c2b.html (abra com o servidor "oaze-interface-c" do .claude/launch.json, porta 4395).
- Imagem: propostas/2026-11-18-interface-c/proposta-c2b.png
- Leia a página inteira antes de começar e reproduza cores, cantos, sombras, vidro e posições. Onde o app tiver uma tela que a proposta não mostra, aplique as mesmas regras.

ONDE ESTÁ O APP
- Núcleo comum: app/live-site (HTML, CSS e JS sem framework). Tela principal: app/live-site/app-v3.html.
- CSS do app: app/live-site/assets/app/*.css, carregados na ordem do app-v3.html. turma.css é o último hoje.
- Lógica: app/live-site/assets/app/app.js (telas, menu, carteira), live-backend.js, turma.js, boas-vindas.js.
- Ícones 3D prontos: app/live-site/assets/turma/icones/*.webp (100 arquivos). Personagens: assets/turma/{oaze,nilo,bia,tico,lume}/.
- Ícone de categoria: função categoryIconHtml em app.js, que usa Icons.forCategory (app/live-site/assets/js/icons.js) e devolve um nome Lucide.
- Android: "app android" (Capacitor). Windows: "app desktop" (Tauri, rode com npm run tauri dentro de app/).

REGRAS QUE NÃO PODEM SER QUEBRADAS
1. A carteira e o cartão continuam funcionando exatamente como hoje: um cartão por vez, setas ‹ › e pontinhos, troca de débito e crédito, olho para esconder valores, bolso com o saldo, "toque na carteira para fechar", adicionar conta ou cartão, dados da conta e PIN. Mude só a aparência. Não altere eventos, estados, dados nem a ordem dos cartões.
2. Antes de mexer na carteira, liste para mim os seletores e funções da carteira em app.js e wallet.css e diga o que vai mudar em cada um. Só siga depois disso.
3. Nada de GitHub: nenhum push, nenhum workflow. Commits só locais, com a identidade osanttoro-creator.
4. Não mexa no servidor (supabase/), nas chaves nem no login.
5. Sem script inline e sem fonte externa: o pacote nativo tem CSP com font-src 'self' data: e script-src 'self'. Fontes vão como arquivos woff2 em app/live-site/assets/fonts/.

O QUE CONSTRUIR
A. Tema (arquivo novo assets/app/tema-c2b.css, carregado por último no app-v3.html)
   - Cores: fundo escuro #1F2D4D (tinta), papel #FFFDF8, creme #F7EEDC, ação teal #2F6E62, marca #5FA99B, atenção tangerina #E9875E. Cores da turma: Nilo #355565/#DCE7EC, Bia #8A5A00/#F6EACB, Tico #B5562F/#FBE6DB, Lume #4A5A8A/#E1E5F2.
   - Redefina as variáveis que o app já usa (--night, --dark, --panel, --panel2, --milk, --muted, --teal, --line, --display, --body) para que a mudança se espalhe sem reescrever cada tela.
   - Fontes: Bricolage Grotesque (títulos), Figtree (texto e números, com tabular-nums), Fredoka (só o logo). Baixe os woff2 (licença OFL) para assets/fonts e declare com @font-face.
   - Cantos: botões e chips em pílula, cartões e widgets com 22 a 26 px. Movimento com cubic-bezier(.34,1.56,.64,1).
B. Vidro (liquid glass)
   - Fundo com 3 manchas desfocadas atrás do conteúdo (teal #2F6E62, tangerina #E9875E a ~40%, lilás #4A5A8A), como na classe .ceu da proposta. Elas ficam fixas, não rolam junto.
   - Painéis com a receita .vidro da proposta: degradê branco translúcido, backdrop-filter blur(26px) saturate(170%), borda 1px rgba(255,255,255,.2), brilho interno no topo.
   - Telas claras (conversa com a turma, plano do mês, quiz): versão clara do vidro (.claro .vidro).
   - Barra inferior do celular: pílula de vidro flutuante.
   - Desempenho: use @supports para backdrop-filter. Com prefers-reduced-transparency ou prefers-reduced-motion, troque o vidro por cor sólida (#2B3A5E escuro, #FFFDF8 claro). Crie uma classe no <html> (por exemplo "vidro-leve") que desliga o blur. Ligue essa classe no Android quando o aparelho tiver pouca memória (navigator.deviceMemory <= 4) e deixe um interruptor em Configurações → Aparência.
C. Carteira (só aparência)
   - Cartão: degradê do banco, reflexo de luz, faixa na cor do banco à esquerda e chip.
   - No canto inferior direito de todo cartão, o selo OAZE (símbolo 3D num quadrado teal + "oaze" em Fredoka), como .marca-cartao na proposta.
   - Cartões vizinhos aparecem inclinados nas laterais (rotateY, ~0,8 de escala, 55% de opacidade). Se a carteira de hoje não mostra os vizinhos, mostre só pelo CSS, sem mudar a lógica de qual cartão está ativo.
   - Bolso do saldo em vidro, com o símbolo da OAZE à direita.
D. Barra lateral retrátil (computador)
   - Aberta: logo completo, "Novo lançamento" em pílula creme, itens com nome, perfil embaixo e botão ‹ para recolher.
   - Recolhida: 92 px, só o símbolo, o botão + e os ícones. O item ativo usa o ícone 3D. Nome do item aparece ao passar o mouse (tooltip) e no leitor de tela.
   - O app já guarda o estado do menu (NAV_KEY 'oaze.v3.sidebar' e o botão "Recolher"). Reaproveite isso, não crie outro armazenamento.
   - Abaixo de 1100 px de largura, começa recolhida.
E. Ícones 3D
   - Categorias: em categoryIconHtml, quando o nome Lucide tiver equivalente 3D, devolva <img class="v3-cat-3d" src="/assets/turma/icones/NOME.webp" alt="" loading="lazy" decoding="async">. Use a tabela de docs/c2b/02-icones-e-simbolos.md. Sem equivalente, mantenha o Lucide.
   - Atalhos da tela inicial, cartões de número (patrimônio, receitas, despesas, sobra), widgets e estados vazios: ícones 3D como na proposta.
   - Menu: só o item ativo usa o 3D; os inativos continuam com o ícone de linha.
F. Widgets da tela inicial
   - Cabeçalho com o rosto e o nome do amigo que cuida: Próximos 7 dias (Tico), Onde foi o mês (Lume), Rende hoje (Nilo), Plano do mês (Bia), Pergunte à OAZE (OAZE).
   - Rende hoje usa a função oaze-invest-data (action indices) que já existe. Mostre fonte e data do CDI.
G. Logo
   - Ícone do app: símbolo da OAZE em 3D num quadrado teal arredondado. Nos cabeçalhos, só "oaze" em Fredoka.
   - Os arquivos de ícone de Android e Windows dependem da lista em docs/c2b/02-icones-e-simbolos.md. Se o arquivo final ainda não existir, use o provisório (assets/turma/oaze/pet.webp sobre fundo teal) e me avise.

COMO TRABALHAR
1. Leia a proposta e os arquivos citados. Me mostre um plano curto com os arquivos que vai criar e alterar.
2. Faça por partes, nesta ordem: A, B, D, E, F, C, G. Ao fim de cada parte:
   - abra o app de demonstração (servidor "oaze-app" do .claude/launch.json, http://localhost:4392/demo);
   - confira no navegador, em desktop (1440x900) e celular (390x844), comparando com a proposta;
   - veja o console sem erros;
   - faça um commit local.
3. Teste a carteira depois da parte C: troque de cartão pelas setas e pelos pontinhos, alterne débito e crédito, esconda valores, abra e feche o bolso e adicione uma conta. Tudo deve funcionar como antes.
4. Teste o pacote nativo: cd app && npm run build:published (precisa terminar sem erro; ele recusa script inline e recurso faltando).
5. No fim, suba a versão para 2.6.0 (app/package.json, package-lock, app desktop/tauri.conf.json, versionName em app android/app/build.gradle) e me entregue um resumo com capturas antes e depois.

Se algo da proposta não couber no app sem mudar o funcionamento da carteira, pare e me pergunte.
```
