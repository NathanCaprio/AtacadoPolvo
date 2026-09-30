/* =========================================================================
   ATACADO POLVO - Página de produto (produto.html?id=c01)
   Lê o produto de data.js e preenche a página. A lista de orçamento e a
   gaveta são as do catalogo.js (window.orcamento), carregado depois deste
   arquivo: aqui só se diz quais ids entram no grid de relacionados.
   ========================================================================= */
(function () {
  'use strict';

  const $ = (s, c) => (c || document).querySelector(s);
  if (!window.CATALOGO) return;

  const { categorias, produtos } = window.CATALOGO;
  const id = new URLSearchParams(location.search).get('id');
  const p = produtos.find(x => x.id === id);

  const texto = (sel, v) => { const el = $(sel); if (el) el.textContent = v; };

  if (!p) {
    // Link quebrado não deve ser indexado como página de produto.
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, follow';
    document.head.appendChild(robots);
    document.title = 'Produto não encontrado | Atacado Polvo';
    return;
  }

  const cat = categorias.find(c => c.id === p.cat) || {};
  const linkCat = `produtos.html?cat=${p.cat}`;

  /* ---- SEO: título, descrição, canonical --------------------------------- */
  const titulo = `${p.nome} no atacado — Porto Alegre | Atacado Polvo`;
  const descricao = `${p.nome}: ${p.desc} ${p.caixa}. Preço de atacado sob consulta — monte seu orçamento e receba a proposta pelo WhatsApp.`;
  document.title = titulo;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.content = descricao;
  const canonical = $('#canonical');
  if (canonical) canonical.href = `https://www.atacadopolvo.com.br/produto.html?id=${p.id}`;
  const ogT = $('#og-title'); if (ogT) ogT.content = `${p.nome} — Atacado Polvo`;
  const ogD = $('#og-desc');  if (ogD) ogD.content = p.desc;

  /* ---- Trilha ------------------------------------------------------------ */
  const trilhaCat = $('#pd-trilha-cat');
  if (trilhaCat) {
    trilhaCat.href = linkCat;
    trilhaCat.textContent = cat.nome || '';
    trilhaCat.hidden = false;
    $('#pd-trilha-sep').hidden = false;
  }
  texto('#pd-trilha-nome', p.nome);

  /* ---- Ficha ------------------------------------------------------------- */
  $('#pd-vazio').hidden = true;
  $('#pd').hidden = false;
  $('#pd-passos').hidden = false;

  const tag = p.tag === 'mais-vendido' ? '<span class="prod-tag">Mais vendido</span>'
            : p.tag === 'novo' ? '<span class="prod-tag prod-tag--new">Novidade</span>' : '';
  $('#pd-art').innerHTML = tag + window.artProduto(p.art, cat.cor);

  const linkCatEl = $('#pd-cat');
  linkCatEl.href = linkCat;
  linkCatEl.textContent = cat.nome || '';
  texto('#pd-nome', p.nome);
  texto('#pd-desc', p.desc);
  texto('#pd-emb', p.emb);
  texto('#pd-caixa', p.caixa);
  texto('#pd-cod', p.id.toUpperCase());

  // main.js transforma data-wpp em link no DOMContentLoaded, depois daqui.
  $('#pd-wpp').dataset.wpp = `Olá! Tenho uma dúvida sobre o produto ${p.nome} (${p.id.toUpperCase()}).`;

  /* ---- Quantidade + adicionar -------------------------------------------- */
  let qtd = 1;
  const qtdEl = $('#pd-qtd');
  const mudarQtd = d => { qtd = Math.min(999, Math.max(1, qtd + d)); qtdEl.textContent = qtd; };
  $('#pd-menos').addEventListener('click', () => mudarQtd(-1));
  $('#pd-mais').addEventListener('click', () => mudarQtd(1));

  // "Vendido em" já diz o que é uma unidade do pedido (caixa, fardo...).
  function mostrarNaLista() {
    const n = window.orcamento ? window.orcamento.quantidade(p.id) : 0;
    const aviso = $('#pd-na-lista');
    aviso.hidden = !n;
    aviso.textContent = n ? `Já está no seu orçamento: ${n}× ${p.caixa.toLowerCase()}` : '';
  }

  $('#pd-add').addEventListener('click', () => {
    if (!window.orcamento) return;
    window.orcamento.adicionar(p.id, qtd);
    qtd = 1;
    qtdEl.textContent = qtd;
  });
  document.addEventListener('orcamento:mudou', mostrarNaLista);
  document.addEventListener('DOMContentLoaded', mostrarNaLista);

  /* ---- Relacionados: mesma categoria, completando com mais vendidos ------- */
  const rel = produtos.filter(x => x.cat === p.cat && x.id !== p.id);
  produtos.forEach(x => {
    if (rel.length < 4 && x.id !== p.id && x.tag === 'mais-vendido' && !rel.includes(x)) rel.push(x);
  });
  const grid = $('#prod-grid');
  if (grid && rel.length) {
    grid.dataset.ids = rel.slice(0, 4).map(x => x.id).join(',');
    $('#pd-relacionados').hidden = false;
    const todos = $('#pd-rel-todos');
    todos.href = linkCat;
    todos.textContent = `Ver todos de ${cat.nome || 'esta categoria'}`;
  }
})();
