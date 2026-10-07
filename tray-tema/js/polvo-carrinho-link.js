/* Atacado Polvo: link de carrinho (snippets/sidecart.html).
   - "Copiar link do carrinho" lê a gaveta pela API da Tray e gera
     /?carrinho=produto:qtd,produto-variacao:qtd (no celular abre o compartilhar do aparelho).
   - Quem abre o link recebe os itens no próprio carrinho e a gaveta abre sozinha.
     Item que já está no carrinho só completa até a quantidade do link, então abrir
     o link duas vezes não dobra o pedido. Kits e "compre junto" não entram no link.
   Acento vai como \uXXXX: a Tray serve o JS sem UTF-8. */
(function () {
  'use strict';

  var PARAMETRO = 'carrinho';
  var MAX_ITENS = 60;
  var MAX_QTD = 9999;

  var t = decodeURIComponent;

  function sessao() {
    return document.documentElement.getAttribute('data-session');
  }

  function variacao(v) {
    return v && String(v) !== '0' ? String(v) : '';
  }

  function chave(produto, variante) {
    return produto + '-' + variacao(variante);
  }

  function lerCarrinho() {
    return fetch('/web_api/cart/' + sessao(), { credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (lista) {
        return (Array.isArray(lista) ? lista : []).map(function (l) {
          return {
            produto: String(l.Cart.product_id),
            variante: variacao(l.Cart.variant_id),
            qtd: parseInt(l.Cart.quantity, 10) || 0
          };
        });
      });
  }

  function adicionar(item, qtd) {
    var corpo = { session_id: sessao(), product_id: item.produto, quantity: qtd };
    if (item.variante) corpo.variant_id = item.variante;
    return fetch('/web_api/cart/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ Cart: corpo })
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
    });
  }

  function abrirCarrinho() {
    var icone = document.querySelector('.cart-header');
    if (icone) icone.click();
  }

  function avisar(texto, tempo) {
    var el = document.querySelector('.polvo-cart-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'polvo-cart-toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = texto;
    el.classList.add('is-visivel');
    clearTimeout(el._timer);
    if (tempo) el._timer = setTimeout(function () { el.classList.remove('is-visivel'); }, tempo);
  }

  /* ---- Gerar o link -------------------------------------------------- */

  function montarLink(itens) {
    var partes = itens.filter(function (i) { return i.qtd > 0; }).map(function (i) {
      return i.produto + (i.variante ? '-' + i.variante : '') + ':' + i.qtd;
    });
    return window.location.origin + '/?' + PARAMETRO + '=' + partes.join(',');
  }

  function copiar(texto) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(texto);
    return new Promise(function (ok, falha) {
      var campo = document.createElement('textarea');
      campo.value = texto;
      campo.setAttribute('readonly', '');
      campo.className = 'polvo-cart-copia';
      document.body.appendChild(campo);
      campo.select();
      var deu = false;
      try { deu = document.execCommand('copy'); } catch (e) { deu = false; }
      document.body.removeChild(campo);
      if (deu) ok(); else falha(new Error('copia recusada'));
    });
  }

  function celular() {
    return window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  }

  document.addEventListener('click', function (e) {
    var botao = e.target.closest && e.target.closest('#sidecart .polvo-cart-link');
    if (!botao) return;
    e.preventDefault();
    if (botao.dataset.openModal === 'editor' || botao.classList.contains('is-carregando')) return;

    var rotulo = botao.querySelector('span');
    var original = rotulo.textContent;
    function voltar(texto) {
      rotulo.textContent = texto;
      setTimeout(function () { rotulo.textContent = original; }, 2500);
    }

    botao.classList.add('is-carregando');
    lerCarrinho()
      .then(function (itens) {
        if (!itens.length) { voltar('Carrinho vazio'); return; }
        var link = montarLink(itens);
        if (celular() && navigator.share) {
          return navigator.share({ title: 'Carrinho Atacado Polvo', url: link })
            .catch(function (erro) {
              if (erro && erro.name === 'AbortError') return;
              return copiar(link).then(function () { voltar('Link copiado!'); });
            });
        }
        return copiar(link).then(function () { voltar('Link copiado!'); });
      })
      .catch(function (erro) {
        console.error('Erro ao gerar link do carrinho:', erro);
        voltar(t('N%C3%A3o deu para copiar'));
      })
      .then(function () { botao.classList.remove('is-carregando'); });
  });

  /* ---- Abrir o link -------------------------------------------------- */

  function lerParametro() {
    var bruto = new URLSearchParams(window.location.search).get(PARAMETRO);
    if (!bruto) return [];
    var vistos = {};
    var itens = [];
    bruto.split(',').forEach(function (parte) {
      var m = /^(\d{1,12})(?:-(\d{1,12}))?:(\d{1,5})$/.exec(parte.trim());
      if (!m || itens.length >= MAX_ITENS) return;
      var item = { produto: m[1], variante: variacao(m[2]), qtd: Math.min(parseInt(m[3], 10), MAX_QTD) };
      var k = chave(item.produto, item.variante);
      if (item.qtd < 1 || vistos[k]) return;
      vistos[k] = true;
      itens.push(item);
    });
    return itens;
  }

  function limparUrl() {
    var url = new URL(window.location.href);
    url.searchParams.delete(PARAMETRO);
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }

  function receber() {
    if (!new URLSearchParams(window.location.search).has(PARAMETRO)) return;
    var pedidos = lerParametro();
    limparUrl();
    if (!pedidos.length || !sessao()) return;

    avisar('Montando seu carrinho...');
    var falhas = 0;

    lerCarrinho()
      .catch(function () { return []; })
      .then(function (atuais) {
        var tem = {};
        atuais.forEach(function (i) { tem[chave(i.produto, i.variante)] = i.qtd; });
        // Um por vez: a API da Tray se perde com POSTs simultâneos na mesma sessão.
        return pedidos.reduce(function (fila, item) {
          return fila.then(function () {
            var falta = item.qtd - (tem[chave(item.produto, item.variante)] || 0);
            if (falta < 1) return;
            return adicionar(item, falta).catch(function (erro) {
              console.error('Item do link recusado:', item, erro);
              falhas++;
            });
          });
        }, Promise.resolve());
      })
      .then(function () {
        abrirCarrinho();
        if (falhas) {
          avisar(falhas + (falhas > 1 ? t(' itens do link n%C3%A3o puderam ser adicionados')
            : t(' item do link n%C3%A3o p%C3%B4de ser adicionado')) + t(' (sem estoque ou indispon%C3%ADvel).'), 7000);
        } else {
          avisar(t('Pronto! Os itens est%C3%A3o no seu carrinho.'), 3500);
        }
      });
  }

  if (document.readyState === 'complete') receber();
  else window.addEventListener('load', receber);
})();
