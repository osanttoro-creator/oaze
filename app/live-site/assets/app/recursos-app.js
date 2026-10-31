/* =============================================================
   recursos-app.js — funções do app que não cabem no painel base
   (31/10/2026)

   · Coco em porcentagem: barras do dia e da semana.
   · Anúncio premiado no Semente (Android): +10 lançamentos no mês.
   · Avisos: vencimento na véspera e no dia, orçamento, metas, score,
     dólar e dicas — com preferências por tipo.
   · Central de permissões: notificações, localização, microfone,
     câmera, biometria e anúncios.
   · Local da compra (opcional) e aviso de viagem no lançamento.

   Este arquivo só desenha e agenda. Quem decide limite e cota é o
   servidor (meus_direitos, reservar_coco, oaze-anuncio).
   ============================================================= */
(function (global) {
  'use strict';

  /* ---------------- utilidades ---------------- */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const brl = (n) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n) || 0);
  const contexto = () => { try { return global.OAZE_REPORT_CONTEXT ? global.OAZE_REPORT_CONTEXT() : null; } catch { return null; } };
  const armazenado = {
    ler(chave, padrao) { try { const v = localStorage.getItem(chave); return v == null ? padrao : JSON.parse(v); } catch { return padrao; } },
    gravar(chave, valor) { try { localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* armazenamento indisponível */ } }
  };
  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const hojeISO = () => iso(new Date());
  const ymDe = (s) => String(s).slice(0, 7);
  const somarMeses = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return iso(d).slice(0, 7); };
  const dias = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
  const usuarioId = () => { try { return global.V3Backend && V3Backend.user && V3Backend.user() ? V3Backend.user().id : null; } catch { return null; } };
  const plano = () => (global.Limites && Limites.plano ? Limites.plano() : 'free');

  function avisar(texto) {
    const el = document.getElementById('v3-toast');
    if (!el) return;
    el.textContent = texto; el.hidden = false;
    clearTimeout(avisar.t); avisar.t = setTimeout(() => { el.hidden = true; }, 4200);
  }

  /* Diálogo próprio, com o mesmo visual do relatório Estado do OAZE. */
  function dialogo(titulo, corpo, rotulo) {
    const volta = document.activeElement;
    const d = document.createElement('dialog');
    d.className = 'v3-estado-dialog oz-dialogo';
    d.setAttribute('aria-label', rotulo || titulo);
    d.innerHTML = '<form method="dialog"><header><img src="/assets/brand/oaze-logo-mono-milk.svg" alt="OAZE"><button type="submit" aria-label="Fechar">×</button></header>'
      + '<h2>' + esc(titulo) + '</h2>' + corpo + '</form>';
    document.body.appendChild(d);
    d.addEventListener('close', () => { d.remove(); if (volta && volta.isConnected) volta.focus(); });
    d.showModal();
    return d;
  }

  /* =============================================================
     COCO EM PORCENTAGEM
     ============================================================= */
  let ultimaConsulta = 0;
  function quando(isoData, semana) {
    if (!isoData) return semana ? 'renova na segunda' : 'renova à meia-noite';
    const d = new Date(isoData);
    if (!Number.isFinite(d.getTime())) return '';
    return semana
      ? 'renova ' + new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(d)
      : 'renova às ' + new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(d);
  }
  function barra(rotulo, pct, sub) {
    const nivel = pct >= 100 ? 'cheio' : pct >= 80 ? 'alto' : 'ok';
    return '<div class="oz-uso-linha"><span>' + esc(rotulo) + '</span><strong>' + pct + '%</strong></div>'
      + '<div class="oz-barra oz-' + nivel + '" role="progressbar" aria-label="' + esc(rotulo) + ' usado" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + Math.min(100, pct) + '%"></i></div>'
      + '<small class="v3-muted">' + esc(sub) + '</small>';
  }
  function painelCoco() {
    if (!global.Limites || !Limites.consumoCoco) return '';
    const c = Limites.consumoCoco();
    if (!c.carregado || c.ilimitado) return '';
    const alto = Math.max(c.pct_dia, c.pct_semana) >= 80;
    return '<section class="v3-panel oz-coco-uso" data-oz-coco-uso aria-label="Uso da Coco">'
      + '<h2>uso da coco</h2>'
      + barra('Hoje', c.pct_dia, quando(c.renova_dia, false))
      + barra('Esta semana', c.pct_semana, quando(c.renova_semana, true))
      + (alto && plano() === 'free' ? '<p class="v3-muted">No Oásis, a Coco tem 10 vezes mais uso por dia e por semana. <button type="button" class="v3-link" data-go="plan">Ver planos</button></p>' : '')
      + '</section>';
  }
  async function atualizarCoco(forcar) {
    if (!global.Limites || !Limites.carregarConsumo) return;
    if (!forcar && Date.now() - ultimaConsulta < 15000) return;
    ultimaConsulta = Date.now();
    await Limites.carregarConsumo().catch(() => {});
    const atual = document.querySelector('[data-oz-coco-uso]');
    const novo = painelCoco();
    if (atual && novo) atual.outerHTML = novo;
    else if (!atual && novo) inserirCoco(estadoPagina);
  }
  function inserirCoco(pagina) {
    const html = painelCoco();
    if (!html || document.querySelector('[data-oz-coco-uso]')) return;
    const view = document.getElementById('v3-view');
    if (!view) return;
    if (pagina === 'coco') view.insertAdjacentHTML('afterbegin', html);
    if (pagina === 'settings') {
      const alvo = view.querySelector('.v3-settings-extra');
      if (alvo) alvo.insertAdjacentHTML('beforebegin', html); else view.insertAdjacentHTML('beforeend', html);
    }
  }

  /* =============================================================
     ANÚNCIO PREMIADO (Semente, app Android)
     ============================================================= */
  const OazeAnuncios = {
    estado() {
      const a = global.Limites && Limites.anuncios ? Limites.anuncios() : { hoje: 0, max_dia: 0, por_anuncio: 0, liberados_mes: 0 };
      return Object.assign({}, a, { restante: Math.max(0, (a.max_dia || 0) - (a.hoje || 0)) });
    },
    nativo() { return !!global.OAZE_NATIVE_ADS; },
    disponivel() {
      const c = contexto();
      return this.nativo() && !(c && c.demo) && plano() === 'free' && !!usuarioId() && this.estado().restante > 0 && this.estado().por_anuncio > 0;
    },
    botao() {
      const e = this.estado();
      return '<button type="button" class="v3-primary oz-anuncio-botao" data-action="assistir-anuncio">Assistir anúncio e liberar +' + e.por_anuncio + ' lançamentos</button>'
        + '<p class="v3-muted oz-anuncio-nota">Hoje: ' + e.hoje + ' de ' + e.max_dia + ' anúncios. A liberação vale até o fim do mês.</p>';
    },
    painel() {
      const c = contexto();
      if (!c || c.demo || plano() !== 'free' || !usuarioId() || !global.Limites) return '';
      const e = this.estado();
      const limite = Limites.limite('transactions_per_month');
      const mes = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date());
      const usado = Limites.contar ? Limites.contar('transactions_per_month', hojeISO().slice(0, 7)) : 0;
      const corpo = this.nativo()
        ? (e.restante > 0 ? this.botao() : '<p class="v3-muted">Você já assistiu os ' + e.max_dia + ' anúncios de hoje. Amanhã libera de novo.</p>')
        : '<p class="v3-muted">No app OAZE para Android, cada anúncio assistido libera +' + (e.por_anuncio || 10) + ' lançamentos no mês, até ' + (e.max_dia || 5) + ' por dia.</p>';
      return '<section class="v3-panel oz-anuncio-painel" data-oz-anuncio aria-label="Lançamentos do mês">'
        + '<h2>lançamentos de ' + esc(mes) + '</h2>'
        + '<p><strong>' + usado + '</strong> de <strong>' + (limite == null ? 'ilimitado' : limite) + '</strong>'
        + (e.liberados_mes ? ' · ' + e.liberados_mes + ' liberados por anúncio' : '') + '</p>'
        + corpo + '</section>';
    },
    async assistir(botao) {
      const id = usuarioId();
      if (!this.nativo() || !id) return;
      const antes = this.estado().liberados_mes || 0;
      if (botao) { botao.disabled = true; botao.setAttribute('aria-busy', 'true'); }
      try {
        const r = await global.OAZE_NATIVE_ADS.mostrar({ userId: id });
        if (!r || !r.recompensado) { avisar('O anúncio foi fechado antes do fim. Nada foi liberado.'); return; }
        avisar('Conferindo a liberação com o Google…');
        for (let i = 0; i < 8; i++) {
          await new Promise((ok) => setTimeout(ok, 2500));
          await Limites.carregar();
          if ((this.estado().liberados_mes || 0) > antes) {
            avisar('+' + this.estado().por_anuncio + ' lançamentos liberados neste mês.');
            if (typeof Limites.aoMudar === 'function') Limites.aoMudar();
            const fechar = document.querySelector('#v3-overlay:not([hidden]) [data-action="close"]');
            if (fechar) fechar.click();
            atualizarAnuncio();
            return;
          }
        }
        avisar('O anúncio terminou, mas a confirmação do Google ainda não chegou. Pode levar alguns minutos.');
      } catch (e) {
        avisar(e && e.message ? e.message : 'Anúncio indisponível agora. Tente mais tarde.');
      } finally {
        if (botao && botao.isConnected) { botao.disabled = false; botao.removeAttribute('aria-busy'); }
      }
    }
  };
  function atualizarAnuncio() {
    const atual = document.querySelector('[data-oz-anuncio]');
    if (atual) atual.outerHTML = OazeAnuncios.painel();
  }

  /* =============================================================
     AVISOS
     ============================================================= */
  const PREF_PADRAO = { vencimentos: true, orcamento: true, metas: true, score: true, dolar: false, dicas: true, detalhes: false, hora: 9 };
  const prefs = () => Object.assign({}, PREF_PADRAO, armazenado.ler('oaze.avisos.prefs', {}));
  const enviados = () => armazenado.ler('oaze.avisos.enviados', {});
  let indicesCache = null;

  async function indices() {
    if (indicesCache && Date.now() - indicesCache.quando < 3 * 3600_000) return indicesCache.dados;
    try {
      const cfg = global.SupabaseConfig || {};
      const base = String(cfg.url || '').replace(/\/+$/, '');
      const chave = String(cfg.publishableKey || cfg.anonKey || '');
      const token = global.AI && AI.tokenDaSessao ? await AI.tokenDaSessao() : null;
      if (!base || !chave || !token) return null;
      const r = await fetch(base + '/functions/v1/oaze-invest-data', {
        method: 'POST', headers: { 'content-type': 'application/json', apikey: chave, authorization: 'Bearer ' + token },
        body: JSON.stringify({ action: 'indices' })
      });
      if (!r.ok) return null;
      const dados = await r.json();
      indicesCache = { quando: Date.now(), dados };
      return dados;
    } catch { return null; }
  }

  /* O que merece aviso agora. Cada item tem chave única para não repetir. */
  async function insights(perfil, p) {
    const lista = [];
    const hoje = hojeISO();
    const ym = hoje.slice(0, 7);
    if (p.orcamento && perfil.budgets && global.Calc) {
      const totais = Calc.categoryTotals('expense', ym + '-01', hoje, perfil);
      Object.entries(perfil.budgets).forEach(([cat, limite]) => {
        const linha = totais.find((t) => t.id === cat);
        if (!linha || !(limite > 0)) return;
        const pct = Math.round(linha.total / limite * 100);
        const faixa = pct >= 100 ? 100 : pct >= 80 ? 80 : 0;
        if (!faixa) return;
        lista.push({ chave: 'orc' + faixa + ':' + ym + ':' + cat, canal: 'insights',
          titulo: p.detalhes ? 'Orçamento de ' + linha.name + ' em ' + pct + '%' : 'Um orçamento passou de ' + faixa + '%',
          corpo: p.detalhes ? brl(linha.total) + ' de ' + brl(limite) + ' neste mês.' : 'Abra o OAZE para ver qual categoria.',
          texto: 'Orçamento de ' + linha.name + ': ' + pct + '% usado (' + brl(linha.total) + ' de ' + brl(limite) + ').' });
      });
    }
    if (p.score && global.Calc && Calc.score) {
      try {
        const s = Calc.score(ym, perfil);
        const total = s && Number.isFinite(+s.total) ? Math.round(+s.total) : null;
        const anterior = armazenado.ler('oaze.avisos.score', null);
        if (total != null) {
          if (anterior != null && total - anterior >= 3) {
            lista.push({ chave: 'score:' + total + ':' + ym, canal: 'insights',
              titulo: 'Seu score OAZE subiu para ' + total, corpo: 'Eram ' + anterior + ' pontos. Veja o que melhorou no início.',
              texto: 'Score OAZE subiu de ' + anterior + ' para ' + total + '.' });
          }
          armazenado.gravar('oaze.avisos.score', total);
        }
      } catch { /* score indisponível neste perfil */ }
    }
    const precisaMercado = p.dolar || p.dicas;
    const mercado = precisaMercado ? await indices() : null;
    if (p.dolar && mercado && mercado.usdBrl && Number.isFinite(+mercado.usdBrl.value)) {
      const v = +mercado.usdBrl.value;
      const ant = mercado.usdBrlAnterior && +mercado.usdBrlAnterior.value;
      const varPct = ant ? (v - ant) / ant * 100 : null;
      const data = String(mercado.usdBrl.date || '').split('-').reverse().slice(0, 2).join('/');
      lista.push({ chave: 'dolar:' + mercado.usdBrl.date, canal: 'insights',
        titulo: 'Dólar: R$ ' + v.toFixed(4).replace('.', ',') + (varPct != null ? ' (' + (varPct >= 0 ? '+' : '') + varPct.toFixed(2).replace('.', ',') + '%)' : ''),
        corpo: 'Dólar comercial (venda) de ' + data + ', Banco Central.',
        texto: 'Dólar comercial de ' + data + ': R$ ' + v.toFixed(4).replace('.', ',') + (varPct != null ? ', ' + (varPct >= 0 ? 'alta' : 'queda') + ' de ' + Math.abs(varPct).toFixed(2).replace('.', ',') + '% no dia' : '') + '.' });
    }
    /* Dica educativa, nunca recomendação de produto: o OAZE não é
       consultor de valores mobiliários (CVM). */
    if (p.dicas && mercado && mercado.cdiAnnual && global.Calc && Calc.totalAccountsBalance) {
      try {
        const saldo = +Calc.totalAccountsBalance(hoje, perfil) || 0;
        const media = (() => {
          const meses = [1, 2, 3].map((n) => somarMeses(ym, -n));
          const tot = meses.map((m) => Calc.monthTotals ? (Calc.monthTotals(m, perfil).expense || 0) : 0);
          return tot.reduce((a, b) => a + b, 0) / 3;
        })();
        const semana = Math.floor(Date.now() / (7 * 86400000));
        if (media > 0 && saldo > media * 3) {
          const cdi = (+mercado.cdiAnnual.value).toFixed(2).replace('.', ',');
          lista.push({ chave: 'dica-reserva:' + semana, canal: 'insights',
            titulo: 'Dinheiro parado também pode render',
            corpo: 'Seu saldo em conta passa de 3 meses de gastos. O CDI está em ' + cdi + '% ao ano. Entenda as opções em Investimentos.',
            texto: 'Saldo em conta acima de 3 meses de gastos; CDI em ' + cdi + '% a.a. Conteúdo educativo, não é recomendação de investimento.' });
        }
      } catch { /* sem dados suficientes */ }
    }
    return lista;
  }

  function proximoHorario(p) {
    const d = new Date(); d.setHours(p.hora, 0, 0, 0);
    if (d.getTime() <= Date.now() + 60_000) return new Date(Date.now() + 60_000);
    return d;
  }

  function vencimentos(perfil, p) {
    const lista = [];
    if (!global.Calc || !Calc.calendarEvents) return lista;
    const hoje = hojeISO();
    const ym = hoje.slice(0, 7);
    [ym, somarMeses(ym, 1)].forEach((mes) => {
      const porDia = Calc.calendarEvents(mes, perfil) || {};
      Object.keys(porDia).forEach((dia) => {
        const data = mes + '-' + String(dia).padStart(2, '0');
        const falta = dias(hoje, data);
        if (falta < 0 || falta > 31) return;
        porDia[dia].filter((ev) => !ev.confirmado && (ev.tipo === 'due' || ev.tipo === 'out')).forEach((ev, i) => {
          [[1, 'amanhã'], [0, 'hoje']].forEach(([antes, palavra]) => {
            const quandoD = new Date(data + 'T00:00:00'); quandoD.setDate(quandoD.getDate() - antes); quandoD.setHours(p.hora, 0, 0, 0);
            if (quandoD.getTime() <= Date.now()) return;
            lista.push({ at: quandoD.toISOString(), canal: 'contas',
              titulo: p.detalhes ? ev.titulo + ' vence ' + palavra : (ev.tipo === 'due' ? 'Uma fatura' : 'Uma conta') + ' vence ' + palavra,
              corpo: p.detalhes ? brl(ev.valor) + ' · abra o OAZE para conferir ou marcar como paga.' : 'Abra o OAZE para ver os detalhes.',
              ordem: data + i });
          });
        });
      });
    });
    return lista;
  }

  function metas(perfil, p) {
    const lista = [];
    (perfil.goals || []).forEach((g) => {
      if (!g.deadline || !(g.target > 0) || (g.saved || 0) >= g.target) return;
      const aviso = new Date(g.deadline + 'T00:00:00'); aviso.setDate(aviso.getDate() - 7); aviso.setHours(p.hora, 0, 0, 0);
      if (aviso.getTime() <= Date.now() || dias(hojeISO(), g.deadline) > 60) return;
      lista.push({ at: aviso.toISOString(), canal: 'contas',
        titulo: p.detalhes ? 'Meta ' + g.name + ': faltam 7 dias' : 'Uma meta vence em 7 dias',
        corpo: p.detalhes ? 'Guardado ' + brl(g.saved || 0) + ' de ' + brl(g.target) + '.' : 'Abra o OAZE para ver o progresso.' });
    });
    return lista;
  }

  let assinaturaAgendada = '';
  const OazeAvisos = {
    prefs,
    async sincronizar() {
      const nativo = global.OAZE_NATIVE_NOTIFICATIONS;
      const c = contexto();
      if (!nativo || !c || c.demo || !c.profile) return;
      const p = prefs();
      const agendados = [];
      if (p.vencimentos) agendados.push(...vencimentos(c.profile, p));
      if (p.metas) agendados.push(...metas(c.profile, p));
      const ja = enviados();
      const novos = (await insights(c.profile, p)).filter((x) => !ja[x.chave]);
      const slot = proximoHorario(p).toISOString();
      novos.slice(0, 3).forEach((x) => { agendados.push({ at: slot, canal: x.canal, titulo: x.titulo, corpo: x.corpo }); ja[x.chave] = hojeISO(); });
      agendados.sort((a, b) => a.at.localeCompare(b.at));
      const itens = agendados.slice(0, 60).map((x, i) => ({ id: 3100000 + i, at: x.at, title: x.titulo, body: x.corpo, channel: x.canal }));
      const assinatura = JSON.stringify(itens);
      if (assinatura === assinaturaAgendada) return;
      await nativo.schedule(itens);
      assinaturaAgendada = assinatura;
      /* Guarda as chaves só depois de agendar, e esquece as com mais de 60 dias. */
      const limite = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
      Object.keys(ja).forEach((k) => { if (ja[k] < limite) delete ja[k]; });
      armazenado.gravar('oaze.avisos.enviados', ja);
    },
    /* Lista dentro da folha de notificações (funciona também no site). */
    listaInsights() {
      const html = (ultimosInsights || []).map((x) => '<div class="v3-notification-item oz-insight"><span class="oz-insight-marca" aria-hidden="true">•</span><span><strong>' + esc(x.titulo) + '</strong><small>' + esc(x.texto || x.corpo) + '</small></span></div>').join('');
      return html ? '<span class="v3-label v3-section-title">INSIGHTS</span><div class="v3-notification-list">' + html + '</div>' : '';
    },
    preferencias() {
      const p = prefs();
      const caixa = (k, rot, sub) => '<label class="oz-pref"><input type="checkbox" name="' + k + '"' + (p[k] ? ' checked' : '') + '><span><strong>' + esc(rot) + '</strong><small>' + esc(sub) + '</small></span></label>';
      const horas = [7, 8, 9, 10, 12, 18, 20].map((h) => '<option value="' + h + '"' + (p.hora === h ? ' selected' : '') + '>' + String(h).padStart(2, '0') + ':00</option>').join('');
      const d = dialogo('escolher avisos',
        '<p>Escolha o que o OAZE avisa neste aparelho. Os avisos são criados a partir dos seus dados quando o app é aberto.</p>'
        + '<fieldset class="oz-prefs"><legend>Contas</legend>'
        + caixa('vencimentos', 'Vencimentos', 'Na véspera e no dia: "conta X vence amanhã"')
        + caixa('metas', 'Metas', '7 dias antes do prazo de uma meta')
        + '</fieldset><fieldset class="oz-prefs"><legend>Complementares</legend>'
        + caixa('orcamento', 'Orçamento', 'Ao passar de 80% e de 100% de uma categoria')
        + caixa('score', 'Score OAZE', 'Quando o seu score subir')
        + caixa('dolar', 'Dólar do dia', 'Cotação comercial do Banco Central, uma vez por dia')
        + caixa('dicas', 'Dicas', 'Conteúdo educativo sobre reserva e juros; nunca indicação de produto')
        + '</fieldset><fieldset class="oz-prefs"><legend>Privacidade</legend>'
        + caixa('detalhes', 'Mostrar nomes e valores', 'Desligado: o aviso diz só "uma conta vence amanhã"')
        + '<label class="oz-pref-hora">Horário dos avisos<select name="hora">' + horas + '</select></label></fieldset>'
        + '<div class="v3-estado-actions"><button type="submit" class="v3-secondary">Cancelar</button><button type="button" class="v3-primary" data-oz-salvar-avisos>Salvar</button></div>',
        'Escolher avisos');
      d.querySelector('[data-oz-salvar-avisos]').addEventListener('click', async () => {
        const f = d.querySelector('form');
        const novo = { hora: Number(f.elements.hora.value) || 9 };
        Object.keys(PREF_PADRAO).forEach((k) => { if (k !== 'hora') novo[k] = !!(f.elements[k] && f.elements[k].checked); });
        armazenado.gravar('oaze.avisos.prefs', novo);
        assinaturaAgendada = '';
        d.close();
        try { await OazeAvisos.sincronizar(); avisar('Avisos atualizados.'); }
        catch { avisar('Preferências salvas. Ative as notificações para recebê-las.'); }
      });
    }
  };
  let ultimosInsights = [];
  async function calcularInsights() {
    const c = contexto();
    if (!c || c.demo || !c.profile) { ultimosInsights = []; return; }
    try { ultimosInsights = await insights(c.profile, Object.assign({}, prefs(), { dolar: true, dicas: true, orcamento: true })); } catch { ultimosInsights = []; }
  }

  /* =============================================================
     PERMISSÕES
     ============================================================= */
  async function consultar(nome) {
    try {
      if (!navigator.permissions || !navigator.permissions.query) return 'perguntar';
      const r = await navigator.permissions.query({ name: nome });
      return r.state === 'granted' ? 'permitida' : r.state === 'denied' ? 'negada' : 'perguntar';
    } catch { return 'perguntar'; }
  }
  const ITENS = [
    { id: 'notificacoes', nome: 'Notificações', por: 'Vencimentos na véspera e no dia, orçamento, metas, score e dólar. Você escolhe quais em "Escolher avisos".',
      async estado() {
        const n = global.OAZE_NATIVE_NOTIFICATIONS;
        if (n && n.status) { const s = await n.status().catch(() => 'prompt'); return s === 'granted' ? 'permitida' : s === 'denied' ? 'negada' : 'perguntar'; }
        if (!('Notification' in global)) return 'indisponível';
        return Notification.permission === 'granted' ? 'permitida' : Notification.permission === 'denied' ? 'negada' : 'perguntar';
      },
      async pedir() {
        const n = global.OAZE_NATIVE_NOTIFICATIONS;
        if (n) { const ok = await n.request().catch(() => false); if (ok) { try { localStorage.setItem('oaze.native.reminders', 'yes'); } catch {} await OazeAvisos.sincronizar().catch(() => {}); } return; }
        if ('Notification' in global) await Notification.requestPermission();
      } },
    { id: 'localizacao', nome: 'Localização', por: 'Opcional. Guarda o local de uma compra quando você toca em "Usar minha localização" (arredondado a ~100 m). Nunca em segundo plano.',
      estado: () => consultar('geolocation'),
      pedir: () => new Promise((ok) => navigator.geolocation ? navigator.geolocation.getCurrentPosition(() => ok(), () => ok(), { timeout: 15000, maximumAge: 600000 }) : ok()) },
    { id: 'microfone', nome: 'Microfone', por: 'Conversa por voz com a Coco. Fica ligado só durante a conversa.',
      estado: () => consultar('microphone'),
      async pedir() { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); s.getTracks().forEach((t) => t.stop()); } },
    { id: 'camera', nome: 'Câmera', por: 'Foto de recibo para a Coco ler. Só quando você escolhe anexar uma foto.',
      estado: () => consultar('camera'),
      async pedir() { const s = await navigator.mediaDevices.getUserMedia({ video: true }); s.getTracks().forEach((t) => t.stop()); } }
  ];
  const OazePermissoes = {
    async abrir() {
      const estados = await Promise.all(ITENS.map((i) => i.estado().catch(() => 'perguntar')));
      const bio = global.OAZE_NATIVE_BIOMETRICS;
      const linhas = ITENS.map((item, n) => {
        const e = estados[n];
        const acao = e === 'permitida' ? '' : e === 'negada'
          ? '<small class="oz-perm-dica">Negada. Para liberar: Configurações do aparelho › Apps › OAZE › Permissões.</small>'
          : e === 'indisponível' ? '' : '<button type="button" class="v3-secondary" data-oz-permitir="' + item.id + '">Permitir</button>';
        return '<div class="oz-perm"><div><strong>' + esc(item.nome) + '</strong><span class="oz-chip oz-chip-' + e.replace('í', 'i') + '">' + esc(e) + '</span></div><p>' + esc(item.por) + '</p>' + acao + '</div>';
      }).join('')
        + '<div class="oz-perm"><div><strong>Biometria</strong><span class="oz-chip">' + (bio ? (bio.isEnabled() ? 'ativada' : 'desativada') : 'no app') + '</span></div><p>Desbloquear o OAZE com digital, rosto ou o bloqueio do aparelho. O PIN do cofre continua valendo.</p>'
        + (bio ? '<button type="button" class="v3-secondary" data-action="biometric-toggle">' + (bio.isEnabled() ? 'Desativar' : 'Ativar') + '</button>' : '') + '</div>'
        + '<div class="oz-perm"><div><strong>Anúncios</strong><span class="oz-chip">' + (plano() === 'free' ? 'plano Semente' : 'sem anúncios') + '</span></div><p>No plano Semente do app Android, o anúncio só aparece quando você escolhe assistir para liberar lançamentos. O Google pode usar o ID de publicidade do aparelho; você pode redefini-lo ou desativar a personalização nas configurações do Android.</p></div>';
      const d = dialogo('permissões do aparelho', '<p>O OAZE pede cada acesso só no momento de uso. Nada aqui é obrigatório para usar o app.</p><div class="oz-perms">' + linhas + '</div>'
        + '<div class="v3-estado-actions">' + (global.OAZE_NATIVE_NOTIFICATIONS ? '<button type="button" class="v3-secondary" data-oz-escolher-avisos>Escolher avisos</button>' : '') + '<button type="submit" class="v3-primary">Fechar</button></div>', 'Permissões do aparelho');
      d.addEventListener('click', async (ev) => {
        const alvo = ev.target.closest('[data-oz-permitir]');
        if (alvo) {
          const item = ITENS.find((i) => i.id === alvo.dataset.ozPermitir);
          alvo.disabled = true;
          try { await item.pedir(); } catch { /* recusada no diálogo do sistema */ }
          d.close(); OazePermissoes.abrir();
        }
        if (ev.target.closest('[data-oz-escolher-avisos]')) { d.close(); OazeAvisos.preferencias(); }
        if (ev.target.closest('[data-action="biometric-toggle"]')) d.close();
      });
    }
  };

  /* =============================================================
     LOCAL DA COMPRA E MODO VIAGEM
     ============================================================= */
  const FUSOS_BR = /^America\/(Sao_Paulo|Bahia|Fortaleza|Recife|Belem|Manaus|Cuiaba|Campo_Grande|Boa_Vista|Porto_Velho|Rio_Branco|Maceio|Araguaina|Santarem|Noronha|Eirunepe)$/;
  function fusoAtual() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { return ''; } }
  function emViagem() { const f = fusoAtual(); return !!f && !FUSOS_BR.test(f); }
  const mapa = (l) => 'https://www.openstreetmap.org/?mlat=' + l.lat + '&mlon=' + l.lng + '#map=17/' + l.lat + '/' + l.lng;
  function blocoLocal(form) {
    if (form.querySelector('[data-oz-local]')) return;
    const id = form.elements.id ? String(form.elements.id.value || '') : '';
    let existente = null;
    try { existente = id && global.Store && Store.transactions && Store.transactions.get(id) ? Store.transactions.get(id).local || null : null; } catch { existente = null; }
    const estrangeiras = (() => {
      const c = contexto();
      if (!c || !c.profile) return [];
      return (c.profile.accounts || []).concat(c.profile.cards || []).filter((x) => x.moeda && x.moeda !== 'BRL' && !x.archived && !x.hidden);
    })();
    const viagem = emViagem()
      ? '<p class="oz-viagem" role="note">Seu aparelho está no fuso ' + esc(fusoAtual()) + ', fora do Brasil. '
        + (estrangeiras.length ? 'Para lançar na moeda local, escolha ' + esc(estrangeiras.slice(0, 2).map((x) => x.name + ' (' + x.moeda + ')').join(' ou ')) + ' em "conta/cartão".'
          : 'Para lançar em outra moeda, cadastre uma conta ou cartão nessa moeda na carteira.') + '</p>'
      : '';
    const html = '<div class="oz-local" data-oz-local>'
      + '<input type="hidden" name="local" value="' + esc(existente ? JSON.stringify(existente) : '') + '">'
      + '<div class="oz-local-cabeca"><span>Local da compra <small>opcional</small></span>'
      + '<span data-oz-local-estado>' + (existente ? 'Salvo · <a href="' + esc(mapa(existente)) + '" target="_blank" rel="noopener noreferrer">ver no mapa</a>' : 'Não registrado') + '</span></div>'
      + '<div class="oz-local-acoes"><button type="button" class="v3-secondary" data-oz-local-usar>Usar minha localização</button>'
      + '<button type="button" class="v3-link" data-oz-local-remover' + (existente ? '' : ' hidden') + '>Remover</button></div>'
      + viagem + '</div>';
    const enviar = form.querySelector('button[type="submit"]');
    const ancora = enviar ? enviar.closest('.v3-form-actions, .v3-sheet-actions, div') : null;
    if (ancora && ancora.parentElement === form) ancora.insertAdjacentHTML('beforebegin', html);
    else form.insertAdjacentHTML('beforeend', html);
  }
  document.addEventListener('click', (ev) => {
    const usar = ev.target.closest('[data-oz-local-usar]');
    const remover = ev.target.closest('[data-oz-local-remover]');
    if (!usar && !remover) return;
    const bloco = ev.target.closest('[data-oz-local]');
    const campo = bloco.querySelector('input[name="local"]');
    const estado = bloco.querySelector('[data-oz-local-estado]');
    const botaoRemover = bloco.querySelector('[data-oz-local-remover]');
    if (remover) { campo.value = ''; estado.textContent = 'Não registrado'; botaoRemover.hidden = true; return; }
    if (!navigator.geolocation) { estado.textContent = 'Localização indisponível neste aparelho.'; return; }
    usar.disabled = true; estado.textContent = 'Procurando…';
    navigator.geolocation.getCurrentPosition((pos) => {
      const l = { lat: Math.round(pos.coords.latitude * 1000) / 1000, lng: Math.round(pos.coords.longitude * 1000) / 1000 };
      campo.value = JSON.stringify(l);
      estado.innerHTML = 'Registrado · <a href="' + esc(mapa(l)) + '" target="_blank" rel="noopener noreferrer">ver no mapa</a>';
      botaoRemover.hidden = false; usar.disabled = false;
    }, (erro) => {
      estado.textContent = erro && erro.code === 1 ? 'Permissão negada. Você pode liberar em Permissões do aparelho.' : 'Não foi possível obter a localização.';
      usar.disabled = false;
    }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 });
  });
  new MutationObserver(() => {
    const form = document.getElementById('v3-form-tx');
    if (form) blocoLocal(form);
  }).observe(document.body, { childList: true, subtree: true });

  /* =============================================================
     LIGAÇÕES COM O PAINEL
     ============================================================= */
  let estadoPagina = 'home';
  document.addEventListener('oaze:render', (ev) => {
    const pagina = ev.detail && ev.detail.page;
    estadoPagina = pagina;
    if (pagina === 'coco' || pagina === 'settings') { inserirCoco(pagina); void atualizarCoco(false); }
    if (pagina === 'plan' || pagina === 'settings') {
      const view = document.getElementById('v3-view');
      const html = OazeAnuncios.painel();
      if (view && html && !view.querySelector('[data-oz-anuncio]')) {
        if (pagina === 'plan') view.insertAdjacentHTML('afterbegin', html);
        else { const alvo = view.querySelector('[data-oz-coco-uso], .v3-settings-extra'); if (alvo) alvo.insertAdjacentHTML('beforebegin', html); else view.insertAdjacentHTML('beforeend', html); }
      }
    }
  });
  document.addEventListener('click', (ev) => {
    const anuncio = ev.target.closest('[data-action="assistir-anuncio"]');
    if (anuncio) { ev.preventDefault(); void OazeAnuncios.assistir(anuncio); return; }
    if (ev.target.closest('[data-action="avisos-preferencias"]')) {
      ev.preventDefault();
      const fechar = document.querySelector('#v3-overlay:not([hidden]) [data-action="close"]');
      if (fechar) fechar.click();
      OazeAvisos.preferencias();
    }
  });
  /* Insights para a folha de notificações e agenda ao voltar ao app. */
  function aoAbrir() {
    void calcularInsights();
    try { if (localStorage.getItem('oaze.native.reminders') === 'yes') void OazeAvisos.sincronizar().catch(() => {}); } catch { /* sem armazenamento */ }
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) aoAbrir(); });
  setTimeout(aoAbrir, 4000);

  global.OazeAnuncios = OazeAnuncios;
  global.OazeAvisos = OazeAvisos;
  global.OazePermissoes = OazePermissoes;
  global.OazeRecursos = { emViagem, fusoAtual, painelCoco };
})(window);
