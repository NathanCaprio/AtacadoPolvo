/* =========================================================================
   ATACADO POLVO - Recuperação de senha

   Uma página só, com quatro estados:

     sem ?token   -> formulário para pedir o link
     link enviado -> confirmação ("confira seu e-mail")
     com ?token   -> formulário de senha nova, se o token ainda vale
     token morto  -> aviso de link expirado

   Ficam na mesma página de propósito: o link do e-mail precisa cair em um
   endereço fixo, e quem chega por ele com o token vencido tem que poder
   pedir outro sem procurar onde.
   ========================================================================= */

(function () {
  'use strict';

  const $ = s => document.querySelector(s);

  const painel = {
    pedir: $('#painel-pedir'),
    enviado: $('#painel-enviado'),
    redefinir: $('#painel-redefinir'),
    invalido: $('#painel-invalido')
  };
  if (!painel.pedir) return;

  const aviso = $('#aviso');

  function mostrar(nome) {
    Object.entries(painel).forEach(([k, el]) => { el.hidden = k !== nome; });
    esconderAviso();
  }

  function erro(msg) {
    aviso.textContent = msg;
    aviso.className = 'aviso aviso--erro is-visible';
    aviso.scrollIntoView({ block: 'nearest' });
  }
  function esconderAviso() {
    aviso.className = 'aviso';
    aviso.textContent = '';
  }

  /* Enquanto o pedido está no ar, o botão trava: dois cliques gerariam dois
     tokens, e o segundo invalidaria o primeiro — que é o que a pessoa já
     teria recebido. */
  function ligar(form, acao) {
    form.addEventListener('submit', async ev => {
      ev.preventDefault();
      esconderAviso();

      const botao = form.querySelector('button[type="submit"]');
      const rotulo = botao.textContent;
      botao.disabled = true;
      botao.textContent = 'Aguarde…';

      try {
        await acao(Object.fromEntries(new FormData(form).entries()));
      } catch (e) {
        erro(e.message || 'Não deu para concluir. Tente de novo.');
      } finally {
        botao.disabled = false;
        botao.textContent = rotulo;
      }
    });
  }

  /* ---- 1. Pedir o link --------------------------------------------------- */

  ligar($('#form-pedir'), async dados => {
    const r = await window.API.pedir('/api/auth/recuperar', {
      metodo: 'POST', corpo: { email: dados.email }
    });

    $('#texto-enviado').textContent =
      `Se existir uma conta com ${dados.email}, o link de redefinição já está a ` +
      'caminho. Ele vale por uma hora.';

    // Só aparece em desenvolvimento, quando o servidor devolve o link porque
    // ainda não há serviço de e-mail configurado.
    if (r && r.link) {
      const caixa = $('#link-dev');
      const a = $('#link-dev-a');
      a.href = r.link;
      a.textContent = r.link;
      caixa.hidden = false;
    }

    mostrar('enviado');
  });

  /* ---- 2. Redefinir com o token ------------------------------------------ */

  const token = new URLSearchParams(location.search).get('token');

  ligar($('#form-redefinir'), async dados => {
    if (dados.senha !== dados.senha2) {
      const campo = $('#r-senha2').closest('.field');
      campo.querySelector('.err').textContent = 'As senhas não conferem.';
      campo.classList.add('has-error');
      return;
    }
    $('#r-senha2').closest('.field').classList.remove('has-error');

    const r = await window.API.pedir('/api/auth/redefinir', {
      metodo: 'POST', corpo: { token, senha: dados.senha }
    });

    // O servidor já abre a sessão junto com a troca, então a pessoa cai
    // logada na conta em vez de ter que digitar a senha nova na hora.
    window.API.esquecerSessao();
    location.replace(r.cliente && r.cliente.papel === 'admin' ? 'admin.html' : 'conta.html');
  });

  /* ---- 3. Boot ------------------------------------------------------------ */

  (async function init() {
    if (!await window.API.temBackend()) {
      mostrar('pedir');
      erro(window.API.AVISO_SEM_API);
      document.querySelectorAll('#form-pedir input, #form-pedir button')
        .forEach(el => { el.disabled = true; });
      return;
    }

    if (!token) return mostrar('pedir');

    // Confere o token antes de desenhar o formulário: descobrir que o link
    // venceu só depois de digitar a senha duas vezes seria cruel.
    try {
      const r = await window.API.pedir(
        '/api/auth/recuperar?token=' + encodeURIComponent(token));
      $('#texto-redefinir').textContent =
        `Você está redefinindo a senha da conta ${r.email}.`;
      mostrar('redefinir');
      $('#r-senha').focus();
    } catch {
      mostrar('invalido');
    }
  })();
})();
