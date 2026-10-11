/* Atacado Polvo: compra direto do cartão de produto (snippets/product.html).
   - Seletor de quantidade (.polvo-qtd): botões -/+ e campo digitável (1 até o max do campo,
     que o snippet põe no estoque, ou 999); Enter adiciona.
   - "Adicionar" põe a quantidade escolhida pela mesma API que o carrinho lateral usa
     (/web_api/cart/), mostra "Adicionado" no botão, volta a quantidade para 1 e abre o
     carrinho lateral clicando no ícone do cabeçalho (que já faz overlay + recarga da lista).
   - Estoque insuficiente (400 da Tray): aviso embaixo do cartão, sem sair da página.
     Outra recusa (sem sessão, erro de rede...): segue o link para a página do produto.
   - O data-session do <html> a Tray preenche por JS logo depois de abrir a página: clique
     muito rápido espera por ele (até 3 s).
   Acento só como escape \u00xx: a Tray serve o JS sem UTF-8. */
(function () {
  'use strict';

  var MIN = 1;
  var MAX = 999;
  var ocupado = {};

  function abrirCarrinho() {
    var icone = document.querySelector('.cart-header');
    if (icone) icone.click();
  }

  function maxDe(campo) {
    var m = parseInt(campo && campo.max, 10);
    return isNaN(m) || m < MIN || m > MAX ? MAX : m;
  }

  function limitar(n, max) {
    n = parseInt(n, 10);
    if (isNaN(n) || n < MIN) return MIN;
    return n > max ? max : n;
  }

  function campoDe(el) {
    var compra = el.closest('.polvo-compra');
    return compra ? compra.querySelector('.polvo-qtd__campo') : null;
  }

  function unidades(n) {
    return n + (n === 1 ? ' unidade' : ' unidades');
  }

  // Digitou acima do estoque: o campo volta para o máximo e o cartão avisa.
  function definir(campo, n) {
    var max = maxDe(campo);
    var pedido = parseInt(n, 10);
    n = limitar(n, max);
    if (max < MAX && pedido > max) avisar(campo, 'Temos s\u00f3 ' + unidades(max) + ' em estoque.');
    campo.value = n;
    var botoes = campo.parentNode.querySelectorAll('.polvo-qtd__botao');
    botoes[0].disabled = n <= MIN;
    botoes[1].disabled = n >= max;
  }

  function sessao() {
    return new Promise(function (resolve) {
      var inicio = Date.now();
      (function ver() {
        var s = document.documentElement.getAttribute('data-session');
        if (s || Date.now() - inicio > 3000) resolve(s || '');
        else setTimeout(ver, 100);
      })();
    });
  }

  function avisar(el, msg) {
    var compra = el.closest('.polvo-compra');
    if (!compra) return;
    var aviso = compra.querySelector('.polvo-compra__aviso');
    if (!aviso) {
      aviso = document.createElement('p');
      aviso.className = 'polvo-compra__aviso';
      aviso.setAttribute('role', 'status');
      compra.appendChild(aviso);
    }
    aviso.textContent = msg;
    clearTimeout(aviso._timer);
    aviso._timer = setTimeout(function () { aviso.remove(); }, 6000);
  }

  // Lê o motivo da recusa: {"causes":["O estoque do produto é insuficiente..."]}
  function motivo(r) {
    return r.text().then(function (t) {
      try {
        var c = JSON.parse(t).causes;
        return JSON.stringify(c || '');
      } catch (e) { return t; }
    });
  }

  function adicionar(botao) {
    var produto = botao.getAttribute('data-produto');
    var variante = botao.getAttribute('data-variante') || '';
    var chave = produto + '-' + variante;
    if (ocupado[chave]) return;
    ocupado[chave] = true;

    var campo = campoDe(botao);
    var qtd = campo ? limitar(campo.value, maxDe(campo)) : 1;
    if (campo) definir(campo, campo.value);

    var texto = botao.querySelector('.polvo-adicionar__texto') || botao;
    var original = texto.textContent;
    botao.classList.add('is-carregando');
    texto.textContent = 'Adicionando...';

    sessao()
      .then(function (s) {
        if (!s) throw new Error('sem data-session');
        var item = { session_id: s, product_id: produto, quantity: qtd };
        if (variante) item.variant_id = variante;
        return fetch('/web_api/cart/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ Cart: item })
        });
      })
      .then(function (r) {
        if (r.ok) {
          botao.classList.remove('is-carregando');
          botao.classList.add('is-adicionado');
          texto.textContent = 'Adicionado';
          if (campo) definir(campo, 1);
          abrirCarrinho();
          setTimeout(function () {
            botao.classList.remove('is-adicionado');
            texto.textContent = original;
          }, 1800);
          return;
        }
        return motivo(r).then(function (m) {
          if (r.status === 400 && /estoque/i.test(m)) {
            texto.textContent = original;
            var max = maxDe(campo);
            avisar(botao, max < MAX
              ? 'Temos s\u00f3 ' + unidades(max) + ' em estoque, somando o que j\u00e1 est\u00e1 no carrinho.'
              : 'N\u00e3o temos estoque para essa quantidade. Tente um n\u00famero menor.');
            return;
          }
          throw new Error('HTTP ' + r.status + ' ' + m);
        });
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
      if (campo) definir(campo, limitar(campo.value, maxDe(campo)) + parseInt(passo.getAttribute('data-qtd'), 10));
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
