/* =========================================================================
   Testes do backup.

   Cada teste roda o comando de verdade como processo separado, com BANCO e
   DESTINO_BACKUP apontados para uma pasta temporária. Tem que ser processo
   separado: db.js decide o arquivo do banco na hora do require, então trocar
   process.env depois não teria efeito.

       node --test server/backup.test.js
   ========================================================================= */

'use strict';

const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const BACKUP = path.join(__dirname, 'backup.js');
const temporarias = [];

/* Pasta nova para cada teste, com um banco já povoado. */
function montarCenario({ clientes = 2, orcamentos = 1 } = {}) {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'polvo-backup-'));
  temporarias.push(raiz);

  const banco = path.join(raiz, 'polvo.db');
  const destino = path.join(raiz, 'copias');
  const ambiente = { ...process.env, BANCO: banco, DESTINO_BACKUP: destino };

  // Deixa o db.js criar o schema, e só então povoa.
  rodar([], ambiente, { comando: 'nada' });

  const db = new DatabaseSync(banco);
  for (let i = 1; i <= clientes; i++) {
    db.prepare('INSERT INTO clientes (nome, email, senha_hash) VALUES (?, ?, ?)')
      .run(`Cliente ${i}`, `c${i}@exemplo.com`, `scrypt$16384$8$1$aa$bb${i}`);
  }
  for (let i = 1; i <= orcamentos; i++) {
    db.prepare('INSERT INTO orcamentos (itens, total_itens) VALUES (?, ?)')
      .run(JSON.stringify([{ id: 'x', nome: 'Água sanitária', qtd: i }]), i);
  }
  db.close();

  return { raiz, banco, destino, ambiente };
}

function rodar(args, ambiente, { entrada = '', comando } = {}) {
  const r = spawnSync(process.execPath, [BACKUP, ...(comando ? [comando] : []), ...args], {
    env: ambiente, input: entrada, encoding: 'utf8'
  });
  return { codigo: r.status, saida: (r.stdout || '') + (r.stderr || '') };
}

const copias = destino => (fs.existsSync(destino) ? fs.readdirSync(destino) : [])
  .filter(n => n.startsWith('polvo-'));

function contarEm(arquivo, tabela) {
  const db = new DatabaseSync(arquivo, { readOnly: true });
  try {
    return db.prepare(`SELECT count(*) AS n FROM ${tabela}`).get().n;
  } finally {
    db.close();
  }
}

after(() => {
  for (const dir of temporarias) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* tanto faz */ }
  }
});

/* ---- Criar -------------------------------------------------------------- */

describe('criar', () => {
  test('gera uma cópia abrível, com os mesmos dados do banco', () => {
    const { destino, ambiente } = montarCenario({ clientes: 3, orcamentos: 2 });

    const r = rodar([], ambiente);
    assert.equal(r.codigo, 0, r.saida);

    const nomes = copias(destino);
    assert.equal(nomes.length, 1);
    assert.match(nomes[0], /^polvo-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.db$/);
    assert.match(r.saida, /integridade ok/);

    const arquivo = path.join(destino, nomes[0]);
    assert.equal(contarEm(arquivo, 'clientes'), 3);
    assert.equal(contarEm(arquivo, 'orcamentos'), 2);
  });

  test('a cópia leva o hash de senha — ela serve para restaurar o sistema', () => {
    const { destino, ambiente } = montarCenario({ clientes: 1 });
    rodar([], ambiente);

    const arquivo = path.join(destino, copias(destino)[0]);
    const db = new DatabaseSync(arquivo, { readOnly: true });
    const linha = db.prepare('SELECT senha_hash FROM clientes').get();
    db.close();
    assert.match(linha.senha_hash, /^scrypt\$/);
  });

  test('por padrão a pasta de cópias fica fora de dados/', () => {
    // Apagar a pasta do banco não pode levar os backups junto. Aqui olhamos os
    // caminhos padrão, sem BANCO/DESTINO_BACKUP no ambiente.
    const limpo = { ...process.env };
    delete limpo.BANCO;
    delete limpo.DESTINO_BACKUP;

    const r = spawnSync(process.execPath, ['-e', `
      const b = require(${JSON.stringify(BACKUP)});
      const { ARQUIVO } = require(${JSON.stringify(path.join(__dirname, 'db.js'))});
      console.log(JSON.stringify({ destino: b.DESTINO, banco: ARQUIVO }));
    `], { env: limpo, encoding: 'utf8' });

    const { destino, banco } = JSON.parse(r.stdout.trim().split('\n').pop());
    assert.ok(!destino.startsWith(path.dirname(banco) + path.sep),
      `${destino} está dentro de ${path.dirname(banco)}`);
  });

  test('escrita depois do backup não aparece na cópia', () => {
    const { banco, destino, ambiente } = montarCenario({ clientes: 1 });
    rodar([], ambiente);

    const db = new DatabaseSync(banco);
    db.prepare('INSERT INTO clientes (nome, email, senha_hash) VALUES (?, ?, ?)')
      .run('Depois', 'depois@exemplo.com', 'x');
    db.close();

    assert.equal(contarEm(path.join(destino, copias(destino)[0]), 'clientes'), 1);
    assert.equal(contarEm(banco, 'clientes'), 2);
  });
});

