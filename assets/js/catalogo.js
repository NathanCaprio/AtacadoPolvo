/* =========================================================================
   ATACADO POLVO - Catalogo
   Filtro por categoria, busca, ordenacao e lista de orcamento.
   A lista de orcamento fica em localStorage e vira uma mensagem de
   WhatsApp. Quando o backend existir, troque enviarOrcamento() por um
   POST em /api/orcamentos.
   ========================================================================= */
(function () {
  'use strict';

  const $  = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  const grid = $('#prod-grid');
  if (!grid || !window.CATALOGO) return;

  const { categorias, produtos } = window.CATALOGO;
  const corDe = id => (categorias.find(c => c.id === id) || {}).cor || '#7B2FE3';
  const nomeDe = id => (categorias.find(c => c.id === id) || {}).nome || '';

  const estado = { cat: 'todos', busca: '', ordem: 'relevancia' };

  // Quem está logado, quando há backend. Decide se o convite para criar
  // conta aparece depois do envio — oferecer conta a quem já tem é ruído.
  let clienteAtual = null;

  /* ---- Lista de orcamento (localStorage) -------------------------------- */
  const CHAVE = 'ap-orcamento';
  let lista = [];
  try { lista = JSON.parse(localStorage.getItem(CHAVE)) || []; } catch (e) { lista = []; }

  const salvar = () => {
    try { localStorage.setItem(CHAVE, JSON.stringify(lista)); } catch (e) { /* modo privado */ }
  };

  /* ---- Filtros da barra lateral ----------------------------------------- */
  function montarFiltros() {
    const ul = $('#filtro-cats');
    if (!ul) return;

    const itens = [{ id: 'todos', nome: 'Todos os produtos' }].concat(categorias);
    ul.innerHTML = itens.map(c => {
      const n = c.id === 'todos' ? produtos.length : produtos.filter(p => p.cat === c.id).length;
      return `<li><button class="filter-btn${c.id === 'todos' ? ' is-active' : ''}" data-cat="${c.id}">
                <span>${c.nome}</span><span class="count">${n}</span>
              </button></li>`;
    }).join('');

    ul.addEventListener('click', e => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      estado.cat = btn.dataset.cat;
      $$('.filter-btn', ul).forEach(b => b.classList.toggle('is-active', b === btn));
      render();
    });
  }

  /* ---- Render do grid ---------------------------------------------------- */
  function filtrar() {
    const termo = estado.busca.trim().toLowerCase();
    let out = produtos.filter(p => {
      const okCat = estado.cat === 'todos' || p.cat === estado.cat;
      const okBusca = !termo ||
        p.nome.toLowerCase().includes(termo) ||
        p.desc.toLowerCase().includes(termo) ||
        nomeDe(p.cat).toLowerCase().includes(termo);
      return okCat && okBusca;
    });

    if (estado.ordem === 'az') out = out.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    if (estado.ordem === 'za') out = out.slice().sort((a, b) => b.nome.localeCompare(a.nome, 'pt-BR'));
    if (estado.ordem === 'categoria') out = out.slice().sort((a, b) => nomeDe(a.cat).localeCompare(nomeDe(b.cat), 'pt-BR'));
    return out;
  }

  function cardProduto(p) {
    const cor = corDe(p.cat);
    const tag = p.tag === 'mais-vendido' ? '<span class="prod-tag">Mais vendido</span>'
              : p.tag === 'novo' ? '<span class="prod-tag prod-tag--new">Novidade</span>' : '';
    const naLista = lista.some(i => i.id === p.id);

    return `<article class="prod">
      <div class="prod-art">${tag}${window.artProduto(p.art, cor)}</div>
      <div class="prod-body">
        <span class="prod-cat">${nomeDe(p.cat)}</span>
        <h3>${p.nome}</h3>
        <p class="prod-desc">${p.desc}</p>
        <div class="prod-meta">
          <span class="chip">${p.emb}</span>
          <span class="chip">${p.caixa}</span>
        </div>
        <div class="prod-foot">
          <button class="btn btn--sm ${naLista ? 'btn--ghost' : 'btn--primary'} btn--block" data-add="${p.id}">
            ${naLista ? 'Na lista' : 'Adicionar ao orçamento'}
          </button>
        </div>
      </div>
    </article>`;
  }

  function render() {
    const itens = filtrar();
    const contador = $('#result-count');

    if (contador) {
      contador.textContent = itens.length === 1
        ? '1 produto encontrado'
        : `${itens.length} produtos encontrados`;
    }

    grid.innerHTML = itens.length
      ? itens.map(cardProduto).join('')
      : `<div class="empty">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
           <h3>Nenhum produto encontrado</h3>
           <p>Tente outro termo ou selecione outra categoria.</p>
         </div>`;
  }

  /* ---- Drawer de orcamento ---------------------------------------------- */
  const drawer  = $('#drawer');
  const overlay = $('#overlay');
  const fab     = $('#quote-fab');

  const abrirDrawer = (abrir) => {
    if (!drawer) return;
    // Abrir sempre volta para a lista: quem acabou de enviar e adiciona
    // outro produto precisa ver a lista, não a confirmação do envio anterior.
    if (abrir) mostrarEnviado(false);
    drawer.classList.toggle('is-open', abrir);
    if (overlay) overlay.classList.toggle('is-open', abrir);
    document.body.style.overflow = abrir ? 'hidden' : '';
    drawer.setAttribute('aria-hidden', String(!abrir));
  };

  function atualizarFab() {
    if (!fab) return;
    const total = lista.reduce((s, i) => s + i.qtd, 0);
    fab.classList.toggle('is-visible', total > 0);
    const badge = $('.badge', fab);
    if (badge) badge.textContent = total;
  }

  function renderDrawer() {
    const body = $('#drawer-body');
    const foot = $('#drawer-foot');
    if (!body) return;

    if (!lista.length) {
      body.innerHTML = `<div class="empty" style="padding:48px 0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.5 11h10L20 7H6"/><circle cx="9" cy="19" r="1.6"/><circle cx="17" cy="19" r="1.6"/></svg>
          <h3>Sua lista está vazia</h3>
          <p>Adicione produtos do catálogo para montar um orçamento.</p>
        </div>`;
      if (foot) foot.style.display = 'none';
      return;
    }

    if (foot) foot.style.display = '';
    body.innerHTML = lista.map(i => {
      const p = produtos.find(x => x.id === i.id);
      if (!p) return '';
      return `<div class="qi">
        <div class="qi-art">${window.artProduto(p.art, corDe(p.cat))}</div>
        <div class="qi-info">
          <b>${p.nome}</b>
          <span>${p.caixa}</span>
        </div>
        <div class="qty">
          <button data-dec="${p.id}" aria-label="Diminuir quantidade">-</button>
          <span>${i.qtd}</span>
          <button data-inc="${p.id}" aria-label="Aumentar quantidade">+</button>
        </div>
      </div>`;
    }).join('');
  }

  function sincronizar() {
    salvar();
    atualizarFab();
    renderDrawer();
    render();
  }

  /* ---- Envio -------------------------------------------------------------- */

  /* Grava o pedido antes de abrir o WhatsApp, mas sem depender dele: o
     registro serve para a loja ver o que foi pedido mesmo quando a conversa
     não acontece. Se o backend estiver fora (ou a página aberta direto do
     disco), o erro é engolido e o WhatsApp abre igual — o caminho de venda
     não pode quebrar por causa do registro.                                 */
  function registrar(itens, contato) {
    if (!window.API) return Promise.resolve();
    return window.API.pedir('/api/orcamentos', {
      metodo: 'POST', corpo: contato ? { itens, contato } : { itens }
    }).catch(() => {});
  }

  /* Um campo só para WhatsApp e e-mail: pedir os dois separados dobraria o
     atrito de um formulário que já é opcional. Aqui a gente descobre qual
     é qual — o servidor valida de novo, de qualquer jeito. */
  function lerContato() {
    const caixa = $('#drawer-contato');
    if (!caixa || caixa.hidden) return null;

    const nome = ($('#oc-nome') || {}).value || '';
    const bruto = (($('#oc-tel') || {}).value || '').trim();
    if (!bruto) return null;

    const ehEmail = bruto.includes('@');
    const digitos = bruto.replace(/\D/g, '');

    // Nem e-mail plausível nem telefone com DDD: avisa em vez de engolir.
    if (!ehEmail && digitos.length < 10) {
      const campo = $('#oc-tel').closest('.field');
      campo.querySelector('.err').textContent =
        'Informe um WhatsApp com DDD ou um e-mail.';
      campo.classList.add('has-error');
      $('#oc-tel').focus();
      return false;
    }
    $('#oc-tel').closest('.field').classList.remove('has-error');

    return ehEmail
      ? { nome: nome.trim(), email: bruto }
      : { nome: nome.trim(), tel: bruto };
  }

  /* Alterna entre a lista e a confirmação dentro da gaveta. A lista NÃO é
     apagada: o pedido ainda não foi aceito pela loja, e quem fecha o
     WhatsApp sem enviar precisa reencontrar o que tinha montado. */
  function mostrarEnviado(mostrar) {
    const enviado = $('#drawer-enviado');
    const corpo = $('#drawer-body');
    const pe = $('#drawer-foot');
    if (!enviado) return;

    enviado.hidden = !mostrar;
    if (corpo) corpo.hidden = mostrar;
    if (pe) pe.hidden = mostrar;

    // O convite de conta só faz sentido para quem não tem uma. Sem backend
    // (HTML aberto do disco) ele nem aparece: levaria a uma tela que não
    // funciona.
    const convite = $('#enviado-conta');
    if (convite) convite.hidden = !(mostrar && window.API && !clienteAtual);
  }

  function enviarOrcamento() {
    const s = window.SITE || {};

    const itens = lista.map(i => {
      const p = produtos.find(x => x.id === i.id) || {};
      return { id: i.id, nome: p.nome || i.id, caixa: p.caixa || '', qtd: i.qtd };
    });

    const contato = lerContato();
    if (contato === false) return;          // o campo está preenchido e errado

    registrar(itens, contato);

    const linhas = itens.map(i => `• ${i.nome} — ${i.qtd}x (${i.caixa})`).join('\n');
    const msg = `Olá! Gostaria de um orçamento dos itens abaixo:\n\n${linhas}\n\nPedido mínimo: ${s.pedidoMinimo || ''}`;
    window.open(window.linkWhatsApp(msg), '_blank', 'noopener');

    mostrarEnviado(true);
  }

  /* ---- Eventos ------------------------------------------------------------ */
  grid.addEventListener('click', e => {
    const btn = e.target.closest('[data-add]');
    if (!btn) return;
    const id = btn.dataset.add;
    const item = lista.find(i => i.id === id);
    if (item) item.qtd += 1;
    else lista.push({ id, qtd: 1 });
    sincronizar();
    abrirDrawer(true);
  });

  const busca = $('#busca');
  if (busca) {
    let t;
    busca.addEventListener('input', e => {
      clearTimeout(t);
      t = setTimeout(() => { estado.busca = e.target.value; render(); }, 180);
    });
  }

  const ordem = $('#ordem');
  if (ordem) ordem.addEventListener('change', e => { estado.ordem = e.target.value; render(); });

  if (fab)     fab.addEventListener('click', () => abrirDrawer(true));
  if (overlay) overlay.addEventListener('click', () => abrirDrawer(false));
  const fechar = $('#drawer-close');
  if (fechar) fechar.addEventListener('click', () => abrirDrawer(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') abrirDrawer(false); });

  const enviar = $('#drawer-enviar');
  if (enviar) enviar.addEventListener('click', enviarOrcamento);

  /* Cliente logado não precisa digitar contato: o pedido já sai com dono.
     A caixa começa visível e some depois — e não o contrário — porque a
     consulta de sessão é assíncrona, e nascer escondida faria a caixa
     piscar na tela de quem não está logado. */
  if (window.API) {
    window.API.quemSou().then(c => {
      clienteAtual = c;
      const caixa = $('#drawer-contato');
      if (c && caixa) caixa.hidden = true;
    });
  }

  const voltar = $('#drawer-voltar');
  if (voltar) voltar.addEventListener('click', () => mostrarEnviado(false));

  const limpar = $('#drawer-limpar');
  if (limpar) limpar.addEventListener('click', () => {
    if (!lista.length || !confirm('Limpar toda a lista de orçamento?')) return;
    lista = [];
    sincronizar();
  });

  const body = $('#drawer-body');
  if (body) {
    body.addEventListener('click', e => {
      const inc = e.target.closest('[data-inc]');
      const dec = e.target.closest('[data-dec]');
      if (inc) {
        const i = lista.find(x => x.id === inc.dataset.inc);
        if (i) i.qtd += 1;
      } else if (dec) {
        const idx = lista.findIndex(x => x.id === dec.dataset.dec);
        if (idx > -1) {
          lista[idx].qtd -= 1;
          if (lista[idx].qtd <= 0) lista.splice(idx, 1);
        }
      } else return;
      sincronizar();
    });
  }

  /* ---- Categoria vinda da URL (?cat=cozinha) ------------------------------ */
  const url = new URLSearchParams(location.search);
  const catUrl = url.get('cat');
  if (catUrl && categorias.some(c => c.id === catUrl)) estado.cat = catUrl;

  /* ---- Boot --------------------------------------------------------------- */
  montarFiltros();
  if (estado.cat !== 'todos') {
    const b = $(`.filter-btn[data-cat="${estado.cat}"]`);
    if (b) {
      $$('.filter-btn').forEach(x => x.classList.remove('is-active'));
      b.classList.add('is-active');
    }
  }
  atualizarFab();
  renderDrawer();
  render();

  /* ---- Chegando com a lista pronta (#orcamento) ---------------------------
     É por aqui que cai quem montou a estimativa na calculadora. Sem abrir a
     gaveta, a pessoa aterrissa num catálogo comum, com um número no canto
     que ela não pediu — e não vê que os itens já estão lá dentro. */
  if (location.hash === '#orcamento' && lista.length) abrirDrawer(true);
})();
