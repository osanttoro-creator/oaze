/* =============================================================
   site.js — o pouco de comportamento que a página precisa
   -------------------------------------------------------------
   Quatro coisas: o menu do celular, a linha do cabeçalho ao rolar,
   a revelação dos blocos e o alternador mensal/anual dos planos.

   Sem JavaScript a página continua inteira e legível — a classe
   `anima` no <html> é escrita no <head> justamente para que o CSS
   só esconda o que este arquivo sabe revelar. O preço mensal é o
   que está no HTML, então quem chega sem script vê um preço certo,
   não um espaço vazio.
   ============================================================= */
(function () {
  'use strict';

  /* ---------------- menu do celular ---------------- */

  var topo = document.getElementById('topo');
  var botao = topo && topo.querySelector('.hamburguer');

  if (topo && botao) {
    var fechar = function () {
      topo.classList.remove('aberto');
      botao.setAttribute('aria-expanded', 'false');
      botao.setAttribute('aria-label', 'Abrir menu');
    };

    botao.addEventListener('click', function () {
      var aberto = topo.classList.toggle('aberto');
      botao.setAttribute('aria-expanded', aberto ? 'true' : 'false');
      botao.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
    });

    /* Escolher um destino fecha o menu: ele cobre o topo da página,
       e ficar aberto sobre a seção recém-aberta é uma porta que não
       se fecha sozinha. */
    topo.addEventListener('click', function (ev) {
      if (ev.target.closest && ev.target.closest('.menu a') && topo.classList.contains('aberto')) fechar();
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && topo.classList.contains('aberto')) { fechar(); botao.focus(); }
    });
  }

  /* ---------------- a linha do cabeçalho ---------------- */

  /* O cabeçalho é de vidro e nasce sem borda: a linha só entra
     quando há conteúdo passando por baixo. Antes disso ela seria um
     traço separando o nada. */
  if (topo) {
    var marcar = function () { topo.classList.toggle('rolou', window.scrollY > 8); };
    marcar();
    window.addEventListener('scroll', marcar, { passive: true });
  }

  /* ---------------- mensal × anual ----------------
     Os dois preços moram no HTML, em data-mensal e data-anual. O
     script só troca qual está à mostra: assim não existe um preço
     que só o JavaScript conhece, e o que aparece sem script é o
     mensal, que é o principal. */

  var ciclo = document.querySelector('.ciclo');
  if (ciclo) {
    var botoes = ciclo.querySelectorAll('button[data-ciclo]');
    ciclo.addEventListener('click', function (ev) {
      var b = ev.target.closest && ev.target.closest('button[data-ciclo]');
      if (!b) return;
      var qual = b.dataset.ciclo;
      Array.prototype.forEach.call(botoes, function (x) {
        x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
      });
      document.querySelectorAll('[data-mensal][data-anual]').forEach(function (n) {
        n.textContent = qual === 'anual' ? n.dataset.anual : n.dataset.mensal;
      });
    });
  }

  /* ---------------- revelar ao rolar ---------------- */

  var alvos = document.querySelectorAll('.revela');
  if (!alvos.length) return;

  var querMenos = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!('IntersectionObserver' in window) || querMenos) {
    Array.prototype.forEach.call(alvos, function (n) { n.classList.add('visivel'); });
    return;
  }

  var observador = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (e) {
      if (!e.isIntersecting) return;
      /* Escalonamento curto entre irmãos: o bloco inteiro entrando
         de uma vez lê como salto, não como chegada. */
      var irmaos = e.target.parentElement ? e.target.parentElement.children : [e.target];
      var i = Array.prototype.indexOf.call(irmaos, e.target);
      e.target.style.transitionDelay = Math.min(i, 4) * 70 + 'ms';
      e.target.classList.add('visivel');
      observador.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });

  Array.prototype.forEach.call(alvos, function (n) { observador.observe(n); });
})();
