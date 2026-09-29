/* =========================================================================
   ATACADO POLVO - Orçamento enviado ao cliente (orcamento.html?t=TOKEN)

   A loja monta a proposta no painel e manda o link. Aqui o cliente vê os
   itens com preço, muda quantidades, remove o que não quer e aprova.

   As mudanças ficam só na tela até "Salvar alterações": assim dá para
   mexer à vontade e desfazer, e a loja vê uma alteração por vez, não um
   carimbo a cada clique no "+". Preço e nome nunca saem daqui — o servidor
   só aceita posição e quantidade.
   ========================================================================= */

(function () {
  'use strict';

  const $ = s => document.querySelector(s);
  const painel = {
    carregando: $('#painel-carregando'),
    invalido: $('#painel-invalido'),
    proposta: $('#painel-proposta')
  };
  if (!painel.proposta) return;

  const aviso = $('#aviso');
  const token = new URLSearchParams(location.search).get('t') || '';

  let orcamento = null;   // como está no servidor
  let rascunho = [];      // [{pos, qtd}] como está na tela

  const real = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const dinheiro = c => (c == null ? 'A cotar' : real.format(c / 100));

  function mostrar(nome) {
    Object.entries(painel).forEach(([k, el]) => { el.hidden = k !== nome; });
  }

  function avisar(msg, ok = false) {
    aviso.textContent = msg;
    aviso.className = `aviso ${ok ? 'aviso--ok' : 'aviso--erro'} is-visible`;
    aviso.scrollIntoView({ block: 'nearest' });
  }
  function esconderAviso() { aviso.className = 'aviso'; aviso.textContent = ''; }

  function dataBr(iso) {
    if (!iso) return '';
    const [a, m, d] = iso.slice(0, 10).split('-');
    return `${d}/${m}/${a}`;
  }

  const mudou = () =>
    rascunho.length !== orcamento.itens.length ||
    rascunho.some((r, n) => r.pos !== n || r.qtd !== orcamento.itens[n].qtd);

  function el(tag, classe, txt) {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (txt != null) e.textContent = txt;
    return e;
  }

  /* ---- Desenho ------------------------------------------------------------ */

  function desenhar() {
    const o = orcamento;
    const editavel = o.editavel;

    $('#p-numero').textContent = `Orçamento nº ${o.id}`;
    $('#p-titulo').textContent = o.cliente_nome ? `Orçamento para ${o.cliente_nome}` : 'Seu orçamento';

    let status;
    if (o.aprovado_em) status = `Aprovado em ${dataBr(o.aprovado_em)}. Obrigado! Vamos entrar em contato para combinar a entrega.`;
    else if (o.vencido) status = `Este orçamento venceu em ${dataBr(o.validade)}. Fale com a gente para atualizar os preços.`;
    else if (!editavel) status = 'Este orçamento não aceita mais alterações.';
    else status = o.validade ? `Válido até ${dataBr(o.validade)}.` : 'Confira os itens abaixo.';
    $('#p-status').textContent = status;

    const obs = $('#p-obs');
    obs.hidden = !o.observacao;
    obs.textContent = o.observacao || '';

    const tbody = $('#p-itens');
    tbody.replaceChildren();
    let total = 0, aCotar = false;

    for (const r of rascunho) {
      const item = o.itens[r.pos];
      const sub = item.preco == null ? null : item.preco * r.qtd;
      if (sub == null) aCotar = true; else total += sub;

      const tr = el('tr');
      const tdNome = el('td');
      tdNome.append(el('div', 'nome', item.nome));
      if (item.caixa) tdNome.append(el('div', 'email', item.caixa));
      tr.append(tdNome);

      const tdQtd = el('td');
      if (editavel) {
        const caixa = el('div', 'qty');
        const menos = el('button', null, '−');
        menos.type = 'button';
        menos.setAttribute('aria-label', `Diminuir ${item.nome}`);
        menos.disabled = r.qtd <= 1;
        menos.onclick = () => { r.qtd = Math.max(1, r.qtd - 1); atualizar(); };

        const campo = el('input', 'input');
        campo.type = 'number';
        campo.min = '1';
        campo.max = '9999';
        campo.value = r.qtd;
        campo.setAttribute('aria-label', `Quantidade de ${item.nome}`);
        campo.onchange = () => {
          r.qtd = Math.max(1, Math.min(9999, parseInt(campo.value, 10) || 1));
          atualizar();
        };

        const mais = el('button', null, '+');
        mais.type = 'button';
        mais.setAttribute('aria-label', `Aumentar ${item.nome}`);
        mais.onclick = () => { r.qtd = Math.min(9999, r.qtd + 1); atualizar(); };

        caixa.append(menos, campo, mais);
        tdQtd.append(caixa);
      } else {
        tdQtd.textContent = r.qtd;
      }
      tr.append(tdQtd);

      tr.append(el('td', 'num', dinheiro(item.preco)));
      tr.append(el('td', 'num', dinheiro(sub)));

      const tdRem = el('td');
      if (editavel) {
        const rem = el('button', 'btn btn--perigo btn--sm', 'Remover');
        rem.type = 'button';
        rem.disabled = rascunho.length === 1;
        rem.title = rascunho.length === 1 ? 'O orçamento precisa de ao menos um item' : '';
        rem.onclick = () => { rascunho = rascunho.filter(x => x !== r); atualizar(); };
        tdRem.append(rem);
      }
      tr.append(tdRem);
      tbody.append(tr);
    }

    $('#p-total').textContent = real.format(total / 100) + (aCotar ? ' + itens a cotar' : '');

    const alterado = mudou();
    $('#p-dica').hidden = !editavel;
    $('#b-salvar').hidden = !editavel || !alterado;
    $('#b-desfazer').hidden = !editavel || !alterado;
    // Aprovar com alteração não salva aprovaria outra coisa: salva antes.
    $('#b-aprovar').hidden = !editavel || alterado;

    $('#b-wpp').href = window.linkWhatsApp
      ? window.linkWhatsApp(`Olá! Sobre o orçamento nº ${o.id} que recebi pelo site.`)
      : '#';
  }

  function atualizar() { esconderAviso(); desenhar(); }

  function receber(o) {
    orcamento = o;
    rascunho = o.itens.map((i, pos) => ({ pos, qtd: i.qtd }));
    desenhar();
  }

  /* ---- Ações --------------------------------------------------------------- */

  async function comBotao(botao, fn) {
    const rotulo = botao.textContent;
    botao.disabled = true;
    botao.textContent = 'Aguarde…';
    try { await fn(); } catch (e) { avisar(e.message || 'Não deu para concluir. Tente de novo.'); }
    finally { botao.disabled = false; botao.textContent = rotulo; }
  }

  const url = `/api/proposta/${encodeURIComponent(token)}`;

  $('#b-desfazer').addEventListener('click', () => { receber(orcamento); esconderAviso(); });

  $('#b-salvar').addEventListener('click', ev => comBotao(ev.currentTarget, async () => {
    const d = await window.API.pedir(url, {
      metodo: 'PATCH',
      corpo: { itens: rascunho.map(r => ({ id: `#${r.pos}`, qtd: r.qtd })) }
    });
    receber(d.orcamento);
    avisar('Alterações salvas. A loja já consegue ver a versão nova.', true);
  }));

  $('#b-aprovar').addEventListener('click', ev => {
    if (!confirm('Aprovar este orçamento? Depois disso ele não pode mais ser alterado por aqui.')) return;
    comBotao(ev.currentTarget, async () => {
      const d = await window.API.pedir(`${url}/aprovar`, { metodo: 'POST' });
      receber(d.orcamento);
      avisar('Orçamento aprovado! Vamos falar com você em breve.', true);
    });
  });

  // Sai da página com alteração não salva: o navegador pergunta.
  window.addEventListener('beforeunload', ev => {
    if (orcamento && orcamento.editavel && mudou()) ev.preventDefault();
  });

  /* ---- Início -------------------------------------------------------------- */

  (async function iniciar() {
    if (!token) return mostrar('invalido');
    try {
      const d = await window.API.pedir(url);
      mostrar('proposta');
      receber(d.orcamento);
    } catch (e) {
      mostrar('invalido');
      if (e.status !== 404) avisar(e.message);
    }
  })();
})();
