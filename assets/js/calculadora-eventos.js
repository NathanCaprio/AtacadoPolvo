/* =========================================================================
   ATACADO POLVO - Tela da calculadora de festa e evento
   -------------------------------------------------------------------------
   Igual em espírito a calculadora.js, mas sem abas de segmento (aqui só
   existe "evento") e sem separação mês/trimestre — o resultado é uma lista
   única, para o dia do evento. A aritmética mora em consumo-evento.js.
   ========================================================================= */
(function () {
  'use strict';

  const raiz = document.querySelector('[data-calculadora]');
  if (!raiz || !window.CONSUMO_EVENTO || !window.CATALOGO) return;

  // Itens genéricos de data.js; com o catálogo do ERP no ar, ficam em
  // CATALOGO_REFERENCIA (ver calculadora.js).
  const catalogo = window.CATALOGO_REFERENCIA || window.CATALOGO;
  // Itens que o painel ligou a produtos do ERP saem com o produto real.
  const real = window.CATALOGO && window.CATALOGO.origem === 'erp' ? window.CATALOGO : null;

  const $  = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  const elCampos = $('[data-calc-campos]', raiz);
  const elRes    = $('[data-calc-resultado]', raiz);
  const elResumo = $('[data-calc-resumo]', raiz);
  const elLista  = $('[data-calc-lista]', raiz);
  const elPerfil = $('[data-calc-perfil]', raiz);
  const formLead = $('[data-lead]', raiz.closest('main') || document);

  const CHAVE_ORC = 'ap-orcamento';   // mesma lista do catálogo

  let ultimo = null;
  let valores = {};

  function montarCampos() {
    elCampos.innerHTML = window.CONSUMO_EVENTO.CAMPOS.map(campo => {
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
    const v = { extras: {} };

    window.CONSUMO_EVENTO.CAMPOS.forEach(campo => {
      if (campo.tipo === 'marcas') {
        $$(`[name="${campo.id}"]`, elCampos).forEach(c => {
          if (c.checked) v.extras[c.value] = true;
        });
        return;
      }
      const el = $(`[name="${campo.id}"]`, elCampos);
      if (!el) return;
      v[campo.id] = el.value === '' ? campo.padrao : el.value;
    });

    return v;
  }

  function montarResumo(r) {
    elResumo.innerHTML = `
      <div class="calc-num"><strong>${r.resumo.itens}</strong><span>itens na lista do evento</span></div>
      <div class="calc-num"><strong>${r.resumo.caixas}</strong><span>caixas e fardos ao todo</span></div>`;
    elResumo.setAttribute('aria-label',
      'Estimativa para o evento: ' + r.resumo.itens + ' itens, ' + r.resumo.caixas + ' caixas.');
  }

  // Produto real: o consumo foi contado no item genérico ("47 × Rolo 30m"),
  // que não é a unidade em que o produto do ERP é vendido.
  const consumo = i => i.real ? `${i.unidades} × ${i.emb}`
    : `${i.unidades} ${i.emb.indexOf('Par') === 0 ? 'pares' : 'un.'}`;

  function linhas(itens) {
    return itens.map(i => `
      <tr>
        <td>
          <span class="nome">${i.nome}</span>
          <span class="calc-porque">${i.porque}</span>
        </td>
        <td class="num">${consumo(i)}</td>
        <td class="num"><b>${i.caixas}x</b> ${i.caixa}</td>
      </tr>`).join('');
  }

  function montarLista(r) {
    elLista.innerHTML = !r.itens.length ? '' : `
      <h3 class="calc-grupo">Para o evento</h3>
      <div class="tabela-wrap">
        <table class="tabela calc-tabela">
          <thead><tr><th>Produto</th><th>Consumo</th><th>Como vem</th></tr></thead>
          <tbody>${linhas(r.itens)}</tbody>
        </table>
      </div>`;
  }

  function montarPerfil() {
    if (!elPerfil) return;
    const partes = [];

    window.CONSUMO_EVENTO.CAMPOS.forEach(campo => {
      if (campo.tipo === 'marcas') {
        campo.opcoes.forEach(o => { if (valores.extras[o.id]) partes.push(o.rotulo); });
        return;
      }
      const v = valores[campo.id];
      if (v === undefined || v === '') return;

      if (campo.tipo === 'opcao') {
        partes.push((campo.opcoes.find(o => o.id === String(v)) || {}).rotulo || v);
        return;
      }
      const n = Number(v);
      const curto = campo.curto || [campo.rotulo.toLowerCase(), campo.rotulo.toLowerCase()];
      partes.push(v + ' ' + (n === 1 ? curto[0] : curto[1]));
    });

    elPerfil.textContent = 'Festa ou evento — ' + partes.join(' · ');
  }

  function calcular() {
    valores = lerValores();
    try {
      ultimo = window.CONSUMO_EVENTO.calcular(valores, catalogo, real);
    } catch (e) {
      elRes.hidden = true;
      return;
    }

    elRes.hidden = false;
    montarResumo(ultimo);
    montarLista(ultimo);
    montarPerfil();
    prepararLead();
    prepararWhatsApp();
  }

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
    return 'Montei a estimativa de consumo para o meu evento pelo site.\n\n' +
           window.CONSUMO_EVENTO.emTexto(ultimo, valores) +
           '\n\nPodem me passar a cotação desses itens para o evento?';
  }

  function prepararWhatsApp() {
    const botao = $('[data-calc-wpp]', raiz);
    if (!botao || !window.linkWhatsApp) return;
    botao.href = window.linkWhatsApp(textoCompleto());
  }

  function prepararLead() {
    if (!formLead) return;
    const campo = $('[name="estimativa"]', formLead);
    if (campo) campo.value = window.CONSUMO_EVENTO.emTexto(ultimo, valores);
  }

  const elData = $('[data-calc-data]', raiz);
  if (elData) {
    elData.textContent = new Date().toLocaleDateString('pt-BR',
      { day: '2-digit', month: 'long', year: 'numeric' });
  }

  montarCampos();
  calcular();

  let espera = null;
  const recalcular = () => {
    clearTimeout(espera);
    espera = setTimeout(calcular, 350);
  };
  elCampos.addEventListener('input', recalcular);
  elCampos.addEventListener('change', recalcular);

  const formCalc = elCampos.closest('form');
  if (formCalc) formCalc.addEventListener('submit', ev => { ev.preventDefault(); calcular(); });

  const botaoOrc = $('[data-calc-orcamento]', raiz);
  if (botaoOrc) botaoOrc.addEventListener('click', mandarParaOrcamento);

  const botaoImp = $('[data-calc-imprimir]', raiz);
  if (botaoImp) botaoImp.addEventListener('click', () => window.print());
})();
