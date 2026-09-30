/* =========================================================================
   ATACADO POLVO - Modelo de consumo para festa e evento
   -------------------------------------------------------------------------
   Diferente de consumo.js (condomínio/escola), aqui não existe "mês": o
   evento acontece uma vez, então todo item lançado vale para AQUELE dia,
   sem período recorrente. Por isso este é um motor separado, mais simples,
   em vez de um terceiro segmento dentro de CONSUMO — misturar os dois ali
   obrigaria a suíte de mês/trimestre a entender um terceiro período que não
   se encaixa na mesma conta.

   Driver principal é o CONVIDADO (descartável, higiene) e a DURAÇÃO em horas
   (frequência de reposição e de limpeza durante o evento). O formato do
   serviço (coquetel, buffet sentado, open bar) muda a proporção de copo e
   guardanapo por convidado.

   Roda no navegador (window.CONSUMO_EVENTO) e no Node (module.exports).
   ========================================================================= */
(function (raiz) {
  'use strict';

  const num = (v, padrao) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : padrao;
  };

  function porCaixa(produto) {
    const m = /(\d+)/.exec(produto.caixa || '');
    return m ? Number(m[1]) : 1;
  }

  /* ---- Campos do formulário ----------------------------------------------
     O HTML monta a tela a partir daqui, igual ao padrão de consumo.js.      */

  const CAMPOS = [
    { id: 'convidados', tipo: 'numero', rotulo: 'Convidados esperados', padrao: 80, min: 10, max: 2000,
      curto: ['convidado', 'convidados'],
      dica: 'Conte todo mundo que vai passar pelo local, mesmo quem não fica o evento inteiro.' },
    { id: 'duracao', tipo: 'numero', rotulo: 'Duração do evento (em horas)', padrao: 4, min: 1, max: 24,
      curto: ['hora de evento', 'horas de evento'] },
    { id: 'tipoEvento', tipo: 'opcao', rotulo: 'Tipo de evento', padrao: 'aniversario',
      opcoes: [
        { id: 'aniversario', rotulo: 'Aniversário' },
        { id: 'casamento',   rotulo: 'Casamento' },
        { id: 'formatura',   rotulo: 'Formatura' },
        { id: 'corporativo', rotulo: 'Evento corporativo' }
      ] },
    { id: 'banheiros', tipo: 'numero', rotulo: 'Banheiros de apoio disponíveis', padrao: 2, min: 1, max: 60,
      curto: ['banheiro de apoio', 'banheiros de apoio'],
      dica: 'Conte só os banheiros reservados para convidados, sem contar o da equipe.' },
    { id: 'servico', tipo: 'opcao', rotulo: 'Formato do serviço', padrao: 'coquetel',
      opcoes: [
        { id: 'coquetel', rotulo: 'Coquetel em pé (finger food)' },
        { id: 'buffet',   rotulo: 'Buffet ou jantar sentado' },
        { id: 'openbar',  rotulo: 'Open bar / open food' }
      ] },
    { id: 'extras', tipo: 'marcas', rotulo: 'O local do evento tem',
      opcoes: [
        { id: 'cozinha',  rotulo: 'Cozinha própria no local, com louça de verdade' },
        { id: 'externa',  rotulo: 'Área externa, jardim ou tenda' },
        { id: 'infantil', rotulo: 'Espaço kids ou festa infantil' }
      ] }
  ];

  /* ---- Cálculo -------------------------------------------------------------
     Copo e guardanapo escalam com o formato do serviço: open bar renova copo
     o tempo todo, buffet sentado usa mais louça de verdade e menos copo,
     coquetel em pé é o que mais gira guardanapo (mão suja segurando canapé).

     Banheiro de apoio virou driver próprio (como em condominio/escola) em vez
     de sair só do número de convidados: dois eventos de 100 pessoas com 1 ou
     com 4 banheiros não gastam a mesma coisa de papel e desinfetante.

     Tipo de evento é um fator de intensidade: corporativo tende a ser mais
     comportado (gente sai mais cedo, bebe menos), casamento e formatura
     esticam mais a noite e sujam mais.                                       */

  function evento(v, add) {
    const convidados = Math.max(1, num(v.convidados, 80));
    const horas = Math.max(1, num(v.duracao, 4));
    const banheiros = Math.max(1, num(v.banheiros, 2));
    const servico = v.servico || 'coquetel';
    const e = v.extras || {};

    const fatorTipo = { corporativo: 0.85, aniversario: 1, casamento: 1.1, formatura: 1.2 }[v.tipoEvento] || 1;

    const coposPorPessoa = servico === 'openbar' ? 3.5 : servico === 'buffet' ? 1.5 : 2.5;
    const guardanapoPorPessoa = servico === 'coquetel' ? 3 : 2;
    const fatorInfantil = e.infantil ? 1.2 : 1;

    add('d06', convidados * coposPorPessoa * fatorInfantil * fatorTipo, 'copo descartável ao longo do evento, por convidado');
    add('d03', convidados * guardanapoPorPessoa * fatorInfantil * fatorTipo, 'guardanapo por convidado');

    add('h01', Math.max(2, banheiros * 1 + convidados * 0.02) * fatorTipo, 'álcool em gel na entrada, no bar e nos banheiros de apoio');
    add('h02', banheiros * 1.2, 'sabonete líquido dos banheiros de apoio');
    add('d01', banheiros * 3 + convidados * 0.02, 'papel higiênico dos banheiros de apoio');
    add('d02', banheiros * 1.5, 'papel toalha dos banheiros de apoio');

    add('d04', Math.max(1, Math.ceil(convidados / 50)), 'saco de lixo 100L para o volume do evento');
    add('d05', Math.max(1, Math.ceil(convidados / 90)), 'saco de lixo 30L para as lixeiras de apoio');

    add('s01', Math.max(1, horas * 0.6) * fatorTipo, 'retoque de piso e superfícies durante o evento');
    add('b01', Math.max(1, banheiros * horas * 0.35 + convidados * 0.005) * fatorTipo, 'desinfecção dos banheiros de apoio durante o evento');

    if (servico === 'buffet') {
      add('c01', convidados * 0.05, 'detergente para lavar a louça de verdade do jantar sentado');
      add('u01', 2, 'esponja para a lavagem da louça do buffet');
    }

    if (e.cozinha) {
      add('c03', 1, 'desengordurante para coifa e fogão da cozinha do local');
      add('c05', 1, 'inox da cozinha e do balcão de serviço');
    }

    if (e.externa) {
      add('s02', horas * 0.5, 'piso externo, tenda ou área de jardim');
    }

    if (e.infantil) {
      add('h03', Math.max(1, convidados * 0.05), 'sabonete em barra para a lavagem de mão das crianças');
    }
  }

  /* ---- Motor -----------------------------------------------------------
     Sem mês/trimestre: todo item lançado vale para o evento, uma vez só.   */

  function calcular(valores, catalogo) {
    const cat = catalogo || raiz.CATALOGO;
    if (!cat) throw new Error('Catálogo indisponível.');

    const acumulado = new Map();
    const add = (id, qtd, porque) => {
      if (!Number.isFinite(qtd) || qtd <= 0) return;
      const atual = acumulado.get(id);
      if (atual) {
        atual.qtd += qtd;
        if (porque && atual.porque.indexOf(porque) === -1) atual.porque += '; ' + porque;
      } else {
        acumulado.set(id, { qtd, porque: porque || '' });
      }
    };

    evento(valores || {}, add);

    const itens = [];
    const desconhecidos = [];

    acumulado.forEach((linha, id) => {
      const p = cat.produtos.find(x => x.id === id);
      if (!p) { desconhecidos.push(id); return; }
      if (linha.qtd < 0.5) return;

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
        porque: linha.porque
      });
    });

    if (desconhecidos.length) {
      throw new Error('Produto fora do catálogo: ' + desconhecidos.join(', '));
    }

    const ordem = cat.categorias.map(c => c.id);
    itens.sort((x, y) => {
      const d = ordem.indexOf(x.cat) - ordem.indexOf(y.cat);
      return d !== 0 ? d : x.nome.localeCompare(y.nome, 'pt-BR');
    });

    return {
      itens,
      resumo: {
        itens: itens.length,
        caixas: itens.reduce((s, i) => s + i.caixas, 0)
      }
    };
  }

  function emTexto(resultado, valores) {
    const v = valores || {};
    const perfil = [];

    CAMPOS.forEach(campo => {
      if (campo.tipo === 'marcas') {
        const marcadas = campo.opcoes
          .filter(o => (v.extras || {})[o.id])
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

    const linhas = ['Perfil (festa ou evento):'];
    perfil.forEach(p => linhas.push('- ' + p));
    linhas.push('', 'Estimativa para o evento:');

    resultado.itens.forEach(i => {
      linhas.push('- ' + i.nome + ': ' + i.unidades + ' un. (' + i.caixas + 'x ' + i.caixa + ')');
    });

    return linhas.join('\n');
  }

  const API = { CAMPOS, calcular, emTexto, porCaixa };

  raiz.CONSUMO_EVENTO = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : global);
