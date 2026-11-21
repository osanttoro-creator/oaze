/* =============================================================
   turma-abertura.js — a abertura do app
   -------------------------------------------------------------
   Duas situações, uma cortina só (div#tm-abertura, no topo do body):

   1. PRIMEIRA VEZ neste aparelho: toca a abertura completa, com a
      OAZE e a turma saindo do telefone (o mesmo motion do site, em
      vídeo com fundo transparente). Dá para pular. Toca uma vez só.

   2. DEPOIS DISSO: uma cortina rápida com a OAZE correndo, que fica
      na frente enquanto o app monta a tela. Some quando o conteúdo
      de verdade aparece (mínimo de 0,7 s para não piscar; no máximo
      6 s, para uma falha de rede nunca prender ninguém aqui).

   Este arquivo é carregado logo depois da cortina, sem defer, para
   que a decisão aconteça antes da primeira pintura do resto.
   ============================================================= */
(function (global) {
  'use strict';

  var doc = document;
  var cortina = doc.getElementById('tm-abertura');
  if (!cortina) return;

  var CHAVE = 'oaze.turma.abertura';
  var MINIMO = 700;
  var MAXIMO = 6000;
  var nasceu = Date.now();
  var menosMov = global.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var jaViu = true;
  try { jaViu = localStorage.getItem(CHAVE) === '1'; } catch (e) { /* sem armazenamento: cortina rápida */ }

  var idioma = (doc.documentElement.getAttribute('data-idioma') || 'pt').slice(0, 2);
  var TEXTO = {
    pt: { titulo: 'Seu dinheiro tem uma <em>turma</em> do seu lado.', sub: 'A OAZE chegou com Nilo, Bia, Tico e Lume.', seguir: 'Começar', pular: 'Pular', carregando: 'Arrumando a casa…' },
    en: { titulo: 'Your money has a <em>crew</em> on its side.', sub: 'OAZE is here with Nilo, Bia, Tico and Lume.', seguir: 'Start', pular: 'Skip', carregando: 'Tidying up…' },
    fr: { titulo: 'Votre argent a une <em>bande</em> à ses côtés.', sub: 'OAZE arrive avec Nilo, Bia, Tico et Lume.', seguir: 'Commencer', pular: 'Passer', carregando: 'On range tout…' },
    es: { titulo: 'Tu dinero tiene una <em>pandilla</em> de su lado.', sub: 'OAZE llegó con Nilo, Bia, Tico y Lume.', seguir: 'Empezar', pular: 'Saltar', carregando: 'Ordenando todo…' }
  };
  var T = TEXTO[idioma] || TEXTO.pt;

  var pronto = false;      /* o app já tem tela de verdade */
  var liberado = jaViu;    /* a abertura completa já terminou (ou nem tocou) */
  var fechada = false;

  function fecha() {
    if (fechada) return;
    fechada = true;
    cortina.classList.add('tm-some');
    setTimeout(function () { if (cortina.parentNode) cortina.parentNode.removeChild(cortina); }, 600);
    try { global.dispatchEvent(new CustomEvent('oaze:abertura-fim')); } catch (e) { /* navegador antigo */ }
  }
  function tenta() {
    if (!pronto || !liberado) return;
    var falta = MINIMO - (Date.now() - nasceu);
    setTimeout(fecha, Math.max(0, falta));
  }

  /* ---------- 1 · primeira vez: abertura completa ---------- */
  function completa() {
    cortina.classList.add('tm-cheia');
    cortina.innerHTML = '';
    var pular = doc.createElement('button');
    pular.type = 'button'; pular.className = 'tm-abertura-pular'; pular.textContent = T.pular;
    var filme = doc.createElement('div');
    filme.className = 'tm-abertura-filme';
    var poster = doc.createElement('img');
    poster.src = '/assets/turma/abertura/poster.webp'; poster.alt = '';
    filme.appendChild(poster);
    var h1 = doc.createElement('h1');
    h1.innerHTML = T.titulo;            /* texto fixo deste arquivo, sem dado de fora */
    var p = doc.createElement('p');
    p.textContent = T.sub;
    cortina.appendChild(pular); cortina.appendChild(filme); cortina.appendChild(h1); cortina.appendChild(p);

    var encerrou = false;
    function termina() {
      if (encerrou) return;
      encerrou = true;
      try { localStorage.setItem(CHAVE, '1'); } catch (e) { /* segue */ }
      liberado = true;
      MINIMO = 0;
      tenta();
      if (!pronto) {                    /* app ainda montando: vira a cortina rápida */
        pular.remove();
        p.textContent = T.carregando;
      }
    }
    function oferece() {                /* fim do vídeo: botão grande para seguir */
      if (encerrou || cortina.querySelector('.tm-abertura-seguir')) return;
      var seguir = doc.createElement('button');
      seguir.type = 'button'; seguir.className = 'tm-abertura-seguir'; seguir.textContent = T.seguir;
      seguir.addEventListener('click', termina);
      cortina.appendChild(seguir);
      pular.remove();
      try { seguir.focus({ preventScroll: true }); } catch (e) { /* segue */ }
    }
    pular.addEventListener('click', termina);

    if (menosMov) { oferece(); return; }
    var video = doc.createElement('video');
    video.muted = true; video.autoplay = true; video.playsInline = true;
    video.setAttribute('playsinline', ''); video.setAttribute('muted', '');
    video.src = '/assets/turma/abertura/abertura.webm';
    video.addEventListener('playing', function () { poster.style.opacity = '0'; });
    video.addEventListener('ended', oferece);
    video.addEventListener('error', oferece);
    filme.appendChild(video);
    var toque = video.play();
    if (toque && toque.catch) toque.catch(oferece);
    setTimeout(oferece, 11000);         /* o vídeo tem 9,5 s; isto é só a rede de segurança */
  }

  /* ---------- 2 · quando o app tem tela de verdade ---------- */
  function vigia() {
    var view = doc.getElementById('v3-view');
    if (!view) { pronto = true; MINIMO = 0; tenta(); return; }   /* páginas sem o painel (entrar) */
    function confere() {
      if (pronto) return;
      if (view.children.length && !view.querySelector('.v3-skeleton')) { pronto = true; olho.disconnect(); tenta(); }
    }
    var olho = new MutationObserver(confere);
    olho.observe(view, { childList: true, subtree: true });
    confere();
  }

  if (!jaViu) completa();
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', vigia); else vigia();
  setTimeout(function () { pronto = true; if (liberado) fecha(); }, MAXIMO);
})(window);
