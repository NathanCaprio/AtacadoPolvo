/* =========================================================================
   Backup do banco — sem dependências, sem serviço externo.

     node server/backup.js                 cópia nova + poda das antigas
     node server/backup.js listar          o que já existe
     node server/backup.js exportar        JSON legível (sem senha)
     node server/backup.js restaurar ARQ   volta para uma cópia

   Por que não copiar o polvo.db com `cp`: com WAL ligado, parte das escritas
   recentes vive no arquivo -wal. Copiar só o .db pode render um banco válido
   mas desatualizado, ou um trio .db/-wal/-shm inconsistente entre si.
   VACUUM INTO resolve os dois: o SQLite escreve um banco completo e já
   compactado, dentro de uma transação, com o servidor rodando.

   Onde cai: pasta backups/ na raiz (ou DESTINO_BACKUP). Nunca dentro de
   dados/ — quem apagar a pasta do banco levaria as cópias junto. As duas
   estão no .gitignore: o arquivo contém os hashes de senha dos clientes.
   ========================================================================= */

'use strict';

const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

const { db, ARQUIVO } = require('./db');

const DESTINO = process.env.DESTINO_BACKUP || path.join(__dirname, '..', 'backups');
const MANTER = Number(process.env.MANTER_BACKUPS || 14);

const PREFIXO = 'polvo-';
const TABELAS = ['clientes', 'sessoes', 'orcamentos', 'mensagens'];

/* ---- Ajudantes --------------------------------------------------------- */

