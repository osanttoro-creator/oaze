/* =============================================================
   turma.js — a OAZE e os quatro amigos dentro do app (11/2026)
   -------------------------------------------------------------
   A OAZE conduz a conversa e chama o amigo certo:
     Nilo  investimento, tempo e reserva
     Bia   propósito, metas e o plano do mês
     Tico  impulso e organização (extratos e recibos, sem sermão)
     Lume  matemática e clareza (faturas, parcelas, juros)

   O QUE MORA AQUI
     · quem responde cada mensagem (o servidor diz em `agente`; se
       ainda não disser, o app deduz pela pergunta, para funcionar
       com a função antiga também);
     · os atalhos da turma na conversa;
     · a apresentação do amigo depois do quiz;
     · o plano do mês da Bia (divisão da renda, meta que cresce,
       tetos SUGERIDOS que a pessoa aprova e o desafio da semana).

   O plano é conta feita no aparelho com os números que o app já
   tem. Nada aqui grava lançamento, orçamento ou meta sozinho.
   ============================================================= */
(function (global) {
  'use strict';

  var doc = document;
  var BASE = '/assets/turma/';
  var TURMA = {
    oaze: { nome: 'OAZE', papel: 'conduz tudo', artigo: 'a' },
    nilo: { nome: 'Nilo', papel: 'investimento e tempo', artigo: 'o',
      oi: 'Oi, eu sou o Nilo. Comigo é sem pressa: eu explico reserva, rendimento e prazo com os seus números na mesa. Eu comparo e explico. Quem decide é você.',
      pergunta: 'Nilo, como está minha reserva e o que vale eu entender sobre meus investimentos?' },
    bia: { nome: 'Bia', papel: 'propósito e metas', artigo: 'a',
      oi: 'Oi, eu sou a Bia. Dinheiro guardado precisa de um porquê. Eu monto o plano do mês com você, sugiro um teto para cada categoria e proponho um desafio pequeno por semana.',
      pergunta: 'Bia, me ajuda a montar o plano deste mês?' },
    tico: { nome: 'Tico', papel: 'impulso e organização', artigo: 'o',
      oi: 'Oi, eu sou o Tico! Extrato bagunçado é comigo. Eu leio linha por linha, reconheço as marcas e pergunto o que eu não souber. E aqui ninguém leva bronca por gastar.',
      pergunta: 'Tico, quero organizar meus gastos deste mês. Por onde eu começo?' },
    lume: { nome: 'Lume', papel: 'matemática e clareza', artigo: 'a',
      oi: 'Oi, eu sou a Lume. A conta que você ia deixar pra depois, eu faço agora: fatura, parcela e juros, com o resultado em português claro.',
      pergunta: 'Lume, quanto da minha fatura é parcela antiga e quanto é gasto novo?' }
  };
  var ORDEM = ['nilo', 'bia', 'tico', 'lume'];

  function valido(a) { return TURMA[a] ? a : 'oaze'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function ler(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function gravar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } }
  function dinheiro(v) {
    try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0); }
    catch (e) { return 'R$ ' + Math.round(v || 0); }
  }

  /* ---------- quem responde ---------- */
  function rosto(agente, falando) {
    var a = valido(agente);
    if (a === 'oaze') return BASE + 'oaze/rosto-' + (falando ? 'orgulhosa' : 'feliz') + '.webp';
    return BASE + a + '/rosto-' + (falando ? 'rindo' : 'feliz') + '.webp';
  }
  function corpo(agente, pose) { var a = valido(agente); return BASE + a + '/corpo-' + (a === 'oaze' ? (pose || 'explicando') : (pose || 'acolhe')) + '.webp'; }
  function nome(agente) { return TURMA[valido(agente)].nome; }

  var REGRAS = [
    ['nilo', /\b(invest\w*|rend\w*|cdb|cdi|lci|lca|tesouro|selic|poupanca|acoes|acao|fundo\w*|fii\w*|etf\w*|reserva|aposent\w*|previdencia|juros compostos|dividendo\w*|carteira de invest\w*|longo prazo|nilo)\b/],
    ['bia', /\b(meta\w*|objetivo\w*|sonho\w*|viagem|viajar|plano\w*|planej\w*|prioridade\w*|guardar|juntar|economiz\w*|poupar|desafio\w*|proposito|teto\w*|orcamento\w*|bia)\b/],
    ['tico', /\b(extrato\w*|recibo\w*|comprovante\w*|nota fiscal|cupom|organiz\w*|categori\w*|impuls\w*|assinatura\w*|bagunc\w*|compra\w*|comprei|delivery|ifood|tico)\b/],
    ['lume', /\b(fatura\w*|parcel\w*|juros|taxa\w*|quanto\w*|calcul\w*|conta\w*|soma\w*|total|media|percent\w*|porcent\w*|divida\w*|quit\w*|emprestimo\w*|financiamento\w*|lume)\b/]
  ];
  function porTexto(pergunta) {
    var q = norm(pergunta);
    for (var i = 0; i < REGRAS.length; i++) if (REGRAS[i][1].test(q)) return REGRAS[i][0];
    return 'oaze';
  }
  /* O servidor novo devolve `agente`. O antigo não: aí vale a pergunta. */
  function agenteDaResposta(resposta, pergunta) {
    if (resposta && TURMA[resposta.agente]) return resposta.agente;
    if (resposta && resposta.meta_proposta) return 'bia';
    if (resposta && resposta.acao_proposta) return 'oaze';
    return porTexto(pergunta);
  }
  function selo(agente) {
    var a = valido(agente);
    if (a === 'oaze') return '';
    var p = TURMA[a];
    return '<small class="tm-chamou">A OAZE chamou ' + p.artigo + ' ' + esc(p.nome) + '</small><span class="tm-selo tm-' + a + '">' + esc(p.nome) + ' · ' + esc(p.papel) + '</span>';
  }
  function chips() {
    return '<div class="tm-quem" role="group" aria-label="Chamar alguém da turma">' + ORDEM.map(function (a) {
      var p = TURMA[a];
      return '<button type="button" data-coco-example="' + esc(p.pergunta) + '"><img src="' + rosto(a) + '" alt="" width="34" height="34"><span>' + esc(p.nome) + '<small>' + esc(p.papel) + '</small></span></button>';
    }).join('') + '</div>';
  }

  /* ---------- conversa pronta: usa os atalhos que o app já entende ---------- */
  function clique(atributo, valor) {
    var b = doc.createElement('button');
    b.type = 'button'; b.hidden = true; b.setAttribute(atributo, valor);
    doc.body.appendChild(b); b.click(); b.remove();
  }
  function perguntar(texto) { clique('data-go', 'coco'); setTimeout(function () { clique('data-coco-example', texto); }, 60); }

  /* ---------- folhas ---------- */
  var aberta = null;
  function fecha() { if (aberta) { aberta.remove(); aberta = null; doc.removeEventListener('keydown', tecla); } }
  function tecla(ev) { if (ev.key === 'Escape') fecha(); }
  function abre(html, rotulo) {
    fecha();
    var veu = doc.createElement('div');
    veu.className = 'tm-veu';
    veu.innerHTML = '<section class="tm-folha" role="dialog" aria-modal="true" aria-label="' + esc(rotulo) + '"><button type="button" class="tm-fechar" data-tm="fechar" aria-label="Fechar">×</button>' + html + '</section>';
    veu.addEventListener('click', function (ev) {
      if (ev.target === veu || ev.target.closest('[data-tm="fechar"]')) { fecha(); return; }
      if (ev.target.closest('[data-go],[data-coco-example]')) setTimeout(fecha, 0);
    });
    doc.body.appendChild(veu);
    doc.addEventListener('keydown', tecla);
    aberta = veu;
    var foco = veu.querySelector('.tm-botao,[data-tm]');
    if (foco) try { foco.focus({ preventScroll: true }); } catch (e) { /* segue */ }
    return veu;
  }

  /* ---------- apresentação do amigo (uma vez, depois do quiz) ---------- */
  function quiz() { return ler('oaze.boasvindas') || {}; }
  function amigoDoQuiz() { var q = quiz(); return TURMA[q.amigo] && q.amigo !== 'oaze' ? q.amigo : null; }
  function apresenta(agente) {
    var a = valido(agente);
    if (a === 'oaze') return;
    var p = TURMA[a];
    abre('<div class="tm-cabeca"><img src="' + corpo(a) + '" alt=""><div><span class="tm-selo tm-' + a + '">' + esc(p.nome) + ' · ' + esc(p.papel) + '</span><h2>' + esc(p.nome) + ' vai começar com você.</h2></div></div>'
      + '<p class="tm-fala">' + esc(p.oi) + '</p>'
      + '<div class="tm-botoes">' + (a === 'bia'
        ? '<button type="button" class="tm-botao" data-tm="plano">Ver meu plano do mês</button>'
        : '<button type="button" class="tm-botao" data-tm="conversa" data-pergunta="' + esc(p.pergunta) + '">Conversar com ' + p.artigo + ' ' + esc(p.nome) + '</button>')
      + '<button type="button" class="tm-botao tm-leve" data-tm="fechar">Agora não</button></div>'
      + '<p class="tm-nota">A OAZE continua no centro. Ela chama os outros amigos quando o assunto pedir.</p>', 'Apresentação de ' + p.nome);
  }

  /* ---------- plano do mês (Bia) ---------- */
  var CHAVE_PLANO = 'oaze.turma.plano.v1';
  var NECESSIDADE = /morad|alug|condom|casa|mercad|aliment|supermerc|saude|farmac|remed|transp|combust|onibus|metro|conta|energia|luz|agua|gas\b|internet|telefone|celular|educa|escola|faculd|curso|seguro|imposto|iptu|ipva|financ|emprest|divid|creche|pet/;
  var DESAFIOS = {
    geral: ['Anote todo gasto abaixo de R$ 20 por 7 dias. É neles que o mês escorre.', 'Espere 24 horas antes de qualquer compra acima de R$ 100.', 'Uma semana pagando só no débito ou no Pix.'],
    lume: ['Abra a fatura e marque o que é parcela antiga. Só olhar já muda a conta.', 'Escolha uma parcela para adiantar este mês, a menor que couber.', 'Some as assinaturas do mês. O total costuma surpreender.'],
    tico: ['Três dias sem pedir delivery. Vale o que você economizar, pra meta.', 'Pause ou cancele uma assinatura que você não usou este mês.', 'Antes de comprar, tire print e espere até amanhã.'],
    bia: ['Dê um nome e uma data para o que você está guardando.', 'Guarde hoje o valor de um lanche. O hábito vale mais que o valor.', 'Arredonde cada gasto da semana e guarde a diferença.'],
    nilo: ['Separe hoje o primeiro pedaço da reserva, mesmo que pequeno.', 'Descubra quanto custa um mês da sua vida. Esse é o tamanho de 1 mês de reserva.', 'Compare onde está sua reserva com um CDB de liquidez diária.']
  };
  function semana() { var d = new Date(); var ini = new Date(d.getFullYear(), 0, 1); return Math.floor((d - ini) / 604800000); }
  function ymHoje() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
  function ymMenos(ym, n) { var p = ym.split('-'); var d = new Date(+p[0], +p[1] - 1 - n, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }

  /* Na demonstração não há conta nem lançamentos de verdade: o plano
     aparece com números de exemplo, e a folha avisa isso. */
  var EXEMPLO = { meses: 3, renda: 7200, gasto: 4912, necess: 3100, desejos: 1812, exemplo: true, categorias: [
    { nome: 'Moradia', media: 1800, necessidade: true }, { nome: 'Mercado', media: 900, necessidade: true },
    { nome: 'Restaurantes e delivery', media: 620, necessidade: false }, { nome: 'Lazer', media: 480, necessidade: false },
    { nome: 'Compras', media: 402, necessidade: false }, { nome: 'Transporte', media: 400, necessidade: true },
    { nome: 'Assinaturas', media: 310, necessidade: false }] };
  function numeros() {
    if (doc.documentElement.getAttribute('data-oaze-mode') === 'demo') return EXEMPLO;
    var AI = global.AI;
    if (!AI || !AI.resumoAgregado) return null;
    var hoje = ymHoje(), meses = [], cat = {};
    for (var i = 1; i <= 3; i++) {
      var r; try { r = AI.resumoAgregado(ymMenos(hoje, i)); } catch (e) { r = null; }
      if (r && (r.receitas > 0 || r.despesas > 0)) meses.push(r);
    }
    var atual; try { atual = AI.resumoAgregado(hoje); } catch (e) { atual = null; }
    if (!meses.length && atual && (atual.receitas > 0 || atual.despesas > 0)) meses.push(atual);
    if (!meses.length) return null;
    var renda = 0, gasto = 0;
    meses.forEach(function (m) {
      renda += m.receitas; gasto += m.despesas;
      (m.categorias || []).forEach(function (c) { cat[c.nome] = (cat[c.nome] || 0) + c.total; });
    });
    var n = meses.length, necess = 0, desejos = 0, lista = [];
    Object.keys(cat).forEach(function (k) {
      var media = cat[k] / n, e = NECESSIDADE.test(norm(k));
      if (e) necess += media; else desejos += media;
      lista.push({ nome: k, media: media, necessidade: e });
    });
    var semCategoria = Math.max(0, gasto / n - necess - desejos);
    desejos += semCategoria;
    lista.sort(function (a, b) { return b.media - a.media; });
    return { meses: n, renda: renda / n, gasto: gasto / n, necess: necess, desejos: desejos, categorias: lista, atual: atual };
  }

  function plano() {
    var N = numeros();
    var p = ler(CHAVE_PLANO) || { inicio: ymHoje(), divisao: [50, 30, 20], tetos: {}, desafio: {} };
    var q = quiz();
    if (!N || N.renda <= 0) {
      abre('<div class="tm-vazio"><img src="' + corpo('bia', 'tema') + '" alt=""><h2>Ainda não dá pra montar o plano.</h2>'
        + '<p>Eu preciso saber quanto entra e quanto sai num mês. Lance uma receita e alguns gastos, ou mande um extrato para o Tico ler, e eu monto tudo.</p></div>'
        + '<div class="tm-botoes"><button type="button" class="tm-botao" data-action="new">Lançar agora</button><button type="button" class="tm-botao tm-leve" data-tm="fechar">Depois</button></div>', 'Plano do mês');
      return;
    }
    var meses = 0; (function () { var a = p.inicio.split('-'), b = ymHoje().split('-'); meses = Math.max(0, (+b[0] - +a[0]) * 12 + (+b[1] - +a[1])); })();
    /* A meta começa pequena e cresce 1 ponto por mês, até a fatia de "guardar". */
    var pctMeta = Math.min(p.divisao[2], 10 + meses);
    var metaMes = Math.round(N.renda * pctMeta / 100);
    var sobraHoje = N.renda - N.gasto;
    var fatias = [
      { nome: 'Necessidades', hoje: N.necess, alvo: N.renda * p.divisao[0] / 100, cor: '#aab8ec' },
      { nome: 'Desejos', hoje: N.desejos, alvo: N.renda * p.divisao[1] / 100, cor: '#f3a27e' },
      { nome: 'Guardar', hoje: Math.max(0, sobraHoje), alvo: N.renda * p.divisao[2] / 100, cor: '#5fa99b' }
    ];
    var tetos = N.categorias.filter(function (c) { return !c.necessidade && c.media >= 30; }).slice(0, 4).map(function (c) {
      var teto = Math.max(10, Math.round(c.media * 0.9 / 10) * 10);
      return { nome: c.nome, media: c.media, teto: teto, aprovado: p.tetos[c.nome] === teto };
    });
    var lista = (DESAFIOS[q.amigo] || []).concat(DESAFIOS.geral);
    var s = semana(), desafio = lista[s % lista.length];
    var topou = p.desafio && p.desafio.semana === s ? p.desafio.estado : '';
    var presets = [[50, 30, 20, 'Equilibrado'], [60, 30, 10, 'Mês apertado'], [50, 20, 30, 'Quero acelerar']];

    var html = '<div class="tm-cabeca"><img src="' + corpo('bia', 'mostra') + '" alt=""><div><span class="tm-selo tm-bia">Bia · propósito e metas</span><h2>Seu plano do mês</h2></div></div>'
      + '<p>Montei com a média ' + (N.meses > 1 ? 'dos últimos ' + N.meses + ' meses' : 'do mês que você já lançou') + ': entram ' + esc(dinheiro(N.renda)) + ' e saem ' + esc(dinheiro(N.gasto)) + '. É sugestão. Você ajusta e aprova o que fizer sentido.</p>'
      + '<h3>Meta deste mês</h3><div class="tm-cartao tm-meta"><img src="' + BASE + 'icones/cofrinho.webp" alt=""><div><strong>' + esc(dinheiro(metaMes)) + '</strong><small>' + pctMeta + '% do que entra. A meta sobe 1 ponto por mês, até ' + p.divisao[2] + '%.'
      + (sobraHoje < metaMes ? ' Hoje sobram ' + esc(dinheiro(Math.max(0, sobraHoje))) + ': os tetos abaixo ajudam a fechar a diferença.' : ' Pelo seu histórico, cabe.') + '</small></div></div>'
      + '<h3>Divisão do que entra</h3><div class="tm-presets" role="group" aria-label="Jeito de dividir">' + presets.map(function (x) {
        var sel = x[0] === p.divisao[0] && x[1] === p.divisao[1] && x[2] === p.divisao[2];
        return '<button type="button" data-tm="divisao" data-valor="' + x[0] + ',' + x[1] + ',' + x[2] + '" aria-pressed="' + sel + '">' + x[3] + ' ' + x[0] + '/' + x[1] + '/' + x[2] + '</button>';
      }).join('') + '</div><div class="tm-cartao">' + fatias.map(function (f) {
        var escala = Math.max(f.alvo, f.hoje, 1) * 1.15;
        return '<div class="tm-linha" style="margin-bottom:10px"><span>' + f.nome + '</span><b>' + esc(dinheiro(f.hoje)) + '</b><span class="tm-trilho" style="--w:' + (f.hoje / escala * 100).toFixed(1) + '%;--m:' + (f.alvo / escala * 100).toFixed(1) + '%;--c:' + f.cor + '"><i></i><u></u></span><small>sugerido: ' + esc(dinheiro(f.alvo)) + ' (o tracinho claro)</small></div>';
      }).join('') + '</div>'
      + (tetos.length ? '<h3>Tetos sugeridos</h3><div class="tm-cartao">' + tetos.map(function (t) {
        return '<div class="tm-teto"><span>' + esc(t.nome) + '<br><small>média de ' + esc(dinheiro(t.media)) + ' → teto de ' + esc(dinheiro(t.teto)) + '</small></span><button type="button" data-tm="teto" data-nome="' + esc(t.nome) + '" data-valor="' + t.teto + '" aria-pressed="' + t.aprovado + '">' + (t.aprovado ? 'Aprovado' : 'Aprovar') + '</button></div>';
      }).join('') + '</div><p class="tm-nota">Aprovar guarda o teto no seu plano. Para receber aviso quando o mês apertar, crie o orçamento da categoria.</p><div class="tm-botoes"><button type="button" class="tm-botao tm-leve" data-go="categories">Abrir categorias e orçamentos</button></div>' : '')
      + '<h3>Desafio da semana</h3><div class="tm-cartao"><p style="margin:0 0 10px;color:#f0e5cf">' + esc(desafio) + '</p><div class="tm-presets" style="margin:0"><button type="button" data-tm="desafio" data-valor="topei" aria-pressed="' + (topou === 'topei') + '">Topei</button><button type="button" data-tm="desafio" data-valor="feito" aria-pressed="' + (topou === 'feito') + '">Concluí</button></div></div>'
      + '<div class="tm-botoes"><button type="button" class="tm-botao" data-tm="conversa" data-pergunta="Bia, me explica meu plano do mês e por onde eu começo.">Conversar com a Bia</button></div>'
      + '<p class="tm-nota">' + (N.exemplo ? 'Demonstração: os números acima são de exemplo.' : 'Conta feita com os seus lançamentos, neste aparelho.') + ' Não é recomendação de investimento.</p>';
    var veu = abre(html, 'Plano do mês');
    veu.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-tm]'); if (!b) return;
      var acao = b.dataset.tm;
      if (acao === 'divisao') { p.divisao = b.dataset.valor.split(',').map(Number); gravar(CHAVE_PLANO, p); plano(); }
      else if (acao === 'teto') { if (p.tetos[b.dataset.nome] === +b.dataset.valor) delete p.tetos[b.dataset.nome]; else p.tetos[b.dataset.nome] = +b.dataset.valor; gravar(CHAVE_PLANO, p); plano(); }
      else if (acao === 'desafio') { p.desafio = { semana: s, estado: b.dataset.valor }; gravar(CHAVE_PLANO, p); plano(); }
    });
  }

  /* ---------- cliques da turma em qualquer lugar do app ---------- */
  doc.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-turma],[data-tm="plano"],[data-tm="conversa"]');
    if (!b) return;
    if (b.dataset.tm === 'plano' || b.dataset.turma === 'plano') { plano(); return; }
    if (b.dataset.tm === 'conversa') { var t = b.dataset.pergunta; fecha(); perguntar(t); return; }
    var a = b.dataset.turma;
    if (a === 'pin') { trocarPin(); return; }
    if (TURMA[a] && TURMA[a].pergunta) perguntar(TURMA[a].pergunta);
  });

  /* ---------- esqueci o PIN: entra pelo Google e cria outro ----------
     O servidor só aceita a troca de quem entrou com Google nos últimos
     15 minutos (ver oaze-cofre, ação "reset"). Quem entrou há mais
     tempo, ou por e-mail + PIN, é levado a sair e entrar de novo. */
  function trocarPin() {
    var veu = abre('<div class="tm-cabeca"><img src="' + corpo('oaze', 'explicando') + '" alt="" style="width:120px;height:96px"><div><h2>Trocar o PIN</h2></div></div>'
      + '<p>Por segurança, só dá para criar outro PIN logo depois de entrar com Google (até 15 minutos). Se você entrou há mais tempo, saia e entre de novo com Google.</p>'
      + '<form class="tm-form" novalidate><label>Novo PIN de 6 dígitos<input name="pin" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="off" required></label>'
      + '<label>Confirme o PIN<input name="confirma" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="off" required></label>'
      + '<p class="tm-erro" role="alert" hidden></p>'
      + '<div class="tm-botoes"><button type="submit" class="tm-botao">Salvar novo PIN</button><button type="button" class="tm-botao tm-leve" data-action="sign-out">Sair e entrar com Google</button></div></form>'
      + '<p class="tm-nota">Evite datas, sequências e números iguais. Depois de 5 erros o PIN fica bloqueado por 15 minutos.</p>', 'Trocar o PIN');
    var form = veu.querySelector('form'), erro = veu.querySelector('.tm-erro');
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var pin = String(form.elements.pin.value || ''), botao = form.querySelector('[type="submit"]');
      function diz(t) { erro.textContent = t; erro.hidden = false; }
      if (!/^\d{6}$/.test(pin)) { diz('O PIN tem seis dígitos.'); return; }
      if (pin !== form.elements.confirma.value) { diz('Os PINs não são iguais.'); return; }
      if (!global.V3Backend || !global.V3Backend.vault) { diz('Entre na sua conta para trocar o PIN.'); return; }
      botao.disabled = true;
      global.V3Backend.vault({ action: 'reset', pin: pin }).then(function () {
        form.elements.pin.value = ''; form.elements.confirma.value = '';
        form.innerHTML = '<p class="tm-fala">PIN novo salvo. Na próxima vez, é só entrar com seu e-mail e ele.</p><div class="tm-botoes"><button type="button" class="tm-botao" data-tm="fechar">Fechar</button></div>';
      }).catch(function (e) {
        form.elements.pin.value = ''; form.elements.confirma.value = '';
        botao.disabled = false;
        diz((e && e.message) || 'Não foi possível trocar o PIN agora.');
      });
    });
  }

  /* Depois que o app abre de verdade: apresenta, uma vez, o amigo que o quiz escolheu. */
  function recepcao() {
    if (!doc.body.classList.contains('v3')) return;
    var amigo = amigoDoQuiz();
    if (!amigo || ler('oaze.turma.recebido')) return;
    var view = doc.getElementById('v3-view');
    if (!view || view.querySelector('.v3-skeleton,.v3-consent') || doc.querySelector('.tm-abertura:not(.tm-some),.bv')) return;
    gravar('oaze.turma.recebido', { amigo: amigo, em: new Date().toISOString() });
    apresenta(amigo);
  }
  global.addEventListener('oaze:abertura-fim', function () { setTimeout(recepcao, 1200); });
  setTimeout(recepcao, 9000);

  global.TurmaOAZE = {
    TURMA: TURMA, rosto: rosto, corpo: corpo, nome: nome, selo: selo, chips: chips,
    agenteDaResposta: agenteDaResposta, porTexto: porTexto,
    plano: plano, apresenta: apresenta, perguntar: perguntar, quiz: quiz
  };
})(window);
