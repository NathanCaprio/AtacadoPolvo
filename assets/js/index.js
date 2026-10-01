/* Vitrine "Mais vendidos": carrossel com os produtos tag 'mais-vendido'.
   Com o catalogo do ERP, quem recebe a tag sao os mais pedidos nos
   orcamentos do site (server/erp.js, maisPedidos).
   O botao usa a mesma lista de orcamento do catalogo (localStorage). */
(function () {
  const trilho = document.getElementById("vitrine-trilho");
  if (!trilho || !window.CATALOGO) return;

  const { categorias, produtos } = window.CATALOGO;
  const cat = (id) => categorias.find((c) => c.id === id) || {};
  const CHAVE = "ap-orcamento";

  const lerLista = () => {
    try { return JSON.parse(localStorage.getItem(CHAVE)) || []; } catch (e) { return []; }
  };
  const salvarLista = (lista) => {
    try { localStorage.setItem(CHAVE, JSON.stringify(lista)); } catch (e) { /* modo privado */ }
  };

  const botao = (id, naLista) =>
    naLista
      ? `<a class="btn btn--sm btn--ghost btn--block" href="produtos.html">Na lista · ver orçamento</a>`
      : `<button class="btn btn--sm btn--primary btn--block" type="button" data-add="${id}">Adicionar ao orçamento</button>`;

  function render() {
    const lista = lerLista();
    trilho.innerHTML = produtos
      .filter((p) => p.tag === "mais-vendido")
      .map((p) => {
        const c = cat(p.cat);
        return `
<article class="vitrine-card">
<a class="vitrine-art" href="produto.html?id=${p.id}" aria-label="${p.nome}">${window.imagemProduto(p, c.cor)}</a>
<div class="vitrine-corpo">
<span class="prod-cat">${c.nome || ""}</span>
<h3>${p.nome}</h3>
<div class="vitrine-oferta">
<strong>${p.caixa}</strong>
<span class="vitrine-selo">Atacado</span>
</div>
<p class="vitrine-emb">${p.emb ? p.emb + " · preço" : "Preço"} no orçamento</p>
<div class="vitrine-foot" data-slot="${p.id}">${botao(p.id, lista.some((i) => i.id === p.id))}</div>
</div>
</article>`;
      })
      .join("");
    atualizarSetas();
  }

  trilho.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add]");
    if (!btn) return;
    const id = btn.dataset.add;
    const lista = lerLista();
    if (!lista.some((i) => i.id === id)) lista.push({ id, qtd: 1 });
    salvarLista(lista);
    btn.parentElement.innerHTML = botao(id, true);
  });

  /* ---- Setas: rolam um "cartao" por clique ---------------------------- */
  const setas = document.querySelectorAll("[data-vitrine]");
  function passo() {
    const card = trilho.querySelector(".vitrine-card");
    const gap = parseFloat(getComputedStyle(trilho).columnGap) || 0;
    return card ? card.offsetWidth + gap : trilho.clientWidth;
  }
  function atualizarSetas() {
    const max = trilho.scrollWidth - trilho.clientWidth - 2;
    setas.forEach((b) => {
      b.disabled = b.dataset.vitrine === "-1" ? trilho.scrollLeft <= 2 : trilho.scrollLeft >= max;
    });
  }
  setas.forEach((b) =>
    b.addEventListener("click", () =>
      trilho.scrollBy({ left: passo() * Number(b.dataset.vitrine), behavior: "smooth" }),
    ),
  );
  trilho.addEventListener("scroll", atualizarSetas, { passive: true });
  window.addEventListener("resize", atualizarSetas);

  render();
})();

/* Monta os cards de categoria da home a partir de window.CATALOGO */
(function () {
  const grid = document.getElementById("cat-grid");
  if (!grid || !window.CATALOGO) return;

  // 24 cards empurram o resto da home para longe: os 8 primeiros grupos
  // (ordem de GRUPOS em server/erp.js) viram card, o resto vira link.
  const PRINCIPAIS = 8;
  const todas = window.CATALOGO.categorias;

  grid.innerHTML = todas
    .slice(0, PRINCIPAIS)
    .map(
      (c, i) => `
<a class="cat-card" href="produtos.html?cat=${c.id}" style="--cat:${c.cor}" data-reveal="${i * 60}">
<span class="cat-ico">${window.ICONS[c.icone] || window.ICONS.drop}</span>
<h3>${c.nome}</h3>
<p>${c.desc}</p>
<span class="cat-link">Ver produtos ${window.ICONS.arrow}</span>
</a>`,
    )
    .join("");

  const mais = document.getElementById("cat-mais");
  if (mais && todas.length > PRINCIPAIS) {
    mais.innerHTML =
      '<span class="cat-mais-titulo">Mais categorias:</span>' +
      todas
        .slice(PRINCIPAIS)
        .map((c) => `<a class="chip" href="produtos.html?cat=${c.id}">${c.nome}</a>`)
        .join("");
    mais.hidden = false;
  }

  // Os cards entram depois do boot, entao observamos de novo
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          setTimeout(
            () => e.target.classList.add("is-in"),
            parseInt(e.target.dataset.reveal, 10) || 0,
          );
          io.unobserve(e.target);
        }),
      { threshold: 0.1 },
    );
    grid
      .querySelectorAll("[data-reveal]")
      .forEach((el) => io.observe(el));
  } else {
    grid
      .querySelectorAll("[data-reveal]")
      .forEach((el) => el.classList.add("is-in"));
  }
})();
