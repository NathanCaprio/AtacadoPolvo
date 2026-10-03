/**
 * Atacado Polvo: botão "Enviar pelo WhatsApp" do carrinho lateral (snippets/sidecart.html).
 * Monta a mensagem com os itens da gaveta e abre o WhatsApp da loja; o "Finalizar pedido"
 * continua indo para o checkout da Tray. Acento no código vai como %XX: a Tray serve o JS sem
 * UTF-8 e "Olá" literal chega como "OlÃ¡".
 */
(function () {
  function texto(el) {
    return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
  }

  function montarMensagem() {
    var linhas = [decodeURIComponent('Ol%C3%A1! Gostaria de fazer o pedido abaixo:'), ''];
    var itens = document.querySelectorAll('#sidecart .box-cart');

    itens.forEach(function (item) {
      var nome = texto(item.querySelector('.info-product .name')) || 'Produto';
      var variacao = texto(item.querySelector('.info-product .variants'));
      var qtd = texto(item.querySelector('.info-product .quantity-value')) || '1';
      var preco = texto(item.querySelector('.info-product .line-down .price'));

      var linha = '- ' + qtd + 'x ' + nome;
      if (variacao) linha += ' (' + variacao + ')';
      if (preco) linha += decodeURIComponent(' %E2%80%94 ') + preco + ' cada';
      linhas.push(linha);
    });

    var subtotal = texto(document.querySelector('#sidecart .footer-cart .total .value'));
    if (subtotal) {
      linhas.push('');
      linhas.push('Subtotal: ' + subtotal);
    }

    return linhas.join('\n');
  }

  document.addEventListener('click', function (event) {
    var botao = event.target.closest && event.target.closest('#sidecart .polvo-cart-wpp');
    if (!botao) return;

    // No editor de temas o clique abre o modal de pré-visualização.
    if (botao.dataset.openModal === 'editor') return;

    // Carrinho vazio: segue o link puro (conversa sem mensagem).
    if (!document.querySelector('#sidecart .box-cart')) return;

    event.preventDefault();
    var url = 'https://wa.me/' + botao.dataset.number + '?text=' + encodeURIComponent(montarMensagem());
    window.open(url, '_blank', 'noopener');
  });
})();
