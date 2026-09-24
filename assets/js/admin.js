/* =========================================================================
   ATACADO POLVO - Painel administrativo

   A tabela é montada com createElement/textContent, nunca com innerHTML:
   nome, e-mail e empresa vêm do cadastro do cliente, então são conteúdo
   não confiável e não podem virar HTML.
   ========================================================================= */

(function () {
  'use strict';

  const $ = s => document.querySelector(s);

  const conteudo = $('#conteudo');
  if (!conteudo) return;

  const aviso = $('#aviso');
  const linhas = $('#linhas');
  let eu = null;

  /* ---- Utilidades -------------------------------------------------------- */

  const iniciais = nome => nome.trim().split(/\s+/).slice(0, 2)
    .map(p => p[0]).join('').toUpperCase();

  function data(iso, comHora = false) {
    if (!iso) return '—';
    const d = new Date(iso.replace(' ', 'T') + 'Z');   // SQLite grava em UTC
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('pt-BR', comHora
      ? { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }
      : { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function mostrarAviso(msg, ok = true) {
    aviso.textContent = msg;
    aviso.className = `aviso ${ok ? 'aviso--ok' : 'aviso--erro'} is-visible`;
    clearTimeout(mostrarAviso.t);
    mostrarAviso.t = setTimeout(() => { aviso.className = 'aviso'; }, 5000);
  }

  const el = (tag, classe, texto) => {
    const n = document.createElement(tag);
    if (classe) n.className = classe;
    if (texto !== undefined) n.textContent = texto;
    return n;
  };

  /* ---- Métricas ---------------------------------------------------------- */

  // Ordem proposital: o que precisa de ação vem primeiro.
  const ROTULOS = {
    orcamentosNovos: 'orçamentos a tratar',
    mensagensNovas: 'mensagens não lidas',
    orcamentos7d: 'orçamentos em 7 dias',
    clientes: 'contas no total',
    novos7d: 'contas novas em 7 dias'
  };

  function desenharMetricas(r) {
    const alvo = $('#metricas');
    alvo.replaceChildren();
    for (const [chave, rotulo] of Object.entries(ROTULOS)) {
      const cartao = el('div', 'metrica');
      cartao.append(el('b', null, String(r[chave] ?? 0)), el('span', null, rotulo));
      alvo.append(cartao);
    }
  }

  /* ---- Tabela ------------------------------------------------------------ */

  function botao(rotulo, classe, aoClicar) {
    const b = el('button', `btn btn--sm ${classe}`, rotulo);
    b.type = 'button';
    b.addEventListener('click', aoClicar);
    return b;
  }

  function desenharLinha(c) {
    const tr = el('tr');

    // Nome, e-mail e empresa numa coluna só: com uma coluna separada para
    // empresa a tabela não cabe na tela e vira rolagem horizontal.
    const tdNome = el('td');
    tdNome.append(el('div', 'nome', c.nome));
    tdNome.append(el('div', 'email', c.empresa ? `${c.email} · ${c.empresa}` : c.email));
    tr.append(tdNome);

    // Papel + estado
    const tdPapel = el('td');
    tdPapel.append(el('span', `selo selo--${c.papel}`, c.papel === 'admin' ? 'admin' : 'cliente'));
    if (!c.ativo) tdPapel.append(document.createTextNode(' '), el('span', 'selo selo--inativo', 'inativo'));
    tr.append(tdPapel);

    tr.append(el('td', 'num', data(c.criado_em)));
    tr.append(el('td', 'num', data(c.ultimo_acesso, true)));

    // Ações
    const tdAcoes = el('td');
    const caixa = el('div', 'acoes');
    const souEu = eu && c.id === eu.id;

    if (souEu) {
      caixa.append(el('span', 'selo selo--cliente', 'você'));
    } else {
      caixa.append(botao(
        c.papel === 'admin' ? 'Rebaixar' : 'Promover', 'btn--ghost',
        () => agir(() => window.API.admin.editar(c.id, {
          papel: c.papel === 'admin' ? 'cliente' : 'admin'
        }))
      ));
      caixa.append(botao(
        c.ativo ? 'Desativar' : 'Ativar', 'btn--ghost',
        () => agir(() => window.API.admin.editar(c.id, { ativo: !c.ativo }))
      ));
      caixa.append(botao('Remover', 'btn--perigo', () => {
        if (!confirm(`Remover a conta de ${c.nome} (${c.email})? Isso não tem volta.`)) return;
        agir(() => window.API.admin.remover(c.id), 'Conta removida.');
      }));
    }

    tdAcoes.append(caixa);
    tr.append(tdAcoes);
    return tr;
  }

  function desenharTabela(lista) {
    linhas.replaceChildren();
    if (!lista.length) {
      const tr = el('tr');
      const td = el('td', 'vazio', 'Nenhuma conta cadastrada ainda.');
      td.colSpan = 5;
      tr.append(td);
      linhas.append(tr);
      return;
    }
    for (const c of lista) linhas.append(desenharLinha(c));
  }

  /* ---- Orçamentos --------------------------------------------------------- */

  const SITUACAO = {
    novo: 'Novo',
    em_andamento: 'Em andamento',
    fechado: 'Fechado',
    perdido: 'Perdido'
  };
  const PROXIMA = { novo: 'em_andamento', em_andamento: 'fechado', fechado: 'novo', perdido: 'novo' };

  function linhaOrcamento(o) {
    const tr = el('tr');

    // Quem
    const tdQuem = el('td');
    if (o.cliente_nome) {
      tdQuem.append(el('div', 'nome', o.cliente_nome));
      tdQuem.append(el('div', 'email',
        o.cliente_empresa ? `${o.cliente_email} · ${o.cliente_empresa}` : o.cliente_email));
    } else {
      tdQuem.append(el('div', 'nome', 'Visitante'));
      tdQuem.append(el('div', 'email', 'sem conta'));
    }
    tr.append(tdQuem);

    // Itens
    const tdItens = el('td');
    const ul = el('ul', 'itens-lista');
    for (const i of o.itens.slice(0, 6)) {
      const li = el('li');
      li.append(el('b', null, `${i.qtd}x `), document.createTextNode(i.nome));
      ul.append(li);
    }
    if (o.itens.length > 6) ul.append(el('li', null, `+${o.itens.length - 6} item(ns)`));
    tdItens.append(ul);
    tr.append(tdItens);

    tr.append(el('td', 'num', data(o.criado_em, true)));

    const tdSit = el('td');
    tdSit.append(el('span', `selo selo--${o.situacao}`, SITUACAO[o.situacao] || o.situacao));
    tr.append(tdSit);

    const tdAcoes = el('td');
    const caixa = el('div', 'acoes');
    caixa.append(botao(
      `Marcar ${SITUACAO[PROXIMA[o.situacao]].toLowerCase()}`, 'btn--ghost',
      () => agir(() => window.API.pedir(`/api/admin/orcamentos/${o.id}`,
        { metodo: 'PATCH', corpo: { situacao: PROXIMA[o.situacao] } }))
    ));
    if (o.situacao !== 'perdido') {
      caixa.append(botao('Perdido', 'btn--perigo',
        () => agir(() => window.API.pedir(`/api/admin/orcamentos/${o.id}`,
          { metodo: 'PATCH', corpo: { situacao: 'perdido' } }))));
    }
    tdAcoes.append(caixa);
    tr.append(tdAcoes);
    return tr;
  }

  /* ---- Mensagens ----------------------------------------------------------- */

  function linhaMensagem(m) {
    const tr = el('tr');
    if (!m.lida) tr.className = 'nao-lida';

    const tdQuem = el('td');
    tdQuem.append(el('div', 'nome', m.nome));
    const detalhe = [m.email, m.telefone, m.empresa].filter(Boolean).join(' · ');
    tdQuem.append(el('div', 'email', detalhe));
    tr.append(tdQuem);

    const tdMsg = el('td');
    if (m.assunto) tdMsg.append(el('div', 'nome', m.assunto));
    tdMsg.append(el('p', 'msg-corpo', m.mensagem));
    tr.append(tdMsg);

    tr.append(el('td', 'num', data(m.criado_em, true)));

    const tdAcoes = el('td');
    const caixa = el('div', 'acoes');
    caixa.append(botao(m.lida ? 'Marcar não lida' : 'Marcar lida', 'btn--ghost',
      () => agir(() => window.API.pedir(`/api/admin/mensagens/${m.id}`,
        { metodo: 'PATCH', corpo: { lida: !m.lida } }))));
    tdAcoes.append(caixa);
    tr.append(tdAcoes);
    return tr;
  }

  /* ---- Abas ---------------------------------------------------------------- */

  const ABAS = ['orcamentos', 'mensagens', 'clientes'];

  function trocarAba(alvo) {
    for (const nome of ABAS) {
      $(`#aba-${nome}`).setAttribute('aria-selected', String(nome === alvo));
      $(`#painel-${nome}`).hidden = nome !== alvo;
    }
  }
  for (const nome of ABAS) {
    $(`#aba-${nome}`).addEventListener('click', () => trocarAba(nome));
  }

  function contador(id, n) {
    const e = $(id);
    e.textContent = n;
    e.hidden = !n;
  }

  /* ---- Carga e ações ------------------------------------------------------ */

  function preencher(tbody, linhas, montar, vazio, colunas) {
    tbody.replaceChildren();
    if (!linhas.length) {
      const tr = el('tr');
      const td = el('td', 'vazio', vazio);
      td.colSpan = colunas;
      tr.append(td);
      tbody.append(tr);
      return;
    }
    for (const x of linhas) tbody.append(montar(x));
  }

  async function carregar() {
    const [resumo, cli, orc, msg] = await Promise.all([
      window.API.admin.resumo(),
      window.API.admin.clientes(),
      window.API.pedir('/api/admin/orcamentos'),
      window.API.pedir('/api/admin/mensagens')
    ]);

    desenharMetricas(resumo);
    desenharTabela(cli.clientes);

    preencher($('#linhas-orcamentos'), orc.orcamentos, linhaOrcamento,
      'Nenhum orçamento recebido ainda.', 5);
    preencher($('#linhas-mensagens'), msg.mensagens, linhaMensagem,
      'Nenhuma mensagem recebida ainda.', 4);

    contador('#cont-orcamentos', resumo.orcamentosNovos);
    contador('#cont-mensagens', resumo.mensagensNovas);
  }

  async function agir(fn, mensagem = 'Pronto.') {
    try {
      await fn();
      await carregar();
      mostrarAviso(mensagem);
    } catch (e) {
      mostrarAviso(e.message || 'Não deu para concluir.', false);
    }
  }

  /* ---- Boot: exige admin --------------------------------------------------- */

  window.API.quemSou().then(async c => {
    if (!c) return window.API.exigirLogin('/admin.html');
    if (c.papel !== 'admin') return location.replace('conta.html');

    eu = c;
    $('#avatar').textContent = iniciais(c.nome);
    $('#quem').textContent = `${c.nome} — ${c.email}`;
    conteudo.hidden = false;

    try {
      await carregar();
    } catch (e) {
      mostrarAviso(e.message || 'Não deu para carregar os dados.', false);
    }
  });

  $('#sair').addEventListener('click', async () => {
    try { await window.API.sair(); } catch { /* segue mesmo assim */ }
    location.replace('index.html');
  });
})();
