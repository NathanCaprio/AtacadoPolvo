/* Atacado Polvo: setas (anterior/próximo) nas vitrines em carrossel.
   Vale para todo .list-slide com lista de produtos (Mais vendidos, Novidades, relacionados,
   visualizados). O swiper é do tema (js/slider-product.js); aqui só embrulha o
   .swiper-container num .polvo-carrossel e põe dois botões que chamam slidePrev/slideNext.
   CSS em polvo.css ("Setas das vitrines"). Sem acento no texto: a Tray serve o JS sem UTF-8. */
(function () {
  'use strict';

  function botao(lado, rotulo, sc) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'polvo-seta polvo-seta--' + lado;
    b.setAttribute('aria-label', rotulo);
    b.innerHTML = '<span class="icon icon-arrow-' + lado + '" aria-hidden="true"></span>';
    b.addEventListener('click', function () {
      var sw = sc.swiper;
      if (!sw) return;
      if (lado === 'prev') sw.slidePrev(); else sw.slideNext();
    });
    return b;
  }

  function montar() {
    document.querySelectorAll('.list-slide .swiper-container').forEach(function (sc) {
      if (!sc.querySelector('.list-product') || sc.parentNode.classList.contains('polvo-carrossel')) return;
      var caixa = document.createElement('div');
      caixa.className = 'polvo-carrossel';
      sc.parentNode.insertBefore(caixa, sc);
      caixa.appendChild(sc);
      caixa.appendChild(botao('prev', 'Produtos anteriores', sc));
      caixa.appendChild(botao('next', 'Mais produtos', sc));
    });
  }

  function iniciar() {
    montar();
    // "Produtos visualizados" é montado depois, pela API (js/page-product.js).
    var vistos = document.querySelector('.section-products-history');
    if (vistos && window.MutationObserver) new MutationObserver(montar).observe(vistos, { childList: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
