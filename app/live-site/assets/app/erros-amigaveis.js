/* =============================================================
   erros-amigaveis.js — nenhum erro técnico chega ao cliente (07/11/2026)

   1. Qualquer erro de script que escape (window "error" e promessa
      rejeitada sem tratamento) vira um aviso curto em português, no
      máximo um a cada 10 s. O detalhe técnico fica só no console.
   2. Mensagens técnicas que algum trecho do app mande para o aviso
      (TypeError, "Failed to fetch", erro do banco, código HTTP...) são
      trocadas por uma frase que a pessoa entende.
   3. Se o painel não chegou a desenhar a primeira tela e houve erro,
      aparece uma tela de "algo deu errado" com botão para tentar de
      novo — em vez de esqueleto eterno ou tela em branco.
   ============================================================= */
(function (global) {
  'use strict';

  var TECNICO = /TypeError|ReferenceError|SyntaxError|RangeError|is not a function|is not defined|Cannot read prop|undefined|null\b|Unexpected token|JSON|violates|row-level|row level|PGRST|duplicate key|constraint|relation "|permission denied|\bstack\b|at [\w.$]+ \(|\b(HTTP|status|c[oó]digo)\s*[45]\d\d\b|ECONN|AbortError|Script error/i;
  var REDE = /Failed to fetch|NetworkError|Load failed|network|ERR_INTERNET|ERR_NETWORK|offline/i;
  var FRASE_REDE = 'Sem conexão com a internet agora. Confira a rede e tente de novo — seus dados estão salvos.';
  var FRASE_GERAL = 'Não foi possível concluir agora. Seus dados estão salvos — tente de novo em instantes.';

  function amigavel(texto) {
    var t = String(texto || '');
    if (!t) return t;
    if (REDE.test(t)) return FRASE_REDE;
    if (TECNICO.test(t)) return FRASE_GERAL;
    return t;
  }

  var ultimoAviso = 0, houveErro = false;
  function avisar(texto) {
    var el = document.getElementById('v3-toast');
    if (!el) return;
    var agora = Date.now();
    if (agora - ultimoAviso < 10000) return;
    ultimoAviso = agora;
    el.textContent = texto;
    el.hidden = false;
    clearTimeout(avisar.t);
    avisar.t = setTimeout(function () { el.hidden = true; }, 5000);
  }

  /* 1. erros que escaparam */
  function capturou(detalhe) {
    houveErro = true;
    try { console.error('[OAZE] erro capturado:', detalhe); } catch (e) { /* sem console */ }
    var msg = detalhe && (detalhe.message || detalhe.reason && detalhe.reason.message || detalhe.reason) || '';
    avisar(REDE.test(String(msg)) ? FRASE_REDE : 'Algo não funcionou nesta tela. Seus dados estão salvos — se continuar, recarregue o app.');
    setTimeout(telaDeErroSePreciso, 0);
  }
  global.addEventListener('error', function (ev) {
    /* imagem ou ícone que não carregou não é falha do app; script é */
    if (ev && ev.target && ev.target !== global && ev.target.tagName) {
      if (ev.target.tagName !== 'SCRIPT') return;
      capturou({ message: 'script não carregou: ' + (ev.target.src || '') });
      return;
    }
    capturou(ev && (ev.error || ev));
  }, true);
  global.addEventListener('unhandledrejection', function (ev) { capturou(ev); });

  /* 2. mensagens técnicas que chegam ao aviso */
  function vigiarAviso() {
    var el = document.getElementById('v3-toast');
    if (!el || el.dataset.ozVigiado) return;
    el.dataset.ozVigiado = '1';
    new MutationObserver(function () {
      var atual = el.textContent, nova = amigavel(atual);
      if (nova !== atual) el.textContent = nova;
    }).observe(el, { childList: true, characterData: true, subtree: true });
  }

  /* 3. painel que não abriu */
  function telaDeErroSePreciso() {
    var vista = document.getElementById('v3-view');
    if (!houveErro || !vista || !vista.querySelector('.v3-skeleton') || vista.querySelector('.oz-erro-tela')) return;
    vista.innerHTML = '<section class="oz-erro-tela" role="alert" style="max-width:420px;margin:12vh auto;padding:28px 22px;text-align:center;border-radius:24px;background:rgba(240,229,207,.05);border:1px solid rgba(240,229,207,.12)">'
      + '<h2 style="margin:0 0 10px;font-size:22px">Algo deu errado ao abrir o OAZE.</h2>'
      + '<p style="margin:0 0 18px;opacity:.8">Seus dados estão salvos na sua conta. Tente abrir de novo; se continuar, fale com o suporte em oaze.site/suporte.</p>'
      + '<button type="button" class="v3-primary" style="min-height:44px;padding:0 22px" data-oz-recarregar>Tentar de novo</button>'
      + '</section>';
    var b = vista.querySelector('[data-oz-recarregar]');
    if (b) { b.addEventListener('click', function () { global.location.reload(); }); b.focus(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vigiarAviso, { once: true });
  else vigiarAviso();
  /* se depois de 15 s ainda só tem o esqueleto e houve erro, mostra a tela */
  setTimeout(telaDeErroSePreciso, 15000);

  global.OazeErros = { amigavel: amigavel };
})(window);
