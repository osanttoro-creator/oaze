/* O OAZE usa apenas armazenamento necessário nesta versão.
   Não há analytics, publicidade ou personalização opcional para consentir.
   Se isso mudar, documentar finalidade e fornecedores e pedir consentimento
   específico antes de carregar qualquer tecnologia opcional. */
(function () {
  'use strict';
  function aplicar() {
    document.documentElement.setAttribute('data-oaze-cookies', 'recusados');
    window.dispatchEvent(new CustomEvent('oaze:preferencias-cookies', {
      detail: { opcionais: false }
    }));
    var aviso = document.querySelector('.aviso-cookies');
    if (aviso) aviso.remove();
  }
  window.OazeCookies = {
    respondido: function () { return 'recusados'; },
    registrar: aplicar,
    mostrar: aplicar
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', aplicar, { once: true });
  } else aplicar();
})();
