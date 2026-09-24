/* =========================================================================
   ATACADO POLVO - Tela da calculadora de consumo
   -------------------------------------------------------------------------
   A aritmética mora em consumo.js. Aqui só tem tela: montar os campos a
   partir da declaração do segmento, recalcular a cada digitada e oferecer
   as três saídas da lista pronta.

   Três saídas de propósito, porque são três pessoas diferentes:
     - Lista de orçamento  -> quem quer mexer nas quantidades antes de pedir
     - WhatsApp            -> quem resolve agora, na conversa
     - Imprimir / PDF      -> o síndico que precisa levar isso para a
                              assembleia e o diretor que anexa ao processo
                              de compra. Sem papel, a compra não é aprovada.

   O resultado aparece já na abertura, com os valores padrão preenchidos:
   tela de calculadora que começa vazia esperando um clique é tela que a
   pessoa fecha antes de descobrir para que serve.
   ========================================================================= */
(function () {
  'use strict';

  const raiz = document.querySelector('[data-calculadora]');
  if (!raiz || !window.CONSUMO || !window.CATALOGO) return;

  const $  = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  const elAbas    = $('[data-calc-abas]', raiz);
  const elCampos  = $('[data-calc-campos]', raiz);
  const elRes     = $('[data-calc-resultado]', raiz);
  const elResumo  = $('[data-calc-resumo]', raiz);
  const elLista   = $('[data-calc-lista]', raiz);
  const elPerfil  = $('[data-calc-perfil]', raiz);
  const formLead  = $('[data-lead]', raiz.closest('main') || document);

  const CHAVE_SEG = 'ap-calc-segmento';
  const CHAVE_ORC = 'ap-orcamento';          // mesma lista do catálogo

  let segmento = escolherSegmento();
  let ultimo = null;                          // último resultado calculado
  let valores = {};

  /* ---- 1. Qual segmento abre ---------------------------------------------
     Ordem: o que veio no link (a landing manda ?seg=escola), depois o que a
     pessoa escolheu da última vez, depois condomínio.                       */

  function escolherSegmento() {
    const doLink = new URLSearchParams(location.search).get('seg');
    if (doLink && window.CONSUMO.SEGMENTOS[doLink]) return doLink;
    try {
      const salvo = localStorage.getItem(CHAVE_SEG);
      if (salvo && window.CONSUMO.SEGMENTOS[salvo]) return salvo;
    } catch (e) { /* modo privado */ }
    return 'condominio';
  }

  /* ---- 2. Abas ------------------------------------------------------------ */

  function montarAbas() {
    if (!elAbas) return;
    elAbas.innerHTML = Object.entries(window.CONSUMO.SEGMENTOS).map(([id, seg]) => `
      <button type="button" class="segtab${id === segmento ? ' is-on' : ''}"
              role="tab" id="aba-${id}" aria-selected="${id === segmento}"
              aria-controls="calc-campos" data-seg="${id}">${seg.nome}</button>
    `).join('');

    elAbas.addEventListener('click', ev => {
      const botao = ev.target.closest('[data-seg]');
      if (!botao || botao.dataset.seg === segmento) return;
      segmento = botao.dataset.seg;
      try { localStorage.setItem(CHAVE_SEG, segmento); } catch (e) { /* modo privado */ }

      $$('.segtab', elAbas).forEach(b => {
        const ativo = b.dataset.seg === segmento;
        b.classList.toggle('is-on', ativo);
        b.setAttribute('aria-selected', String(ativo));
      });
      montarCampos();
      calcular();
    });
  }

  /* ---- 3. Campos, montados a partir da declaração do segmento ------------- */

  function montarCampos() {
    const seg = window.CONSUMO.SEGMENTOS[segmento];
    elCampos.setAttribute('aria-labelledby', 'aba-' + segmento);

    elCampos.innerHTML = seg.campos.map(campo => {
      const id = 'calc-' + campo.id;
      const dica = campo.dica ? `<p class="hint">${campo.dica}</p>` : '';

      if (campo.tipo === 'numero') {
        return `<div class="field">
          <label for="${id}">${campo.rotulo}</label>
          <input class="input" type="number" id="${id}" name="${campo.id}"
                 value="${campo.padrao}" min="${campo.min}" max="${campo.max}"
                 step="1" inputmode="numeric" data-calc-campo>
          ${dica}
        </div>`;
      }

      if (campo.tipo === 'opcao') {
        return `<div class="field">
          <label for="${id}">${campo.rotulo}</label>
          <select class="input" id="${id}" name="${campo.id}" data-calc-campo>
            ${campo.opcoes.map(o => `<option value="${o.id}"${o.id === String(campo.padrao) ? ' selected' : ''}>${o.rotulo}</option>`).join('')}
          </select>
          ${dica}
        </div>`;
      }

      // marcas: caixas de seleção agrupadas
      return `<fieldset class="field field--marcas">
        <legend>${campo.rotulo}</legend>
        <div class="marcas">
          ${campo.opcoes.map(o => `
            <label class="marca">
              <input type="checkbox" name="${campo.id}" value="${o.id}" data-calc-campo>
              <span>${o.rotulo}</span>
            </label>`).join('')}
        </div>
        ${dica}
      </fieldset>`;
    }).join('');
  }

  function lerValores() {
    const seg = window.CONSUMO.SEGMENTOS[segmento];
    const v = { areas: {} };

    seg.campos.forEach(campo => {
      if (campo.tipo === 'marcas') {
        $$(`[name="${campo.id}"]`, elCampos).forEach(c => {
          if (c.checked) v.areas[c.value] = true;
        });
        return;
      }
      const el = $(`[name="${campo.id}"]`, elCampos);
      if (!el) return;
      // Campo vazio vira o padrão: a tela nunca fica sem resultado enquanto
      // a pessoa apaga um número para digitar outro.
      v[campo.id] = el.value === '' ? campo.padrao : el.value;
    });

    return v;
  }

  /* ---- 4. Resultado -------------------------------------------------------- */

  const plural = (n, um, muitos) => n + ' ' + (n === 1 ? um : muitos);

  function montarResumo(r) {
    const seg = window.CONSUMO.SEGMENTOS[segmento];
    elResumo.innerHTML = `
      <div class="calc-num"><strong>${r.resumo.itensMes}</strong><span>itens no pedido do mês</span></div>
      <div class="calc-num"><strong>${r.resumo.caixasMes}</strong><span>caixas e fardos por mês</span></div>
      <div class="calc-num"><strong>${r.resumo.itensTrimestre}</strong><span>itens de troca trimestral</span></div>`;
    elResumo.setAttribute('aria-label',
      'Estimativa para ' + seg.nome.toLowerCase() + ': ' +
      plural(r.resumo.itensMes, 'item', 'itens') + ' por mês.');
  }

  function linhas(itens) {
    return itens.map(i => `
      <tr>
        <td>
          <span class="nome">${i.nome}</span>
          <span class="calc-porque">${i.porque}</span>
        </td>
        <td class="num">${i.unidades} ${i.emb.indexOf('Par') === 0 ? 'pares' : 'un.'}</td>
        <td class="num"><b>${i.caixas}x</b> ${i.caixa}</td>
      </tr>`).join('');
  }

  function montarLista(r) {
    const mes = r.itens.filter(i => i.periodo === 'mes');
    const tri = r.itens.filter(i => i.periodo === 'trimestre');

    const tabela = (titulo, itens) => !itens.length ? '' : `
      <h3 class="calc-grupo">${titulo}</h3>
      <div class="tabela-wrap">
        <table class="tabela calc-tabela">
          <thead><tr><th>Produto</th><th>Consumo</th><th>Como vem</th></tr></thead>
          <tbody>${linhas(itens)}</tbody>
        </table>
      </div>`;

    elLista.innerHTML =
      tabela('Todo mês', mes) +
      tabela('A cada três meses', tri);
  }

  function montarPerfil(r) {
    if (!elPerfil) return;
    const seg = window.CONSUMO.SEGMENTOS[segmento];
    const partes = [];

    seg.campos.forEach(campo => {
      if (campo.tipo === 'marcas') {
        campo.opcoes.forEach(o => { if (valores.areas[o.id]) partes.push(o.rotulo); });
        return;
      }
      const v = valores[campo.id];
      if (v === undefined || v === '') return;

      if (campo.tipo === 'opcao') {
        partes.push((campo.opcoes.find(o => o.id === String(v)) || {}).rotulo || v);
        return;
      }
      // "1 torres ou blocos" no topo da estimativa faz a ferramenta inteira
      // parecer automática demais, então o rótulo curto tem singular e plural.
      const n = Number(v);
      const curto = campo.curto || [campo.rotulo.toLowerCase(), campo.rotulo.toLowerCase()];
      partes.push(v + ' ' + (n === 1 ? curto[0] : curto[1]));
    });

    elPerfil.textContent = seg.nome + ' — ' + partes.join(' · ');
  }

  function calcular() {
    valores = lerValores();
    try {
      ultimo = window.CONSUMO.calcular(segmento, valores, window.CATALOGO);
    } catch (e) {
      // Catálogo fora de sincronia com o modelo: melhor sumir com a seção do
      // que mostrar uma lista pela metade e o cliente pedir errado.
      elRes.hidden = true;
      return;
    }

    elRes.hidden = false;
    montarResumo(ultimo);
    montarLista(ultimo);
    montarPerfil(ultimo);
    prepararLead();
    prepararWhatsApp();
  }

  /* ---- 5. Saídas ----------------------------------------------------------- */

  /* Lista de orçamento: a mesma chave do catálogo, então a pessoa cai em
     produtos.html com tudo dentro e pode ajustar item a item. Soma ao que já
     houver lá em vez de substituir — quem já tinha montado meia lista não
     pode perdê-la por clicar aqui. */
  function mandarParaOrcamento() {
    let lista = [];
    try { lista = JSON.parse(localStorage.getItem(CHAVE_ORC)) || []; } catch (e) { lista = []; }

    ultimo.itens.forEach(i => {
      const atual = lista.find(x => x.id === i.id);
      if (atual) atual.qtd = Math.max(atual.qtd, i.caixas);
      else lista.push({ id: i.id, qtd: i.caixas });
    });

    try { localStorage.setItem(CHAVE_ORC, JSON.stringify(lista)); } catch (e) { /* modo privado */ }
    location.href = 'produtos.html#orcamento';
  }

  function textoCompleto() {
    const seg = window.CONSUMO.SEGMENTOS[segmento];
    return 'Montei a estimativa de consumo pelo site.\n\n' +
           window.CONSUMO.emTexto(ultimo, valores) +
           '\n\nPodem me passar a cotação desses itens para ' + seg.nome.toLowerCase() + '?';
  }

  function prepararWhatsApp() {
    const botao = $('[data-calc-wpp]', raiz);
    if (!botao || !window.linkWhatsApp) return;
    botao.href = window.linkWhatsApp(textoCompleto());
  }

  /* O formulário de lead é o mesmo dos outros da casa (lead.js cuida dele).
     A estimativa entra num campo escondido marcado com data-extra, então
     chega no painel dentro do corpo da mensagem sem precisar de coluna
     nova no banco a cada segmento que a calculadora ganhar. */
  function prepararLead() {
    if (!formLead) return;
    formLead.dataset.segmento = segmento;

    const campo = $('[name="estimativa"]', formLead);
    if (campo) campo.value = window.CONSUMO.emTexto(ultimo, valores);

    const titulo = $('[data-lead-titulo]', formLead);
    if (titulo) {
      titulo.textContent = 'Receber esta lista cotada';
    }
  }

  /* ---- 6. Ligação ---------------------------------------------------------- */

  // Data do cabeçalho de impressão. Fica aqui e não no HTML porque o valor
  // precisa ser o do dia em que a pessoa imprime, não o da publicação.
  const elData = $('[data-calc-data]', raiz);
  if (elData) {
    elData.textContent = new Date().toLocaleDateString('pt-BR',
      { day: '2-digit', month: 'long', year: 'numeric' });
  }

  montarAbas();
  montarCampos();
  calcular();

  // Recalcula enquanto digita: o número muda na frente da pessoa, que é o
  // que faz ela testar cenários em vez de preencher e ir embora. Com uma
  // pausa curta, porque o resumo é um live region: recalcular a cada tecla
  // faria o leitor de tela anunciar "40... 4... 45" a cada dígito apagado.
  let espera = null;
  const recalcular = () => {
    clearTimeout(espera);
    espera = setTimeout(calcular, 350);
  };
  elCampos.addEventListener('input', recalcular);
  elCampos.addEventListener('change', recalcular);

  // O formulário existe pelo agrupamento e pelo autofill; ele não envia nada.
  const formCalc = elCampos.closest('form');
  if (formCalc) formCalc.addEventListener('submit', ev => { ev.preventDefault(); calcular(); });

  const botaoOrc = $('[data-calc-orcamento]', raiz);
  if (botaoOrc) botaoOrc.addEventListener('click', mandarParaOrcamento);

  const botaoImp = $('[data-calc-imprimir]', raiz);
  if (botaoImp) botaoImp.addEventListener('click', () => window.print());
})();
