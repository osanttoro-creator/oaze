/* =============================================================
   gestos.js — menu de ações (action sheet) e deslizar nas linhas
   (10/11/2026)

   MENU DE AÇÕES
     OazeGestos.acoes({ titulo, texto, opcoes: [{ rotulo, detalhe,
       icone, tom: 'perigo' | 'atual', ao }], cancelar })
     No celular sobe de baixo, com o polegar alcançando tudo; no
     computador abre no meio da tela. Uma pergunta, poucas respostas,
     e "Cancelar" sempre separado das escolhas.

   DESLIZAR
     OazeGestos.deslizar(linha, { direita, esquerda })
       direita:  { rotulo, icone, tom, ao }  — puxar para a direita e
                 soltar depois do limite faz a ação na hora.
       esquerda: [{ rotulo, icone, tom, ao }] — puxar para a esquerda
                 deixa os botões à mostra; um toque escolhe.
     Só responde ao dedo (pointerType 'touch'): mouse e caneta seguem
     clicando como sempre. Nada aqui é o único caminho para uma ação:
     tudo que o deslizar faz também existe num botão visível.
   ============================================================= */
(function (global) {
  'use strict';
  const doc = global.document;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduzir = () => global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- menu de ações ---------------- */
  let aberto = null;

  function fecharAcoes(devolverFoco = true) {
    if (!aberto) return;
    const { raiz, antes, aoTecla } = aberto;
    aberto = null;
    doc.removeEventListener('keydown', aoTecla, true);
    raiz.classList.remove('is-aberto');
    const sair = () => raiz.remove();
    if (reduzir()) sair(); else setTimeout(sair, 180);
    if (devolverFoco && antes && antes.isConnected) antes.focus({ preventScroll: true });
  }

  function acoes(cfg) {
    fecharAcoes(false);
    const opcoes = (cfg && cfg.opcoes || []).filter(Boolean);
    if (!opcoes.length) return;
    const raiz = doc.createElement('div');
    raiz.className = 'oz-acoes';
    raiz.innerHTML = '<div class="oz-acoes-fundo" data-oz-acao-fechar></div>'
      + '<div class="oz-acoes-caixa" role="dialog" aria-modal="true" aria-labelledby="oz-acoes-titulo">'
      + '<div class="oz-acoes-grupo">'
      + (cfg.titulo ? '<div class="oz-acoes-cabeca"><strong id="oz-acoes-titulo">' + esc(cfg.titulo) + '</strong>' + (cfg.texto ? '<small>' + esc(cfg.texto) + '</small>' : '') + '</div>' : '<span id="oz-acoes-titulo" hidden>Ações</span>')
      + opcoes.map((o, i) => '<button type="button" class="oz-acoes-op' + (o.tom ? ' is-' + esc(o.tom) : '') + '" data-oz-acao="' + i + '"'
        + (o.tom === 'atual' ? ' aria-current="true"' : '') + '>'
        + (o.icone ? '<span class="oz-acoes-ic" aria-hidden="true">' + o.icone + '</span>' : '')
        + '<span class="oz-acoes-txt"><strong>' + esc(o.rotulo) + '</strong>' + (o.detalhe ? '<small>' + esc(o.detalhe) + '</small>' : '') + '</span>'
        + (o.tom === 'atual' ? '<span class="oz-acoes-marca" aria-hidden="true">✓</span>' : '')
        + '</button>').join('')
      + '</div>'
      + '<button type="button" class="oz-acoes-cancelar" data-oz-acao-fechar>' + esc(cfg.cancelar || 'Cancelar') + '</button>'
      + '</div>';
    doc.body.appendChild(raiz);
    const antes = doc.activeElement;
    const aoTecla = (ev) => {
      if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); fecharAcoes(); return; }
      if (ev.key === 'Tab') {
        const foco = [...raiz.querySelectorAll('button')];
        const i = foco.indexOf(doc.activeElement);
        if (ev.shiftKey && i <= 0) { ev.preventDefault(); foco[foco.length - 1].focus(); }
        else if (!ev.shiftKey && i === foco.length - 1) { ev.preventDefault(); foco[0].focus(); }
      }
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        const foco = [...raiz.querySelectorAll('button')];
        const i = foco.indexOf(doc.activeElement);
        ev.preventDefault();
        foco[(i + (ev.key === 'ArrowDown' ? 1 : -1) + foco.length) % foco.length].focus();
      }
    };
    raiz.addEventListener('click', (ev) => {
      if (ev.target.closest('[data-oz-acao-fechar]')) { fecharAcoes(); return; }
      const b = ev.target.closest('[data-oz-acao]');
      if (!b) return;
      const op = opcoes[Number(b.dataset.ozAcao)];
      fecharAcoes(false);
      if (op && typeof op.ao === 'function') op.ao();
    });
    doc.addEventListener('keydown', aoTecla, true);
    aberto = { raiz, antes, aoTecla };
    requestAnimationFrame(() => {
      raiz.classList.add('is-aberto');
      (raiz.querySelector('[aria-current="true"]') || raiz.querySelector('.oz-acoes-op')).focus({ preventScroll: true });
    });
  }

  /* ---------------- deslizar ---------------- */
  const LIMIAR_DIREITA = 88;   // px para disparar a ação da direita
  const LARGURA_BOTAO = 78;    // px de cada botão revelado à esquerda
  let linhaAberta = null;

  function fecharLinha(embrulho) {
    const alvo = embrulho || linhaAberta;
    if (!alvo) return;
    alvo.classList.remove('is-aberta', 'is-arrastando');
    alvo.style.setProperty('--oz-dx', '0px');
    if (alvo === linhaAberta) linhaAberta = null;
  }

  function deslizar(linha, cfg) {
    if (!linha || linha.closest('.oz-desliza') || !cfg) return;
    const esquerda = (cfg.esquerda || []).filter(Boolean);
    const direita = cfg.direita || null;
    if (!esquerda.length && !direita) return;
    const estilo = global.getComputedStyle(linha);
    const embrulho = doc.createElement('div');
    embrulho.className = 'oz-desliza';
    embrulho.style.setProperty('--oz-raio', estilo.borderRadius);
    embrulho.style.setProperty('--oz-margem', estilo.marginBottom);
    const fundo = doc.createElement('div');
    fundo.className = 'oz-desliza-fundo';
    fundo.setAttribute('aria-hidden', 'true');
    fundo.innerHTML = (direita ? '<div class="oz-desliza-dir is-' + esc(direita.tom || 'ok') + '"><span>' + (direita.icone || '') + esc(direita.rotulo) + '</span></div>' : '<div></div>')
      + '<div class="oz-desliza-esq">' + esquerda.map((o, i) => '<button type="button" tabindex="-1" class="is-' + esc(o.tom || 'neutro') + '" data-oz-desliza="' + i + '">' + (o.icone || '') + '<span>' + esc(o.rotulo) + '</span></button>').join('') + '</div>';
    linha.parentNode.insertBefore(embrulho, linha);
    embrulho.append(fundo, linha);
    const maxEsquerda = esquerda.length * LARGURA_BOTAO;

    let inicioX = 0, inicioY = 0, base = 0, dx = 0, eixo = '', id = null;
    const aplicar = (v) => { dx = v; embrulho.style.setProperty('--oz-dx', v + 'px'); embrulho.classList.toggle('is-alem', direita && v >= LIMIAR_DIREITA); };

    linha.addEventListener('pointerdown', (ev) => {
      if (ev.pointerType !== 'touch' || id !== null) return;
      if (linhaAberta && linhaAberta !== embrulho) fecharLinha();
      id = ev.pointerId; inicioX = ev.clientX; inicioY = ev.clientY; eixo = '';
      base = embrulho.classList.contains('is-aberta') ? -maxEsquerda : 0;
    });
    linha.addEventListener('pointermove', (ev) => {
      if (ev.pointerId !== id) return;
      const mx = ev.clientX - inicioX, my = ev.clientY - inicioY;
      if (!eixo) {
        if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
        eixo = Math.abs(mx) > Math.abs(my) * 1.2 ? 'x' : 'y';
        if (eixo === 'x') { embrulho.classList.add('is-arrastando'); try { linha.setPointerCapture(id); } catch (e) { /* segue sem captura */ } }
      }
      if (eixo !== 'x') return;
      let v = base + mx;
      if (!direita) v = Math.min(0, v);
      if (!esquerda.length) v = Math.max(0, v);
      // resistência depois do fim, como borracha
      if (v < -maxEsquerda) v = -maxEsquerda + (v + maxEsquerda) * 0.25;
      if (v > LIMIAR_DIREITA * 1.6) v = LIMIAR_DIREITA * 1.6 + (v - LIMIAR_DIREITA * 1.6) * 0.25;
      aplicar(v);
    });
    const soltar = (ev) => {
      if (ev.pointerId !== id) return;
      id = null;
      embrulho.classList.remove('is-arrastando');
      if (eixo !== 'x') { eixo = ''; return; }
      eixo = '';
      // um arrasto não vira clique na linha
      linha.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); }, { capture: true, once: true });
      if (direita && dx >= LIMIAR_DIREITA) {
        aplicar(0); embrulho.classList.remove('is-alem');
        if (global.navigator.vibrate) { try { global.navigator.vibrate(10); } catch (e) { /* sem vibração */ } }
        direita.ao();
        return;
      }
      if (esquerda.length && dx <= -maxEsquerda * 0.45) {
        aplicar(-maxEsquerda); embrulho.classList.add('is-aberta'); linhaAberta = embrulho;
        fundo.querySelectorAll('button').forEach((b) => b.removeAttribute('tabindex'));
      } else {
        fecharLinha(embrulho);
        fundo.querySelectorAll('button').forEach((b) => b.setAttribute('tabindex', '-1'));
      }
    };
    linha.addEventListener('pointerup', soltar);
    linha.addEventListener('pointercancel', soltar);
    fundo.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-oz-desliza]');
      if (!b) return;
      const op = esquerda[Number(b.dataset.ozDesliza)];
      fecharLinha(embrulho);
      if (op && typeof op.ao === 'function') op.ao();
    });
  }

  // toque fora de uma linha aberta fecha a linha
  doc.addEventListener('pointerdown', (ev) => {
    if (linhaAberta && !linhaAberta.contains(ev.target)) fecharLinha();
  }, true);

  global.OazeGestos = { acoes, fecharAcoes, deslizar, fecharLinha };
})(window);
