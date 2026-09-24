/* =========================================================================
   Banco de dados — SQLite via módulo nativo do Node (sem dependências).

   O arquivo do banco fica em dados/polvo.db, criado na primeira execução.
   O schema é aplicado toda vez que o servidor sobe (CREATE TABLE IF NOT
   EXISTS), então não existe passo de migração manual por enquanto.

   node:sqlite ainda é marcado como experimental no Node 22 — ele funciona,
   mas emite um aviso no boot. Se um dia precisar trocar, a única superfície
   usada aqui é db.prepare().get/all/run, igual à do better-sqlite3.
   ========================================================================= */

'use strict';

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

// BANCO permite apontar para outro arquivo — é assim que os testes rodam
// isolados, sem encostar no banco de verdade.
const ARQUIVO = process.env.BANCO || path.join(__dirname, '..', 'dados', 'polvo.db');

fs.mkdirSync(path.dirname(ARQUIVO), { recursive: true });

const db = new DatabaseSync(ARQUIVO);

// WAL deixa leitura e escrita concorrentes bem mais tranquilas.
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS clientes (
    id            INTEGER PRIMARY KEY,
    nome          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,      -- sempre em minúsculas
    senha_hash    TEXT NOT NULL,             -- scrypt$N$r$p$salt$hash
    papel         TEXT NOT NULL DEFAULT 'cliente'
                  CHECK (papel IN ('cliente','admin')),
    telefone      TEXT,
    empresa       TEXT,
    ativo         INTEGER NOT NULL DEFAULT 1,
    criado_em     TEXT NOT NULL DEFAULT (datetime('now')),
    ultimo_acesso TEXT
  );

  CREATE TABLE IF NOT EXISTS sessoes (
    id         INTEGER PRIMARY KEY,
    token_hash TEXT NOT NULL UNIQUE,         -- sha256 do token; o cru só vai no cookie
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    criada_em  TEXT NOT NULL DEFAULT (datetime('now')),
    expira_em  TEXT NOT NULL,
    user_agent TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_sessoes_cliente ON sessoes(cliente_id);
  CREATE INDEX IF NOT EXISTS idx_sessoes_expira  ON sessoes(expira_em);

  -- Pedido de orçamento montado no catálogo. Fica gravado mesmo quando a
  -- pessoa não está logada: serve como sinal de demanda e de carrinho
  -- abandonado, já que o envio pelo WhatsApp pode não se concretizar.
  CREATE TABLE IF NOT EXISTS orcamentos (
    id         INTEGER PRIMARY KEY,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
    itens      TEXT NOT NULL,              -- JSON: [{id, nome, qtd, caixa}]
    total_itens INTEGER NOT NULL,
    situacao   TEXT NOT NULL DEFAULT 'novo'
               CHECK (situacao IN ('novo','em_andamento','fechado','perdido')),
    -- Contato de quem montou a lista sem ter conta. É opcional e vem do
    -- próprio visitante. Sem isso, um pedido anônimo que não vira conversa
    -- no WhatsApp deixa a loja sabendo O QUE a pessoa queria e sem nenhum
    -- jeito de falar com ela.
    contato_nome  TEXT,
    contato_email TEXT,
    contato_tel   TEXT,
    aceite_em     TEXT,
    criado_em  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_orc_cliente  ON orcamentos(cliente_id);
  CREATE INDEX IF NOT EXISTS idx_orc_criado   ON orcamentos(criado_em DESC);

  -- Mensagem do formulário de contato.
  CREATE TABLE IF NOT EXISTS mensagens (
    id         INTEGER PRIMARY KEY,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
    nome       TEXT NOT NULL,
    email      TEXT NOT NULL,
    telefone   TEXT,
    empresa    TEXT,
    cnpj       TEXT,
    assunto    TEXT,
    mensagem   TEXT NOT NULL,
    -- De onde o lead veio. É o que responde "a landing de condomínio está
    -- trazendo cliente?" — sem isso, toda mensagem vira um balaio só.
    origem     TEXT NOT NULL DEFAULT 'contato',
    segmento   TEXT,
    -- Quando a pessoa marcou o aceite da política de privacidade. Guardar a
    -- mensagem sem guardar o consentimento deixa a empresa sem prova na hora
    -- em que a administradora ou a escola audita o fornecedor.
    aceite_em  TEXT,
    lida       INTEGER NOT NULL DEFAULT 0,
    criado_em  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_msg_criado ON mensagens(criado_em DESC);

  -- Pedidos de redefinição de senha. Guardamos só o sha256 do token, pela
  -- mesma razão das sessões: vazar o banco não pode entregar conta nenhuma.
  -- A linha sobrevive ao uso (usado_em preenchido) e vira trilha de
  -- auditoria; a limpeza leva embora o que passou da validade.
  CREATE TABLE IF NOT EXISTS recuperacoes (
    id         INTEGER PRIMARY KEY,
    token_hash TEXT NOT NULL UNIQUE,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    criado_em  TEXT NOT NULL DEFAULT (datetime('now')),
    expira_em  TEXT NOT NULL,
    usado_em   TEXT,
    origem     TEXT NOT NULL DEFAULT 'cliente'
               CHECK (origem IN ('cliente','admin'))
  );

  CREATE INDEX IF NOT EXISTS idx_rec_cliente ON recuperacoes(cliente_id);
  CREATE INDEX IF NOT EXISTS idx_rec_expira  ON recuperacoes(expira_em);
`);

/* Limpa sessões vencidas. Chamado no boot e de hora em hora. */
function limparSessoes() {
  const r = db.prepare(`DELETE FROM sessoes WHERE expira_em < datetime('now')`).run();
  return r.changes;
}

/* ---- Migrações ---------------------------------------------------------
   O schema acima é CREATE TABLE IF NOT EXISTS: ele cria banco novo, mas não
   mexe em tabela que já existe. Para banco antigo, cada coluna nova entra
   aqui. É idempotente — rodar de novo não faz nada.                        */

function colunas(tabela) {
  return db.prepare(`PRAGMA table_info(${tabela})`).all().map(c => c.name);
}

function migrar() {
  const m = colunas('mensagens');
  if (!m.includes('origem')) {
    db.exec(`ALTER TABLE mensagens ADD COLUMN origem TEXT NOT NULL DEFAULT 'contato'`);
  }
  if (!m.includes('segmento')) {
    db.exec('ALTER TABLE mensagens ADD COLUMN segmento TEXT');
  }
  if (!m.includes('aceite_em')) {
    db.exec('ALTER TABLE mensagens ADD COLUMN aceite_em TEXT');
  }

  const o = colunas('orcamentos');
  for (const coluna of ['contato_nome', 'contato_email', 'contato_tel', 'aceite_em']) {
    if (!o.includes(coluna)) {
      db.exec(`ALTER TABLE orcamentos ADD COLUMN ${coluna} TEXT`);
    }
  }
}

migrar();

/* Tokens de recuperação vencidos, ou usados há mais de 7 dias. O prazo
   extra existe para o histórico recente continuar visível numa investigação
   ("quem pediu redefinição ontem?"). */
function limparRecuperacoes() {
  const r = db.prepare(`
    DELETE FROM recuperacoes
     WHERE expira_em < datetime('now')
        OR (usado_em IS NOT NULL AND usado_em < datetime('now','-7 days'))
  `).run();
  return r.changes;
}

module.exports = { db, limparSessoes, limparRecuperacoes, ARQUIVO };
