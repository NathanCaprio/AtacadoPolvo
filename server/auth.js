/* =========================================================================
   Autenticação — senha com scrypt e sessão em cookie httpOnly.

   Decisões, para quem for mexer depois:
   - Senha nunca é guardada; guardamos scrypt(senha, salt) com salt por usuário.
   - O token de sessão só existe em claro dentro do cookie. No banco fica o
     sha256 dele, então vazar o banco não dá acesso às sessões.
   - Comparações usam timingSafeEqual para não vazar informação pelo tempo.
   ========================================================================= */

'use strict';

const crypto = require('node:crypto');
const { promisify } = require('node:util');
const { db } = require('./db');

const scrypt = promisify(crypto.scrypt);

// Parâmetros do scrypt. N=16384 leva ~100ms nesta máquina: caro o bastante
// para força bruta, barato o bastante para um login.
const N = 16384, r = 8, p = 1, TAM = 64;

const DIAS_SESSAO = 30;
const COOKIE = 'polvo_sessao';

/* ---- 1. Senha ---------------------------------------------------------- */

async function gerarHash(senha) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(senha, salt, TAM, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

async function conferirSenha(senha, armazenado) {
  try {
    const [algo, n, rr, pp, saltHex, hashHex] = String(armazenado).split('$');
    if (algo !== 'scrypt') return false;
    const salt = Buffer.from(saltHex, 'hex');
    const esperado = Buffer.from(hashHex, 'hex');
    const obtido = await scrypt(senha, salt, esperado.length, {
      N: Number(n), r: Number(rr), p: Number(pp)
    });
    return crypto.timingSafeEqual(esperado, obtido);
  } catch {
    return false;
  }
}

/* ---- 2. Sessões -------------------------------------------------------- */

const hashToken = t => crypto.createHash('sha256').update(t).digest('hex');

function criarSessao(clienteId, userAgent) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expira = new Date(Date.now() + DIAS_SESSAO * 864e5).toISOString();
  db.prepare(`
    INSERT INTO sessoes (token_hash, cliente_id, expira_em, user_agent)
    VALUES (?, ?, ?, ?)
  `).run(hashToken(token), clienteId, expira, (userAgent || '').slice(0, 250));
  return { token, expira };
}

/** Devolve o cliente dono da sessão, ou null. */
function clienteDaSessao(token) {
  if (!token) return null;
  return db.prepare(`
    SELECT c.id, c.nome, c.email, c.papel, c.telefone, c.empresa, c.criado_em
      FROM sessoes s
      JOIN clientes c ON c.id = s.cliente_id
     WHERE s.token_hash = ?
       AND s.expira_em > datetime('now')
       AND c.ativo = 1
  `).get(hashToken(token)) || null;
}

function encerrarSessao(token) {
  if (!token) return;
  db.prepare('DELETE FROM sessoes WHERE token_hash = ?').run(hashToken(token));
}

function encerrarTodasDoCliente(clienteId) {
  db.prepare('DELETE FROM sessoes WHERE cliente_id = ?').run(clienteId);
}

/* ---- 3. Recuperação de senha ------------------------------------------
   Mesmo desenho das sessões: o token só existe em claro no link que vai
   para o cliente; no banco fica o sha256. Validade curta (1 hora) porque
   um link de redefinição é uma chave da conta inteira, e ele passa por
   e-mail ou WhatsApp, que não são canais seguros.
   Cada pedido novo invalida os anteriores daquela conta — assim um link
   antigo que ficou numa caixa de entrada para de valer.                   */

const HORAS_RECUPERACAO = 1;

function criarRecuperacao(clienteId, origem = 'cliente') {
  db.prepare('DELETE FROM recuperacoes WHERE cliente_id = ? AND usado_em IS NULL')
    .run(clienteId);

  const token = crypto.randomBytes(32).toString('base64url');
  const expira = new Date(Date.now() + HORAS_RECUPERACAO * 36e5).toISOString();
  db.prepare(`
    INSERT INTO recuperacoes (token_hash, cliente_id, expira_em, origem)
    VALUES (?, ?, ?, ?)
  `).run(hashToken(token), clienteId, expira, origem);
  return { token, expira };
}

/** Devolve a linha da recuperação válida, ou null. */
function recuperacaoValida(token) {
  if (!token || typeof token !== 'string') return null;
  return db.prepare(`
    SELECT r.id, r.cliente_id, c.email, c.nome
      FROM recuperacoes r
      JOIN clientes c ON c.id = r.cliente_id
     WHERE r.token_hash = ?
       AND r.usado_em IS NULL
       AND r.expira_em > datetime('now')
       AND c.ativo = 1
  `).get(hashToken(token)) || null;
}

function marcarRecuperacaoUsada(id) {
  db.prepare(`UPDATE recuperacoes SET usado_em = datetime('now') WHERE id = ?`).run(id);
}

/* ---- 4. Cookie --------------------------------------------------------- */

function lerCookie(req, nome) {
  const bruto = req.headers.cookie;
  if (!bruto) return null;
  for (const parte of bruto.split(';')) {
    const i = parte.indexOf('=');
    if (i < 0) continue;
    if (parte.slice(0, i).trim() === nome) {
      return decodeURIComponent(parte.slice(i + 1).trim());
    }
  }
  return null;
}

// Secure fica de fora no localhost porque o navegador descarta cookie Secure
// em http://. Em produção, sirva por HTTPS e ligue seguro:true.
function cookieSessao(token, { seguro = false } = {}) {
  const partes = [
    `${COOKIE}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'SameSite=Lax',      // barra CSRF vindo de outro site em POST
    'Path=/',
    `Max-Age=${DIAS_SESSAO * 86400}`
  ];
  if (seguro) partes.push('Secure');
  return partes.join('; ');
}

const cookieLimpo = () =>
  `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;

module.exports = {
  gerarHash, conferirSenha,
  criarSessao, clienteDaSessao, encerrarSessao, encerrarTodasDoCliente,
  criarRecuperacao, recuperacaoValida, marcarRecuperacaoUsada, HORAS_RECUPERACAO,
  lerCookie, cookieSessao, cookieLimpo, COOKIE
};
