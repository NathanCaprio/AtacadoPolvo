/* =========================================================================
   ATACADO POLVO - Formulário de cotação das landings de segmento

   Por que existe, já que a página inteira já leva para o WhatsApp: porque
   boa parte do síndico e do diretor não abre conversa. Ou está no
   computador da administradora (onde o WhatsApp Web não está logado), ou
   quer só deixar o pedido e receber depois. Esse lead hoje se perde.

   O formulário grava o lead na API com origem='landing' e o segmento da
   página, e só então oferece o WhatsApp. Assim o contato existe mesmo
   quando a conversa não acontece.

   O módulo é genérico: quem manda é o HTML.

     <form data-lead data-segmento="condominio" data-assunto="...">
       <input name="nome"  data-rotulo="Nome"     required>
       <input name="email" data-rotulo="E-mail"   required data-regra="email">
       <input name="tel"   data-rotulo="WhatsApp" required data-regra="tel"
              data-mascara="telefone">
       ...
     </form>

   Sem servidor (HTML aberto com duplo clique), o envio cai direto no
   WhatsApp — a página nunca fica sem saída.
   ========================================================================= */
(function () {
  'use strict';

  const formularios = Array.from(document.querySelectorAll('[data-lead]'));
  if (!formularios.length) return;

  /* ---- 1. Máscaras (mesmas do formulário de contato) -------------------- */

  function mascaraTelefone(v) {
    v = v.replace(/\D/g, '').slice(0, 11);
    if (v.length <= 10) {
      return v.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (m, a, b, c) =>
        [a && '(' + a, a.length === 2 ? ') ' : '', b, c && '-' + c].join(''));
    }
    return v.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3');
  }

  const MASCARAS = { telefone: mascaraTelefone };

  /* ---- 2. Validação ------------------------------------------------------ */

  const REGRAS = {
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'Informe um e-mail válido.',
    tel:   v => v.replace(/\D/g, '').length >= 10 || 'Informe um telefone com DDD.',
    nome:  v => v.trim().length >= 3 || 'Informe seu nome completo.'
  };

  function mostrarErro(campo, msg) {
    const box = campo.closest('.field');
    if (!box) return;
    const p = box.querySelector('.err');
    if (p) p.textContent = msg;
    box.classList.add('has-error');
  }

  function limparErro(campo) {
    const box = campo.closest('.field');
    if (box) box.classList.remove('has-error');
  }

  function validar(campo) {
    const valor = campo.type === 'checkbox' ? (campo.checked ? 'x' : '') : campo.value;

    if (campo.required && !valor.trim()) {
      mostrarErro(campo, campo.type === 'checkbox'
        ? 'Precisamos do seu aceite para entrar em contato.'
        : 'Preencha este campo.');
      return false;
    }
    if (!valor.trim()) { limparErro(campo); return true; }   // opcional e vazio

    const regra = REGRAS[campo.dataset.regra];
    if (regra) {
      const r = regra(valor);
      if (r !== true) { mostrarErro(campo, r); return false; }
    }
    limparErro(campo);
    return true;
  }

  /* ---- 3. Mensagem de WhatsApp montada a partir dos rótulos ------------- */

  function montarMensagem(form, dados) {
    const titulo = form.dataset.titulo || 'Pedido de cotação pelo site';
    const linhas = [`*${titulo}*`, ''];

    form.querySelectorAll('[data-rotulo]').forEach(campo => {
      const v = (dados[campo.name] || '').trim();
      if (!v) return;
      // Em <select>, o rótulo legível é o texto da opção, não o value.
      const texto = campo.tagName === 'SELECT'
        ? campo.options[campo.selectedIndex].text
        : v;
      linhas.push(`${campo.dataset.rotulo}: ${texto}`);
    });

    return linhas.join('\n');
  }

  /* ---- 4. Envio ---------------------------------------------------------- */

  /* O corpo que vai para /api/mensagens. A mensagem em si é o texto livre
     mais os campos extras da landing (nº de unidades, por exemplo): eles não
     têm coluna no banco e cabem melhor no corpo do que em coluna nova a cada
     landing criada. */
  function corpoApi(form, dados) {
    const extras = [];
    form.querySelectorAll('[data-extra]').forEach(campo => {
      const v = (dados[campo.name] || '').trim();
      if (!v) return;
      const texto = campo.tagName === 'SELECT'
        ? campo.options[campo.selectedIndex].text
        : v;
      extras.push(`${campo.dataset.rotulo || campo.name}: ${texto}`);
    });

    const livre = (dados.mensagem || '').trim();
    const mensagem = [extras.join('\n'), livre].filter(Boolean).join('\n\n')
      || 'Pediu cotação pela landing, sem detalhes.';

    return {
      nome: dados.nome || '',
      email: dados.email || '',
      telefone: dados.tel || dados.telefone || '',
      empresa: dados.empresa || '',
      assunto: form.dataset.assunto || 'Cotação pela landing',
      origem: form.dataset.origem || 'landing',
      // A landing de recorrência pergunta o segmento num <select name="segmento">;
      // as de segmento o trazem fixo no data-segmento do formulário.
      segmento: dados.segmento || form.dataset.segmento || null,
      // O checkbox é obrigatório, então aqui ele está sempre marcado — mas
      // quem carimba a data é o servidor.
      aceite: true,
      mensagem
    };
  }

  function sucesso(form, comBackend) {
    const caixa = form.parentElement.querySelector('[data-lead-ok]');
    if (!caixa) return;

    const texto = caixa.querySelector('[data-lead-ok-texto]');
    if (texto) {
      texto.textContent = comBackend
        ? 'Respondemos com a cotação dentro do horário comercial — normalmente no mesmo dia útil.'
        : 'Abrimos o WhatsApp com seu pedido já escrito. É só enviar.';
    }

    form.hidden = true;
    caixa.hidden = false;
    caixa.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function enviar(form, dados) {
    const mensagem = montarMensagem(form, dados);
    const linkWpp = window.linkWhatsApp ? window.linkWhatsApp(mensagem) : null;

    // O botão do estado de sucesso já sai apontando para a conversa pronta.
    const botaoWpp = form.parentElement.querySelector('[data-lead-wpp]');
    if (botaoWpp && linkWpp) {
      botaoWpp.href = linkWpp;
      botaoWpp.target = '_blank';
      botaoWpp.rel = 'noopener';
    }

    if (!window.API) {                       // página sem os scripts da API
      if (linkWpp) window.open(linkWpp, '_blank', 'noopener');
      return sucesso(form, false);
    }

    try {
      await window.API.pedir('/api/mensagens', { metodo: 'POST', corpo: corpoApi(form, dados) });
      sucesso(form, true);
    } catch (e) {
      // Sem API (HTML aberto direto, Live Server) ou servidor fora do ar: o
      // lead não pode evaporar, então vai pelo WhatsApp.
      if (linkWpp) window.open(linkWpp, '_blank', 'noopener');
      sucesso(form, false);
    }
  }

  /* ---- 5. Ligação -------------------------------------------------------- */

  formularios.forEach(form => {
    const campos = Array.from(form.querySelectorAll('input, select, textarea'))
      .filter(c => c.name);

    campos.forEach(campo => {
      const mascara = MASCARAS[campo.dataset.mascara];
      if (mascara) {
        campo.addEventListener('input', e => { e.target.value = mascara(e.target.value); });
      }
      campo.addEventListener('blur', () => validar(campo));
      campo.addEventListener('input', () => {
        const box = campo.closest('.field');
        if (box && box.classList.contains('has-error')) validar(campo);
      });
      campo.addEventListener('change', () => {
        const box = campo.closest('.field');
        if (box && box.classList.contains('has-error')) validar(campo);
      });
    });

    form.addEventListener('submit', async ev => {
      ev.preventDefault();

      const invalidos = campos.filter(c => !validar(c));
      if (invalidos.length) { invalidos[0].focus(); return; }

      const botao = form.querySelector('button[type="submit"]');
      const rotulo = botao ? botao.innerHTML : '';
      if (botao) { botao.disabled = true; botao.textContent = 'Enviando…'; }

      const dados = Object.fromEntries(new FormData(form).entries());
      await enviar(form, dados);

      if (botao) { botao.disabled = false; botao.innerHTML = rotulo; }
      form.reset();
    });
  });
})();
