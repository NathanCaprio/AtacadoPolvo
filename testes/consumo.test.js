/* =========================================================================
   Testes do modelo de consumo (assets/js/consumo.js)
   -------------------------------------------------------------------------
   O modelo é o único lugar do site que produz NÚMERO para o cliente ler.
   Ele quebra de dois jeitos silenciosos, e os dois estão cobertos aqui:

   1. Um id de produto sai do catálogo (data.js) e a linha some da lista sem
      ninguém notar — o síndico recebe uma estimativa incompleta.
   2. Um coeficiente é trocado de sinal ou de driver e a quantidade deixa de
      acompanhar o porte — escola de 900 alunos recebendo o mesmo que uma de
      100 é erro que só aparece na cara do cliente.

   O catálogo é carregado de verdade, do mesmo arquivo que o navegador usa:
   data.js escreve em `window`, então aqui ele roda num contexto com um
   `window` de mentira. Assim o teste falha quando o catálogo muda, que é
   exatamente o que se quer.
   ========================================================================= */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const RAIZ = path.join(__dirname, '..');

function carregarCatalogo() {
  const ctx = { window: {} };
  ctx.window.window = ctx.window;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'assets/js/data.js'), 'utf8'), ctx);
  return ctx.window.CATALOGO;
}

const CATALOGO = carregarCatalogo();
const CONSUMO = require(path.join(RAIZ, 'assets/js/consumo.js'));

const calc = (seg, v) => CONSUMO.calcular(seg, v, CATALOGO);
const acha = (r, id) => r.itens.find(i => i.id === id);

/* Perfis de teste: pequeno, grande e o caso do "só o obrigatório". */
const COND_PEQ = { unidades: 24, torres: 1, banheiros: 1, equipe: 1, areas: {} };
const COND_GDE = { unidades: 240, torres: 4, banheiros: 6, equipe: 6,
                   areas: { salao: true, academia: true, piscina: true, garagem: true } };
const ESC_PEQ  = { alunos: 120, salas: 6, banheiros: 3, turnos: 1, equipe: 2, areas: {} };
const ESC_GDE  = { alunos: 900, salas: 30, banheiros: 14, turnos: 3, equipe: 10,
                   areas: { refeitorio: true, quadra: true, infantil: true } };

/* ---- 1. Integridade com o catálogo ------------------------------------- */

test('todo produto citado pelo modelo existe no catálogo', () => {
  // calcular() lança quando um id não é encontrado — é esse o contrato.
  for (const perfil of [COND_PEQ, COND_GDE]) assert.ok(calc('condominio', perfil).itens.length);
  for (const perfil of [ESC_PEQ, ESC_GDE]) assert.ok(calc('escola', perfil).itens.length);
});

test('segmento desconhecido não passa despercebido', () => {
  assert.throws(() => calc('hotel', {}), /Segmento desconhecido/);
});

test('os campos declarados cobrem tudo que o cálculo lê', () => {
  for (const [nome, seg] of Object.entries(CONSUMO.SEGMENTOS)) {
    assert.ok(seg.campos.length >= 3, nome + ' precisa de campos');
    for (const campo of seg.campos) {
      assert.ok(campo.id && campo.rotulo && campo.tipo, nome + '/' + campo.id);
      if (campo.tipo === 'marcas' || campo.tipo === 'opcao') {
        assert.ok(Array.isArray(campo.opcoes) && campo.opcoes.length, nome + '/' + campo.id);
      }
    }
  }
});

/* ---- 2. Aritmética das embalagens -------------------------------------- */

test('a caixa nunca fica em zero e fecha para cima', () => {
  const r = calc('escola', ESC_GDE);
  for (const i of r.itens) {
    assert.ok(i.unidades >= 1, i.nome + ' com unidade zerada');
    assert.ok(i.caixas >= 1, i.nome + ' com caixa zerada');
    assert.strictEqual(i.caixas, Math.max(1, Math.ceil(i.unidades / i.porCaixa)), i.nome);
  }
});

test('o resumo bate com a lista', () => {
  const r = calc('condominio', COND_GDE);
  const mensais = r.itens.filter(i => i.periodo === 'mes');
  assert.strictEqual(r.resumo.itens, r.itens.length);
  assert.strictEqual(r.resumo.itensMes, mensais.length);
  assert.strictEqual(r.resumo.itensTrimestre, r.itens.length - mensais.length);
  assert.strictEqual(r.resumo.caixasMes, mensais.reduce((s, i) => s + i.caixas, 0));
});

/* ---- 3. A quantidade acompanha o porte ---------------------------------- */

test('escola maior consome mais papel, sabonete e desinfetante', () => {
  const peq = calc('escola', ESC_PEQ);
  const gde = calc('escola', ESC_GDE);
  for (const id of ['d01', 'd02', 'h02']) {
    assert.ok(acha(gde, id).unidades > acha(peq, id).unidades, 'produto ' + id);
  }
  assert.ok(gde.resumo.caixasMes > peq.resumo.caixasMes);
});

