/* =========================================================================
   ATACADO POLVO - Pop-up do cupom de primeira compra
   -------------------------------------------------------------------------
   Pede nome, WhatsApp e segmento e devolve um código único (POST
   /api/cupom). O lead cai no painel com origem 'cupom' e o código, que o
   vendedor confere antes de dar o desconto.

   Aparece uma vez só, no primeiro destes sinais de interesse:
     - 20 s na página;
     - rolou metade da página;
     - o mouse saiu pelo topo (intenção de fechar a aba, só no desktop).
   Fechou sem pedir: volta em 7 dias. Pediu: nunca mais, e o código passa a
   ir junto na mensagem de orçamento do catálogo (ver catalogo.js).

   Desligar no site todo: cupomAtivo: false em config.js.
   ========================================================================= */

(function () {
  'use strict';

  const s = window.SITE || {};
  const CHAVE_CUPOM = 'polvo-cupom';
  const CHAVE_FECHOU = 'polvo-cupom-fechou';
  const PAUSA_DIAS = 7;

  // O servidor aceita exatamente estes valores (SEGMENTOS em server/api.js).
  const SEGMENTOS = [
    ['revenda', 'Mercado ou revenda'],
    ['condominio', 'Condomínio'],
    ['empresa', 'Empresa ou escritório'],
    ['restaurante', 'Restaurante ou lanchonete'],
    ['escola', 'Escola'],
    ['hotel', 'Hotel ou pousada'],
    ['pet', 'Pet shop ou veterinária'],
    ['residencial', 'Uso em casa']
  ];

  // localStorage pode lançar (aba anônima, cookies bloqueados): sem ele o
  // pop-up simplesmente se comporta como na primeira visita.
  const ler = k => { try { return localStorage.getItem(k); } catch { return null; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, v); } catch { /* ok */ } };

  function deveMostrar() {
    if (s.cupomAtivo === false) return false;
    if (typeof HTMLDialogElement !== 'function') return false;
    if (ler(CHAVE_CUPOM)) return false;
    const fechou = Number(ler(CHAVE_FECHOU)) || 0;
    return Date.now() - fechou > PAUSA_DIAS * 864e5;
  }

  const desconto = s.cupomDesconto || '5%';

  function montar() {
    const d = document.createElement('dialog');
    d.className = 'cupom';
    d.setAttribute('aria-labelledby', 'cupom-titulo');
    d.innerHTML = `
      <button class="cupom-fechar" type="button" aria-label="Fechar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>

      <div class="cupom-passo" data-passo="form">
        <span class="cupom-selo">Primeira compra</span>
        <h2 id="cupom-titulo" tabindex="-1" autofocus>Ganhe <span class="grad">${desconto} de desconto</span> no seu primeiro pedido</h2>
        <p class="cupom-lead">Deixe seu WhatsApp e receba o cupom agora. Vale para o primeiro pedido acima do mínimo.</p>

        <form class="cupom-form" novalidate>
          <div class="field">
            <label for="cupom-nome">Seu nome</label>
            <input class="input" id="cupom-nome" name="nome" autocomplete="name" required maxlength="120">
            <p class="err"></p>
          </div>
          <div class="field">
            <label for="cupom-whats">WhatsApp</label>
            <input class="input" id="cupom-whats" name="whatsapp" type="tel" inputmode="tel"
                   autocomplete="tel-national" placeholder="(51) 99999-9999" required maxlength="20">
            <p class="err"></p>
          </div>
          <div class="field">
            <label for="cupom-seg">Para onde é a compra?</label>
            <select class="input" id="cupom-seg" name="segmento" required>
              <option value="">Escolha…</option>
              ${SEGMENTOS.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}
            </select>
            <p class="err"></p>
          </div>
          <div class="field field--check">
            <label class="check">
              <input type="checkbox" name="aceite" required>
              <span>Autorizo o contato pelo WhatsApp, conforme a <a href="privacidade.html" target="_blank">Política de Privacidade</a>.</span>
            </label>
            <p class="err"></p>
          </div>
          <p class="cupom-erro" role="alert" hidden></p>
          <button class="btn btn--primary btn--block" type="submit">Quero meu cupom</button>
        </form>
      </div>

      <div class="cupom-passo" data-passo="ok" hidden>
        <span class="cupom-selo">Cupom liberado</span>
        <h2>Pronto, <span data-cupom-nome></span>!</h2>
        <p class="cupom-lead">Informe este código ao vendedor no seu primeiro pedido:</p>
        <div class="cupom-codigo">
          <strong data-cupom-codigo></strong>
          <button class="btn btn--ghost btn--sm" type="button" data-cupom-copiar>Copiar</button>
        </div>
        <p class="cupom-nota">Guardamos o código aqui no site: ele vai junto automaticamente quando você enviar sua lista de orçamento.</p>
        <a class="btn btn--wpp btn--block" data-cupom-wpp target="_blank" rel="noopener">Usar agora no WhatsApp</a>
      </div>`;
    document.body.appendChild(d);
    return d;
  }

  function erroCampo(campo, msg) {
    const f = campo.closest('.field');
    f.classList.toggle('has-error', !!msg);
    f.querySelector('.err').textContent = msg || '';
  }

  function validar(form) {
    const { nome, whatsapp, segmento, aceite } = form.elements;
    let ok = true;
    const digitos = whatsapp.value.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
    // Mesmas regras de normalizarWhats em server/api.js.
    const whatsOk = (digitos.length === 10 || digitos.length === 11) &&
                    /^[1-9]{2}/.test(digitos) &&
                    (digitos.length === 10 || digitos[2] === '9') &&
                    !/^(\d)\1+$/.test(digitos.slice(2));
    const regras = [
      [nome, nome.value.trim().length >= 2 ? '' : 'Informe seu nome.'],
      [whatsapp, whatsOk ? '' : 'Número inválido. Use DDD + número.'],
      [segmento, segmento.value ? '' : 'Escolha uma opção.'],
      [aceite, aceite.checked ? '' : 'Marque para receber o cupom.']
    ];
    for (const [campo, msg] of regras) {
      erroCampo(campo, msg);
      if (msg && ok) { campo.focus(); ok = false; }
    }
    return ok;
  }

  /** Máscara leve: (51) 99999-9999 enquanto digita. */
  function mascarar(input) {
    input.addEventListener('input', () => {
      const d = input.value.replace(/\D/g, '').slice(0, 11);
      if (d.length <= 2) input.value = d.length ? `(${d}` : '';
      else if (d.length <= 6) input.value = `(${d.slice(0, 2)}) ${d.slice(2)}`;
      else if (d.length <= 10) input.value = `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
      else input.value = `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    });
  }

  function mostrarCodigo(d, cupom, nome) {
    d.querySelector('[data-passo="form"]').hidden = true;
    d.querySelector('[data-passo="ok"]').hidden = false;
    d.querySelector('[data-cupom-codigo]').textContent = cupom;
    d.querySelector('[data-cupom-nome]').textContent = nome.split(' ')[0];
    const wpp = d.querySelector('[data-cupom-wpp]');
    wpp.href = window.linkWhatsApp
      ? window.linkWhatsApp(`Olá! Quero fazer meu primeiro pedido com o cupom ${cupom}.`)
      : '#';

    const copiar = d.querySelector('[data-cupom-copiar]');
    copiar.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(cupom);
        copiar.textContent = 'Copiado!';
      } catch {
        copiar.textContent = 'Selecione e copie';
      }
      setTimeout(() => { copiar.textContent = 'Copiar'; }, 2000);
    });
  }

  function iniciar() {
    if (!deveMostrar()) return;

    let aberto = false;
    let dialogo = null;

    function abrir() {
      if (aberto || !deveMostrar()) return;
      // Outro modal (gaveta de orçamento, menu) aberto: não empilha.
      if (document.querySelector('.drawer.is-open, .nav.is-open')) return;
      aberto = true;
      desligar();
      dialogo = dialogo || ligar(montar());
      dialogo.showModal();
    }

    function ligar(d) {
      const form = d.querySelector('form');
      const botao = form.querySelector('[type="submit"]');
      const aviso = d.querySelector('.cupom-erro');
      mascarar(form.elements.whatsapp);

      d.querySelector('.cupom-fechar').addEventListener('click', () => d.close());
      // Clique fora do cartão (no backdrop) fecha também.
      d.addEventListener('click', e => { if (e.target === d) d.close(); });
      d.addEventListener('close', () => {
        if (!ler(CHAVE_CUPOM)) gravar(CHAVE_FECHOU, String(Date.now()));
      });

      form.addEventListener('submit', async e => {
        e.preventDefault();
        aviso.hidden = true;
        if (!validar(form)) return;

        botao.disabled = true;
        botao.textContent = 'Gerando cupom…';
        try {
          const r = await fetch('/api/cupom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nome: form.elements.nome.value.trim(),
              whatsapp: form.elements.whatsapp.value,
              segmento: form.elements.segmento.value,
              aceite: form.elements.aceite.checked
            })
          });
          const dados = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(dados.erro || 'Não foi possível gerar o cupom.');
          gravar(CHAVE_CUPOM, dados.cupom);
          mostrarCodigo(d, dados.cupom, form.elements.nome.value.trim());
        } catch (err) {
          aviso.textContent = err.message === 'Failed to fetch'
            ? 'Sem conexão. Tente de novo em instantes.'
            : err.message;
          aviso.hidden = false;
        } finally {
          botao.disabled = false;
          botao.textContent = 'Quero meu cupom';
        }
      });
      return d;
    }

    const timer = setTimeout(abrir, 20000);
    const aoRolar = () => {
      const h = document.documentElement;
      if (h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight) > 0.5) abrir();
    };
    const aoSair = e => { if (!e.relatedTarget && e.clientY <= 0) abrir(); };

    function desligar() {
      clearTimeout(timer);
      window.removeEventListener('scroll', aoRolar);
      document.removeEventListener('mouseout', aoSair);
    }

    window.addEventListener('scroll', aoRolar, { passive: true });
    if (window.matchMedia('(hover: hover)').matches) {
      document.addEventListener('mouseout', aoSair);
    }
  }

  /** Código já pedido neste navegador (catalogo.js usa na mensagem). */
  window.cupomGuardado = () => ler(CHAVE_CUPOM);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