// 2026-09-24T14-03-51 — ordenável como texto, e sem ':' (proibido no Windows).
function marcaDeTempo(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
         `T${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

function tamanhoLegivel(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function contar(banco) {
  const linhas = {};
  for (const t of TABELAS) {
    try {
      linhas[t] = banco.prepare(`SELECT count(*) AS n FROM ${t}`).get().n;
    } catch {
      linhas[t] = null;      // tabela pode não existir numa cópia antiga
    }
  }
  return linhas;
}

function resumoLinhas(linhas) {
  return TABELAS
    .filter(t => t !== 'sessoes' && linhas[t] !== null)
    .map(t => `${linhas[t]} ${t}`)
    .join(', ');
}

function copiasExistentes() {
  if (!fs.existsSync(DESTINO)) return [];
  return fs.readdirSync(DESTINO)
    .filter(n => n.startsWith(PREFIXO) && n.endsWith('.db'))
    .sort()                                 // o nome é a data, então ordena por data
    .map(nome => {
      const completo = path.join(DESTINO, nome);
      return { nome, completo, info: fs.statSync(completo) };
    });
}

async function perguntar(rotulo) {
  process.stdout.write(rotulo);

  // Sem terminal (pipe, script, agendador) lemos a resposta do stdin. Não vale
  // assumir "sim" aqui: a confirmação é a única trava antes de sobrescrever o
  // banco, e nesse modo ninguém está olhando a tela.
  if (!process.stdin.isTTY) {
    let buf = '';
    for await (const pedaco of process.stdin) buf += pedaco;
    return buf.split(/\r?\n/)[0] ?? '';
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question('', r => { rl.close(); resolve(r); }));
}

/* ---- Comandos ---------------------------------------------------------- */

/* Cria a cópia e devolve o que foi feito. Lança Error se algo não fechar —
   quem chama decide o que fazer, porque isto também roda dentro do servidor,
   onde um process.exit() derrubaria o site por causa de um backup. */
function criar() {
  fs.mkdirSync(DESTINO, { recursive: true });

  const nome = `${PREFIXO}${marcaDeTempo()}.db`;
  const alvo = path.join(DESTINO, nome);

  // Duas execuções no mesmo segundo. VACUUM INTO recusa arquivo existente.
  if (fs.existsSync(alvo)) throw new Error(`já existe ${nome}`);

  // O caminho vai como parâmetro, e não interpolado no SQL: pasta com apóstrofo
  // (C:\Users\D'Avila\...) quebraria a string montada à mão.
  db.prepare('VACUUM INTO ?').run(alvo);

  // Confere a cópia antes de dizer que deu certo — backup que ninguém abriu
  // é só um arquivo. Abrimos somente para leitura.
  const copia = new DatabaseSync(alvo, { readOnly: true });
  let linhas;
  try {
    const veredito = Object.values(copia.prepare('PRAGMA integrity_check').get())[0];
    if (veredito !== 'ok') throw new Error(`cópia corrompida (${veredito})`);
    linhas = contar(copia);
  } finally {
    copia.close();
  }

  const origem = contar(db);
  for (const t of TABELAS) {
    if (t === 'sessoes') continue;          // podem expirar no meio do caminho
    if (linhas[t] !== origem[t]) {
      throw new Error(`a cópia tem ${linhas[t]} linha(s) em ${t} e o banco tem ${origem[t]}`);
    }
  }

  return { nome, alvo, linhas, tamanho: fs.statSync(alvo).size, podadas: podar() };
}

/* Mantém as MANTER cópias mais novas. MANTER=0 desliga a poda. */
function podar() {
  if (!MANTER) return 0;
  const copias = copiasExistentes();
  const sobrando = copias.length - MANTER;
  if (sobrando <= 0) return 0;

  for (const c of copias.slice(0, sobrando)) fs.rmSync(c.completo);
  return sobrando;
}

function listar() {
  const copias = copiasExistentes();
  if (!copias.length) {
    console.log(`\n  Nenhuma cópia em ${DESTINO}`);
    console.log('  Rode: npm run backup\n');
    return;
  }
  console.log('');
  for (const c of copias) {
    console.log(`  ${c.nome}   ${tamanhoLegivel(c.info.size).padStart(9)}`);
  }
  const total = copias.reduce((s, c) => s + c.info.size, 0);
  console.log(`\n  ${copias.length} cópia(s), ${tamanhoLegivel(total)} em ${DESTINO}\n`);
}

/* Export legível, para levar os dados a outro sistema ou a uma planilha.
   Sem senha_hash e sem sessões: isto costuma acabar anexado num e-mail. */
function exportar() {
  fs.mkdirSync(DESTINO, { recursive: true });
  const alvo = path.join(DESTINO, `export-${marcaDeTempo()}.json`);

  const dados = {
    gerado_em: new Date().toISOString(),
    observacao: 'Export sem senhas e sem sessoes. Para restaurar o sistema, use o .db.',
    clientes: db.prepare(`
      SELECT id, nome, email, papel, telefone, empresa, ativo, criado_em, ultimo_acesso
        FROM clientes ORDER BY id
    `).all(),
    orcamentos: db.prepare(`
      SELECT id, cliente_id, itens, total_itens, situacao, criado_em
        FROM orcamentos ORDER BY id
    `).all().map(o => ({ ...o, itens: JSON.parse(o.itens) })),
    mensagens: db.prepare('SELECT * FROM mensagens ORDER BY id').all()
  };

  fs.writeFileSync(alvo, JSON.stringify(dados, null, 2), 'utf8');
  console.log(`\n  ${path.basename(alvo)}  ${tamanhoLegivel(fs.statSync(alvo).size)}`);
  console.log(`  ${dados.clientes.length} clientes, ${dados.orcamentos.length} orçamentos, ` +
              `${dados.mensagens.length} mensagens`);
  console.log(`  em ${DESTINO}\n`);
}

async function restaurar(arq) {
  if (!arq) {
    console.error('Uso: node server/backup.js restaurar polvo-2026-09-24T14-03-51.db');
    console.error('(o nome basta, se a cópia estiver na pasta de backups)');
    process.exit(1);
  }

  const origem = fs.existsSync(arq) ? arq : path.join(DESTINO, arq);
  if (!fs.existsSync(origem)) {
    console.error(`Não achei ${origem}`);
    process.exit(1);
  }

  // Verifica a cópia antes de encostar no banco atual.
  const copia = new DatabaseSync(origem, { readOnly: true });
  let linhas;
  try {
    const veredito = Object.values(copia.prepare('PRAGMA integrity_check').get())[0];
    if (veredito !== 'ok') {
      console.error(`Essa cópia está corrompida (${veredito}). Nada foi alterado.`);
      process.exit(1);
    }
    linhas = contar(copia);
  } finally {
    copia.close();
  }

  console.log(`\n  Restaurar   ${path.basename(origem)}  (${resumoLinhas(linhas)})`);
  console.log(`  sobre       ${ARQUIVO}  (${resumoLinhas(contar(db))})`);
  console.log('\n  O banco de agora será salvo como antes-de-restaurar-*.db antes da troca.');
  console.log('  Pare o servidor antes de continuar.');

  const ok = await perguntar('\n  Digite restaurar para confirmar: ');
  if (ok.trim() !== 'restaurar') {
    console.log('  Cancelado. Nada foi alterado.\n');
    process.exit(0);
  }

  // Rede de segurança: o banco de agora vira uma cópia antes de sumir.
  fs.mkdirSync(DESTINO, { recursive: true });
  const rede = path.join(DESTINO, `antes-de-restaurar-${marcaDeTempo()}.db`);
  db.prepare('VACUUM INTO ?').run(rede);
  db.close();

  // -wal e -shm do banco antigo não podem sobrar: o SQLite os aplicaria
  // sobre o arquivo novo na próxima abertura.
  fs.copyFileSync(origem, ARQUIVO);
  for (const sufixo of ['-wal', '-shm']) {
    if (fs.existsSync(ARQUIVO + sufixo)) fs.rmSync(ARQUIVO + sufixo);
  }

  console.log(`\n  Pronto. Cópia do banco anterior em ${path.basename(rede)}`);
  console.log('  Suba o servidor: npm start\n');
}

/* ---- Backup automático (usado pelo servidor) ---------------------------- */

/* Uma cópia no boot e outra a cada INTERVALO_BACKUP horas. Ninguém vai lembrar
   de rodar o comando à mão todo dia, e o valor de um backup mora justamente na
   regularidade. Falha aqui só vira log: perder o backup é ruim, derrubar o site
   por causa dele é pior. BACKUP_AUTO=0 desliga. */
function agendar(log = console.log) {
  if (process.env.BACKUP_AUTO === '0') return null;

  const horas = Number(process.env.INTERVALO_BACKUP || 24);

  const rodar = () => {
    try {
      const r = criar();
      log(`[backup] ${r.nome}  ${tamanhoLegivel(r.tamanho)}  ${resumoLinhas(r.linhas)}` +
          (r.podadas ? `  (${r.podadas} antiga(s) removida(s))` : ''));
    } catch (e) {
      log(`[backup] falhou: ${e.message}`);
    }
  };

  rodar();
  // unref: um temporizador pendente não deve segurar o processo no ar.
  return setInterval(rodar, horas * 60 * 60 * 1000).unref();
}

/* ---- Despacho ---------------------------------------------------------- */

function cliCriar() {
  let r;
  try {
    r = criar();
  } catch (e) {
    console.error(`\n  Backup não feito: ${e.message}\n`);
    process.exit(1);
  }
  console.log(`\n  ${r.nome}`);
  console.log(`  ${tamanhoLegivel(r.tamanho)}  ·  ${resumoLinhas(r.linhas)}  ·  integridade ok`);
  console.log(`  em ${DESTINO}`);
  if (r.podadas) {
    console.log(`  ${r.podadas} cópia(s) antiga(s) removida(s) — mantendo as ${MANTER} mais novas`);
  }
  console.log('');
}

module.exports = { criar, podar, listar, exportar, agendar, DESTINO };

// Só despacha quando chamado direto na linha de comando. Sem esta guarda, o
// require feito pelo servidor imprimiria o menu de ajuda no boot.
const [, , comando, ...args] = process.argv;

(async () => {
  if (require.main !== module) return;

  switch (comando) {
    case undefined:
    case 'criar':     cliCriar(); break;
    case 'listar':    listar(); break;
    case 'exportar':  exportar(); break;
    case 'restaurar': await restaurar(args[0]); break;
    default:
      console.log(`
  Comandos:
    node server/backup.js                 cria uma cópia e poda as antigas
    node server/backup.js listar          lista as cópias
    node server/backup.js exportar        JSON legível (sem senhas)
    node server/backup.js restaurar ARQ   volta para uma cópia

  Variáveis:
    DESTINO_BACKUP   pasta das cópias (padrão: backups/)
    MANTER_BACKUPS   quantas manter (padrão: 14; 0 desliga a poda)
`);
  }
})();
