/* =========================================================================
   Utilitário de linha de comando.

     node server/cli.js criar-admin "Nome" email@exemplo.com
     node server/cli.js promover email@exemplo.com
     node server/cli.js listar

   A senha é pedida escondida no terminal, de propósito: passar senha como
   argumento deixaria ela no histórico do shell e na lista de processos.
   ========================================================================= */

'use strict';

const readline = require('node:readline');
const { db } = require('./db');
const auth = require('./auth');

/* ---- Entrada ----------------------------------------------------------- */

/* Entrada em dois modos.

   Com terminal de verdade usamos readline e silenciamos o eco da senha.
   Com stdin vindo de pipe não dá para usar readline em várias perguntas:
   com terminal:false o stream termina depois da primeira leitura e o segundo
   question() nunca chama o callback. Então, no pipe, lemos tudo de uma vez e
   servimos linha por linha.                                                  */

const tty = Boolean(process.stdin.isTTY);
const escrever = txt => process.stdout.write(txt);

let rl = null;              // só no modo terminal
let mudo = false;
let linhas = null, iLinha = 0;   // só no modo pipe

async function prepararEntrada() {
  if (rl || linhas) return;
  if (tty) {
    rl = readline.createInterface({
      input: process.stdin, output: process.stdout, terminal: true
    });
    rl._writeToOutput = txt => {
      if (!mudo) return escrever(txt);
      if (txt.includes('\n')) escrever('\n');   // engole o eco, mantém a quebra
    };
  } else {
    let buf = '';
    for await (const pedaco of process.stdin) buf += pedaco;
    linhas = buf.split(/\r?\n/);
  }
}

function perguntar(rotulo, { escondido = false } = {}) {
  escrever(rotulo);
  if (!tty) {
    const v = linhas[iLinha++] ?? '';
    escrever('\n');
    return Promise.resolve(v);
  }
  return new Promise(resolve => {
    mudo = escondido;
    rl.question('', resposta => { mudo = false; resolve(resposta); });
  });
}

async function pedirSenha() {
  await prepararEntrada();
  const a = await perguntar('Senha (mín. 8 caracteres): ', { escondido: true });
  if (a.length < 8) { console.error('\nSenha curta demais.'); process.exit(1); }
  const b = await perguntar('Repita a senha: ', { escondido: true });
  if (a !== b) { console.error('\nAs senhas não conferem.'); process.exit(1); }
  return a;
}

/* ---- Comandos ---------------------------------------------------------- */

async function criarAdmin(nome, email) {
  if (!nome || !email) {
    console.error('Uso: node server/cli.js criar-admin "Nome" email@exemplo.com');
    process.exit(1);
  }
  email = email.trim().toLowerCase();

  if (db.prepare('SELECT 1 FROM clientes WHERE email = ?').get(email)) {
    console.error(`Já existe conta com ${email}. Use "promover" para torná-la admin.`);
    process.exit(1);
  }

  const senha = await pedirSenha();
  const hash = await auth.gerarHash(senha);
  db.prepare(`
    INSERT INTO clientes (nome, email, senha_hash, papel) VALUES (?, ?, ?, 'admin')
  `).run(nome.trim(), email, hash);

  console.log(`\nAdmin criado: ${email}`);
}

async function promover(email) {
  if (!email) {
    console.error('Uso: node server/cli.js promover email@exemplo.com');
    process.exit(1);
  }
  email = email.trim().toLowerCase();
  const r = db.prepare(`UPDATE clientes SET papel = 'admin' WHERE email = ?`).run(email);
  if (!r.changes) { console.error(`Ninguém com o e-mail ${email}.`); process.exit(1); }
  console.log(`${email} agora é admin.`);
}

function listar() {
  const linhas = db.prepare(`
    SELECT id, nome, email, papel, ativo, criado_em FROM clientes ORDER BY id
  `).all();
  if (!linhas.length) return console.log('Nenhuma conta ainda.');
  console.log('');
  for (const c of linhas) {
    const marca = c.papel === 'admin' ? '*' : ' ';
    const estado = c.ativo ? '' : '  (inativo)';
    console.log(`${marca} ${String(c.id).padStart(3)}  ${c.email.padEnd(32)} ${c.nome}${estado}`);
  }
  console.log(`\n  * = admin   (${linhas.length} conta(s))\n`);
}

/* ---- Despacho ---------------------------------------------------------- */

const [, , comando, ...args] = process.argv;

(async () => {
  switch (comando) {
    case 'criar-admin': await criarAdmin(args[0], args[1]); break;
    case 'promover':    await promover(args[0]); break;
    case 'listar':      listar(); break;
    default:
      console.log(`
  Comandos:
    node server/cli.js criar-admin "Nome" email@exemplo.com
    node server/cli.js promover email@exemplo.com
    node server/cli.js listar
`);
  }
  if (rl) rl.close();
})();
