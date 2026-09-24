/* =========================================================================
   ATACADO POLVO - Autenticação no front

   Carregado em todas as páginas. Faz duas coisas:
     1. Descobre quem está logado (GET /api/auth/eu) e desenha o botão de
        conta no header.
     2. Expõe window.API com os helpers usados por entrar/conta/admin.

   O site continua funcionando sem backend: se a API não responde (abriu o
   HTML com duplo clique, por exemplo), o botão de conta simplesmente não
   aparece e nada quebra.
   ========================================================================= */

(function () {
  'use strict';

  const $ = (s, ctx = document) => ctx.querySelector(s);

  /* ---- 1. Cliente HTTP -------------------------------------------------- */

  const AVISO_SEM_API =
    'Esta página está sendo servida por um servidor de arquivos (Live Server, ' +
    'por exemplo), que não tem a API. Rode "node server/server.js" e abra ' +
    'http://127.0.0.1:3000';

  /* A API sempre responde JSON. Se veio outra coisa, quem respondeu foi um
     servidor estático — e o 404/405 dele não quer dizer nada sobre a conta.
     Sem esta checagem o usuário vê só "Erro 405" e não tem como adivinhar. */
  const respondeuJson = res =>
    (res.headers.get('content-type') || '').includes('application/json');

  async function pedir(caminho, { metodo = 'GET', corpo } = {}) {
    const res = await fetch(caminho, {
      method: metodo,
      credentials: 'same-origin',
      headers: corpo ? { 'Content-Type': 'application/json' } : undefined,
      body: corpo ? JSON.stringify(corpo) : undefined
    });

    if (res.status === 204) return null;

    if (!respondeuJson(res)) {
      const e = new Error(AVISO_SEM_API);
      e.status = res.status;
      e.semApi = true;
      throw e;
    }

    let dados = null;
    try { dados = await res.json(); } catch { /* corpo vazio ou quebrado */ }

    if (!res.ok) {
      const e = new Error((dados && dados.erro) || `Erro ${res.status}`);
      e.status = res.status;
      throw e;
    }
    return dados;
  }

  /* Uma consulta só de sessão por carregamento de página, compartilhada
     entre o header e o script da página.
       sem resposta -> não há servidor (abriu o HTML direto)
       401          -> servidor no ar, ninguém logado
       200          -> logado                                              */
  let pendente = null;

  async function consultarSessao() {
    try {
      const res = await fetch('/api/auth/eu', { credentials: 'same-origin' });
      // Resposta que não é JSON veio de um servidor estático: aqui não há API.
      if (!respondeuJson(res)) return { backend: false, cliente: null };
      if (!res.ok) return { backend: true, cliente: null };
      const d = await res.json();
      return { backend: true, cliente: d.cliente };
    } catch {
      return { backend: false, cliente: null };
    }
  }

  const API = {
    pedir,
    cadastrar: d => pedir('/api/auth/cadastrar', { metodo: 'POST', corpo: d }),
    entrar:    d => pedir('/api/auth/entrar',    { metodo: 'POST', corpo: d }),
    sair:      () => pedir('/api/auth/sair',     { metodo: 'POST' }),
    eu:        () => pedir('/api/auth/eu'),
    salvarEu:  d => pedir('/api/auth/eu', { metodo: 'PATCH', corpo: d }),
    trocarSenha: d => pedir('/api/auth/senha', { metodo: 'PATCH', corpo: d }),

    admin: {
      resumo:   () => pedir('/api/admin/resumo'),
      clientes: () => pedir('/api/admin/clientes'),
      editar:   (id, d) => pedir(`/api/admin/clientes/${id}`, { metodo: 'PATCH', corpo: d }),
      remover:  id => pedir(`/api/admin/clientes/${id}`, { metodo: 'DELETE' })
    },

    /** Resolve com o cliente logado ou null. Nunca rejeita.
        A primeira chamada é reaproveitada: o header e a página pedem o
        mesmo /api/auth/eu no carregamento, e uma requisição basta. */
    quemSou() {
      if (!pendente) pendente = consultarSessao();
      return pendente.then(r => r.cliente);
    },

    /** Descarta o cache — use depois de entrar ou sair. */
    esquecerSessao() { pendente = null; },

    /** false quando a página está num servidor estático, sem API. */
    temBackend() {
      if (!pendente) pendente = consultarSessao();
      return pendente.then(r => r.backend);
    },

    AVISO_SEM_API,

    /** Manda para o login guardando a página de origem. */
    exigirLogin(destino) {
      const volta = encodeURIComponent(destino || location.pathname + location.search);
      location.replace(`entrar.html?volta=${volta}`);
    }
  };

  window.API = API;

  /* ---- 2. Botão de conta no header -------------------------------------- */

  const iniciais = nome => nome.trim().split(/\s+/).slice(0, 2)
    .map(p => p[0]).join('').toUpperCase();

  const ICONE_PESSOA =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
    'stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg>';

  function desenharBotao(cliente) {
    const acoes = $('.header-actions');
    if (!acoes) return;

    // Substitui o botão anterior, se a função rodar de novo (ex.: após sair).
    const antigo = $('.conta-btn', acoes);
    if (antigo) antigo.remove();

    const a = document.createElement('a');
    a.className = 'icon-btn conta-btn';

    if (cliente) {
      a.href = cliente.papel === 'admin' ? 'admin.html' : 'conta.html';
      a.title = cliente.papel === 'admin'
        ? `Painel admin — ${cliente.nome}`
        : `Minha conta — ${cliente.nome}`;
      a.innerHTML = `<span class="conta-iniciais">${iniciais(cliente.nome)}</span>`;
      a.classList.add('conta-btn--logado');
      if (cliente.papel === 'admin') a.classList.add('conta-btn--admin');
    } else {
      a.href = 'entrar.html';
      a.title = 'Entrar na minha conta';
      // Com rótulo: um ícone de pessoa sozinho, ao lado do alternador de
      // tema, não se lê como "entrar" — ninguém clica no que não entende.
      // O texto some abaixo de 1140px (ver .conta-btn--entrar no CSS), onde
      // o cabeçalho já está no limite com sete itens de menu.
      a.innerHTML = ICONE_PESSOA + '<span class="conta-rotulo">Entrar</span>';
      a.classList.add('conta-btn--entrar');
    }
    a.setAttribute('aria-label', a.title);

    // Antes do alternador de tema, para o menu hambúrguer seguir por último.
    acoes.insertBefore(a, acoes.firstChild);
  }

  window.atualizarBotaoConta = desenharBotao;

  /* ---- 3. Boot ----------------------------------------------------------- */

  async function init() {
    if (!pendente) pendente = consultarSessao();
    const { backend, cliente } = await pendente;
    // Sem servidor não desenha nada: um "Entrar" levaria a uma página que
    // não funciona quando o HTML é aberto com duplo clique.
    if (backend) desenharBotao(cliente);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
