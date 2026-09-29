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

  /* ---- Funis de origem ----------------------------------------------------

     A pergunta que o painel precisa responder não é "quantas mensagens
     chegaram", é "de onde". Sem esse recorte não dá para saber se a landing
     de condomínio ou a de escola vale o esforço.

     São dois recortes porque são duas decisões diferentes. SEGMENTO diz quem
     pediu (condomínio, escola) e responde onde insistir no conteúdo. ORIGEM
     diz o que fez a pessoa pedir (a landing, a calculadora, o rodapé) e
     responde qual peça do site está puxando lead. Uma calculadora que traz
     síndico aparece nos dois, mas só o segundo mostra que foi ela.        */

  const SEGMENTO = {
    condominio: 'Condomínios',
    escola: 'Escolas',
    empresa: 'Empresas',
    residencial: 'Residencial',
    restaurante: 'Restaurantes',
    hotel: 'Hotéis',
    pet: 'Pet shops e veterinárias',
    revenda: 'Mercados e revenda',
    outros: 'Sem segmento'
  };

  const ORIGEM = {
    landing: 'Páginas de segmento',
    calculadora: 'Calculadora de consumo',
    recorrencia: 'Pedido recorrente',
    cupom: 'Pop-up de cupom',
    contato: 'Formulário de contato',
    orcamento: 'Lista de orçamento',
    rodape: 'Rodapé'
  };

  /* Uma função para os dois blocos: muda o campo que identifica a fatia, o
     dicionário de rótulos e onde desenhar. */
  function desenharFunil(dados, opcoes) {
    const alvo = $(opcoes.alvo);
    const secao = $(opcoes.secao);
    if (!alvo || !Array.isArray(dados) || !dados.length) {
      if (secao) secao.hidden = true;
      return;
    }

    // A barra é proporcional ao maior valor, não ao total: com um segmento
    // dominante, proporção do total deixaria todos os outros invisíveis.
    const maior = Math.max(...dados.map(s => s.n), 1);

    alvo.replaceChildren();
    for (const s of dados) {
      const chave = s[opcoes.campo] || 'outros';
      const linha = el('div', 'funil-linha');

      linha.append(el('span', 'funil-rotulo', opcoes.rotulos[chave] || chave));

      const trilho = el('div', 'funil-trilho');
      const barra = el('div', `funil-barra funil-barra--${chave}`);
      barra.style.width = Math.round((s.n / maior) * 100) + '%';
      trilho.append(barra);
      linha.append(trilho);

      const numeros = el('span', 'funil-numeros');
      numeros.append(el('b', null, String(s.n)));
      numeros.append(document.createTextNode(` · ${s.n30} em 30 dias`));
      linha.append(numeros);

      alvo.append(linha);
    }
    secao.hidden = false;
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
      // Enquanto não há SMTP, é assim que o cliente que perdeu a senha
      // volta: o atendente gera o link e passa no WhatsApp. O link é
      // mostrado em prompt() de propósito — dá para copiar com Ctrl+C e
      // ele não fica na tela para o próximo que passar pelo balcão.
      caixa.append(botao('Link de senha', 'btn--ghost', async () => {
        try {
          const r = await window.API.pedir(`/api/admin/clientes/${c.id}/recuperacao`,
            { metodo: 'POST' });
          window.prompt(
            `Link de redefinição para ${r.cliente.email} — vale ${r.horas}h. ` +
            'Copie e mande para o cliente:', r.link);
          mostrarAviso(`Link gerado para ${r.cliente.email}. Vale ${r.horas} hora(s).`);
        } catch (e) {
          mostrarAviso(e.message || 'Não deu para gerar o link.', false);
        }
      }));

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
    const prop = estadoProposta(o);
    if (prop) tdSit.append(el('div', 'email proposta-estado', prop));
    tr.append(tdSit);

    const tdAcoes = el('td');
    const caixa = el('div', 'acoes');
    caixa.append(botao(o.token ? 'Proposta' : 'Enviar ao cliente', 'btn--primary',
      () => abrirEditor(o)));
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
    caixa.append(botao('Excluir', 'btn--perigo', () => {
      if (!confirm(`Excluir o orçamento de ${o.cliente_nome || 'visitante'}? Isso não tem volta.`)) return;
      agir(() => window.API.pedir(`/api/admin/orcamentos/${o.id}`, { metodo: 'DELETE' }),
        'Orçamento excluído.');
    }));
    tdAcoes.append(caixa);
    tr.append(tdAcoes);
    return tr;
  }

  /* ---- Proposta enviada ao cliente ----------------------------------------

     Mesmo orçamento, com preço por item e um link público que o cliente
     abre sem conta (orcamento.html?t=TOKEN). Preço circula em centavos; o
     campo aceita "45,90", "1.234,50" ou "45.90".                            */

  function estadoProposta(o) {
    if (!o.token) return '';
    if (o.aprovado_em) return `✓ Aprovado pelo cliente ${data(o.aprovado_em, true)}`;
    if (o.alterado_em && o.alterado_em > o.enviado_em) {
      return `Cliente alterou ${data(o.alterado_em, true)}`;
    }
    return `Link enviado ${data(o.enviado_em, true)}`;
  }

  const editor = $('#editor-proposta');
  let editando = null;     // orçamento aberto (null = novo)
  let itensEd = [];        // [{id, nome, caixa, qtd, preco}]

  function paraCentavos(v) {
    let t = String(v).trim();
    if (!t) return null;
    if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
    const n = Math.round(parseFloat(t) * 100);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }
  const deCentavos = c => (c == null ? '' : (c / 100).toFixed(2).replace('.', ','));

  function avisoEditor(msg, ok = false) {
    const a = $('#ep-aviso');
    a.textContent = msg;
    a.className = msg ? `aviso ${ok ? 'aviso--ok' : 'aviso--erro'} is-visible` : 'aviso';
  }

  const reais = c => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Subtotais e total são recalculados a cada tecla sem redesenhar a
  // tabela (redesenhar tiraria o foco do campo que está sendo digitado).
  const celulaSub = new WeakMap();   // item -> <td> do subtotal
  function atualizarTotais() {
    let total = 0, aCotar = 0, caixas = 0;
    for (const item of itensEd) {
      caixas += item.qtd;
      const cel = celulaSub.get(item);
      if (item.preco == null) { aCotar++; if (cel) cel.textContent = '—'; continue; }
      const sub = item.preco * item.qtd;
      total += sub;
      if (cel) cel.textContent = reais(sub);
    }
    const tfoot = $('#ep-total');
    tfoot.hidden = !itensEd.length;
    tfoot.replaceChildren();
    if (!itensEd.length) return;
    const tr = el('tr');
    tr.append(el('td', 'nome', `${itensEd.length} ${itensEd.length === 1 ? 'item' : 'itens'} · ${caixas} cx`));
    const td = el('td', 'num nome', `Total ${reais(total)}`);
    td.colSpan = 3;
    if (aCotar) td.append(el('span', 'proposta-cotar', `${aCotar} a cotar (fora do total)`));
    tr.append(td, el('td'));
    tfoot.append(tr);
  }

  function desenharItensEditor() {
    const tbody = $('#ep-itens');
    tbody.replaceChildren();
    if (!itensEd.length) {
      const tr = el('tr', 'proposta-vazio');
      const td = el('td', '', 'Nenhum item ainda — busque um produto abaixo.');
      td.colSpan = 5;
      tr.append(td);
      tbody.append(tr);
    }
    for (const item of itensEd) {
      const tr = el('tr');
      const tdNome = el('td');
      tdNome.append(el('div', 'nome', item.nome));
      if (item.caixa) tdNome.append(el('div', 'email', item.caixa));
      tr.append(tdNome);

      const qtd = el('input', 'input input--curto');
      qtd.type = 'number'; qtd.min = '1'; qtd.max = '9999'; qtd.value = item.qtd;
      qtd.setAttribute('aria-label', `Quantidade de ${item.nome}`);
      qtd.addEventListener('input', () => {
        item.qtd = Math.max(1, Math.min(9999, parseInt(qtd.value, 10) || 1));
        atualizarTotais();
      });
      const tdQ = el('td'); tdQ.append(qtd); tr.append(tdQ);

      const preco = el('input', 'input input--curto');
      preco.inputMode = 'decimal'; preco.placeholder = 'a cotar';
      preco.value = deCentavos(item.preco);
      preco.setAttribute('aria-label', `Preço por caixa de ${item.nome}`);
      preco.addEventListener('input', () => { item.preco = paraCentavos(preco.value); atualizarTotais(); });
      preco.addEventListener('change', () => { preco.value = deCentavos(item.preco); });
      const tdP = el('td'); tdP.append(preco); tr.append(tdP);

      const tdSub = el('td', 'num');
      celulaSub.set(item, tdSub);
      tr.append(tdSub);

      const tdR = el('td');
      tdR.append(botao('Remover', 'btn--perigo', () => {
        itensEd = itensEd.filter(x => x !== item);
        desenharItensEditor();
      }));
      tr.append(tdR);
      tbody.append(tr);
    }
    atualizarTotais();
  }

  function mostrarLink(o) {
    const caixa = $('#ep-link');
    caixa.hidden = !o || !o.token;
    if (caixa.hidden) return;
    const url = `${location.origin}/orcamento.html?t=${o.token}`;
    $('#ep-url').value = url;
    // Com telefone o WhatsApp já abre na conversa do cliente; sem, a loja
    // escolhe o contato.
    const tel = (o.contato_tel || '').replace(/\D/g, '');
    const numero = tel.length === 10 || tel.length === 11 ? '55' + tel : tel;
    const nome = o.cliente_nome || o.contato_nome;
    const msg = `Olá${nome ? ', ' + nome : ''}! Segue o seu orçamento do Atacado Polvo. ` +
      `Pelo link dá para conferir, ajustar quantidades, remover itens e aprovar: ${url}`;
    $('#ep-wpp').href = `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`;
  }

  function abrirEditor(o) {
    editando = o || null;
    itensEd = o ? o.itens.map(i => ({ preco: null, ...i })) : [];
    $('#ep-titulo').textContent = o ? `Orçamento nº ${o.id}` : 'Novo orçamento';
    $('#ep-contato').hidden = !!o;
    $('#ep-nome').value = '';
    $('#ep-tel').value = '';
    $('#ep-busca').value = '';
    $('#ep-validade').value = (o && o.validade) || '';
    $('#ep-obs').value = (o && o.observacao) || '';
    $('#ep-salvar').textContent = o && o.token ? 'Salvar alterações' : 'Salvar e gerar link';
    avisoEditor('');
    desenharItensEditor();
    mostrarLink(o);
    editor.showModal();
  }

  if (editor) {
    /* Busca de produto: ignora acento/maiúscula, casa todas as palavras
       digitadas em nome, embalagem, categoria ou código. Sem resultado, o
       texto vira um item avulso (o servidor aceita item fora do catálogo). */
    const busca = $('#ep-busca');
    const lista = $('#ep-resultados');
    const cat = window.CATALOGO || { categorias: [], produtos: [] };
    const nomeCat = Object.fromEntries(cat.categorias.map(c => [c.id, c.nome]));
    const normalizar = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const indice = cat.produtos.map(p => ({
      p, chave: normalizar([p.nome, p.caixa, p.emb, nomeCat[p.cat], p.id].join(' '))
    }));
    let opcoes = [];   // [{p} | {avulso: 'texto'}]
    let ativa = -1;

    function adicionarItem(o) {
      const id = o.p ? o.p.id : 'avulso-' + normalizar(o.avulso).replace(/\W+/g, '-').slice(0, 30);
      const ja = itensEd.find(i => i.id === id);
      if (ja) ja.qtd = Math.min(9999, ja.qtd + 1);
      else if (o.p) itensEd.push({ id, nome: o.p.nome, caixa: o.p.caixa, qtd: 1, preco: null });
      else itensEd.push({ id, nome: o.avulso.slice(0, 160), caixa: '', qtd: 1, preco: null });
      busca.value = '';
      fecharLista();
      desenharItensEditor();
      busca.focus();
    }

    // Destaca no nome o trecho que casou com a primeira palavra da busca.
    function nomeDestacado(nome, termo) {
      const div = el('div', 'pb-nome');
      // Normaliza letra a letra para os índices baterem com o nome original.
      const i = termo ? Array.from(nome, normalizar).join('').indexOf(termo) : -1;
      if (i < 0) { div.textContent = nome; return div; }
      div.append(nome.slice(0, i), el('mark', '', nome.slice(i, i + termo.length)), nome.slice(i + termo.length));
      return div;
    }

    function fecharLista() {
      lista.hidden = true;
      busca.setAttribute('aria-expanded', 'false');
      busca.removeAttribute('aria-activedescendant');
      ativa = -1;
    }

    function marcarAtiva(n) {
      const lis = lista.querySelectorAll('li[role="option"]');
      if (!lis.length) return;
      ativa = (n + lis.length) % lis.length;
      lis.forEach((li, i) => li.setAttribute('aria-selected', i === ativa ? 'true' : 'false'));
      busca.setAttribute('aria-activedescendant', lis[ativa].id);
      lis[ativa].scrollIntoView({ block: 'nearest' });
    }

    function desenharLista() {
      const q = normalizar(busca.value).trim();
      const termos = q.split(/\s+/).filter(Boolean);
      opcoes = (termos.length ? indice.filter(x => termos.every(t => x.chave.includes(t))) : indice)
        .slice(0, 40).map(x => ({ p: x.p }));
      if (busca.value.trim().length >= 3) opcoes.push({ avulso: busca.value.trim() });

      lista.replaceChildren();
      opcoes.forEach((o, i) => {
        const li = el('li');
        li.id = `ep-op-${i}`;
        li.setAttribute('role', 'option');
        const info = el('div', 'pb-info');
        if (o.p) {
          info.append(nomeDestacado(o.p.nome, termos[0]),
            el('div', 'pb-meta', `${o.p.caixa} · ${nomeCat[o.p.cat] || ''}`));
          li.append(info);
          const ja = itensEd.find(it => it.id === o.p.id);
          if (ja) li.append(el('span', 'pb-ja', `no orçamento · ${ja.qtd} cx`));
        } else {
          info.append(el('div', 'pb-nome', `+ Adicionar “${o.avulso}” como item avulso`),
            el('div', 'pb-meta', 'Fora do catálogo — defina quantidade e preço na tabela'));
          li.append(info);
        }
        // mousedown (e não click) para não perder o foco do campo antes.
        li.addEventListener('mousedown', ev => { ev.preventDefault(); adicionarItem(o); });
        li.addEventListener('mousemove', () => { if (ativa !== i) marcarAtiva(i); });
        lista.append(li);
      });
      if (!opcoes.length) {
        const li = el('li', 'pb-vazio', 'Nenhum produto encontrado. Digite 3 letras ou mais para item avulso.');
        lista.append(li);
      }
      lista.hidden = false;
      busca.setAttribute('aria-expanded', 'true');
      if (opcoes.length && termos.length) marcarAtiva(0);
      else ativa = -1;
    }

    busca.addEventListener('input', desenharLista);
    busca.addEventListener('focus', desenharLista);
    busca.addEventListener('blur', fecharLista);
    busca.addEventListener('keydown', ev => {
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        if (lista.hidden) desenharLista();
        marcarAtiva(ativa + (ev.key === 'ArrowDown' ? 1 : -1));
      } else if (ev.key === 'Enter') {
        ev.preventDefault();
        if (ativa >= 0 && opcoes[ativa]) adicionarItem(opcoes[ativa]);
      } else if (ev.key === 'Escape' && !lista.hidden) {
        ev.preventDefault();   // fecha só a lista, não o diálogo
        fecharLista();
      }
    });

    $('#novo-orcamento').addEventListener('click', () => abrirEditor(null));

    $('#ep-salvar').addEventListener('click', async ev => {
      const b = ev.currentTarget;
      if (!itensEd.length) return avisoEditor('Inclua ao menos um item.');
      if (!editando && $('#ep-nome').value.trim().length < 2) {
        return avisoEditor('Informe o nome do cliente.');
      }

      const corpo = {
        itens: itensEd,
        validade: $('#ep-validade').value,
        observacao: $('#ep-obs').value
      };
      b.disabled = true;
      try {
        let r;
        if (editando) {
          r = await window.API.pedir(`/api/admin/orcamentos/${editando.id}/proposta`,
            { metodo: 'PUT', corpo });
        } else {
          corpo.contato = { nome: $('#ep-nome').value, tel: $('#ep-tel').value };
          r = await window.API.pedir('/api/admin/orcamentos', { metodo: 'POST', corpo });
          editando = { contato_nome: corpo.contato.nome, contato_tel: corpo.contato.tel };
        }
        Object.assign(editando, corpo, { id: r.id, token: r.token });
        $('#ep-titulo').textContent = `Orçamento nº ${r.id}`;
        $('#ep-contato').hidden = true;
        $('#ep-salvar').textContent = 'Salvar alterações';
        mostrarLink(editando);
        avisoEditor('Salvo. Copie o link ou envie pelo WhatsApp.', true);
        await carregar();
      } catch (e) {
        avisoEditor(e.message || 'Não deu para salvar.');
      } finally {
        b.disabled = false;
      }
    });

    /* PDF sem dependência: monta uma página limpa numa janela nova e abre a
       impressão do navegador ("Salvar como PDF"). */
    $('#ep-pdf').addEventListener('click', () => {
      if (!itensEd.length) return avisoEditor('Inclua ao menos um item.');
      const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      const cliente = editando ? (editando.cliente_nome || editando.contato_nome) : $('#ep-nome').value.trim();
      const validade = $('#ep-validade').value;
      const obs = $('#ep-obs').value.trim();
      let total = 0, aCotar = 0;
      const linhas = itensEd.map(i => {
        const sub = i.preco == null ? null : i.preco * i.qtd;
        if (sub == null) aCotar++; else total += sub;
        return `<tr><td>${esc(i.nome)}<small>${esc(i.caixa)}</small></td><td class="n">${i.qtd}</td>` +
          `<td class="n">${i.preco == null ? 'a cotar' : reais(i.preco)}</td><td class="n">${sub == null ? '—' : reais(sub)}</td></tr>`;
      }).join('');
      const titulo = editando && editando.id ? `Orçamento nº ${editando.id}` : 'Orçamento';
      const w = window.open('', '_blank');
      if (!w) return avisoEditor('Libere pop-ups para baixar o PDF.');
      w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>${esc(titulo)} — Atacado Polvo</title><style>
body{font:14px/1.5 system-ui,sans-serif;color:#1b0733;margin:32px}
h1{margin:0;font-size:22px;color:#7b2fe3}.topo{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #7b2fe3;padding-bottom:12px;margin-bottom:18px}
table{width:100%;border-collapse:collapse;margin-top:14px}th,td{padding:8px;border-bottom:1px solid #e8def7;text-align:left;vertical-align:top}
th{font-size:12px;text-transform:uppercase;color:#6f5c8a}.n{text-align:right;white-space:nowrap}small{display:block;color:#6f5c8a}
tfoot td{font-weight:700;border:0}.obs{margin-top:18px;padding:10px 14px;border-left:3px solid #7b2fe3;background:#f8f5fe;white-space:pre-line}
@page{margin:14mm}</style></head><body>
<div class="topo"><div><h1>Atacado Polvo</h1><div>${esc(titulo)}</div></div>
<div class="n">Emitido em ${new Date().toLocaleDateString('pt-BR')}${validade ? `<br>Válido até ${validade.split('-').reverse().join('/')}` : ''}</div></div>
${cliente ? `<div><strong>Cliente:</strong> ${esc(cliente)}</div>` : ''}
<table><thead><tr><th>Produto</th><th class="n">Qtd (cx)</th><th class="n">Preço/cx</th><th class="n">Subtotal</th></tr></thead>
<tbody>${linhas}</tbody><tfoot><tr><td colspan="3" class="n">Total</td><td class="n">${reais(total)}</td></tr>
${aCotar ? `<tr><td colspan="4" class="n" style="font-weight:400">${aCotar} item(ns) a cotar, fora do total</td></tr>` : ''}</tfoot></table>
${obs ? `<div class="obs">${esc(obs)}</div>` : ''}
</body></html>`);
      w.document.close();
      // Script inline na janela nova seria barrado pelo CSP (herdado); o
      // print é chamado daqui.
      w.focus();
      w.print();
    });

    $('#ep-copiar').addEventListener('click', async () => {
      const campo = $('#ep-url');
      try { await navigator.clipboard.writeText(campo.value); }
      catch { campo.select(); document.execCommand('copy'); }
      avisoEditor('Link copiado.', true);
    });

    $('#ep-revogar').addEventListener('click', async () => {
      if (!editando || !confirm('Desativar o link? Quem tem a URL deixa de ver o orçamento.')) return;
      try {
        await window.API.pedir(`/api/admin/orcamentos/${editando.id}/proposta`, { metodo: 'DELETE' });
        editando.token = null;
        mostrarLink(editando);
        $('#ep-salvar').textContent = 'Salvar e gerar link';
        avisoEditor('Link desativado. Salvar de novo gera um link novo.', true);
        await carregar();
      } catch (e) { avisoEditor(e.message); }
    });
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

    const selos = el('div', 'selos-lead');
    if (m.segmento) {
      selos.append(el('span', `selo selo--${m.segmento}`, SEGMENTO[m.segmento] || m.segmento));
    }
    if (m.origem === 'landing') {
      selos.append(el('span', 'selo selo--landing', 'veio da landing'));
    }
    // O vendedor confere este código antes de aplicar o desconto na proposta.
    if (m.cupom) selos.append(el('span', 'selo selo--cupom', 'cupom ' + m.cupom));
    // O aceite da política é o que a auditoria de administradora e de escola
    // pede. Sem carimbo, o selo avisa — pode ser lead antigo, de antes do
    // checkbox existir.
    selos.append(m.aceite_em
      ? el('span', 'selo selo--aceite', 'aceite registrado')
      : el('span', 'selo selo--sem-aceite', 'sem aceite'));
    if (selos.childNodes.length) tdMsg.append(selos);

    tdMsg.append(el('p', 'msg-corpo', m.mensagem));
    tr.append(tdMsg);

    tr.append(el('td', 'num', data(m.criado_em, true)));

    const tdAcoes = el('td');
    const caixa = el('div', 'acoes');
    caixa.append(botao(m.lida ? 'Marcar não lida' : 'Marcar lida', 'btn--ghost',
      () => agir(() => window.API.pedir(`/api/admin/mensagens/${m.id}`,
        { metodo: 'PATCH', corpo: { lida: !m.lida } }))));
    caixa.append(botao('Excluir', 'btn--perigo', () => {
      if (!confirm(`Excluir a mensagem de ${m.nome}? Isso não tem volta.`)) return;
      agir(() => window.API.pedir(`/api/admin/mensagens/${m.id}`, { metodo: 'DELETE' }),
        'Mensagem excluída.');
    }));
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
    desenharFunil(resumo.porSegmento,
      { campo: 'seg', rotulos: SEGMENTO, alvo: '#funil-barras', secao: '#funil' });
    desenharFunil(resumo.porOrigem,
      { campo: 'origem', rotulos: ORIGEM, alvo: '#origem-barras', secao: '#origem' });
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

  /* ---- Exportação CSV -----------------------------------------------------

     Link direto, não fetch: a rota devolve o arquivo com Content-Disposition
     e o navegador cuida do download. Se a sessão tiver caído, o servidor
     responde 401 em JSON e a aba mostra o erro — pior do que tratar aqui,
     mas em troca não seguramos o arquivo inteiro em memória.               */

  document.querySelectorAll('[data-exportar]').forEach(botao => {
    botao.addEventListener('click', () => {
      const tipo = botao.dataset.exportar;
      const a = document.createElement('a');
      a.href = `/api/admin/exportar?tipo=${encodeURIComponent(tipo)}`;
      a.download = '';
      document.body.append(a);
      a.click();
      a.remove();
      mostrarAviso('Arquivo gerado. Confira a pasta de downloads.');
    });
  });

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
