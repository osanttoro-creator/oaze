/* =============================================================
   teste-gratis.js — 30 dias grátis do Oásis (01/11/2026)
   A oferta mostra a linha do tempo inteira antes do clique (hoje
   grátis, aviso no dia 27, primeira cobrança no dia 30) para ninguém
   ser pego de surpresa na fatura.

   Regras (o servidor confere de novo, o app só pergunta):
   - Oásis mensal ou anual; uma vez por PESSOA, não por conta. O
     servidor dá uma nota de risco: mesmo aparelho, mesma rede, mesmo
     e-mail com pontinho/+sufixo e mesmo cartão em outra conta somam
     pontos. Nota baixa: teste sem cartão. Média: com cartão. Alta:
     sem teste (assinar continua aberto).
   - sem cartão no fim do teste, a assinatura cancela sozinha em vez
     de cobrar;
   - no app da Play Store a cobrança é da Google: aqui não aparece.

   O APP PARA WINDOWS É DO OÁSIS. No computador, quem está no Semente
   vê o muro de assinatura (com o teste de 30 dias quando cabe). Os
   dados não somem: continuam na conta e abrem no navegador e no
   celular.
   ============================================================= */
(function (global) {
  'use strict';

  const DIAS = 30, AVISO = 27;
  const CHAVE_VISTO = 'oaze.teste.oferecido';
  const CHAVE_INICIO = 'oaze.teste.inicio';
  const CHAVE_APARELHO = 'oaze.aparelho';
  const ler = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sem armazenamento */ } };
  const contexto = () => { try { return global.OAZE_REPORT_CONTEXT ? global.OAZE_REPORT_CONTEXT() : null; } catch { return null; } };
  const reais = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const desktop = () => !!global.OAZE_NATIVE_DESKTOP;

  function preco() {
    const p = global.Planos && Planos.get ? Planos.get('pro') : null;
    const anual = p && p.anualCentavos ? p.anualCentavos : 27990;
    const mensal = p && p.mensalCentavos ? p.mensalCentavos : 3590;
    return { anual, mensal, mesNoAnual: Math.floor(anual / 12) };
  }

  /* ---------- impressão do aparelho ----------
     Dois pedaços, os dois em hex: um id aleatório guardado no próprio
     aparelho (some se a pessoa limpar os dados) e um resumo dos traços
     do navegador/tela (não some ao limpar). O servidor só guarda os
     dois como hash com sal; nada disso identifica a pessoa fora do
     OAZE. */
  const hex = (buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  async function sha(texto) {
    return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto)));
  }
  function idAparelho() {
    let v = ler(CHAVE_APARELHO);
    if (!/^[a-f0-9]{32}$/.test(v || '')) {
      const cookie = /(?:^|;\s*)oaze_ap=([a-f0-9]{32})/.exec(document.cookie || '');
      v = cookie ? cookie[1] : hex(crypto.getRandomValues(new Uint8Array(16)));
      gravar(CHAVE_APARELHO, v);
    }
    try { document.cookie = 'oaze_ap=' + v + ';max-age=63072000;path=/;SameSite=Lax' + (location.protocol === 'https:' ? ';Secure' : ''); } catch { /* sem cookie */ }
    return v;
  }
  function desenhoDaTela() {
    try {
      const c = document.createElement('canvas'); c.width = 220; c.height = 30;
      const g = c.getContext('2d');
      g.textBaseline = 'top'; g.font = '16px Arial'; g.fillStyle = '#5fa99b'; g.fillRect(0, 0, 110, 30);
      g.fillStyle = '#F0E5CF'; g.fillText('OAZE 30 dias', 4, 6);
      return c.toDataURL().slice(-120);
    } catch { return ''; }
  }
  function placaDeVideo() {
    try {
      const gl = document.createElement('canvas').getContext('webgl');
      const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
      return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    } catch { return ''; }
  }
  let impressao = null;
  function dispositivo() {
    if (!impressao) impressao = (async () => {
      const n = navigator, s = global.screen || {};
      const tracos = [
        String(n.userAgent || '').replace(/[\d._]+/g, ''),   // sem versão: atualizar o navegador não muda
        n.platform, (n.languages || [n.language]).join(','),
        Intl.DateTimeFormat().resolvedOptions().timeZone,
        [s.width, s.height].sort().join('x'), s.colorDepth, global.devicePixelRatio,
        n.hardwareConcurrency, n.deviceMemory, n.maxTouchPoints,
        placaDeVideo(), desenhoDaTela()
      ].join('|');
      return idAparelho() + '.' + (await sha(tracos));
    })().catch(() => undefined);
    return impressao;
  }

  /* ---------- elegibilidade ---------- */
  let resposta = null, consultando = null;
  function podeOferecer() {
    const c = contexto();
    return !!(c && !c.demo && global.V3Backend && V3Backend.payment && !global.OAZE_BILLING_READONLY);
  }
  async function consultar() {
    if (resposta) return resposta.elegivel;
    if (!podeOferecer()) return false;
    if (!consultando) consultando = dispositivo()
      .then((d) => V3Backend.payment(d ? { acao: 'teste', dispositivo: d } : { acao: 'teste' }))
      .then((r) => { resposta = { elegivel: !!(r && r.elegivel), cartao: !(r && r.cartao === false) }; return resposta.elegivel; })
      .catch(() => { resposta = { elegivel: false, cartao: true }; return false; });   // servidor antigo: sem oferta
    return consultando;
  }

  function linhaDoTempo(ciclo) {
    const { anual, mensal, mesNoAnual } = preco();
    const passo = (cls, ic, t, s) => '<li class="tg-passo tg-' + cls + '"><span class="tg-ic" aria-hidden="true">' + ic + '</span><span><strong>' + t + '</strong><small>' + s + '</small></span></li>';
    const cobranca = ciclo === 'annual'
      ? reais(anual) + ' por ano (' + reais(mesNoAnual) + '/mês).'
      : reais(mensal) + ' por mês.';
    return '<ol class="tg-tempo">'
      + passo('hoje', '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/></svg>',
        'Hoje: tudo liberado', 'App para Windows, mais Coco por dia, relatórios em PDF, lançamentos sem limite e sem anúncio. ' + reais(0) + '.')
      + passo('aviso', '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
        'Dia ' + AVISO + ': a gente te avisa', 'Lembrete de que o teste está acabando. Sem surpresa na fatura.')
      + passo('pro', '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18h20l-2-11-5 4-3-6-3 6-5-4z"/></svg>',
        'Dia ' + DIAS + ': vira Oásis', cobranca + ' Cancele antes e não paga nada.')
      + '</ol>';
  }
  function notaDoCartao() {
    return resposta && resposta.cartao === false
      ? 'Sem cartão hoje. No dia ' + DIAS + ' você decide se continua.'
      : 'O cartão é pedido só para confirmar. Nada é cobrado antes do dia ' + DIAS + '.';
  }
  function marcarCiclo(raiz, botao) {
    raiz.dataset.ciclo = botao.dataset.tgCiclo;
    raiz.querySelectorAll('[data-tg-ciclo]').forEach((b) => b.setAttribute('aria-checked', String(b === botao)));
  }

  function abrir(origem) {
    if (!podeOferecer()) { if (global.location.hash !== '#plan') document.querySelector('[data-go="plan"]')?.click(); return; }
    gravar(CHAVE_VISTO, new Date().toISOString());
    const volta = document.activeElement;
    const d = document.createElement('dialog');
    d.className = 'tg-dialogo';
    d.dataset.ciclo = 'annual';
    d.setAttribute('aria-labelledby', 'tg-titulo');
    d.innerHTML = '<div class="tg-folha">'
      + '<button type="button" class="tg-fechar" data-tg="fechar" aria-label="Agora não">×</button>'
      + '<h2 id="tg-titulo">Comece com 30 dias grátis.</h2>'
      + '<p class="tg-sub">Tudo do Oásis liberado hoje por ' + reais(0) + '. Veja como funciona:</p>'
      + '<div class="tg-ciclo" role="radiogroup" aria-label="Depois do teste">'
      + '<button type="button" role="radio" aria-checked="true" data-tg-ciclo="annual">Anual <small>' + reais(preco().mesNoAnual) + '/mês</small></button>'
      + '<button type="button" role="radio" aria-checked="false" data-tg-ciclo="monthly">Mensal <small>' + reais(preco().mensal) + '/mês</small></button></div>'
      + '<div data-tg-tempo>' + linhaDoTempo('annual') + '</div>'
      + '<ul class="tg-chips"><li>App para Windows</li><li>Relatórios + PDF</li><li>Lançamentos sem limite</li><li>Mais Coco por dia</li><li>Sem anúncios</li></ul>'
      + '<div class="tg-rodape"><button type="button" class="tg-principal" data-tg="comecar">Começar teste grátis</button>'
      + '<p class="tg-garantia">' + notaDoCartao() + '</p>'
      + '<p class="tg-erro" role="alert" hidden></p>'
      + '<div class="tg-links"><button type="button" data-tg="planos">Ver todos os planos</button><a href="/suporte">Precisa de ajuda?</a></div>'
      + '<p class="tg-legal"><a href="/termos">Termos de uso</a> · <a href="/privacidade">Política de privacidade</a></p></div></div>';
    document.body.appendChild(d);
    d.addEventListener('close', () => { d.remove(); if (volta && volta.isConnected) volta.focus(); });
    d.addEventListener('click', async (ev) => {
      if (ev.target === d) { d.close(); return; }
      const c = ev.target.closest('[data-tg-ciclo]');
      if (c) { marcarCiclo(d, c); d.querySelector('[data-tg-tempo]').innerHTML = linhaDoTempo(d.dataset.ciclo); return; }
      const b = ev.target.closest('[data-tg]');
      if (!b) return;
      if (b.dataset.tg === 'fechar') d.close();
      else if (b.dataset.tg === 'planos') { d.close(); document.querySelector('[data-go="plan"]')?.click(); }
      else if (b.dataset.tg === 'comecar') await comecar(b, d.querySelector('.tg-erro'), d.dataset.ciclo, () => d.close());
    });
    d.showModal();
    d.querySelector('[data-tg="comecar"]').focus();
    void origem;
  }

  /* Abre a página segura da Stripe. Com teste=false é a assinatura
     comum (o muro do Windows usa quando o teste não cabe). */
  async function comecar(botao, erro, ciclo, fechar, teste = true) {
    const rotulo = botao.textContent;
    erro.hidden = true;
    botao.disabled = true; botao.textContent = 'Abrindo pagamento seguro…';
    try {
      const pedido = { acao: 'assinar', plano: 'pro', ciclo: ciclo === 'monthly' ? 'monthly' : 'annual', moeda: 'BRL' };
      if (teste) pedido.teste = true;
      const d = await dispositivo();
      if (d) pedido.dispositivo = d;
      if (desktop()) pedido.canal = 'windows';
      const r = await V3Backend.payment(pedido);
      if (!/^https:\/\/checkout\.stripe\.com\//.test(String(r.url || ''))) throw new Error('O servidor não retornou uma página segura de pagamento.');
      if (teste) gravar(CHAVE_INICIO, new Date().toISOString());
      if (global.OAZE_NATIVE_OPEN_EXTERNAL) { await global.OAZE_NATIVE_OPEN_EXTERNAL(r.url); if (fechar) fechar(); }
      else global.location.assign(r.url);
    } catch (e) {
      erro.textContent = (e && e.message) || 'Não foi possível abrir o pagamento. Nada foi cobrado.';
      erro.hidden = false;
      if (teste && /teste/i.test(erro.textContent)) resposta = { elegivel: false, cartao: true };
    } finally {
      botao.disabled = false; botao.textContent = rotulo;
    }
  }

  /* Lembrete do dia 27, para o agendador de avisos (recursos-app.js).
     O fim do teste vem do servidor quando já existe; senão, conta do
     dia em que o teste foi pedido neste aparelho. */
  function lembretes() {
    const dir = global.Limites && Limites.direitos ? Limites.direitos() : null;
    const inicio = ler(CHAVE_INICIO);
    const fim = dir && dir.emTeste && dir.testeAte ? new Date(dir.testeAte)
      : inicio ? new Date(new Date(inicio).getTime() + DIAS * 86400000) : null;
    if (!fim || isNaN(fim)) return [];
    const aviso = new Date(fim.getTime() - (DIAS - AVISO) * 86400000);
    aviso.setHours(10, 0, 0, 0);
    if (!(aviso > new Date())) return [];
    const { anual, mensal } = preco();
    const ciclo = dir && dir.ciclo === 'monthly' ? reais(mensal) + '/mês' : reais(anual) + '/ano';
    return [{ at: aviso.toISOString(), canal: 'oaze-contas', titulo: 'Seu teste do Oásis acaba em ' + (DIAS - AVISO) + ' dias',
      corpo: 'No dia ' + DIAS + ' vira Oásis (' + ciclo + '). Para não pagar, cancele em Configurações › Plano.' }];
  }

  /* Faixa no topo da tela de planos. */
  function faixaPlanos() {
    const view = document.getElementById('v3-view');
    if (!view || view.querySelector('[data-tg-faixa]')) return;
    view.insertAdjacentHTML('afterbegin', '<section class="v3-panel tg-faixa" data-tg-faixa><span><strong>30 dias grátis do Oásis</strong><small>Depois ' + reais(preco().mesNoAnual) + '/mês no anual. Avisamos no dia ' + AVISO + '.</small></span><button type="button" class="v3-primary" data-tg-abrir>Experimentar</button></section>');
  }

  /* ---------- muro do Windows ---------- */
  function precisaDoMuro() {
    if (!desktop()) return false;
    const c = contexto();
    const dir = global.Limites && Limites.direitos ? Limites.direitos() : null;
    return !!(c && !c.demo && dir && dir.carregado && dir.plano === 'free');
  }
  async function muro() {
    const atual = document.querySelector('[data-tg-muro]');
    if (!precisaDoMuro()) { if (atual) atual.remove(); document.documentElement.classList.remove('tg-com-muro'); return; }
    if (atual) return;
    const cabeTeste = await consultar();
    if (!precisaDoMuro() || document.querySelector('[data-tg-muro]')) return;
    const { anual, mensal, mesNoAnual } = preco();
    const m = document.createElement('div');
    m.className = 'tg-muro';
    m.dataset.tgMuro = '';
    m.dataset.ciclo = 'annual';
    m.setAttribute('role', 'dialog');
    m.setAttribute('aria-modal', 'true');
    m.setAttribute('aria-labelledby', 'tg-muro-titulo');
    m.innerHTML = '<div class="tg-folha">'
      + '<h2 id="tg-muro-titulo">O OAZE para Windows é do Oásis.</h2>'
      + '<p class="tg-sub">Seus dados continuam salvos na sua conta e abrem no navegador e no celular, mesmo sem assinar.</p>'
      + '<div class="tg-ciclo" role="radiogroup" aria-label="Plano">'
      + '<button type="button" role="radio" aria-checked="true" data-tg-ciclo="annual">Anual <small>' + reais(anual) + ' (' + reais(mesNoAnual) + '/mês)</small></button>'
      + '<button type="button" role="radio" aria-checked="false" data-tg-ciclo="monthly">Mensal <small>' + reais(mensal) + '/mês</small></button></div>'
      + '<ul class="tg-chips"><li>App para Windows</li><li>Relatórios + PDF</li><li>Lançamentos sem limite</li><li>Mais Coco por dia</li><li>Sem anúncios</li></ul>'
      + '<div class="tg-rodape">'
      + (cabeTeste
        ? '<button type="button" class="tg-principal" data-tg-muro-acao="teste">Começar 30 dias grátis</button><p class="tg-garantia">' + notaDoCartao() + '</p>'
        : '<button type="button" class="tg-principal" data-tg-muro-acao="assinar">Assinar o Oásis</button><p class="tg-garantia">Cancele quando quiser em Configurações › Plano.</p>')
      + '<p class="tg-erro" role="alert" hidden></p>'
      + '<div class="tg-links"><button type="button" data-tg-muro-acao="conferir">Já assinei</button><button type="button" data-tg-muro-acao="navegador">Abrir no navegador</button><button type="button" data-tg-muro-acao="sair">Sair da conta</button></div>'
      + '<p class="tg-legal"><a href="https://oaze.site/termos" data-tg-externo>Termos de uso</a> · <a href="https://oaze.site/privacidade" data-tg-externo>Política de privacidade</a></p></div></div>';
    document.body.appendChild(m);
    document.documentElement.classList.add('tg-com-muro');
    m.querySelector('.tg-principal').focus();
    m.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Tab') return;
      const focaveis = [...m.querySelectorAll('button,a[href]')].filter((el) => !el.disabled);
      const i = focaveis.indexOf(document.activeElement);
      if (ev.shiftKey && i <= 0) { ev.preventDefault(); focaveis[focaveis.length - 1].focus(); }
      else if (!ev.shiftKey && i === focaveis.length - 1) { ev.preventDefault(); focaveis[0].focus(); }
    });
    m.addEventListener('click', async (ev) => {
      const externo = ev.target.closest('[data-tg-externo]');
      if (externo && global.OAZE_NATIVE_OPEN_EXTERNAL) { ev.preventDefault(); global.OAZE_NATIVE_OPEN_EXTERNAL(externo.href); return; }
      const c = ev.target.closest('[data-tg-ciclo]');
      if (c) { marcarCiclo(m, c); return; }
      const b = ev.target.closest('[data-tg-muro-acao]');
      if (!b) return;
      const erro = m.querySelector('.tg-erro');
      const acao = b.dataset.tgMuroAcao;
      if (acao === 'teste' || acao === 'assinar') await comecar(b, erro, m.dataset.ciclo, null, acao === 'teste');
      else if (acao === 'conferir') {
        b.disabled = true;
        try { await Limites.aoEntrar(); } finally { b.disabled = false; }
        if (precisaDoMuro()) { erro.textContent = 'Ainda não chegou a confirmação do pagamento. Se acabou de pagar, espere alguns segundos e tente de novo.'; erro.hidden = false; }
      } else if (acao === 'navegador') {
        const url = 'https://oaze.site/app';
        if (global.OAZE_NATIVE_OPEN_EXTERNAL) global.OAZE_NATIVE_OPEN_EXTERNAL(url); else global.open(url, '_blank', 'noopener');
      } else if (acao === 'sair') {
        try { await V3Backend.signOut(); } catch (e) { erro.textContent = (e && e.message) || 'Não foi possível sair agora.'; erro.hidden = false; }
      }
    });
  }

  document.addEventListener('click', (ev) => { if (ev.target.closest('[data-tg-abrir]')) abrir('faixa'); });
  document.addEventListener('oaze:render', async (ev) => {
    muro();
    if (desktop()) return;   // no computador quem oferece o teste é o muro
    const pagina = ev.detail && ev.detail.page;
    if (pagina !== 'plan' && pagina !== 'home') return;
    const plano = global.Limites && Limites.plano ? Limites.plano() : 'free';
    if (plano !== 'free' || !(await consultar())) return;
    if (pagina === 'plan') faixaPlanos();
    else if (!ler(CHAVE_VISTO) && !document.querySelector('dialog[open]')) setTimeout(() => { if (!document.querySelector('dialog[open]')) abrir('primeira-vez'); }, 1800);
  });
  global.addEventListener('oaze:direitos', () => muro());
  /* voltou da Stripe pelo oaze://billing: confere o plano na hora */
  global.addEventListener('oaze:billing-return', () => { resposta = null; consultando = null; if (global.Limites && Limites.aoEntrar) Limites.aoEntrar(); });

  global.OazeTeste = { abrir, lembretes, consultar, muro, dias: DIAS };
})(window);
