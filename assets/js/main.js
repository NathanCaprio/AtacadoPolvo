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
    // Velocidade constante por logo, não por volta: mais marcas, volta mais longa.
    trilho.style.setProperty('--marcas-dur', (lista.children.length * 4) + 's');
    trilho.closest('.marcas').classList.add('marcas--ativo');
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
