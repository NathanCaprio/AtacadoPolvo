/* =========================================================================
   ATACADO POLVO - Modelo de consumo mensal (condomínio e escola)
   -------------------------------------------------------------------------
   Por que existe: síndico e diretor não travam no preço, travam no "quanto
   eu preciso". Quem não sabe a quantidade não pede orçamento — pede "uma
   tabela de preços", que é o pedido que não vira venda. Este módulo estima
   a lista mensal a partir do porte do prédio ou da escola, para o visitante
   chegar na conversa com uma lista pronta em vez de uma dúvida.

   O modelo é só aritmética: cada item tem um DRIVER (banheiro, aluno,
   unidade, pessoa da equipe) e um coeficiente por mês. Nada de preço — o
   preço de atacado depende do volume fechado, e inventar número aqui
   queimaria a cotação real.

   Os coeficientes são médias de uso, não medição. Estão todos reunidos e
   comentados abaixo de propósito: quando a loja disser "papel higiênico em
   escola rende mais que isso", o ajuste é um número, num lugar só.

   Roda no navegador (window.CONSUMO) e no Node (module.exports), para a
   suíte de testes conseguir conferir a aritmética e, principalmente, que
   todo id citado aqui existe mesmo no catálogo.
   ========================================================================= */
(function (raiz) {
  'use strict';

  /* ---- 1. Utilidades ----------------------------------------------------- */

  const num = (v, padrao) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : padrao;
  };

  /* "Caixa com 24 un." -> 24 | "Fardo com 64 un." -> 64 | "Unidade" -> 1 */
  function porCaixa(produto) {
    const m = /(\d+)/.exec(produto.caixa || '');
    return m ? Number(m[1]) : 1;
  }

  /* ---- 2. Campos de cada segmento ---------------------------------------
     O HTML não sabe nada sobre os campos: a tela é montada a partir daqui,
     então acrescentar um segmento novo (empresa, hotel) é escrever um bloco
     como os dois de baixo, sem tocar no HTML nem no CSS.                    */

  const SEGMENTOS = {

    condominio: {
      nome: 'Condomínio',
      calcular: condominio,
      campos: [
        { id: 'unidades',  tipo: 'numero', rotulo: 'Unidades (apartamentos ou salas)', padrao: 40, min: 1, max: 2000, curto: ['unidade', 'unidades'], dica: 'Total do condomínio, somando todas as torres.' },
        { id: 'torres',    tipo: 'numero', rotulo: 'Torres ou blocos',                 padrao: 1,  min: 1, max: 40, curto: ['torre', 'torres'] },
        { id: 'banheiros', tipo: 'numero', rotulo: 'Banheiros de uso comum',           padrao: 2,  min: 0, max: 100, curto: ['banheiro comum', 'banheiros comuns'], dica: 'Portaria, salão, academia e áreas de lazer.' },
        { id: 'equipe',    tipo: 'numero', rotulo: 'Pessoas na equipe de limpeza',     padrao: 2,  min: 0, max: 100, curto: ['pessoa na limpeza', 'pessoas na limpeza'] },
        { id: 'areas',     tipo: 'marcas', rotulo: 'Áreas comuns que o condomínio tem',
          opcoes: [
            { id: 'salao',    rotulo: 'Salão de festas' },
            { id: 'academia', rotulo: 'Academia' },
            { id: 'piscina',  rotulo: 'Piscina' },
            { id: 'garagem',  rotulo: 'Garagem coberta' }
          ] }
      ]
    },

    escola: {
      nome: 'Escola',
      calcular: escola,
      campos: [
        { id: 'alunos',    tipo: 'numero', rotulo: 'Alunos matriculados',          padrao: 300, min: 1, max: 20000, curto: ['aluno', 'alunos'], dica: 'Somando todos os turnos.' },
        { id: 'salas',     tipo: 'numero', rotulo: 'Salas de aula',                padrao: 12,  min: 1, max: 300, curto: ['sala', 'salas'] },
        { id: 'banheiros', tipo: 'numero', rotulo: 'Conjuntos de banheiro',        padrao: 6,   min: 1, max: 200, curto: ['conjunto de banheiro', 'conjuntos de banheiro'], dica: 'Conte cada banheiro coletivo, de aluno e de funcionário.' },
        { id: 'turnos',    tipo: 'opcao',  rotulo: 'Turnos de aula',               padrao: '2',
          opcoes: [
            { id: '1', rotulo: 'Um turno' },
            { id: '2', rotulo: 'Dois turnos' },
            { id: '3', rotulo: 'Três turnos' }
          ] },
        { id: 'equipe',    tipo: 'numero', rotulo: 'Pessoas na equipe de limpeza', padrao: 4,   min: 0, max: 200, curto: ['pessoa na limpeza', 'pessoas na limpeza'] },
        { id: 'areas',     tipo: 'marcas', rotulo: 'A escola tem',
          opcoes: [
            { id: 'refeitorio', rotulo: 'Cozinha ou refeitório próprio' },
            { id: 'quadra',     rotulo: 'Quadra ou ginásio' },
            { id: 'infantil',   rotulo: 'Educação infantil' }
          ] }
      ]
    }
  };

  /* ---- 3. Condomínio -----------------------------------------------------
     O driver do condomínio NÃO é o morador: o apartamento compra o próprio
     material. O que o condomínio consome vem da área comum — banheiro de
     portaria e de salão, hall, escada, garagem — e da lixeira coletiva.
     Por isso "unidades" quase só aparece no saco de lixo.                    */

  function condominio(v, add) {
    const u = num(v.unidades, 40);
    const t = Math.max(1, num(v.torres, 1));
    const b = num(v.banheiros, 2);
    const e = num(v.equipe, 2);
    const a = v.areas || {};

    // Cada área de lazer acrescenta piso e banheiro à rotina da equipe.
    const fator = 1 + (a.salao ? 0.15 : 0) + (a.academia ? 0.15 : 0)
                    + (a.piscina ? 0.10 : 0) + (a.garagem ? 0.20 : 0);

    // Acima de ~60 unidades o volume justifica o concentrado em bombona,
    // que é onde o condomínio realmente corta custo por litro.
    const grande = u >= 60;

    add('d01', b * 10 + (a.salao ? 8 : 0), 'mes', 'banheiros comuns e portaria, com uso de visitante');
    add('d02', b * 1.5 + (a.salao ? 1 : 0), 'mes', 'papel toalha dos dispensers da área comum');
    add('h02', b * 0.5, 'mes', 'refil de sabonete dos dispensers');
    add('h01', t * 2 + (a.academia ? 2 : 0), 'mes', 'álcool em gel na portaria e nos elevadores');

    add('b01', (b * 2.5 + t * 3) * fator, 'mes', 'desinfecção diária de banheiro, hall e escada');
    add('b02', b * 2 + t * 2, 'mes', 'lixeira, ralo e área de serviço');
    add('b03', b * 1, 'mes', 'vaso de área comum, que roda o dia inteiro');

    if (grande) {
      add('p03', Math.max(1, t * 0.6), 'mes',
          'bombona de 20L: neste porte o concentrado sai bem mais barato por litro');
      add('s01', t * 2, 'mes', 'retoque de vidro, corrimão e interfone');
    } else {
      add('s02', t * 3 * fator, 'mes', 'piso de hall, corredor e escadaria');
      add('s01', t * 3 * fator, 'mes', 'retoque de vidro, corrimão e interfone');
    }
    add('s05', t * 2, 'mes', 'vidro da portaria e do hall');

    // Lixeira coletiva: cerca de 0,15 saco de 100L por unidade por dia.
    add('d04', u * 0.15 * 30 / 100, 'mes', 'coleta diária das unidades');
    add('d05', t * 2, 'mes', 'lixeiras de hall, elevador e área comum');

    add('u01', e * 1, 'mes', 'esponja da equipe');
    add('u05', e * 2, 'mes', 'pano de chão, troca quinzenal por pessoa');
    add('u06', e * 2, 'mes', 'luva de proteção da equipe');

    add('u02', e * 1, 'trimestre', 'vassoura: reposição a cada três meses');
    add('u03', e * 1, 'trimestre', 'rodo: reposição a cada três meses');
    add('u04', e * 1, 'trimestre', 'balde: reposição a cada três meses');
  }

  /* ---- 4. Escola ---------------------------------------------------------
     Aqui o driver é o aluno (papel, sabonete, copo) e o banheiro (desinfecção).
     Turno não multiplica o consumo por aluno — o aluno já foi contado uma vez
     —, mas multiplica a FREQUÊNCIA de limpeza de piso e banheiro.            */

  function escola(v, add) {
    const al = num(v.alunos, 300);
    const s  = Math.max(1, num(v.salas, 12));
    const b  = Math.max(1, num(v.banheiros, 6));
    const e  = num(v.equipe, 4);
    const tn = Math.min(3, Math.max(1, num(v.turnos, 2)));
    const a  = v.areas || {};

    const ft = 1 + (tn - 1) * 0.45;          // mais turno, mais passada de pano
    const grande = al >= 400;

    add('d01', al * 0.5, 'mes', 'cerca de 1,5 uso por aluno por dia letivo');
    add('d02', al * 0.045, 'mes', 'papel toalha do dispenser, 2 folhas por aluno por dia');
    add('h02', al * 0.011, 'mes', 'sabonete líquido, 2 lavagens de mão por aluno por dia');
    add('h01', s * 1.5 + b * 1, 'mes', 'álcool em gel nas salas e na entrada dos banheiros');

    // Acima de 400 alunos o concentrado assume a maior parte da desinfecção.
    if (grande) {
      add('p02', Math.max(1, al / 500), 'mes',
          'concentrado 1:100: neste porte é o item que mais derruba o custo do mês');
      add('b01', b * 3 * ft * 0.6, 'mes', 'desinfetante pronto para uso no retoque entre turnos');
    } else {
      add('b01', b * 3 * ft, 'mes', 'banheiros de aluno, limpos várias vezes ao dia');
    }
    add('b02', b * 2 * ft, 'mes', 'ralo, lixeira e área molhada');
    add('b05', b * 1, 'mes', 'azulejo e rejunte de banheiro de aluno');
    add('b03', b * 1, 'mes', 'vaso de uso coletivo');

    add('s01', s * 0.6, 'mes', 'carteira, quadro, maçaneta e corrimão');
    add('s02', (s * 0.5 + (a.quadra ? 3 : 0)) * ft, 'mes',
        a.quadra ? 'piso de sala, corredor e quadra' : 'piso de sala e corredor');
    add('s05', s * 0.15 + 2, 'mes', 'vidro de sala e secretaria');

    add('d05', s * 0.6 + b * 0.4, 'mes', 'lixeira de sala e de banheiro');
    add('d04', al * 0.012 + (a.refeitorio ? 2 : 0), 'mes', 'lixo do pátio e da cozinha');

    if (a.refeitorio) {
      add('c01', al * 0.02, 'mes', 'louça da merenda');
      add('c03', 2 + al * 0.002, 'mes', 'coifa e fogão industrial');
      add('c04', 1, 'mes', 'lava-louças da cozinha');
      add('c05', 1, 'mes', 'inox da cozinha e do balcão');
      add('d03', al * 0.4, 'mes', 'guardanapo, 1 por refeição');
      add('d06', al * 0.2, 'mes', 'copo descartável, 1 por aluno por dia');
      add('u01', 2, 'mes', 'esponja da cozinha');
    }

    if (a.infantil) {
      add('l01', 2, 'mes', 'lavagem de pano, babador e roupa de cama');
      add('l04', 1, 'mes', 'alvejante sem cloro, seguro para tecido de criança');
      add('h03', al * 0.02, 'mes', 'sabonete em barra para a rotina da educação infantil');
    }

    add('u01', e * 1, 'mes', 'esponja da equipe');
    add('u05', e * 2, 'mes', 'pano de chão, troca quinzenal por pessoa');
    add('u06', e * 2, 'mes', 'luva de proteção da equipe');

    add('u02', e * 1, 'trimestre', 'vassoura: reposição a cada três meses');
    add('u03', e * 1, 'trimestre', 'rodo: reposição a cada três meses');
    add('u04', e * 1, 'trimestre', 'balde: reposição a cada três meses');
  }

  /* ---- 5. Motor ----------------------------------------------------------
     Soma os lançamentos por produto (o mesmo id pode ser lançado por mais de
     um driver — esponja da cozinha e esponja da equipe), arredonda para cima
     na embalagem de venda e descarta o que não chega a meia unidade no mês.  */

  function calcular(segmento, valores, catalogo) {
    const seg = SEGMENTOS[segmento];
    if (!seg) throw new Error('Segmento desconhecido: ' + segmento);

    const cat = catalogo || raiz.CATALOGO;
    if (!cat) throw new Error('Catálogo indisponível.');

    const acumulado = new Map();
    const add = (id, qtd, periodo, porque) => {
      if (!Number.isFinite(qtd) || qtd <= 0) return;
      const atual = acumulado.get(id);
      if (atual) {
        atual.qtd += qtd;
        // Dois drivers no mesmo produto: o motivo vira a soma dos dois.
        if (porque && atual.porque.indexOf(porque) === -1) atual.porque += '; ' + porque;
      } else {
        acumulado.set(id, { qtd, periodo: periodo || 'mes', porque: porque || '' });
      }
    };

    seg.calcular(valores || {}, add);

    const itens = [];
    const desconhecidos = [];

    acumulado.forEach((linha, id) => {
      const p = cat.produtos.find(x => x.id === id);
      if (!p) { desconhecidos.push(id); return; }          // o teste pega isto
      if (linha.qtd < 0.5) return;                          // ruído, não pedido

      const unidades = Math.ceil(linha.qtd);
      const emCaixa = porCaixa(p);
      itens.push({
        id: p.id,
        nome: p.nome,
        cat: p.cat,
        art: p.art,
        emb: p.emb,
        caixa: p.caixa,
        porCaixa: emCaixa,
        unidades,
        caixas: Math.max(1, Math.ceil(unidades / emCaixa)),
        periodo: linha.periodo,
        porque: linha.porque
      });
    });

    if (desconhecidos.length) {
      throw new Error('Produto fora do catálogo: ' + desconhecidos.join(', '));
    }

    // Ordem do catálogo: a lista sai na mesma sequência das categorias do
    // site, então bate com o que a pessoa já viu em produtos.html.
    const ordem = cat.categorias.map(c => c.id);
    itens.sort((x, y) => {
      const d = ordem.indexOf(x.cat) - ordem.indexOf(y.cat);
      return d !== 0 ? d : x.nome.localeCompare(y.nome, 'pt-BR');
    });

    const mensais = itens.filter(i => i.periodo === 'mes');
    return {
      segmento,
      itens,
      resumo: {
        itens: itens.length,
        caixasMes: mensais.reduce((s, i) => s + i.caixas, 0),
        itensMes: mensais.length,
        itensTrimestre: itens.length - mensais.length
      }
    };
  }

  /* ---- 6. Saída legível --------------------------------------------------
     Usada no WhatsApp e no corpo do lead. Texto puro de propósito: é o que
     sobrevive igual nos dois canais.                                        */

  function emTexto(resultado, valores) {
    const seg = SEGMENTOS[resultado.segmento];
    const v = valores || {};
    const perfil = [];

    seg.campos.forEach(campo => {
      if (campo.tipo === 'marcas') {
        const marcadas = campo.opcoes
          .filter(o => (v.areas || {})[o.id])
          .map(o => o.rotulo);
        if (marcadas.length) perfil.push(campo.rotulo + ': ' + marcadas.join(', '));
        return;
      }
      const valor = v[campo.id];
      if (valor === undefined || valor === '' || valor === null) return;
      const legivel = campo.tipo === 'opcao'
        ? ((campo.opcoes.find(o => o.id === String(valor)) || {}).rotulo || valor)
        : valor;
      perfil.push(campo.rotulo + ': ' + legivel);
    });

    const linhas = ['Perfil (' + seg.nome + '):'];
    perfil.forEach(p => linhas.push('- ' + p));
    linhas.push('', 'Estimativa mensal:');

    resultado.itens.filter(i => i.periodo === 'mes').forEach(i => {
      linhas.push('- ' + i.nome + ': ' + i.unidades + ' un. (' + i.caixas + 'x ' + i.caixa + ')');
    });

    const tri = resultado.itens.filter(i => i.periodo === 'trimestre');
    if (tri.length) {
      linhas.push('', 'Reposição trimestral:');
      tri.forEach(i => linhas.push('- ' + i.nome + ': ' + i.unidades + ' un.'));
    }

    return linhas.join('\n');
  }

  const API = { SEGMENTOS, calcular, emTexto, porCaixa };

  raiz.CONSUMO = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;

})(typeof window !== 'undefined' ? window : globalThis);
