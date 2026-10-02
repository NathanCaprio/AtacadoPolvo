/* Regras da busca automática de fotos (server/fotos.js), com os casos que
   apareceram no piloto: marca trocada, volume trocado, abreviação do ERP. */

'use strict';

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// fotos.js abre o banco ao carregar: nunca o de verdade.
const banco = path.join(os.tmpdir(), `polvo-fotos-${process.pid}-${Date.now()}.db`);
process.env.BANCO = banco;
const { palavras, nota, eanValido } = require('./fotos');

after(() => {
  for (const sufixo of ['', '-wal', '-shm']) {
    try { fs.unlinkSync(banco + sufixo); } catch { /* pode não existir */ }
  }
});

const r = (titulo, extra = {}) => ({ titulo, pagina: '', imagem: '', quadrada: false, ...extra });

test('número e unidade viram uma palavra, em qualquer grafia', () => {
  assert.deepEqual(palavras('Sabão em pó 1,6 Kg'), ['SABAO', 'EM', 'PO', '1.6KG']);
  assert.deepEqual(palavras('5 Litros'), ['5L']);
  assert.deepEqual(palavras('750ml'), palavras('750 ML'));
});

test('EAN com dígito verificador', () => {
  assert.equal(eanValido('7896040701112'), true);
  assert.equal(eanValido('7896040701113'), false);
  assert.equal(eanValido('78965409243'), false, 'código interno da loja (11 dígitos)');
});

test('marca trocada não passa', () => {
  const n = nota('CERA EM PASTA INCOLOR 400G PROQUILL', null, r('Cera para Pisos Ingleza Incolor em Pasta 400g'));
  assert.equal(n.serve, false);
  assert.deepEqual(n.falta, ['PROQUILL']);
  assert.equal(n.duvida, true, 'faltou uma palavra só: vai para a revisão visual');
});

test('marca curta também é obrigatória', () => {
  assert.equal(nota('CLORO CONCENTRADO 5L SUL FIT', null, r('Super cloro 5l concentrado UPPRO')).serve, false);
  assert.equal(nota('CERA LUX CLEAN AMARELA 5L', null, r('Cera Acrílica Amarela CleanSpot 5L')).serve, false);
});

test('marca que aparece em metade do catálogo também é obrigatória', () => {
  // Erros reais da revisão: OMO no lugar de Gota Limpa, Cif no lugar de Saif.
  assert.equal(nota('SABAO LAVA ROUPAS 5L MULTIACAO GOTA LIMPA', null,
    r('Sabão Líquido Lava Roupas Omo Multiação 5L')).serve, false);
  assert.equal(nota('DESINFETANTE 5L SAIF MARINE', null, r('Desinfetante Cif Marine 5L')).serve, false);
  assert.equal(nota('SABONETE 5L ERVA DOCE SAIF', null, r('Sabonete Erva Doce Saif 5L')).serve, true);
});

test('volume trocado não passa nem como dúvida', () => {
  const n = nota('CERA EM PASTA INCOLOR 400G PROQUILL', null, r('Cera em Pasta Incolor Proquill 800g'));
  assert.equal(n.serve, false);
  assert.equal(n.duvida, false);
});

test('abreviação do ERP casa com a palavra inteira, mas não o contrário', () => {
  assert.equal(nota('CERA LIQ AMARELA 5L PROQUILL', null, r('Cera Líquida Amarela 5L Proquill')).serve, true);
  const n = nota('DESENGRAXANTE 5L FORTPINE HIGIFORT', null, r('Fort Gel Desengraxante Higifort 5L'));
  assert.deepEqual(n.falta, ['FORTPINE']);
});

test('código de barras no resultado vale mesmo com o título diferente', () => {
  const n = nota('CERA CASAKM AUTOBRILHO AMARELA 750ML', '7896040701129',
    r('Cera Líquida Autobrilho Amarela Brilho Fácil 750ml', { pagina: 'https://x.com/p/7896040701129' }));
  assert.equal(n.serve, true);
});

test('kit não serve para produto avulso', () => {
  const avulso = nota('CERA LUX CLEAN AMARELA 5L', null, r('Cera Lux Clean Amarela 5L'));
  const kit = nota('CERA LUX CLEAN AMARELA 5L', null, r('Kit 4 Cera Lux Clean Amarela 5L'));
  assert.ok(kit.nota < avulso.nota);
});
