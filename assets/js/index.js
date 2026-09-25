/* Monta os cards de categoria da home a partir de window.CATALOGO */
(function () {
  const grid = document.getElementById("cat-grid");
  if (!grid || !window.CATALOGO) return;

  grid.innerHTML = window.CATALOGO.categorias
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
