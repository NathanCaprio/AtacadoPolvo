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

  // Item que veio da calculadora de consumo: é genérico (catálogo de
  // exemplo, data.js) e não existe no catálogo do ERP. Continua na lista e
  // no pedido; o vendedor escolhe o produto equivalente.
  const referencia = (window.CATALOGO_REFERENCIA || {}).produtos || [];
  const acharProduto = id => produtos.find(x => x.id === id) || referencia.find(x => x.id === id);

  // A regra de busca (acento, maiúscula, palavras em qualquer ordem, código)
  // é a do main.js, carregado antes: a mesma da lupa do cabeçalho.
  const { normalizar, casa } = window.BUSCA;

  // Mais de mil produtos num grid só travam o celular: desenha aos poucos.
  const PAGINA = 48;
  const estado = { cat: 'todos', busca: '', ordem: 'relevancia', limite: PAGINA };

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
      estado.limite = PAGINA;
      $$('.filter-btn', ul).forEach(b => b.classList.toggle('is-active', b === btn));
      render();
    });
  }

  /* ---- Render do grid ---------------------------------------------------- */
  function filtrar() {
    const termo = normalizar(estado.busca.trim());
    const cats = estado.cat.split(',');     // ?cat=vassouras,panos (cards das landings)
    let out = produtos.filter(p =>
      (estado.cat === 'todos' || cats.includes(p.cat)) && casa(p, termo, nomeDe(p.cat)));

    if (estado.ordem === 'az') out = out.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    if (estado.ordem === 'za') out = out.slice().sort((a, b) => b.nome.localeCompare(a.nome, 'pt-BR'));
    if (estado.ordem === 'categoria') out = out.slice().sort((a, b) => nomeDe(a.cat).localeCompare(nomeDe(b.cat), 'pt-BR'));

    // Grid com lista fixa (relacionados em produto.html): mantém a ordem dada.
    if (grid.dataset.ids) {
      const ids = grid.dataset.ids.split(',');
      out = ids.map(id => out.find(p => p.id === id)).filter(Boolean);
    }
    return out;
  }

  function cardProduto(p) {
    const cor = corDe(p.cat);
    const tag = p.tag === 'mais-vendido' ? '<span class="prod-tag">Mais vendido</span>'
              : p.tag === 'novo' ? '<span class="prod-tag prod-tag--new">Novidade</span>' : '';
    const naLista = lista.some(i => i.id === p.id);
    const link = `produto.html?id=${p.id}`;

    return `<article class="prod">
      <a class="prod-art" href="${link}" tabindex="-1" aria-hidden="true">${tag}${window.imagemProduto(p, cor)}</a>
      <div class="prod-body">
        <span class="prod-cat">${nomeDe(p.cat)}</span>
        <h3><a class="prod-link" href="${link}">${p.nome}</a></h3>
        <p class="prod-desc">${p.desc}</p>
        <div class="prod-meta">
          ${[p.emb, p.caixa].filter(Boolean).map(t => `<span class="chip">${t}</span>`).join('')}
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

    // Grid de relacionados (lista fixa) não pagina.
    const visiveis = grid.dataset.ids ? itens : itens.slice(0, estado.limite);
    grid.innerHTML = itens.length
      ? visiveis.map(cardProduto).join('')
      : `<div class="empty">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
           <h3>Nenhum produto encontrado</h3>
           <p>Tente outro termo ou selecione outra categoria.</p>
         </div>`;
    atualizarMais(itens.length - visiveis.length);
  }

  let mais = null;
  function atualizarMais(restantes) {
    if (!mais) {
      mais = document.createElement('div');
      mais.className = 'prod-mais';
      mais.innerHTML = '<button class="btn btn--ghost" type="button"></button>';
      mais.firstChild.addEventListener('click', () => { estado.limite += PAGINA; render(); });
      grid.after(mais);
    }
    mais.hidden = restantes <= 0;
    mais.firstChild.textContent = `Ver mais produtos (${restantes})`;
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
      body.innerHTML = `<div class="empty u-p-48-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.5 11h10L20 7H6"/><circle cx="9" cy="19" r="1.6"/><circle cx="17" cy="19" r="1.6"/></svg>
          <h3>Sua lista está vazia</h3>
          <p>Adicione produtos do catálogo para montar um orçamento.</p>
        </div>`;
      if (foot) foot.style.display = 'none';
      return;
    }

    if (foot) foot.style.display = '';
    body.innerHTML = lista.map(i => {
      const p = acharProduto(i.id);
      if (!p) return '';
      return `<div class="qi">
        <div class="qi-art">${window.imagemProduto(p, corDe(p.cat))}</div>
        <div class="qi-info">
          <b>${p.nome}</b>
          <span>${p.caixa}</span>
        </div>
        <div class="qty">
          <button data-dec="${p.id}" aria-label="Diminuir quantidade">-</button>
          <span>${i.qtd}</span>
          <button data-inc="${p.id}" aria-label="Aumentar quantidade">+</button>
        </div>
        <button class="qi-remove" data-remove="${p.id}" aria-label="Remover ${p.nome} do orçamento">&times;</button>
      </div>`;
    }).join('');
  }

  function sincronizar() {
    // Mexeu na lista depois de enviar: o aviso já não descreve o que está ali.
    mostrarEnviado(false);
    salvar();
    atualizarFab();
    renderDrawer();
    render();
    document.dispatchEvent(new CustomEvent('orcamento:mudou', { detail: lista }));
  }

  /* Para a página de produto (produto.js), que adiciona com quantidade e
     precisa usar esta mesma lista e esta mesma gaveta. */
  window.orcamento = {
    adicionar(id, qtd) {
      const item = lista.find(i => i.id === id);
      if (item) item.qtd += qtd;
      else lista.push({ id, qtd });
      sincronizar();
      abrirDrawer(true);
    },
    quantidade: id => (lista.find(i => i.id === id) || {}).qtd || 0
  };

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

  /* (00) 0000-0000 ou (00) 00000-0000, conforme vai digitando. */
  function mascaraTelefone(v) {
    v = v.replace(/\D/g, '').slice(0, 11);
    if (v.length <= 10) {
      return v.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (m, a, b, c) =>
        [a && '(' + a, a.length === 2 ? ') ' : '', b, c && '-' + c].join(''));
    }
    return v.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3');
  }

  /* Nome + WhatsApp com DDD, obrigatórios para quem não está logado: sem
     isso a loja não tem como retornar. O servidor valida de novo. */
  function lerContato() {
    const caixa = $('#drawer-contato');
    if (!caixa || caixa.hidden) return null;

    const nome = (($('#oc-nome') || {}).value || '').trim();
    const tel = (($('#oc-tel') || {}).value || '').trim();
    const digitos = tel.replace(/\D/g, '');

    const marcar = (id, msg) => {
      const campo = $(id).closest('.field');
      campo.querySelector('.err').textContent = msg;
      campo.classList.toggle('has-error', !!msg);
    };
    marcar('#oc-nome', nome ? '' : 'Informe seu nome.');
    marcar('#oc-tel', digitos.length >= 10 ? '' : 'Informe um WhatsApp com DDD.');
    const invalido = $('#drawer-contato .has-error input');
    if (invalido) { invalido.focus(); return false; }

    return { nome, tel };
  }

  /* Mostra/esconde o aviso de envio no topo da gaveta. A lista NÃO é
     apagada nem escondida: o pedido ainda não foi aceito pela loja, e quem
     fecha o WhatsApp sem enviar precisa ver que os itens continuam ali. */
  let ultimaMsg = '';
  function mostrarEnviado(mostrar) {
    const enviado = $('#drawer-enviado');
    if (!enviado) return;

    enviado.hidden = !mostrar;
    if (!mostrar) mostrarContatoOk(null);

    // O convite de conta só faz sentido para quem não tem uma. Sem backend
    // (HTML aberto do disco) ele nem aparece: levaria a uma tela que não
    // funciona.
    const convite = $('#enviado-conta');
    if (convite) convite.hidden = !(mostrar && window.API && !clienteAtual);
  }

  /* Troca o formulário de contato por uma confirmação, com opção de
     reenviar (reabre o WhatsApp, sem gravar de novo) ou corrigir os dados.
     null = volta a mostrar o formulário. */
  function mostrarContatoOk(contato) {
    const ok = $('#oc-ok'), form = $('#oc-form');
    if (!ok || !form) return;
    ok.hidden = !contato;
    form.hidden = !!contato;
    if (contato) $('#oc-ok-quem').textContent = `${contato.nome} · ${contato.tel}`;
  }

  function enviarOrcamento() {
    const s = window.SITE || {};

    const itens = lista.map(i => {
      const p = acharProduto(i.id) || {};
      return { id: i.id, nome: p.nome || i.id, caixa: p.caixa || '', qtd: i.qtd };
    });

    const contato = lerContato();
    if (contato === false) return;          // falta nome ou contato válido

    registrar(itens, contato);
    mostrarContatoOk(contato);

    const linhas = itens.map(i => `• ${i.nome} — ${i.qtd}x (${i.caixa})`).join('\n');
    // Cupom pedido no pop-up (cupom.js) vai junto, para o vendedor conferir.
    const cupom = window.cupomGuardado ? window.cupomGuardado() : null;
    const msg = `Olá! Gostaria de um orçamento dos itens abaixo:\n\n${linhas}\n\nPedido mínimo: ${s.pedidoMinimo || ''}` +
                (cupom ? `\nCupom de primeira compra: ${cupom}` : '');
    ultimaMsg = msg;
    window.open(window.linkWhatsApp(msg), '_blank', 'noopener');

    mostrarEnviado(true);
    const topo = $('#drawer-enviado');
    if (topo) topo.scrollIntoView({ block: 'nearest' });
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
      t = setTimeout(() => { estado.busca = e.target.value; estado.limite = PAGINA; render(); }, 180);
    });
  }

  const ordem = $('#ordem');
  if (ordem) ordem.addEventListener('change', e => { estado.ordem = e.target.value; estado.limite = PAGINA; render(); });

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

  const ocTel = $('#oc-tel');
  if (ocTel) ocTel.addEventListener('input', e => { e.target.value = mascaraTelefone(e.target.value); });

  const ocReenviar = $('#oc-reenviar');
  if (ocReenviar) ocReenviar.addEventListener('click', () => {
    if (ultimaMsg) window.open(window.linkWhatsApp(ultimaMsg), '_blank', 'noopener');
  });
  const ocAlterar = $('#oc-alterar');
  if (ocAlterar) ocAlterar.addEventListener('click', () => {
    mostrarContatoOk(null);
    $('#oc-nome').focus();
  });

  // Pop-up bloqueado ou aba fechada sem querer: reabre a mesma mensagem.
  const reabrir = $('#drawer-reabrir');
  if (reabrir) reabrir.addEventListener('click', () => {
    if (ultimaMsg) window.open(window.linkWhatsApp(ultimaMsg), '_blank', 'noopener');
  });

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
      const rem = e.target.closest('[data-remove]');
      if (inc) {
        const i = lista.find(x => x.id === inc.dataset.inc);
        if (i) i.qtd += 1;
      } else if (dec) {
        const idx = lista.findIndex(x => x.id === dec.dataset.dec);
        if (idx > -1) {
          lista[idx].qtd -= 1;
          if (lista[idx].qtd <= 0) lista.splice(idx, 1);
        }
      } else if (rem) {
        const idx = lista.findIndex(x => x.id === rem.dataset.remove);
        if (idx > -1) lista.splice(idx, 1);
      } else return;
      sincronizar();
    });
  }

  /* ---- Categoria vinda da URL (?cat=cozinha) ------------------------------ */
  // Links de antes do catálogo do ERP (?cat=cozinha) que ainda podem estar
  // no Google ou em mensagens: cada um cai no grupo mais próximo em vez de
  // abrir "todos os produtos". As páginas do site já linkam os grupos.
  const CATEGORIA_ANTIGA = {
    cozinha: 'limpeza', superficies: 'limpeza', profissional: 'limpeza',
    banheiro: 'limpeza,sanitarios', utensilios: 'vassouras,baldes-e-mops,panos,esponjas'
  };
  const existe = id => categorias.some(c => c.id === id);
  const url = new URLSearchParams(location.search);
  const pedidas = (url.get('cat') || '').split(',')
    .flatMap(id => existe(id) ? [id] : (CATEGORIA_ANTIGA[id] || '').split(','))
    .filter(existe);
  if (pedidas.length) estado.cat = [...new Set(pedidas)].join(',');

  // ?busca=5l: o card "Linha profissional" das landings abre só os galões.
  const buscaUrl = (url.get('busca') || '').slice(0, 60);
  if (buscaUrl) {
    estado.busca = buscaUrl;
    if (busca) busca.value = buscaUrl;
  }

  /* ---- Boot --------------------------------------------------------------- */
  montarFiltros();
  if (estado.cat !== 'todos') {
    const cats = estado.cat.split(',');
    $$('.filter-btn').forEach(b => b.classList.toggle('is-active', cats.includes(b.dataset.cat)));
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
