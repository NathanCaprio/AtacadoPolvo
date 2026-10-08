/* Atacado Polvo: compra direto do cartão de produto (snippets/product.html).
   - Seletor de quantidade (.polvo-qtd): botões -/+ e campo digitável (1 a 999); Enter adiciona.
   - "Adicionar" põe a quantidade escolhida pela mesma API que o carrinho lateral usa
     (/web_api/cart/), mostra "Adicionado" no botão, volta a quantidade para 1 e abre o
     carrinho lateral clicando no ícone do cabeçalho (que já faz overlay + recarga da lista).
   Se a API recusar (sem estoque, pedido inválido...), segue o link para a página do produto.
   Sem acento no texto: a Tray serve o JS sem UTF-8. */
(function () {
  'use strict';

  var MIN = 1;
  var MAX = 999;
  var ocupado = {};

  function abrirCarrinho() {
    var icone = document.querySelector('.cart-header');
    if (icone) icone.click();
  }

  function limitar(n) {
    n = parseInt(n, 10);
    if (isNaN(n) || n < MIN) return MIN;
    return n > MAX ? MAX : n;
  }

  function campoDe(el) {
    var compra = el.closest('.polvo-compra');
    return compra ? compra.querySelector('.polvo-qtd__campo') : null;
  }

  function definir(campo, n) {
    n = limitar(n);
    campo.value = n;
    var botoes = campo.parentNode.querySelectorAll('.polvo-qtd__botao');
    botoes[0].disabled = n <= MIN;
    botoes[1].disabled = n >= MAX;
  }

  function adicionar(botao) {
    var produto = botao.getAttribute('data-produto');
    var variante = botao.getAttribute('data-variante') || '';
    var chave = produto + '-' + variante;
    if (ocupado[chave]) return;
    ocupado[chave] = true;

    var campo = campoDe(botao);
    var qtd = campo ? limitar(campo.value) : 1;
    if (campo) definir(campo, qtd);

    var item = {
      session_id: document.documentElement.getAttribute('data-session'),
      product_id: produto,
      quantity: qtd
    };
    if (variante) item.variant_id = variante;

    var texto = botao.querySelector('.polvo-adicionar__texto') || botao;
    var original = texto.textContent;
    botao.classList.add('is-carregando');
    texto.textContent = 'Adicionando...';

    fetch('/web_api/cart/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ Cart: item })
    })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        botao.classList.remove('is-carregando');
        botao.classList.add('is-adicionado');
        texto.textContent = 'Adicionado';
        if (campo) definir(campo, 1);
        abrirCarrinho();
        setTimeout(function () {
          botao.classList.remove('is-adicionado');
          texto.textContent = original;
        }, 1800);
      })
      .catch(function (erro) {
        console.error('Erro ao adicionar ao carrinho:', erro);
        window.location.href = botao.href;
      })
      .then(function () {
        delete ocupado[chave];
        botao.classList.remove('is-carregando');
      });
  }

  document.addEventListener('click', function (e) {
    if (!e.target.closest) return;

    var passo = e.target.closest('.polvo-qtd__botao');
    if (passo) {
      e.preventDefault();
      var campo = campoDe(passo);
      if (campo) definir(campo, limitar(campo.value) + parseInt(passo.getAttribute('data-qtd'), 10));
      return;
    }

    var botao = e.target.closest('.polvo-adicionar');
    if (!botao) return;
    e.preventDefault();
    adicionar(botao);
  });

  document.addEventListener('change', function (e) {
    if (e.target.classList && e.target.classList.contains('polvo-qtd__campo')) definir(e.target, e.target.value);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || !e.target.classList || !e.target.classList.contains('polvo-qtd__campo')) return;
    e.preventDefault();
    var compra = e.target.closest('.polvo-compra');
    var botao = compra && compra.querySelector('.polvo-adicionar');
    if (botao) adicionar(botao);
  });

  // Ao focar o campo, seleciona o número para digitar por cima (no celular é o mais comum).
  document.addEventListener('focusin', function (e) {
    if (e.target.classList && e.target.classList.contains('polvo-qtd__campo')) e.target.select();
  });
})();
