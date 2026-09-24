/* =========================================================================
   ATACADO POLVO - Formulario de contato
   Validacao, mascaras e envio. Sem backend, o envio monta uma mensagem
   de WhatsApp. Quando a API existir, troque enviar() por um POST.
   ========================================================================= */
(function () {
  'use strict';

  const form = document.querySelector('#form-contato');
  if (!form) return;

  const $ = (s, c) => (c || document).querySelector(s);

  /* ---- Mascaras --------------------------------------------------------- */
  function mascaraTelefone(v) {
    v = v.replace(/\D/g, '').slice(0, 11);
    if (v.length <= 10) {
      return v.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (m, a, b, c) =>
        [a && '(' + a, a.length === 2 ? ') ' : '', b, c && '-' + c].join(''));
    }
    return v.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3');
  }

  function mascaraCnpj(v) {
    v = v.replace(/\D/g, '').slice(0, 14);
    return v
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }

  const tel = $('#tel');
  if (tel) tel.addEventListener('input', e => { e.target.value = mascaraTelefone(e.target.value); });

  const cnpj = $('#cnpj');
  if (cnpj) cnpj.addEventListener('input', e => { e.target.value = mascaraCnpj(e.target.value); });

  /* ---- Validacao --------------------------------------------------------- */
  const regras = {
    nome:     v => v.trim().length >= 3        || 'Informe seu nome completo.',
    empresa:  v => v.trim().length >= 2        || 'Informe o nome da empresa.',
    email:    v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'Informe um e-mail válido.',
    tel:      v => v.replace(/\D/g, '').length >= 10 || 'Informe um telefone com DDD.',
    mensagem: v => v.trim().length >= 10       || 'Escreva ao menos 10 caracteres.'
  };

  function validarCampo(input) {
    const regra = regras[input.id];
    if (!regra) return true;

    const res = regra(input.value);
    const campo = input.closest('.field');
    const erro = $('.err', campo);

    if (res === true) {
      campo.classList.remove('has-error');
      return true;
    }
    if (erro) erro.textContent = res;
    campo.classList.add('has-error');
    return false;
  }

  Object.keys(regras).forEach(id => {
    const el = $('#' + id);
    if (!el) return;
    el.addEventListener('blur', () => validarCampo(el));
    el.addEventListener('input', () => {
      const campo = el.closest('.field');
      if (campo.classList.contains('has-error')) validarCampo(el);
    });
  });

  /* ---- Envio -------------------------------------------------------------- */
  /* Mesmo critério do catálogo: grava a mensagem, mas nunca deixa o registro
     impedir a abertura do WhatsApp. */
  function registrar(dados) {
    if (!window.API) return;
    window.API.pedir('/api/mensagens', { metodo: 'POST', corpo: dados })
      .catch(() => {});
  }

  function enviar(dados) {
    registrar(dados);

    const s = window.SITE || {};
    const msg =
      `*Novo contato pelo site*\n\n` +
      `Nome: ${dados.nome}\n` +
      `Empresa: ${dados.empresa}\n` +
      (dados.cnpj ? `CNPJ: ${dados.cnpj}\n` : '') +
      `E-mail: ${dados.email}\n` +
      `Telefone: ${dados.tel}\n` +
      `Assunto: ${dados.assunto}\n\n` +
      `${dados.mensagem}`;

    window.open(window.linkWhatsApp(msg), '_blank', 'noopener');
  }

  form.addEventListener('submit', e => {
    e.preventDefault();

    const invalidos = Object.keys(regras)
      .map(id => $('#' + id))
      .filter(el => el && !validarCampo(el));

    if (invalidos.length) {
      invalidos[0].focus();
      return;
    }

    const dados = Object.fromEntries(new FormData(form).entries());
    enviar(dados);

    const msg = $('#form-msg');
    if (msg) {
      msg.classList.add('is-visible');
      msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    form.reset();
  });
})();