test('condomínio maior consome mais saco de lixo', () => {
  const peq = calc('condominio', COND_PEQ);
  const gde = calc('condominio', COND_GDE);
  assert.ok(acha(gde, 'd04').unidades > acha(peq, 'd04').unidades);
});

test('turno extra aumenta a limpeza de piso, não o papel por aluno', () => {
  const base = { alunos: 300, salas: 12, banheiros: 6, equipe: 4, areas: {} };
  const um   = calc('escola', { ...base, turnos: 1 });
  const tres = calc('escola', { ...base, turnos: 3 });

  // Piso e banheiro passam mais vezes por dia...
  assert.ok(acha(tres, 'b02').unidades > acha(um, 'b02').unidades, 'água sanitária');
  assert.ok(acha(tres, 's02').unidades > acha(um, 's02').unidades, 'limpador de piso');
  // ...mas o aluno já foi contado uma vez: papel higiênico não muda.
  assert.strictEqual(acha(tres, 'd01').unidades, acha(um, 'd01').unidades);
});

/* ---- 4. As opções mudam mesmo a lista ----------------------------------- */

test('sem refeitório não entra copo, guardanapo nem detergente', () => {
  const sem = calc('escola', { ...ESC_PEQ, areas: {} });
  const com = calc('escola', { ...ESC_PEQ, areas: { refeitorio: true } });
  for (const id of ['d06', 'd03', 'c01']) {
    assert.strictEqual(acha(sem, id), undefined, 'produto ' + id + ' não devia estar');
    assert.ok(acha(com, id), 'produto ' + id + ' devia estar');
  }
});

test('educação infantil traz a linha de lavanderia', () => {
  const sem = calc('escola', { ...ESC_PEQ, areas: {} });
  const com = calc('escola', { ...ESC_PEQ, areas: { infantil: true } });
  assert.strictEqual(acha(sem, 'l01'), undefined);
  assert.ok(acha(com, 'l01'));
});

test('condomínio grande recebe concentrado em bombona; pequeno, não', () => {
  assert.ok(acha(calc('condominio', COND_GDE), 'p03'), 'grande devia ter bombona');
  assert.strictEqual(acha(calc('condominio', COND_PEQ), 'p03'), undefined);
});

test('o mesmo produto pedido por dois motivos soma, não substitui', () => {
  // Esponja entra pela equipe e pela cozinha do refeitório.
  const sem = calc('escola', { ...ESC_PEQ, areas: {} });
  const com = calc('escola', { ...ESC_PEQ, areas: { refeitorio: true } });
  assert.ok(acha(com, 'u01').unidades > acha(sem, 'u01').unidades);
  assert.ok(acha(com, 'u01').porque.includes(';'), 'os dois motivos deviam aparecer');
});

/* ---- 5. Entrada suja ---------------------------------------------------- */

test('campo vazio, texto ou negativo cai no padrão em vez de quebrar', () => {
  const sujo = calc('escola', { alunos: '', salas: 'doze', banheiros: -4, turnos: 99, equipe: null });
  assert.ok(sujo.itens.length > 5);
  for (const i of sujo.itens) assert.ok(Number.isFinite(i.unidades) && i.unidades >= 1, i.nome);
});

test('objeto vazio ainda produz uma lista utilizável', () => {
  for (const seg of ['condominio', 'escola']) {
    const r = CONSUMO.calcular(seg, {}, CATALOGO);
    assert.ok(r.resumo.caixasMes > 0, seg);
  }
});

/* ---- 6. Texto que vai para o WhatsApp e para o lead --------------------- */

test('o texto traz o perfil e todos os itens do mês', () => {
  const valores = { ...ESC_GDE };
  const r = calc('escola', valores);
  const txt = CONSUMO.emTexto(r, valores);

  assert.match(txt, /Perfil \(Escola\)/);
  assert.match(txt, /Alunos matriculados: 900/);
  assert.match(txt, /Turnos de aula: Três turnos/);       // opção sai legível, não "3"
  assert.match(txt, /Cozinha ou refeitório próprio/);
  assert.match(txt, /Reposição trimestral/);

  for (const i of r.itens.filter(x => x.periodo === 'mes')) {
    assert.ok(txt.includes(i.nome), 'faltou ' + i.nome + ' no texto');
  }
});

test('o texto do condomínio não inventa área que não foi marcada', () => {
  const valores = { ...COND_PEQ };
  const txt = CONSUMO.emTexto(calc('condominio', valores), valores);
  assert.ok(!txt.includes('Piscina'));
  assert.match(txt, /Unidades \(apartamentos ou salas\): 24/);
});
