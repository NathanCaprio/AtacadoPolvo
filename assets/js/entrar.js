/* =========================================================================
   ATACADO POLVO - Tela de entrar / criar conta
   ========================================================================= */

(function () {
  'use strict';

  const $ = s => document.querySelector(s);

  const abaEntrar = $('#aba-entrar');
  const abaCriar = $('#aba-criar');
  const painelEntrar = $('#painel-entrar');
  const painelCriar = $('#painel-criar');
  const aviso = $('#aviso');

  if (!abaEntrar) return;

  /* ---- 1. Para onde ir depois do login ---------------------------------- */

  // Só aceita caminho relativo interno: um "volta" com http:// ou //host
  // viraria redirecionamento aberto para fora do site.
  function destino() {
    const v = new URLSearchParams(location.search).get('volta') || '';
    if (!v.startsWith('/') || v.startsWith('//')) return null;
    return v;
  }

  const irPara = cliente =>
    location.replace(destino() || (cliente.papel === 'admin' ? 'admin.html' : 'conta.html'));

  /* ---- 2. Abas ----------------------------------------------------------- */

  function trocar(paraCriar) {
    abaEntrar.setAttribute('aria-selected', String(!paraCriar));
    abaCriar.setAttribute('aria-selected', String(paraCriar));
    painelEntrar.hidden = paraCriar;
    painelCriar.hidden = !paraCriar;
    esconderAviso();
    const foco = (paraCriar ? painelCriar : painelEntrar).querySelector('input');
    if (foco) foco.focus();
  }

  abaEntrar.addEventListener('click', () => trocar(false));
  abaCriar.addEventListener('click', () => trocar(true));

  // ?novo=1 abre direto no cadastro
  if (new URLSearchParams(location.search).get('novo')) trocar(true);

  /* ---- 3. Avisos --------------------------------------------------------- */

  function mostrarErro(msg) {
    aviso.textContent = msg;
    aviso.className = 'aviso aviso--erro is-visible';
    aviso.scrollIntoView({ block: 'nearest' });
  }
  function esconderAviso() {
    aviso.className = 'aviso aviso--erro';
    aviso.textContent = '';
  }

  /* ---- 4. Envio ---------------------------------------------------------- */

  function ligar(form, acao) {
    form.addEventListener('submit', async ev => {
      ev.preventDefault();
      esconderAviso();

      const botao = form.querySelector('button[type="submit"]');
      const rotulo = botao.textContent;
      botao.disabled = true;
      botao.textContent = 'Aguarde…';

      try {
        const dados = Object.fromEntries(new FormData(form).entries());
        const r = await acao(dados);
        irPara(r.cliente);
      } catch (e) {
        mostrarErro(e.message || 'Não deu para concluir. Tente de novo.');
        botao.disabled = false;
        botao.textContent = rotulo;
      }
    });
  }

  ligar($('#form-entrar'), d => window.API.entrar(d));
  ligar($('#form-criar'), d => window.API.cadastrar(d));

  /* ---- 5. Boot ------------------------------------------------------------ */

  window.API.temBackend().then(async ok => {
    if (!ok) {
      // Página aberta por um servidor estático (Live Server) ou direto do
      // disco: sem API, login e cadastro não têm como funcionar. Avisa logo,
      // em vez de deixar a pessoa tentar e receber um erro sem sentido.
      mostrarErro(window.API.AVISO_SEM_API);
      document.querySelectorAll('#form-entrar, #form-criar')
        .forEach(f => f.querySelectorAll('input, button')
          .forEach(el => { el.disabled = true; }));
      return;
    }
    const c = await window.API.quemSou();
    if (c) irPara(c);
  });
})();
