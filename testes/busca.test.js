/* =========================================================================
   Testes da regra de busca (window.BUSCA, em assets/js/main.js)
   -------------------------------------------------------------------------
   A mesma regra serve a lupa do cabeçalho (sugestões) e o filtro do
   catálogo (catalogo.js). Quando eram duas cópias, bastava mexer numa para
   a sugestão dizer "12 produtos" e o catálogo mostrar 9. Agora há uma só,
   e estes testes travam o comportamento que o cliente espera:

   - o ERP grava "AGUA SANITARIA" e o cliente digita "água";
   - "detergente 5l" acha "DETERGENTE NEUTRO 5L" (palavras em qualquer ordem);
   - o código do produto acha o produto, mas só inteiro;
   - o nome da categoria também conta ("lavanderia" acha o amaciante).

   main.js é carregado de verdade, num contexto com um document mínimo: no
   carregamento ele só lê o tema e registra o init para o DOMContentLoaded.
   ========================================================================= */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const RAIZ = path.join(__dirname, '..');

function carregar(arquivos) {
  const nada = () => {};
  const window = {
    SITE: {},
    localStorage: { getItem: () => null, setItem: nada },
    matchMedia: () => ({ matches: false, addEventListener: nada })
  };
  window.window = window;
  window.document = {
    readyState: 'loading',
    addEventListener: nada,
    querySelector: () => null,
    querySelectorAll: () => [],
    documentElement: { setAttribute: nada, removeAttribute: nada, classList: { add: nada, toggle: nada } }
  };
  const ctx = vm.createContext(window);
  for (const f of arquivos) vm.runInContext(fs.readFileSync(path.join(RAIZ, f), 'utf8'), ctx, { filename: f });
  return window;
}

const { BUSCA } = carregar(['assets/js/main.js']);

const CATS = [
  { id: 'limpeza', nome: 'Limpeza' },
  { id: 'lavanderia', nome: 'Roupas e Lavanderia' }
];
const PRODUTOS = [
  { id: '7896', nome: 'AGUA SANITARIA 1L ATRIUS', cat: 'limpeza', desc: '', texto: '' },
  { id: '7897', nome: 'DETERGENTE NEUTRO 5L', cat: 'limpeza', desc: 'Para louças', texto: '' },
  { id: '7898', nome: 'Detergente Limão 500ml', cat: 'limpeza', desc: '', texto: 'Rende muito na pia.' },
  { id: '1234', nome: 'AMACIANTE 2L', cat: 'lavanderia', desc: '', texto: '' },
  { id: 'x-1', nome: 'Sabão em Pó 1kg', cat: 'lavanderia' }   // sem desc/texto, como vem do ERP
];
const nomeCat = id => CATS.find(c => c.id === id).nome;
const achados = termo => {
  const t = BUSCA.normalizar(termo.trim());
  return PRODUTOS.filter(p => BUSCA.casa(p, t, nomeCat(p.cat))).map(p => p.id);
};

test('main.js expõe a regra de busca', () => {
  assert.equal(typeof BUSCA.normalizar, 'function');
  assert.equal(typeof BUSCA.casa, 'function');
  assert.equal(typeof BUSCA.buscar, 'function');
});

test('ignora acento e maiúscula dos dois lados', () => {
  assert.deepEqual(achados('água sanitária'), ['7896']);
  assert.deepEqual(achados('AGUA'), ['7896']);
  assert.deepEqual(achados('sabao em po'), ['x-1']);
  assert.deepEqual(achados('limao'), ['7898']);
});

test('cada palavra precisa aparecer, em qualquer ordem', () => {
  assert.deepEqual(achados('detergente 5l'), ['7897']);
  assert.deepEqual(achados('5l   detergente'), ['7897']);
  assert.deepEqual(achados('detergente'), ['7897', '7898']);
  assert.deepEqual(achados('detergente 20l'), []);
});

test('procura também na descrição, no texto e no nome da categoria', () => {
  assert.deepEqual(achados('louças'), ['7897']);
  assert.deepEqual(achados('pia'), ['7898']);
  assert.deepEqual(achados('lavanderia'), ['1234', 'x-1']);
  assert.deepEqual(achados('lavanderia amaciante'), ['1234']);
});

test('código do produto só vale inteiro', () => {
  assert.deepEqual(achados('1234'), ['1234']);
  assert.deepEqual(achados('X-1'), ['x-1']);
  assert.deepEqual(achados('123'), []);
});

test('termo vazio ou só espaço casa com tudo', () => {
  assert.equal(achados('').length, PRODUTOS.length);
  assert.equal(achados('   ').length, PRODUTOS.length);
});

test('sugestões: nome que começa com o termo vem primeiro', () => {
  const { produtos } = BUSCA.buscar({ categorias: CATS, produtos: PRODUTOS }, 'neutro');
  assert.deepEqual(produtos.map(p => p.id), ['7897']);

  // "detergente": os dois começam com o termo; empate vai por ordem alfabética
  // sem ligar para maiúscula (Limão antes de NEUTRO).
  const det = BUSCA.buscar({ categorias: CATS, produtos: PRODUTOS }, 'Detergente');
  assert.deepEqual(det.produtos.map(p => p.id), ['7898', '7897']);

  // "rende": só o texto tem a palavra; achou, mas vem no fim.
  const rende = BUSCA.buscar({ categorias: CATS, produtos: PRODUTOS.concat({ id: 'r', nome: 'Rende Mais', cat: 'limpeza' }) }, 'rende');
  assert.deepEqual(rende.produtos.map(p => p.id), ['r', '7898']);

  // "lavanderia" só casa pela categoria: vem depois de quem tem no nome.
  const lav = BUSCA.buscar({ categorias: CATS, produtos: PRODUTOS }, 'amaciante lavanderia');
  assert.deepEqual(lav.produtos.map(p => p.id), ['1234']);
});

test('sugestão e catálogo contam igual para o catálogo de exemplo', () => {
  // data.js de verdade: o número que a lupa mostra é o que o catálogo lista.
  const win = carregar(['assets/js/data.js', 'assets/js/main.js']);
  const cat = win.CATALOGO;
  const nome = id => (cat.categorias.find(c => c.id === id) || {}).nome || '';
  for (const termo of ['detergente', 'água', 'papel toalha', 'sabão', '5l', 'luva', 'xyz']) {
    const t = win.BUSCA.normalizar(termo);
    const noCatalogo = cat.produtos.filter(p => win.BUSCA.casa(p, t, nome(p.cat))).length;
    assert.equal(win.BUSCA.buscar(cat, termo).produtos.length, noCatalogo, termo);
  }
});

test('catalogo.js não tem regra de busca própria', () => {
  const src = fs.readFileSync(path.join(RAIZ, 'assets/js/catalogo.js'), 'utf8');
  assert.match(src, /window\.BUSCA/);
  assert.doesNotMatch(src, /normalize\(['"]NFD['"]\)/, 'normalizar duplicado no catalogo.js');
});
