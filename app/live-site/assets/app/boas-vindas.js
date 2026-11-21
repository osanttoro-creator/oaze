/* =============================================================
   boas-vindas.js — o quiz de entrada com a turma (14/11/2026)
   -------------------------------------------------------------
   Antes do primeiro login, a OAZE faz cinco perguntas curtas para
   entender como a pessoa vai usar o app. Cada pergunta é feita por
   quem cuida do assunto:

     1. OAZE  o que resolver primeiro        (monta o Início)
     2. Tico  como prefere registrar gastos  (conversa, extrato, mão)
     3. Lume  como o dinheiro entra          (fixo, variável…)
     4. Bia   o momento de agora             (escolhe o amigo que recebe)
     5. Nilo  de onde sai o dinheiro         (a primeira conta)

   As respostas ficam neste aparelho (localStorage) e o app usa depois
   do login: os blocos do Início seguem os objetivos, a primeira conta
   já vem com o banco escolhido, um amigo se apresenta e a conversa
   passa a saber o jeito da pessoa. Aparece uma vez; "Já uso a OAZE"
   fecha direto na entrada.

   As chaves antigas continuam valendo (oaze.boasvindas guarda
   objetivos e banco como antes), então quem respondeu a versão de
   31/10 não perde nada.
   ============================================================= */