/* ---- Poda --------------------------------------------------------------- */

describe('poda', () => {
  /* Cria cópias com nome de datas antigas, sem esperar segundos reais passarem. */
  function semear(destino, quantas) {
    fs.mkdirSync(destino, { recursive: true });
    for (let i = 1; i <= quantas; i++) {
      const nome = `polvo-2026-01-${String(i).padStart(2, '0')}T00-00-00.db`;
      fs.writeFileSync(path.join(destino, nome), 'copia de mentira');
    }
  }

  test('mantém as MANTER mais novas e apaga o resto', () => {
    const { destino, ambiente } = montarCenario();
    semear(destino, 5);

    const r = rodar([], { ...ambiente, MANTER_BACKUPS: '3' });
    assert.equal(r.codigo, 0, r.saida);

    const nomes = copias(destino).sort();
    assert.equal(nomes.length, 3);
    // As mais antigas foram embora; a de hoje e as duas últimas de janeiro ficam.
    assert.ok(!nomes.includes('polvo-2026-01-01T00-00-00.db'));
    assert.ok(nomes.includes('polvo-2026-01-05T00-00-00.db'));
  });

  test('MANTER_BACKUPS=0 desliga a poda', () => {
    const { destino, ambiente } = montarCenario();
    semear(destino, 4);

    rodar([], { ...ambiente, MANTER_BACKUPS: '0' });
    assert.equal(copias(destino).length, 5);
  });

  test('não apaga nada quando ainda cabe', () => {
    const { destino, ambiente } = montarCenario();
    semear(destino, 2);

    const r = rodar([], { ...ambiente, MANTER_BACKUPS: '10' });
    assert.equal(copias(destino).length, 3);
    assert.doesNotMatch(r.saida, /removida/);
  });
});

/* ---- Export ------------------------------------------------------------- */

describe('exportar', () => {
  test('gera JSON com os dados e sem hash de senha', () => {
    const { destino, ambiente } = montarCenario({ clientes: 2, orcamentos: 3 });

    const r = rodar([], ambiente, { comando: 'exportar' });
    assert.equal(r.codigo, 0, r.saida);

    const nome = fs.readdirSync(destino).find(n => n.startsWith('export-'));
    assert.ok(nome, 'nenhum arquivo de export');

    const bruto = fs.readFileSync(path.join(destino, nome), 'utf8');
    assert.doesNotMatch(bruto, /scrypt\$/);

    const dados = JSON.parse(bruto);
    assert.equal(dados.clientes.length, 2);
    assert.equal(dados.orcamentos.length, 3);
    assert.equal(dados.clientes[0].senha_hash, undefined);
    // itens volta como lista, não como string JSON — é o que uma planilha espera.
    assert.ok(Array.isArray(dados.orcamentos[0].itens));
    assert.equal(dados.orcamentos[0].itens[0].nome, 'Água sanitária');
  });

  test('não inclui sessões', () => {
    const { destino, ambiente } = montarCenario();
    rodar([], ambiente, { comando: 'exportar' });

    const nome = fs.readdirSync(destino).find(n => n.startsWith('export-'));
    const dados = JSON.parse(fs.readFileSync(path.join(destino, nome), 'utf8'));
    assert.equal(dados.sessoes, undefined);
  });
});

