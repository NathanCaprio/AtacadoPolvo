/* Vitrine "Mais vendidos": carrossel com os produtos tag 'mais-vendido'.
   Com o catalogo do ERP, quem recebe a tag sao os mais pedidos nos
   orcamentos do site (server/erp.js, maisPedidos).
   catalogo.js desenha os cards e cuida da gaveta de orçamento (o trilho é
   o #prod-grid); aqui só se diz quais ids entram (data-ids). */
(function () {
  const trilho = document.getElementById("prod-grid");
  if (!trilho || !window.CATALOGO) return;

  trilho.dataset.ids = window.CATALOGO.produtos
    .filter((p) => p.tag === "mais-vendido")
    .map((p) => p.id)
    .join(",");
  // Sem ids o catalogo.js desenharia o catálogo inteiro: some a vitrine.
  if (!trilho.dataset.ids) trilho.closest("section").hidden = true;

  // Os cards chegam depois (catalogo.js) e são redesenhados a cada mudança
  // na lista: as setas acompanham.
  new MutationObserver(() => atualizarSetas()).observe(trilho, { childList: true });

  /* ---- Setas: rolam um "cartao" por clique ---------------------------- */
  const setas = document.querySelectorAll("[data-vitrine]");
  function passo() {
    const card = trilho.querySelector(".prod");
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

  /* ---- Arrastar com o mouse (no toque a rolagem já é nativa) ------------
     Durante o arrasto o snap/smooth ficam desligados (.is-arrastando) para
     o trilho seguir o mouse; ao soltar, encaixa no cartão mais próximo.
     Um arrasto não vale como clique no link/botão onde ele terminou. */
  let arrasto = null;
  let engolirClique = false;
  trilho.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    arrasto = { x: e.clientX, inicio: trilho.scrollLeft, moveu: false };
  });
  window.addEventListener("pointermove", (e) => {
    if (!arrasto) return;
    const dx = e.clientX - arrasto.x;
    if (!arrasto.moveu) {
      if (Math.abs(dx) < 6) return;
      arrasto.moveu = true;
      trilho.classList.add("is-arrastando");
      window.getSelection()?.removeAllRanges();
    }
    trilho.scrollLeft = arrasto.inicio - dx;
  });
  window.addEventListener("pointerup", () => {
    if (!arrasto) return;
    if (arrasto.moveu) {
      trilho.classList.remove("is-arrastando");
      const p = passo();
      trilho.scrollTo({ left: Math.round(trilho.scrollLeft / p) * p, behavior: "smooth" });
      engolirClique = true;
      setTimeout(() => (engolirClique = false), 0);
    }
    arrasto = null;
  });
  trilho.addEventListener(
    "click",
    (e) => {
      if (!engolirClique) return;
      e.preventDefault();
      e.stopPropagation();
    },
    true,
  );
  // Sem o "fantasma" nativo ao puxar a foto ou o link
  trilho.addEventListener("dragstart", (e) => e.preventDefault());
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
<a class="cat-card" href="produtos.html?cat=${c.id}" data-reveal="${i * 60}">
<span class="cat-ico">${window.ICONS[c.icone] || window.ICONS.drop}</span>
<h3>${c.nome}</h3>
<p>${c.desc}</p>
<span class="cat-link">Ver produtos ${window.ICONS.arrow}</span>
</a>`,
    )
    .join("");
  // A cor vai pelo CSSOM: atributo style dentro do innerHTML seria barrado pelo
  // CSP (style-src sem unsafe-inline).
  grid.querySelectorAll(".cat-card").forEach((el, i) => el.style.setProperty("--cat", todas[i].cor));

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
