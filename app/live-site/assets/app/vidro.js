/* =============================================================
   vidro.js — liga ou desliga o vidro (20/11/2026)
   -------------------------------------------------------------
   O vidro do tema C2b usa backdrop-filter, que custa caro em
   aparelho modesto: cada painel translúcido obriga o sistema a
   desfocar o que está atrás, a cada quadro. Num celular de 4 GB
   isso aparece como rolagem travada.

   Três coisas decidem, nesta ordem:
     1. a escolha da pessoa, em Configurações → Aparência;
     2. o aparelho (pouca memória ou poucos núcleos);
     3. o padrão: vidro ligado.

   A classe vai no <html> antes da primeira pintura, para a tela
   não nascer com vidro e perdê-lo um instante depois.
   ============================================================= */
(function (global) {
  'use strict';
  var CHAVE = 'oaze.vidro';
  var raiz = document.documentElement;

  function escolha() {
    try { return localStorage.getItem(CHAVE); } catch (e) { return null; }
  }

  /* Memória e núcleos são dicas, não promessa: muitos navegadores
     não contam, e aí o padrão vale. 4 GB é o corte porque abaixo
     disso o WebView do Android já divide memória com o resto. */
  function aparelhoModesto() {
    var mem = Number(global.navigator && global.navigator.deviceMemory) || 0;
    var cpu = Number(global.navigator && global.navigator.hardwareConcurrency) || 0;
    return (mem > 0 && mem <= 4) || (cpu > 0 && cpu <= 4);
  }

  function aplicar() {
    var quer = escolha();
    var leve = quer === 'leve' || (quer !== 'cheio' && aparelhoModesto());
    raiz.classList.toggle('vidro-leve', leve);
    return leve;
  }

  var Vidro = {
    aplicar: aplicar,
    /* 'cheio', 'leve' ou null para voltar ao automático. */
    definir: function (modo) {
      try {
        if (modo === null) localStorage.removeItem(CHAVE);
        else localStorage.setItem(CHAVE, modo === 'leve' ? 'leve' : 'cheio');
      } catch (e) { /* sem armazenamento: vale só nesta sessão */ }
      return aplicar();
    },
    estaLeve: function () { return raiz.classList.contains('vidro-leve'); },
    modo: function () { return escolha() || 'auto'; }
  };

  aplicar();
  global.OazeVidro = Vidro;
})(window);
