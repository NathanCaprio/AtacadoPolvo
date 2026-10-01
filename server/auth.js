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
// Admin vê todos os leads e clientes: sessão esquecida aberta num
// computador da loja vale menos tempo.
const DIAS_SESSAO_ADMIN = 7;
/* Em produção o nome leva o prefixo __Host-: o navegador só aceita esse
   cookie com Secure, Path=/ e sem Domain, então nem um subdomínio nem alguém
   na rede (via http://) consegue plantar ou sobrescrever a sessão. No
   localhost não dá — __Host- exige Secure, e Secure exige https. */
const PRODUCAO = process.env.NODE_ENV === 'production';
const COOKIE = PRODUCAO ? '__Host-polvo_sessao' : 'polvo_sessao';
const diasDaSessao = papel => (papel === 'admin' ? DIAS_SESSAO_ADMIN : DIAS_SESSAO);

/* ---- 1. Senha ---------------------------------------------------------- */

async function gerarHash(senha) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(senha, salt, TAM, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

/* Hash descartável para o login com e-mail inexistente. Calculado uma vez só:
   gerar um a cada pedido custava dois scrypts (gerar + conferir) contra um do
   e-mail que existe — o dobro do tempo, e o tempo denunciava quem é cliente. */
let descarte = null;
const hashDescarte = () => (descarte ||= gerarHash('descarte-' + crypto.randomUUID()));

/* As senhas que caem primeiro em qualquer lista de força bruta. O mínimo de
   8 caracteres sozinho deixa passar "12345678" e "senha123". */
const SENHAS_OBVIAS = new Set([
  '12345678', '123456789', '1234567890', '12341234', '11111111', '00000000',
  '87654321', '123123123', '11223344', '12344321', 'abcd1234', 'abc12345',
  'qwerty123', 'qwertyuiop', 'password', 'password1', 'senha123', 'senha1234',
  'senha12345', 'mudar123', 'mudar1234', 'admin123', 'admin1234', 'iloveyou',
  'teamo123', 'brasil123', 'flamengo', 'corinthians', 'palmeiras', 'polvo123',
  'atacado123', 'atacadopolvo'
]);

/** Mensagem de recusa, ou null se a senha serve. */
function senhaFraca(senha, email = '') {
  const s = String(senha);
  if (s.length < 8) return 'A senha precisa de ao menos 8 caracteres.';
  if (s.length > 200) return 'Senha longa demais.';
  const minuscula = s.toLowerCase();
  if (SENHAS_OBVIAS.has(minuscula) || /^(.)\1+$/.test(s) ||
      (email && (minuscula === email.toLowerCase() || minuscula === email.split('@')[0].toLowerCase()))) {
    return 'Essa senha é fácil demais de adivinhar. Escolha outra.';
  }
  return null;
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

function criarSessao(clienteId, userAgent, dias = DIAS_SESSAO) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expira = new Date(Date.now() + dias * 864e5).toISOString();
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
      // Cookie malformado (%E0) não pode virar 500: é só "sem sessão".
      try { return decodeURIComponent(parte.slice(i + 1).trim()); } catch { return null; }
    }
  }
  return null;
}

// Secure fica de fora no localhost porque o navegador descarta cookie Secure
// em http://. Em produção (NODE_ENV=production) entra sozinho.
function cookieSessao(token, { seguro = PRODUCAO, dias = DIAS_SESSAO } = {}) {
  const partes = [
    `${COOKIE}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'SameSite=Lax',      // barra CSRF vindo de outro site em POST
    'Path=/',
    `Max-Age=${dias * 86400}`
  ];
  if (seguro) partes.push('Secure');
  return partes.join('; ');
}

// Com __Host-, até o cookie de apagar precisa de Secure, senão o navegador
// ignora e a sessão fica no navegador depois do "sair".
const cookieLimpo = () =>
  `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${PRODUCAO ? '; Secure' : ''}`;

module.exports = {
  gerarHash, conferirSenha, hashDescarte, senhaFraca, diasDaSessao,
  criarSessao, clienteDaSessao, encerrarSessao, encerrarTodasDoCliente,
  criarRecuperacao, recuperacaoValida, marcarRecuperacaoUsada, HORAS_RECUPERACAO,
  lerCookie, cookieSessao, cookieLimpo, COOKIE
};