/* ---- Restaurar ---------------------------------------------------------- */

describe('restaurar', () => {
  let cenario, copiaAntiga;

  beforeEach(() => {
    cenario = montarCenario({ clientes: 1 });
    rodar([], cenario.ambiente);                       // cópia com 1 cliente
    copiaAntiga = copias(cenario.destino)[0];

    const db = new DatabaseSync(cenario.banco);         // e agora o banco tem 3
    for (const n of [2, 3]) {
      db.prepare('INSERT INTO clientes (nome, email, senha_hash) VALUES (?, ?, ?)')
        .run(`Novo ${n}`, `n${n}@exemplo.com`, 'x');
    }
    db.close();
  });

  test('sem a palavra de confirmação, não altera nada', () => {
    const r = rodar([copiaAntiga], cenario.ambiente, { comando: 'restaurar', entrada: 'sim\n' });
    assert.equal(r.codigo, 0, r.saida);
    assert.match(r.saida, /Nada foi alterado/);
    assert.equal(contarEm(cenario.banco, 'clientes'), 3);
  });

  test('confirmado, troca o banco e guarda o anterior', () => {
    const r = rodar([copiaAntiga], cenario.ambiente,
      { comando: 'restaurar', entrada: 'restaurar\n' });
    assert.equal(r.codigo, 0, r.saida);

    assert.equal(contarEm(cenario.banco, 'clientes'), 1);

    const rede = fs.readdirSync(cenario.destino).find(n => n.startsWith('antes-de-restaurar-'));
    assert.ok(rede, 'não guardou o banco anterior');
    assert.equal(contarEm(path.join(cenario.destino, rede), 'clientes'), 3);
  });

  test('não deixa -wal do banco antigo sobrar sobre o arquivo novo', () => {
    rodar([copiaAntiga], cenario.ambiente, { comando: 'restaurar', entrada: 'restaurar\n' });
    assert.ok(!fs.existsSync(cenario.banco + '-wal'));
    assert.ok(!fs.existsSync(cenario.banco + '-shm'));
  });

  test('reclama de arquivo que não existe, sem encostar no banco', () => {
    const r = rodar(['polvo-2000-01-01T00-00-00.db'], cenario.ambiente,
      { comando: 'restaurar', entrada: 'restaurar\n' });
    assert.notEqual(r.codigo, 0);
    assert.equal(contarEm(cenario.banco, 'clientes'), 3);
  });

  test('recusa cópia corrompida, sem encostar no banco', () => {
    const ruim = path.join(cenario.destino, 'polvo-2026-02-02T00-00-00.db');
    fs.writeFileSync(ruim, 'isto não é um banco');

    const r = rodar([path.basename(ruim)], cenario.ambiente,
      { comando: 'restaurar', entrada: 'restaurar\n' });
    assert.notEqual(r.codigo, 0);
    assert.equal(contarEm(cenario.banco, 'clientes'), 3);
  });

  test('sem argumento, mostra o uso e falha', () => {
    const r = rodar([], cenario.ambiente, { comando: 'restaurar' });
    assert.notEqual(r.codigo, 0);
    assert.match(r.saida, /Uso:/);
    assert.equal(contarEm(cenario.banco, 'clientes'), 3);
  });
});

/* ---- Listar ------------------------------------------------------------- */

describe('listar', () => {
  test('avisa quando não há cópia nenhuma', () => {
    const { ambiente } = montarCenario();
    const r = rodar([], ambiente, { comando: 'listar' });
    assert.equal(r.codigo, 0, r.saida);
    assert.match(r.saida, /Nenhuma cópia/);
  });

  test('lista o que existe', () => {
    const { destino, ambiente } = montarCenario();
    rodar([], ambiente);

    const r = rodar([], ambiente, { comando: 'listar' });
    assert.match(r.saida, new RegExp(copias(destino)[0].replace(/\./g, '\\.')));
    assert.match(r.saida, /1 cópia\(s\)/);
  });
});
