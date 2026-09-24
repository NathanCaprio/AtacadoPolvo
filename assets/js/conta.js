/* =========================================================================
   ATACADO POLVO - Área do cliente
   ========================================================================= */

(function () {
  'use strict';

  const $ = s => document.querySelector(s);

  const conteudo = $('#conteudo');
  if (!conteudo) return;

  const aviso = $('#aviso');
  const form = $('#form-dados');

  const iniciais = nome => nome.trim().split(/\s+/).slice(0, 2)
    .map(p => p[0]).join('').toUpperCase();

  const primeiroNome = nome => nome.trim().split(/\s+/)[0];

  function dataBonita(iso) {
    // vem como "2026-09-24 01:36:41" (UTC, do SQLite)
    const d = new Date(iso.replace(' ', 'T') + 'Z');
    if (isNaN(d)) return '';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  function mostrarAviso(msg, ok = true) {
    aviso.textContent = msg;
    aviso.className = `aviso ${ok ? 'aviso--ok' : 'aviso--erro'} is-visible`;
    clearTimeout(mostrarAviso.t);
    mostrarAviso.t = setTimeout(() => { aviso.className = 'aviso'; }, 4000);
  }

  function preencher(c) {
    $('#avatar').textContent = iniciais(c.nome);
    $('#saudacao').textContent = `Olá, ${primeiroNome(c.nome)}`;
    $('#desde').textContent = c.criado_em ? `Cliente desde ${dataBonita(c.criado_em)}` : '';
    $('#d-nome').value = c.nome || '';
    $('#d-empresa').value = c.empresa || '';
    $('#d-telefone').value = c.telefone || '';
    $('#d-email').value = c.email || '';
  }

  /* ---- Orçamentos do cliente ---------------------------------------------- */

  const SITUACAO = {
    novo: 'Recebido',
    em_andamento: 'Em andamento',
    fechado: 'Fechado',
    perdido: 'Encerrado'
  };

  const el = (tag, classe, txt) => {
    const n = document.createElement(tag);
    if (classe) n.className = classe;
    if (txt !== undefined) n.textContent = txt;
    return n;
  };

  async function carregarOrcamentos() {
    const alvo = $('#orcamentos');
    let lista;
    try {
      ({ orcamentos: lista } = await window.API.pedir('/api/meus/orcamentos'));
    } catch {
      alvo.replaceChildren(el('p', 'vazio', 'Não deu para carregar seus orçamentos agora.'));
      return;
    }

    if (!lista.length) {
      alvo.replaceChildren(el('p', null,
        'Você ainda não enviou nenhum orçamento. Monte sua lista no catálogo e envie — ' +
        'a gente responde no mesmo dia útil.'));
      alvo.firstChild.style.cssText = 'font-size:.93rem;color:var(--ink-3)';
      return;
    }

    alvo.replaceChildren();
    for (const o of lista) {
      const item = el('div', 'orc');

      const topo = el('div', 'orc-topo');
      topo.append(
        el('b', null, `${o.total_itens} ${o.total_itens === 1 ? 'item' : 'itens'}`),
        el('span', `selo selo--${o.situacao}`, SITUACAO[o.situacao] || o.situacao)
      );
      item.append(topo);

      item.append(el('span', 'orc-data', dataBonita(o.criado_em)));

      // Nomes vêm do catálogo, mas passaram pelo banco: textContent sempre.
      const resumo = o.itens.slice(0, 3).map(i => `${i.qtd}x ${i.nome}`).join(' · ');
      const resto = o.itens.length > 3 ? ` +${o.itens.length - 3}` : '';
      item.append(el('p', 'orc-itens', resumo + resto));

      alvo.append(item);
    }
  }

  /* ---- Boot: exige login ------------------------------------------------- */

  window.API.quemSou().then(c => {
    if (!c) return window.API.exigirLogin('/conta.html');
    preencher(c);
    conteudo.hidden = false;
    carregarOrcamentos();
  });

  /* ---- Salvar ------------------------------------------------------------ */

  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const botao = form.querySelector('button[type="submit"]');
    botao.disabled = true;

    try {
      const d = Object.fromEntries(new FormData(form).entries());
      const r = await window.API.salvarEu(d);
      preencher(r.cliente);
      if (window.atualizarBotaoConta) window.atualizarBotaoConta(r.cliente);
      mostrarAviso('Dados salvos.');
    } catch (e) {
      mostrarAviso(e.message || 'Não deu para salvar.', false);
    } finally {
      botao.disabled = false;
    }
  });

  /* ---- Trocar senha ------------------------------------------------------ */

  const formSenha = $('#form-senha');
  const avisoSenha = $('#aviso-senha');

  function avisarSenha(msg, ok = true) {
    avisoSenha.textContent = msg;
    avisoSenha.className = `aviso ${ok ? 'aviso--ok' : 'aviso--erro'} is-visible`;
    clearTimeout(avisarSenha.t);
    avisarSenha.t = setTimeout(() => { avisoSenha.className = 'aviso'; }, 5000);
  }

  formSenha.addEventListener('submit', async ev => {
    ev.preventDefault();
    const botao = formSenha.querySelector('button[type="submit"]');
    botao.disabled = true;

    try {
      await window.API.trocarSenha(Object.fromEntries(new FormData(formSenha).entries()));
      formSenha.reset();
      avisarSenha('Senha trocada. As outras sessões foram encerradas.');
    } catch (e) {
      avisarSenha(e.message || 'Não deu para trocar a senha.', false);
    } finally {
      botao.disabled = false;
    }
  });

  /* ---- Sair -------------------------------------------------------------- */

  $('#sair').addEventListener('click', async () => {
    try { await window.API.sair(); } catch { /* segue mesmo assim */ }
    location.replace('index.html');
  });
})();