(function (global) {
  'use strict';

  const CHAVE = 'oaze.boasvindas';
  const CHAVE_INICIO = 'oaze.v3.inicio';
  const T = '/assets/turma/';
  const ler = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem armazenamento */ } };
  if (ler(CHAVE)) return;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  const OBJETIVOS = [
    { id: 'onde', titulo: 'Pra onde vai meu dinheiro', blocos: ['categorias', 'ultimos'], ic: 'dinheiro-voando' },
    { id: 'mes', titulo: 'Não estourar o mês', blocos: ['sobra', 'tetos', 'planejado'], ic: 'orcamento' },
    { id: 'contas', titulo: 'Faturas e contas em dia', blocos: ['faturas', 'proximos', 'fixas'], ic: 'fatura' },
    { id: 'meta', titulo: 'Juntar pra uma meta', blocos: ['metas', 'reserva'], ic: 'meta' },
    { id: 'relatorio', titulo: 'Ter tudo num relatório', blocos: ['comparativo', 'indicadores'], ic: 'pizza-financeira' }
  ];
  const REGISTRO = [
    { id: 'conversa', titulo: 'Falando ou escrevendo pra OAZE', sub: '“Gastei 42 no mercado” e pronto', ic: 'conversa' },
    { id: 'extrato', titulo: 'Mandando extrato ou recibo', sub: 'o Tico lê e pergunta o que não souber', ic: 'recibo' },
    { id: 'manual', titulo: 'Digitando eu mesmo', sub: 'gosto de conferir cada lançamento', ic: 'calculadora' },
    { id: 'aviso', titulo: 'Pelos avisos do banco', sub: 'lançar a partir da notificação', ic: 'celular' }
  ];
  const RENDA = [
    { id: 'fixa', titulo: 'Salário fixo, todo mês', ic: 'calendario' },
    { id: 'variavel', titulo: 'Varia de um mês pro outro', ic: 'crescimento' },
    { id: 'varias', titulo: 'Mais de uma fonte', ic: 'moedas' },
    { id: 'sem', titulo: 'Ainda sem renda certa', ic: 'duvida' }
  ];
  const MOMENTO = [
    { id: 'aperto', amigo: 'lume', titulo: 'Quero sair do aperto', sub: 'entender fatura, parcela e juros', ic: 'fatura' },
    { id: 'impulso', amigo: 'tico', titulo: 'Quero gastar com mais calma', sub: 'organizar sem levar bronca', ic: 'compras' },
    { id: 'objetivo', amigo: 'bia', titulo: 'Quero juntar pra um objetivo', sub: 'meta com data e plano do mês', ic: 'meta' },
    { id: 'investir', amigo: 'nilo', titulo: 'Quero começar a investir', sub: 'reserva e rendimento, sem economês', ic: 'investimento' }
  ];
  const AMIGOS = {
    nilo: ['Nilo', 'investimento e tempo'], bia: ['Bia', 'propósito e metas'],
    tico: ['Tico', 'impulso e organização'], lume: ['Lume', 'matemática e clareza']
  };
  const BANCOS = [['nubank', 'Nubank'], ['inter', 'Inter'], ['c6', 'C6 Bank'], ['itau', 'Itaú'], ['bradesco', 'Bradesco'], ['caixa', 'Caixa'],
    ['bancodobrasil', 'Banco do Brasil'], ['santander', 'Santander'], ['picpay', 'PicPay'], ['mercadopago', 'Mercado Pago'], ['btg', 'BTG Pactual'],
    ['xp', 'XP'], ['neon', 'Neon'], ['pagbank', 'PagBank'], ['sicoob', 'Sicoob'], ['sicredi', 'Sicredi'], ['next', 'Next'], ['pan', 'Banco PAN'],
    ['digio', 'Digio'], ['wise', 'Wise'], ['nomad', 'Nomad'], ['revolut', 'Revolut'], ['safra', 'Safra'], ['original', 'Original']];

  const ULTIMO = 6;
  const estado = { passo: 0, objetivos: new Set(), registro: new Set(), renda: null, momento: null, banco: null };
  const ic = (nome) => '<span class="bv-ic"><img src="' + T + 'icones/' + nome + '.webp" alt="" width="34" height="34"></span>';

  function logoBanco(chave) {
    const BR = global.BancosBR || { ICONES: {}, PRESETS: {} };
    const raw = BR.ICONES[chave], p = BR.PRESETS[chave];
    if (!raw || !p) return '<span class="bv-logo">' + esc(chave.slice(0, 2).toUpperCase()) + '</span>';
    const vb = (/viewBox=["']([^"']+)["']/.exec(raw) || [, '0 0 108 108'])[1];
    const corpo = (/<svg[^>]*>([\s\S]*)<\/svg>/.exec(raw) || [, ''])[1].replace(/\s*fill="[^"]*"/g, '');
    return '<span class="bv-logo" style="background:' + esc(p.fundo) + '"><svg viewBox="' + esc(vb) + '" width="26" height="26" fill="' + esc(p.cor) + '" aria-hidden="true">' + corpo + '</svg></span>';
  }

  function topo(podePular) {
    const pct = Math.round(estado.passo / ULTIMO * 100);
    return '<div class="bv-topo"><button type="button" class="bv-voltar" data-bv="voltar" aria-label="Voltar">‹</button>'
      + '<div class="bv-progresso" role="progressbar" aria-label="Progresso" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + pct + '%"></i></div>'
      + (podePular ? '<button type="button" class="bv-pular" data-bv="pular">Pular</button>' : '<span class="bv-pular"></span>') + '</div>';
  }
  /* quem pergunta: o personagem e a fala dele */
  function quem(pasta, pose, fala) {
    return '<div class="bv-quem"><img src="' + T + pasta + '/corpo-' + pose + '.webp" alt=""><span>' + esc(fala) + '</span></div>';
  }
  function opcoes(lista, atributo, marcado) {
    return '<div class="bv-opcoes">' + lista.map((o) => '<button type="button" class="bv-opcao" ' + atributo + '="' + o.id + '" aria-pressed="' + marcado(o.id) + '">'
      + ic(o.ic) + '<strong>' + esc(o.titulo) + (o.sub ? '<small>' + esc(o.sub) + '</small>' : '') + '</strong><span class="bv-marca-sel" aria-hidden="true"></span></button>').join('') + '</div>';
  }
  function rodape(ativo, rotulo) {
    return '<div class="bv-rodape"><button type="button" class="bv-principal" data-bv="avancar"' + (ativo ? '' : ' disabled') + '>' + (rotulo || 'Continuar') + '</button></div>';
  }

  function tela() {
    const p = estado.passo;
    if (p === 0) {
      return '<div class="bv-hero"><img class="bv-oaze" src="' + T + 'oaze/corpo-neutra-acolhedora.webp" alt="OAZE, um axolote verde e laranja" width="640" height="420"></div>'
        + '<div class="bv-folha"><h1 id="bv-titulo">Oi! Eu sou a OAZE.</h1>'
        + '<p>Responde cinco perguntas rápidas e a turma se organiza do seu jeito.</p>'
        + '<button type="button" class="bv-principal" data-bv="avancar">Bora começar</button>'
        + '<p class="bv-nota">Leva menos de 2 minutos</p>'
        + '<button type="button" class="bv-link" data-bv="fechar">Já uso a OAZE · Entrar</button></div>';
    }
    if (p === 1) {
      return topo(false) + '<div class="bv-corpo">' + quem('oaze', 'curiosa', 'Me conta: o que mais te incomoda hoje?')
        + '<h1 id="bv-titulo">O que você quer resolver primeiro?</h1><p>Escolha quantos quiser. O Início do app começa por isso.</p>'
        + opcoes(OBJETIVOS, 'data-bv-obj', (id) => estado.objetivos.has(id)) + '</div>' + rodape(estado.objetivos.size);
    }
    if (p === 2) {
      return topo(true) + '<div class="bv-corpo">' + quem('tico', 'mostra', 'Eu sou o Tico! Cada um anota do seu jeito. Qual é o seu?')
        + '<h1 id="bv-titulo">Como você prefere registrar seus gastos?</h1><p>Pode marcar mais de um. Dá para mudar depois.</p>'
        + opcoes(REGISTRO, 'data-bv-reg', (id) => estado.registro.has(id)) + '</div>' + rodape(estado.registro.size);
    }
    if (p === 3) {
      return topo(true) + '<div class="bv-corpo">' + quem('lume', 'tema', 'Lume aqui. Pra fazer conta boa, preciso saber como o dinheiro chega.')
        + '<h1 id="bv-titulo">Como o dinheiro entra?</h1><p>Isso ajusta o plano do mês e os avisos.</p>'
        + opcoes(RENDA, 'data-bv-renda', (id) => estado.renda === id) + '</div>' + rodape(!!estado.renda);
    }
    if (p === 4) {
      return topo(true) + '<div class="bv-corpo">' + quem('bia', 'tema', 'Sou a Bia. Todo dinheiro precisa de um porquê. Qual é o seu agora?')
        + '<h1 id="bv-titulo">O que mais combina com o seu momento?</h1><p>Quem entende do assunto recebe você no app.</p>'
        + opcoes(MOMENTO, 'data-bv-mom', (id) => estado.momento === id) + '</div>' + rodape(!!estado.momento);
    }
    if (p === 5) {
      return topo(true) + '<div class="bv-corpo">' + quem('nilo', 'acolhe', 'Nilo. Última pergunta, e é das fáceis.')
        + '<h1 id="bv-titulo">De onde sai seu dinheiro?</h1>'
        + '<p>É só para identificar sua primeira conta. Nada é conectado ao banco.</p>'
        + '<input type="search" class="bv-busca" id="bv-busca" placeholder="Buscar banco" aria-label="Buscar banco" autocomplete="off">'
        + '<div class="bv-bancos" id="bv-bancos">' + BANCOS.map(([k, n]) => '<button type="button" class="bv-banco" data-bv-banco="' + k + '" data-nome="' + esc(norm(n)) + '" aria-pressed="' + (estado.banco === k) + '">' + logoBanco(k) + '<span>' + esc(n) + '</span></button>').join('')
        + '</div><p class="bv-vazio" id="bv-vazio" hidden>Não achou? Pule e escolha "Outro" ao cadastrar a conta.</p></div>' + rodape(!!estado.banco);
    }
    const escolhidos = OBJETIVOS.filter((o) => estado.objetivos.has(o.id)).map((o) => o.titulo);
    const banco = (BANCOS.find(([k]) => k === estado.banco) || [])[1];
    const amigo = (MOMENTO.find((m) => m.id === estado.momento) || {}).amigo;
    const registros = REGISTRO.filter((r) => estado.registro.has(r.id)).map((r) => r.titulo.charAt(0).toLowerCase() + r.titulo.slice(1));
    return topo(false) + '<div class="bv-corpo"><h1 id="bv-titulo">Pronto. A turma já sabe por onde começar.</h1>'
      + (amigo ? '<div class="bv-amigo"><img src="' + T + amigo + '/corpo-comemora.webp" alt=""><div><strong>' + esc(AMIGOS[amigo][0]) + ' recebe você</strong><small>' + esc(AMIGOS[amigo][1]) + '. A OAZE continua no centro e chama os outros quando precisar.</small></div></div>' : '')
      + '<ul class="bv-pronto">'
      + (escolhidos.length ? '<li><strong>Início pensado para</strong><small>' + esc(escolhidos.join(' · ')) + '</small></li>' : '')
      + (registros.length ? '<li><strong>Seu jeito de registrar</strong><small>' + esc(registros.join(' · ')) + '</small></li>' : '')
      + (banco ? '<li><strong>Primeira conta</strong><small>' + esc(banco) + ', é só confirmar o saldo</small></li>' : '')
      + '<li><strong>Grátis para começar</strong><small>O plano Semente não pede cartão. O Oásis amplia os limites e tira os anúncios.</small></li>'
      + '</ul></div><div class="bv-rodape"><button type="button" class="bv-principal" data-bv="concluir-entrar">Entrar e criar meu PIN</button></div>';
  }

  let raiz = null;
  function desenhar(foco) {
    raiz.innerHTML = '<div class="bv-tela bv-passo-' + estado.passo + '">' + tela() + '</div>';
    raiz.setAttribute('aria-labelledby', 'bv-titulo');
    if (foco !== false) { const h = raiz.querySelector('h1'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } }
  }

  function salvar() {
    const objetivos = [...estado.objetivos];
    const amigo = (MOMENTO.find((m) => m.id === estado.momento) || {}).amigo || null;
    gravar(CHAVE, { objetivos, banco: estado.banco, registro: [...estado.registro], renda: estado.renda, momento: estado.momento, amigo, versao: 2, em: new Date().toISOString() });
    /* Só mexe nos blocos do Início se a pessoa ainda não escolheu nada. */
    if (objetivos.length && !ler(CHAVE_INICIO)) {
      const blocos = {};
      OBJETIVOS.filter((o) => estado.objetivos.has(o.id)).forEach((o) => o.blocos.forEach((b) => { blocos[b] = true; }));
      gravar(CHAVE_INICIO, blocos);
    }
  }
  function fechar(guardar) {
    if (guardar) salvar(); else gravar(CHAVE, { objetivos: [], banco: null, pulou: true, versao: 2, em: new Date().toISOString() });
    document.documentElement.classList.remove('bv-aberto');
    raiz.remove();
    const alvo = document.getElementById('btn-google') || document.getElementById('email');
    if (alvo && !alvo.hidden) alvo.focus({ preventScroll: true });
  }
  function alterna(conjunto, id, botao) {
    conjunto.has(id) ? conjunto.delete(id) : conjunto.add(id);
    botao.setAttribute('aria-pressed', conjunto.has(id));
    raiz.querySelector('[data-bv="avancar"]').disabled = !conjunto.size;
  }
  function unica(seletor, botao) {
    raiz.querySelectorAll(seletor).forEach((x) => x.setAttribute('aria-pressed', x === botao));
    raiz.querySelector('[data-bv="avancar"]').disabled = false;
  }

  function iniciar() {
    raiz = document.createElement('div');
    raiz.className = 'bv';
    raiz.setAttribute('role', 'dialog');
    raiz.setAttribute('aria-modal', 'true');
    document.body.appendChild(raiz);
    document.documentElement.classList.add('bv-aberto');
    const entrada = document.getElementById('oaze-entrance');
    if (entrada) entrada.hidden = true;
    desenhar(false);

    raiz.addEventListener('click', (ev) => {
      const obj = ev.target.closest('[data-bv-obj]');
      if (obj) { alterna(estado.objetivos, obj.dataset.bvObj, obj); return; }
      const reg = ev.target.closest('[data-bv-reg]');
      if (reg) { alterna(estado.registro, reg.dataset.bvReg, reg); return; }
      const renda = ev.target.closest('[data-bv-renda]');
      if (renda) { estado.renda = renda.dataset.bvRenda; unica('[data-bv-renda]', renda); return; }
      const mom = ev.target.closest('[data-bv-mom]');
      if (mom) { estado.momento = mom.dataset.bvMom; unica('[data-bv-mom]', mom); return; }
      const b = ev.target.closest('[data-bv-banco]');
      if (b) { estado.banco = b.dataset.bvBanco; unica('[data-bv-banco]', b); return; }
      const acao = ev.target.closest('[data-bv]');
      if (!acao) return;
      const a = acao.dataset.bv;
      if (a === 'avancar') { estado.passo = Math.min(ULTIMO, estado.passo + 1); desenhar(); }
      else if (a === 'voltar') { estado.passo = Math.max(0, estado.passo - 1); desenhar(); }
      else if (a === 'pular') {
        if (estado.passo === 2) estado.registro.clear();
        else if (estado.passo === 3) estado.renda = null;
        else if (estado.passo === 4) estado.momento = null;
        else if (estado.passo === 5) estado.banco = null;
        estado.passo = Math.min(ULTIMO, estado.passo + 1); desenhar();
      }
      else if (a === 'fechar') fechar(false);
      else if (a === 'concluir-entrar') fechar(true);
    });
    raiz.addEventListener('input', (ev) => {
      if (ev.target.id !== 'bv-busca') return;
      const q = norm(ev.target.value);
      let visiveis = 0;
      raiz.querySelectorAll('[data-bv-banco]').forEach((b) => { const ok = !q || b.dataset.nome.includes(q); b.hidden = !ok; if (ok) visiveis++; });
      const vazio = raiz.querySelector('#bv-vazio'); if (vazio) vazio.hidden = visiveis > 0;
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})(window);
