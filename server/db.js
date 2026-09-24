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

const PASTA = path.join(__dirname, '..', 'dados');
const ARQUIVO = path.join(PASTA, 'polvo.db');

fs.mkdirSync(PASTA, { recursive: true });

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
    lida       INTEGER NOT NULL DEFAULT 0,
    criado_em  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_msg_criado ON mensagens(criado_em DESC);
`);

/* Limpa sessões vencidas. Chamado no boot e de hora em hora. */
function limparSessoes() {
  const r = db.prepare(`DELETE FROM sessoes WHERE expira_em < datetime('now')`).run();
  return r.changes;
}

module.exports = { db, limparSessoes, ARQUIVO };
