/* Atacado Polvo: botão "Adicionar ao carrinho" do cartão de produto (snippets/product.html).
   Adiciona 1 unidade pela mesma API que o carrinho lateral usa (/web_api/cart/) e abre o
   carrinho lateral clicando no ícone do cabeçalho, que já faz overlay + recarga da lista.
   Se a API recusar (sem estoque, pedido inválido...), segue o link para a página do produto. */
(function () {
  'use strict';

  var ocupado = {};

  function abrirCarrinho() {
    var icone = document.querySelector('.cart-header');
    if (icone) icone.click();
  }

  document.addEventListener('click', function (e) {
    var botao = e.target.closest && e.target.closest('.polvo-adicionar');
    if (!botao) return;
    e.preventDefault();

    var produto = botao.getAttribute('data-produto');
    var variante = botao.getAttribute('data-variante') || '';
    var chave = produto + '-' + variante;
    if (ocupado[chave]) return;
    ocupado[chave] = true;

    var item = {
      session_id: document.documentElement.getAttribute('data-session'),
      product_id: produto,
      quantity: 1
    };
    if (variante) item.variant_id = variante;

    var texto = botao.textContent;
    botao.classList.add('is-carregando');
    botao.textContent = 'Adicionando...';

    fetch('/web_api/cart/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ Cart: item })
    })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        abrirCarrinho();
      })
      .catch(function (erro) {
        console.error('Erro ao adicionar ao carrinho:', erro);
        window.location.href = botao.href;
      })
      .then(function () {
        delete ocupado[chave];
        botao.classList.remove('is-carregando');
        botao.textContent = texto;
      });
  });
})();
