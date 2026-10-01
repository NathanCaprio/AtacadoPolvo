/* =========================================================================
   ATACADO POLVO - Comportamento global
   Tema, menu mobile, injecao de config, revelacao ao rolar, contadores, FAQ.
   ========================================================================= */
(function () {
  'use strict';

  const $  = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  /* ---- Icones reutilizaveis (usados pelo catalogo e pelos cards) -------- */
  window.ICONS = {
    dish:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v7a4 4 0 0 0 4 4v7"/><path d="M7 3v7"/><path d="M21 3c-2 0-4 3-4 7s1 4 2 4v7"/></svg>',
    shirt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3l3 2 3-2 5 3-2 4-2-1v12H8V9L6 10 4 6z"/></svg>',
    floor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16M15 4v16"/></svg>',
    drop:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5S5.5 10 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 10 12 2.5 12 2.5z"/></svg>',
    roll:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="10" height="16" rx="4"/><path d="M14 10h4a2 2 0 0 1 2 2v8h-6"/></svg>',
    broom: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3l-7 7"/><path d="M9 8l5 5"/><path d="M11 13l-4 8h12l-3-8z"/></svg>',
    soap:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="3"/><path d="M8 11V8a2 2 0 0 1 4 0M16 8a1.5 1.5 0 1 0 0-3"/></svg>',
    gallon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="14" height="13" rx="2"/><path d="M9 8V5h4v3"/><path d="M18 11h1a2 2 0 0 1 0 4h-1"/></svg>',
    // Categorias que vieram dos grupos do ERP (server/erp.js, GRUPOS)
    bag:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1.2 12.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    bucket:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h16l-2 11a2 2 0 0 1-2 1.6H8A2 2 0 0 1 6 20z"/><path d="M5 9a7 6 0 0 1 14 0"/></svg>',
    shield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg>',
    bug:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="7" width="8" height="13" rx="4"/><path d="M12 7V4M9.5 4.5 11 7M14.5 4.5 13 7M4 12h4M16 12h4M5 18l3-2M19 18l-3-2M5 6l3 2M19 6l-3 2"/></svg>',
    box:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/></svg>',
    pen:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    cart:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.5 11h10L20 7H6"/><circle cx="9" cy="19" r="1.6"/><circle cx="17" cy="19" r="1.6"/></svg>',
    wpp:   '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.2-.7.1s-.7 1-.9 1.2c-.2.2-.3.2-.6.1a8 8 0 0 1-2.4-1.5 9 9 0 0 1-1.6-2c-.2-.3 0-.5.1-.6l.5-.6.3-.5v-.5l-.9-2.2c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.5 3.5 0 0 0-1.1 2.6A6.1 6.1 0 0 0 7.3 13a13.9 13.9 0 0 0 5.3 4.7c.7.3 1.3.5 1.8.6a4.2 4.2 0 0 0 1.9.1 3.2 3.2 0 0 0 2-1.4 2.6 2.6 0 0 0 .2-1.4c-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.5A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .9.9-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z"/></svg>'
  };

  /* ---- 1. Tema claro / escuro ------------------------------------------ */
  const THEME_KEY = 'ap-theme';
  function readTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }
  function applyTheme(t) {
    if (t) document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
  }
  applyTheme(readTheme());

  function toggleTheme() {
    const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const atual = document.documentElement.getAttribute('data-theme') || (sysDark ? 'dark' : 'light');
    const novo = atual === 'dark' ? 'light' : 'dark';
    applyTheme(novo);
    try { localStorage.setItem(THEME_KEY, novo); } catch (e) { /* modo privado */ }
  }

  /* Calculadoras ligadas ou não (calculadoraAtiva em config.js). O CSS
     esconde tudo que tem data-calculadora enquanto esta classe não entra. */
  if ((window.SITE || {}).calculadoraAtiva) document.documentElement.classList.add('com-calculadora');
  // Desligadas, as próprias páginas da calculadora (<main data-calculadora>)
  // mandam para o catálogo — vale para quem chega por link antigo.
  else if (document.querySelector('main[data-calculadora]')) location.replace('produtos.html');

  /* ---- 2. Config: injeta dados de contato no HTML ----------------------- */
  function linkWhatsApp(msg) {
    const s = window.SITE || {};
    const texto = encodeURIComponent(msg || s.mensagemPadrao || '');
    return 'https://wa.me/' + (s.whatsapp || '') + (texto ? '?text=' + texto : '');
  }
  window.linkWhatsApp = linkWhatsApp;

  function aplicarConfig() {
    const s = window.SITE;
    if (!s) return;

    // Texto simples: <span data-site="telefone"></span>
    $$('[data-site]').forEach(el => {
      const v = s[el.dataset.site];
      if (v !== undefined && v !== null) el.textContent = v;
    });

    // Links de WhatsApp: <a data-wpp="Mensagem opcional">
    $$('[data-wpp]').forEach(el => {
      el.href = linkWhatsApp(el.dataset.wpp || '');
      el.target = '_blank';
      el.rel = 'noopener';
    });

    $$('[data-tel]').forEach(el => { el.href = 'tel:' + s.telefoneLink; });
    $$('[data-mail]').forEach(el => { el.href = 'mailto:' + s.email; });
    $$('[data-insta]').forEach(el => { el.href = s.instagram; });
    $$('[data-grupo]').forEach(el => {
      el.href = s.grupoOfertas;
      el.target = '_blank';
      el.rel = 'noopener';
    });

    // Endereco completo montado
    $$('[data-endereco2-full]').forEach(el => {
      el.textContent = [s.endereco2, s.bairro2, `${s.cidade2}/${s.uf2}`]
        .filter(Boolean).join(" - ");
    });

    $$('[data-endereco-full]').forEach(el => {
      el.textContent = [s.endereco, s.bairro, `${s.cidade}/${s.uf}`, s.cep && `CEP ${s.cep}`]
        .filter(Boolean).join(" - ");
    });

    $$('[data-ano]').forEach(el => { el.textContent = new Date().getFullYear(); });
  }

  /* ---- 3. Header sticky ------------------------------------------------- */
  function initHeader() {
    const header = $('.header');
    if (!header) return;
    const onScroll = () => header.classList.toggle('is-stuck', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---- 4. Menu mobile --------------------------------------------------- */
  function initMenu() {
    const btn = $('.menu-btn');
    const nav = $('.nav');
    const back = $('.nav-backdrop');
    if (!btn || !nav) return;

    const setOpen = (open) => {
      nav.classList.toggle('is-open', open);
      if (back) back.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    };

    btn.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
    if (back) back.addEventListener('click', () => setOpen(false));
    $$('a', nav).forEach(a => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
    window.addEventListener('resize', () => { if (window.innerWidth > 900) setOpen(false); });
  }

  /* ---- 5. Revelacao ao rolar -------------------------------------------- */
  function initReveal() {
    const alvos = $$('[data-reveal]');
    if (!alvos.length) return;

    if (!('IntersectionObserver' in window)) {
      alvos.forEach(el => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const delay = parseInt(e.target.dataset.reveal, 10) || 0;
        setTimeout(() => e.target.classList.add('is-in'), delay);
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px' });

    alvos.forEach(el => io.observe(el));
  }

  /* ---- 6. Contadores ---------------------------------------------------- */
  function initCounters() {
    const alvos = $$('[data-count]');
    if (!alvos.length || !('IntersectionObserver' in window)) {
      alvos.forEach(el => { el.textContent = el.dataset.count + (el.dataset.suffix || ''); });
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const alvo = parseInt(el.dataset.count, 10);
        const suf = el.dataset.suffix || '';
        const dur = 1400;
        const ini = performance.now();

        const passo = (now) => {
          const p = Math.min((now - ini) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(alvo * eased).toLocaleString('pt-BR') + suf;
          if (p < 1) requestAnimationFrame(passo);
        };
        requestAnimationFrame(passo);
        io.unobserve(el);
      });
    }, { threshold: 0.4 });

    alvos.forEach(el => io.observe(el));
  }

  /* ---- 7. FAQ (accordion) ----------------------------------------------- */
  function initFaq() {
    $$('.faq-q').forEach(btn => {
      btn.addEventListener('click', () => {
        const aberto = btn.getAttribute('aria-expanded') === 'true';
        const painel = btn.nextElementSibling;

        // fecha os demais
        $$('.faq-q').forEach(o => {
          if (o === btn) return;
          o.setAttribute('aria-expanded', 'false');
          o.nextElementSibling.style.maxHeight = null;
        });

        btn.setAttribute('aria-expanded', String(!aberto));
        painel.style.maxHeight = aberto ? null : painel.scrollHeight + 'px';
      });
    });
  }

  /* ---- 8. "Meu orçamento" fora do catálogo ------------------------------
     O catálogo tem o próprio botão (abre a gaveta). Nas outras páginas, se a
     lista salva tiver itens, o botão aparece e leva ao catálogo já com a
     gaveta aberta (#orcamento). */
  function initQuoteFab() {
    if ($('#quote-fab') || /admin\.html$/.test(location.pathname)) return;
    let lista = [];
    try { lista = JSON.parse(localStorage.getItem('ap-orcamento')) || []; } catch (e) { lista = []; }
    const total = Array.isArray(lista) ? lista.reduce((s, i) => s + (Number(i.qtd) || 0), 0) : 0;
    if (total <= 0) return;

    const a = document.createElement('a');
    a.className = 'quote-fab';
    a.href = 'produtos.html#orcamento';
    a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h2l2.5 11h10L20 7H6"/><circle cx="9" cy="19" r="1.6"/><circle cx="17" cy="19" r="1.6"/></svg>'
      + 'Meu orçamento <span class="badge">' + total + '</span>';
    document.body.appendChild(a);
    requestAnimationFrame(() => a.classList.add('is-visible'));
  }

  /* ---- 8b. Carrossel de marcas (home) -----------------------------------
     Duplica a lista para o trilho rolar -50% e emendar sem salto. A cópia
     é aria-hidden: leitor de tela lê cada marca uma vez só. */
  function initMarcas() {
    const trilho = $('.marcas-trilho');
    if (!trilho) return;
    const lista = $('.marcas-lista', trilho);
    const copia = lista.cloneNode(true);
    copia.setAttribute('aria-hidden', 'true');
    $$('img', copia).forEach(img => { img.alt = ''; });
    trilho.appendChild(copia);
    const secao = trilho.closest('.marcas');
    secao.classList.add('marcas--ativo');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Rolagem por requestAnimationFrame (não CSS) para o arraste continuar de
    // onde o trilho está. Velocidade constante por logo: 4 s cada.
    const viewport = $('.marcas-viewport', secao);
    let x = 0, volta = 0, parado = false, arraste = null, anterior = 0;
    const medir = () => { volta = lista.offsetWidth; };
    medir();
    window.addEventListener('resize', medir);
    // Logos lazy só têm largura depois de carregar.
    $$('img', lista).forEach(img => img.addEventListener('load', medir));

    function quadro(t) {
      const dt = anterior ? Math.min(t - anterior, 100) : 0;
      anterior = t;
      if (!parado && !arraste && volta) x -= dt * volta / (lista.children.length * 4000);
      if (volta) x = ((x % volta) - volta) % volta; // mantém em (-volta, 0]
      trilho.style.transform = 'translateX(' + x + 'px)';
      requestAnimationFrame(quadro);
    }
    requestAnimationFrame(quadro);

    viewport.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') parado = true; });
    viewport.addEventListener('pointerleave', () => { parado = false; });
    viewport.addEventListener('pointerdown', e => {
      arraste = { id: e.pointerId, inicio: e.clientX, x0: x };
      viewport.setPointerCapture(e.pointerId);
      viewport.classList.add('arrastando');
    });
    viewport.addEventListener('pointermove', e => {
      if (arraste && e.pointerId === arraste.id) x = arraste.x0 + e.clientX - arraste.inicio;
    });
    const soltar = e => {
      if (!arraste || e.pointerId !== arraste.id) return;
      arraste = null;
      viewport.classList.remove('arrastando');
    };
    viewport.addEventListener('pointerup', soltar);
    viewport.addEventListener('pointercancel', soltar);
  }

  /* ---- 8c. Busca no cabeçalho -------------------------------------------
     A lupa entra aqui, e não no HTML de cada página. O formulário funciona
     sozinho: Enter leva a produtos.html?busca=, que o catalogo.js entende.
     As sugestões usam window.CATALOGO; nas páginas que não carregam o
     catálogo do ERP, data.js + catalogo-erp.js são baixados na primeira vez
     que a busca abre. No próprio catálogo a lupa só foca o campo da página. */
  const ICONE_LUPA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
  const SUGESTOES = 6;

  // Mesma regra do catalogo.js: ignora acento e maiúscula ("agua" acha "ÁGUA").
  const normalizar = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const esc = s => String(s == null ? '' : s)
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  function carregarScript(src) {
    return new Promise(ok => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = s.onerror = ok;     // sem catálogo, a busca ainda manda ao catálogo
      document.body.appendChild(s);
    });
  }
  let catalogoPedido = null;
  function catalogo() {
    if (!catalogoPedido) {
      catalogoPedido = $('script[src*="catalogo-erp.js"]')
        ? Promise.resolve()
        : (window.CATALOGO ? Promise.resolve() : carregarScript('assets/js/data.js'))
            .then(() => carregarScript('catalogo-erp.js'));
    }
    return catalogoPedido.then(() => window.CATALOGO || null);
  }

  // Cada palavra precisa aparecer (em qualquer ordem): "detergente 5l" acha
  // "DETERGENTE NEUTRO 5L". Nome que começa com o termo vem primeiro.
  function buscarProdutos(cat, termo) {
    const t = normalizar(termo.trim());
    const palavras = t.split(/\s+/).filter(Boolean);
    const nomeCat = {};
    cat.categorias.forEach(c => { nomeCat[c.id] = c.nome; });
    const achados = [];
    cat.produtos.forEach(p => {
      const nome = normalizar(p.nome);
      const tudo = [nome, normalizar(p.desc), normalizar(p.texto), normalizar(nomeCat[p.cat])].join(' ');
      if (normalizar(p.id) !== t && !palavras.every(w => tudo.includes(w))) return;
      const peso = nome.startsWith(t) ? 0 : palavras.every(w => nome.includes(w)) ? 1 : 2;
      achados.push({ p, peso });
    });
    achados.sort((a, b) => a.peso - b.peso || a.p.nome.localeCompare(b.p.nome, 'pt-BR'));
    return { produtos: achados.map(a => a.p), nomeCat };
  }

  function initBusca() {
    const acoes = $('.header-actions');
    const header = $('.header');
    if (!acoes || !header || /admin\.html$/.test(location.pathname)) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'icon-btn busca-btn';
    btn.setAttribute('aria-label', 'Buscar produtos');
    btn.title = 'Buscar produtos (/)';
    btn.innerHTML = ICONE_LUPA;
    acoes.insertBefore(btn, acoes.firstChild);

    // No catálogo já existe um campo que filtra o grid ao vivo.
    const campoDaPagina = $('#busca');
    if (campoDaPagina) {
      btn.addEventListener('click', () => {
        campoDaPagina.scrollIntoView({ behavior: 'smooth', block: 'center' });
        campoDaPagina.focus({ preventScroll: true });
      });
      return;
    }

    const painel = document.createElement('div');
    painel.className = 'busca';
    painel.hidden = true;
    painel.innerHTML = `<div class="wrap"><div class="busca-card">
        <form class="busca-caixa" action="produtos.html" method="get" role="search">
          ${ICONE_LUPA}
          <input type="search" name="busca" maxlength="60" autocomplete="off" spellcheck="false"
                 placeholder="Buscar produto, marca ou categoria..." aria-label="Buscar produtos"
                 role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="busca-lista">
          <button type="button" class="busca-fechar" aria-label="Fechar busca" title="Fechar (Esc)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </form>
        <div class="busca-lista" id="busca-lista" role="listbox" aria-label="Sugestões"></div>
      </div></div>`;
    header.appendChild(painel);

    const campo = $('input', painel);
    const lista = $('.busca-lista', painel);
    let ativo = -1;

    const opcoes = () => $$('a', lista);
    function marcar(i) {
      const ops = opcoes();
      ops.forEach((a, j) => a.classList.toggle('is-ativo', j === i));
      ativo = i;
      if (ops[i]) {
        campo.setAttribute('aria-activedescendant', ops[i].id);
        // Rola só a lista: scrollIntoView mexeria na página (scroll-padding do html).
        const a = ops[i];
        if (a.offsetTop < lista.scrollTop) lista.scrollTop = a.offsetTop;
        else if (a.offsetTop + a.offsetHeight > lista.scrollTop + lista.clientHeight) {
          lista.scrollTop = a.offsetTop + a.offsetHeight - lista.clientHeight;
        }
      } else campo.removeAttribute('aria-activedescendant');
    }

    function desenhar(cat) {
      const termo = campo.value.trim();
      let html = '';

      if (!cat) {
        html = termo ? '' : '<p class="busca-vazio">Digite o nome do produto, a marca ou a categoria.</p>';
      } else if (!termo) {
        html = '<p class="busca-titulo">Categorias</p><div class="busca-cats">' +
          cat.categorias.map(c => `<a role="option" href="produtos.html?cat=${encodeURIComponent(c.id)}">${esc(c.nome)}</a>`).join('') +
          '</div>';
      } else {
        const { produtos, nomeCat } = buscarProdutos(cat, termo);
        const t = normalizar(termo);
        const cats = cat.categorias.filter(c => normalizar(c.nome).includes(t)).slice(0, 3);
        if (cats.length) {
          html += '<div class="busca-cats">' + cats.map(c =>
            `<a role="option" href="produtos.html?cat=${encodeURIComponent(c.id)}">${esc(c.nome)}</a>`).join('') + '</div>';
        }
        html += produtos.slice(0, SUGESTOES).map(p => {
          const cor = (cat.categorias.find(c => c.id === p.cat) || {}).cor || '#7B2FE3';
          const arte = window.imagemProduto ? window.imagemProduto(p, cor) : '';
          return `<a class="busca-item" role="option" href="produto.html?id=${encodeURIComponent(p.id)}">
              <span class="busca-art">${arte}</span>
              <span class="busca-txt"><b>${esc(p.nome)}</b><small>${esc(nomeCat[p.cat] || '')}</small></span>
            </a>`;
        }).join('');
        if (produtos.length) {
          html += `<a class="busca-todos" role="option" href="produtos.html?busca=${encodeURIComponent(termo)}">
              Ver ${produtos.length === 1 ? 'o resultado' : `todos os ${produtos.length} resultados`} no catálogo ${ICONS.arrow}</a>`;
        } else if (!cats.length) {
          html = `<p class="busca-vazio">Nada encontrado para “${esc(termo)}”.
            <a role="option" href="${esc(linkWhatsApp('Olá! Procuro o produto: ' + termo))}" target="_blank" rel="noopener">Pergunte no WhatsApp</a> — a gente tem mais do que está no site.</p>`;
        }
      }

      lista.innerHTML = html;
      opcoes().forEach((a, i) => { a.id = 'busca-op-' + i; });
      campo.setAttribute('aria-expanded', String(!!html));
      marcar(-1);
    }

    let espera;
    const atualizar = () => catalogo().then(desenhar);
    campo.addEventListener('input', () => {
      clearTimeout(espera);
      espera = setTimeout(atualizar, 120);
    });

    function abrir() {
      painel.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      campo.focus({ preventScroll: true });
      campo.select();
      atualizar();
    }
    function fechar(voltarFoco) {
      if (painel.hidden) return;
      painel.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      if (voltarFoco) btn.focus({ preventScroll: true });
    }

    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', () => (painel.hidden ? abrir() : fechar()));
    $('.busca-fechar', painel).addEventListener('click', () => fechar(true));

    campo.addEventListener('keydown', e => {
      const ops = opcoes();
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!ops.length) return;
        e.preventDefault();
        // Gira pelas opções passando pelo campo (-1): de -1 a ops.length - 1.
        const n = ops.length + 1;
        marcar((ativo + 1 + (e.key === 'ArrowDown' ? 1 : -1) + n) % n - 1);
      } else if (e.key === 'Enter' && ops[ativo]) {
        e.preventDefault();
        ops[ativo].click();
      } else if (e.key === 'Escape') {
        fechar(true);
      }
    });

    // Fecha ao clicar fora; "/" abre de qualquer lugar (fora de campos).
    document.addEventListener('click', e => {
      if (!painel.hidden && !painel.contains(e.target) && !btn.contains(e.target)) fechar();
    });
    document.addEventListener('keydown', e => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || !painel.hidden) return;
      const el = document.activeElement;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      e.preventDefault();
      abrir();
    });
  }

  /* ---- 9. Boot ----------------------------------------------------------- */
  function init() {
    aplicarConfig();
    initHeader();
    initMenu();
    initReveal();
    initCounters();
    initFaq();
    initQuoteFab();
    initMarcas();
    initBusca();

    const tBtn = $('.theme-toggle');
    if (tBtn) tBtn.addEventListener('click', toggleTheme);

    // Marca o link da pagina atual
    const pagina = location.pathname.split('/').pop() || 'index.html';
    $$('.nav a[href]').forEach(a => {
      if (a.getAttribute('href') === pagina) a.setAttribute('aria-current', 'page');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
