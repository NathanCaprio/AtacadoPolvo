 /**
 * Redireciona o "Fechar pedido" do sidecart para o WhatsApp com os itens do carrinho,
 * em vez de seguir para o checkout nativo da Tray.
 */
(function () {
  function onlyDigits(value) {
    return (value || '').replace(/\D/g, '');
  }

  function buildOrderMessage() {
    var lines = ['Olá! Gostaria de fechar o pedido abaixo:', ''];
    var items = document.querySelectorAll('#sidecart .box-cart');

    items.forEach(function (item, index) {
      var nameEl = item.querySelector('.info-product a');
      var qtyEl = item.querySelector('.info-product .qnt');
      var priceEl = item.querySelector('.info-product .price');
      var variantsEl = item.querySelector('.info-product .variants');

      var name = nameEl ? nameEl.textContent.trim() : 'Produto';
      var qty = qtyEl ? qtyEl.textContent.trim() : '';
      var price = priceEl ? priceEl.textContent.trim() : '';
      var variants = variantsEl ? variantsEl.textContent.trim() : '';

      var line = (index + 1) + '. ' + name;
      if (variants) line += ' (' + variants + ')';
      if (qty) line += ' - ' + qty;
      if (price) line += ' - ' + price;

      lines.push(line);
    });

    var subtotalEl = document.querySelector('#sidecart .footer-cart .text-info .value');
    if (subtotalEl && subtotalEl.textContent.trim()) {
      lines.push('');
      lines.push('Subtotal: ' + subtotalEl.textContent.trim());
    }

    return lines.join('\n');
  }

  function handleCheckoutClick(event) {
    var trigger = event.target.closest('#sidecart .footer-cart a.buy');
    if (!trigger) return;

    // Dentro do editor de temas o clique deve abrir o modal de preview, não redirecionar.
    if (trigger.dataset.openModal === 'editor') return;

    var numberEl = document.querySelector('.whatsapp-checkout-number');
    var number = numberEl ? onlyDigits(numberEl.dataset.number) : '';

    // Sem WhatsApp cadastrado na loja, mantém o link original (checkout nativo).
    if (!number) return;

    var items = document.querySelectorAll('#sidecart .box-cart');
    if (!items.length) return;

    event.preventDefault();

    var message = buildOrderMessage();
    var url = 'https://wa.me/55' + number + '?text=' + encodeURIComponent(message);
    window.location.href = url;
  }

  document.addEventListener('click', handleCheckoutClick);
})();
