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

  /* "Produtos visualizados": a Tray (js/page-product.js, appendVisited) apaga o carrossel vazio do
     snippet e insere outro no fim da .section-products-history, fora do .container. Aqui: some com
     as setas que ficaram do carrossel apagado, devolve o novo ao lugar dele (alinhado ao titulo) e
     da a cada cartao um "Ver produto" (o HTML da Tray nao traz o id para comprar direto). */
  function arrumarVistos(secao) {
    secao.querySelectorAll('.polvo-carrossel').forEach(function (caixa) {
      if (!caixa.querySelector('.swiper-container')) caixa.remove();
    });
    var lugar = secao.querySelector('.products-history-wrapper');
    var solto = secao.querySelector(':scope > .swiper-container');
    if (lugar && solto) {
      lugar.appendChild(solto);
      if (solto.swiper) solto.swiper.update();
    }
    secao.querySelectorAll('.product').forEach(function (cartao) {
      if (cartao.querySelector('.actions')) return;
      var link = cartao.querySelector('a[href]');
      if (!link) return;
      var acoes = document.createElement('div');
      acoes.className = 'actions';
      acoes.innerHTML = '<a class="product-button polvo-ver-produto"></a>';
      acoes.firstChild.href = link.href;
      acoes.firstChild.textContent = 'Ver produto';
      cartao.appendChild(acoes);
    });
  }

  function montar() {
    var vistos = document.querySelector('.section-products-history');
    if (vistos) arrumarVistos(vistos);
    document.querySelectorAll('.list-slide .swiper-container').forEach(function (sc) {
      var lista = sc.querySelector('.list-product');
      // lista vazia = carrossel que ainda vai ser trocado pelo JS da Tray; setas so no definitivo
      if (!lista || !lista.children.length || sc.parentNode.classList.contains('polvo-carrossel')) return;
      var caixa = document.createElement('div');
      caixa.className = 'polvo-carrossel';
      sc.parentNode.insertBefore(caixa, sc);
      caixa.appendChild(sc);
      caixa.appendChild(botao('prev', 'Produtos anteriores', sc));
      caixa.appendChild(botao('next', 'Mais produtos', sc));
    });
    travar();
  }

  /* Sem setas quando todos os cartoes cabem (ex.: 1 produto visualizado). O swiper do tema
     nasce depois deste script, por isso confere de novo em seguida e a cada resize. */
  function travar() {
    document.querySelectorAll('.polvo-carrossel').forEach(function (caixa) {
      var sw = caixa.querySelector('.swiper-container');
      sw = sw && sw.swiper;
      if (sw) caixa.classList.toggle('sem-setas', sw.isBeginning && sw.isEnd);
    });
  }

  function iniciar() {
    montar();
    // "Produtos visualizados" é montado depois, pela API (js/page-product.js).
    var vistos = document.querySelector('.section-products-history');
    if (vistos && window.MutationObserver) new MutationObserver(montar).observe(vistos, { childList: true });
    setTimeout(travar, 600);
    setTimeout(travar, 2000);
    window.addEventListener('resize', travar);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
