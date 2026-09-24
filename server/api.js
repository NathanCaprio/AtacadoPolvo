/* =========================================================================
   Rotas da API.

     POST   /api/auth/cadastrar        cria conta e já entra
     POST   /api/auth/entrar           login
     POST   /api/auth/sair             logout
     GET    /api/auth/eu               quem está logado
     PATCH  /api/auth/eu               edita os próprios dados
     PATCH  /api/auth/senha            troca a senha

     POST   /api/orcamentos            grava um pedido de orçamento
     POST   /api/mensagens             grava uma mensagem de contato
     GET    /api/meus/orcamentos       orçamentos do cliente logado

     GET    /api/admin/resumo          contagens para o painel
     GET    /api/admin/clientes        lista de clientes
     PATCH  /api/admin/clientes/:id    muda papel / ativa / desativa
     DELETE /api/admin/clientes/:id    remove cliente
     GET    /api/admin/orcamentos      todos os orçamentos
     PATCH  /api/admin/orcamentos/:id  muda a situação
     GET    /api/admin/mensagens       todas as mensagens
     PATCH  /api/admin/mensagens/:id   marca lida / não lida

   Tudo devolve JSON. Erros usam { erro: "mensagem" } com o status HTTP certo.
   ========================================================================= */

'use strict';

const { StringDecoder } = require('node:string_decoder');
const { db } = require('./db');
const auth = require('./auth');

const PRODUCAO = process.env.NODE_ENV === 'production';

/* ---- 1. Helpers de resposta ------------------------------------------- */

function json(res, status, corpo, cabecalhos = {}) {
  const txt = JSON.stringify(corpo);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(txt),
    'Cache-Control': 'no-store',
    ...cabecalhos
  });
  res.end(txt);
}
const erro = (res, status, msg, cab) => json(res, status, { erro: msg }, cab);

/* O StringDecoder segura os bytes de um caractere multibyte que caia na
   fronteira entre dois chunks. Concatenar pedaco.toString() direto
   transformaria um "í" partido ao meio em U+FFFD.                          */
async function lerJson(req, limite = 16 * 1024) {
  const decodificador = new StringDecoder('utf8');
  let bruto = '', tamanho = 0;

  for await (const pedaco of req) {
    tamanho += pedaco.length;
    if (tamanho > limite) throw new Error('corpo grande demais');
    bruto += decodificador.write(pedaco);
  }
  bruto += decodificador.end();

  if (!bruto.trim()) return {};
  return JSON.parse(bruto);
}

/* ---- 2. Validação ------------------------------------------------------ */

const texto = v => (typeof v === 'string' ? v.trim() : '');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

function validarCadastro(c) {
  const problemas = [];
  const nome = texto(c.nome);
  const email = texto(c.email).toLowerCase();
  const senha = typeof c.senha === 'string' ? c.senha : '';

  if (nome.length < 2 || nome.length > 120) problemas.push('Informe seu nome.');
  if (!EMAIL_RE.test(email) || email.length > 160) problemas.push('E-mail inválido.');
  if (senha.length < 8) problemas.push('A senha precisa de ao menos 8 caracteres.');
  if (senha.length > 200) problemas.push('Senha longa demais.');

  return {
    problemas,
    dados: {
      nome, email, senha,
      telefone: texto(c.telefone).slice(0, 40) || null,
      empresa: texto(c.empresa).slice(0, 120) || null
    }
  };
}

/* ---- 3. Rate limit (memória) ------------------------------------------
   Janela deslizante simples por IP. Como é um processo só, um Map resolve.
   Se um dia rodar em mais de uma instância, isso precisa sair para o banco
   ou para um Redis — senão o limite vale por instância.                   */

const tentativas = new Map();

function limitar(ip, chave, max, janelaMs) {
  const agora = Date.now();
  const id = `${chave}:${ip}`;
  const lista = (tentativas.get(id) || []).filter(t => agora - t < janelaMs);
  lista.push(agora);
  tentativas.set(id, lista);
  return lista.length <= max;
}

setInterval(() => {
  const limite = Date.now() - 60 * 60 * 1000;
  for (const [id, lista] of tentativas) {
    const vivos = lista.filter(t => t > limite);
    if (vivos.length) tentativas.set(id, vivos); else tentativas.delete(id);
  }
}, 10 * 60 * 1000).unref();

/* ---- 4. Sessão do pedido ---------------------------------------------- */

function clienteAtual(req) {
  return auth.clienteDaSessao(auth.lerCookie(req, auth.COOKIE));
}

function entrarComSessao(res, clienteId, req, corpo, status = 200) {
  const { token } = auth.criarSessao(clienteId, req.headers['user-agent']);
  db.prepare(`UPDATE clientes SET ultimo_acesso = datetime('now') WHERE id = ?`)
    .run(clienteId);
  json(res, status, corpo, { 'Set-Cookie': auth.cookieSessao(token, { seguro: PRODUCAO }) });
}

/* ---- 5. Rotas de autenticação ----------------------------------------- */

async function cadastrar(req, res, ip) {
  if (!limitar(ip, 'cadastro', 5, 60 * 60 * 1000)) {
    return erro(res, 429, 'Muitas tentativas. Tente de novo mais tarde.');
  }
  const { problemas, dados } = validarCadastro(await lerJson(req));
  if (problemas.length) return erro(res, 400, problemas[0]);

  const existe = db.prepare('SELECT 1 FROM clientes WHERE email = ?').get(dados.email);
  if (existe) return erro(res, 409, 'Já existe uma conta com esse e-mail.');

  const hash = await auth.gerarHash(dados.senha);
  const r = db.prepare(`
    INSERT INTO clientes (nome, email, senha_hash, telefone, empresa)
    VALUES (?, ?, ?, ?, ?)
  `).run(dados.nome, dados.email, hash, dados.telefone, dados.empresa);

  const id = Number(r.lastInsertRowid);
  entrarComSessao(res, id, req, {
    cliente: { id, nome: dados.nome, email: dados.email, papel: 'cliente' }
  }, 201);
}

async function entrar(req, res, ip) {
  if (!limitar(ip, 'login', 10, 15 * 60 * 1000)) {
    return erro(res, 429, 'Muitas tentativas. Espere alguns minutos.');
  }
  const corpo = await lerJson(req);
  const email = texto(corpo.email).toLowerCase();
  const senha = typeof corpo.senha === 'string' ? corpo.senha : '';

  const c = db.prepare('SELECT * FROM clientes WHERE email = ?').get(email);

  // Mesmo sem usuário, roda um scrypt descartável: assim o tempo de resposta
  // não denuncia se o e-mail existe ou não.
  const ok = c
    ? await auth.conferirSenha(senha, c.senha_hash)
    : await auth.conferirSenha(senha, await auth.gerarHash('descarte'));

  if (!c || !ok || !c.ativo) return erro(res, 401, 'E-mail ou senha incorretos.');

  entrarComSessao(res, c.id, req, {
    cliente: { id: c.id, nome: c.nome, email: c.email, papel: c.papel }
  });
}

function sair(req, res) {
  auth.encerrarSessao(auth.lerCookie(req, auth.COOKIE));
  res.writeHead(204, { 'Set-Cookie': auth.cookieLimpo() });
  res.end();
}

function eu(req, res) {
  const c = clienteAtual(req);
  if (!c) return erro(res, 401, 'Não autenticado.');
  json(res, 200, { cliente: c });
}

async function editarEu(req, res) {
  const c = clienteAtual(req);
  if (!c) return erro(res, 401, 'Não autenticado.');
  const corpo = await lerJson(req);

  const nome = texto(corpo.nome) || c.nome;
  if (nome.length < 2 || nome.length > 120) return erro(res, 400, 'Nome inválido.');

  db.prepare('UPDATE clientes SET nome = ?, telefone = ?, empresa = ? WHERE id = ?')
    .run(nome, texto(corpo.telefone).slice(0, 40) || null,
         texto(corpo.empresa).slice(0, 120) || null, c.id);

  json(res, 200, { cliente: clienteAtual(req) });
}

async function trocarSenha(req, res) {
  const c = clienteAtual(req);
  if (!c) return erro(res, 401, 'Não autenticado.');

  const corpo = await lerJson(req);
  const atual = typeof corpo.senhaAtual === 'string' ? corpo.senhaAtual : '';
  const nova = typeof corpo.senhaNova === 'string' ? corpo.senhaNova : '';

  if (nova.length < 8) return erro(res, 400, 'A nova senha precisa de ao menos 8 caracteres.');
  if (nova.length > 200) return erro(res, 400, 'Senha longa demais.');
  if (nova === atual) return erro(res, 400, 'A nova senha é igual à atual.');

  const linha = db.prepare('SELECT senha_hash FROM clientes WHERE id = ?').get(c.id);
  if (!await auth.conferirSenha(atual, linha.senha_hash)) {
    return erro(res, 401, 'A senha atual está incorreta.');
  }

  db.prepare('UPDATE clientes SET senha_hash = ? WHERE id = ?')
    .run(await auth.gerarHash(nova), c.id);

  // Derruba todas as sessões e abre uma nova: se a senha vazou, quem estava
  // logado em outro lugar perde o acesso na hora.
  auth.encerrarTodasDoCliente(c.id);
  entrarComSessao(res, c.id, req, { ok: true });
}

/* ---- 6. Leads: orçamentos e mensagens ---------------------------------- */

/* Gravado também para visitante anônimo: um orçamento montado e não enviado
   é carrinho abandonado, e isso é informação comercial. O POST nunca deve
   atrapalhar o fluxo do WhatsApp, então erro aqui é sempre silencioso no
   front — ver assets/js/catalogo.js.                                       */
async function criarOrcamento(req, res, ip) {
  if (!limitar(ip, 'orcamento', 20, 60 * 60 * 1000)) {
    return erro(res, 429, 'Muitos envios. Tente de novo mais tarde.');
  }
  const corpo = await lerJson(req, 64 * 1024);
  const bruto = Array.isArray(corpo.itens) ? corpo.itens : [];
  if (!bruto.length) return erro(res, 400, 'Lista vazia.');
  if (bruto.length > 200) return erro(res, 400, 'Lista grande demais.');

  // Só o que interessa, com tamanho limitado: o corpo vem do navegador.
  const itens = bruto.slice(0, 200).map(i => ({
    id: texto(i.id).slice(0, 40),
    nome: texto(i.nome).slice(0, 160),
    caixa: texto(i.caixa).slice(0, 80),
    qtd: Math.max(1, Math.min(9999, parseInt(i.qtd, 10) || 1))
  }));
  const total = itens.reduce((s, i) => s + i.qtd, 0);

  const c = clienteAtual(req);
  const r = db.prepare(`
    INSERT INTO orcamentos (cliente_id, itens, total_itens) VALUES (?, ?, ?)
  `).run(c ? c.id : null, JSON.stringify(itens), total);

  json(res, 201, { id: Number(r.lastInsertRowid), total_itens: total });
}

async function criarMensagem(req, res, ip) {
  if (!limitar(ip, 'mensagem', 10, 60 * 60 * 1000)) {
    return erro(res, 429, 'Muitos envios. Tente de novo mais tarde.');
  }
  const b = await lerJson(req, 32 * 1024);
  const nome = texto(b.nome).slice(0, 120);
  const email = texto(b.email).toLowerCase().slice(0, 160);
  const mensagem = texto(b.mensagem).slice(0, 4000);

  if (nome.length < 2) return erro(res, 400, 'Informe seu nome.');
  if (!EMAIL_RE.test(email)) return erro(res, 400, 'E-mail inválido.');
  if (mensagem.length < 5) return erro(res, 400, 'Escreva sua mensagem.');

  const c = clienteAtual(req);
  const r = db.prepare(`
    INSERT INTO mensagens (cliente_id, nome, email, telefone, empresa, cnpj, assunto, mensagem)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(c ? c.id : null, nome, email,
         texto(b.tel || b.telefone).slice(0, 40) || null,
         texto(b.empresa).slice(0, 120) || null,
         texto(b.cnpj).slice(0, 24) || null,
         texto(b.assunto).slice(0, 80) || null,
         mensagem);

  json(res, 201, { id: Number(r.lastInsertRowid) });
}

/** Orçamentos do próprio cliente logado. */
function meusOrcamentos(req, res) {
  const c = clienteAtual(req);
  if (!c) return erro(res, 401, 'Não autenticado.');
  const linhas = db.prepare(`
    SELECT id, itens, total_itens, situacao, criado_em
      FROM orcamentos WHERE cliente_id = ? ORDER BY criado_em DESC LIMIT 50
  `).all(c.id);
  json(res, 200, { orcamentos: linhas.map(o => ({ ...o, itens: JSON.parse(o.itens) })) });
}

/* ---- 7. Rotas de admin ------------------------------------------------- */

function exigirAdmin(req, res) {
  const c = clienteAtual(req);
  if (!c) { erro(res, 401, 'Não autenticado.'); return null; }
  if (c.papel !== 'admin') { erro(res, 403, 'Acesso restrito.'); return null; }
  return c;
}

function resumo(req, res) {
  if (!exigirAdmin(req, res)) return;
  const n = sql => db.prepare(sql).get().n;
  json(res, 200, {
    // Os dois primeiros são o que interessa no dia a dia: o que chegou e
    // ainda não foi trabalhado.
    orcamentosNovos: n(`SELECT COUNT(*) n FROM orcamentos WHERE situacao = 'novo'`),
    mensagensNovas: n('SELECT COUNT(*) n FROM mensagens WHERE lida = 0'),
    orcamentos7d: n(`SELECT COUNT(*) n FROM orcamentos WHERE criado_em > datetime('now','-7 days')`),
    clientes: n('SELECT COUNT(*) n FROM clientes'),
    novos7d: n(`SELECT COUNT(*) n FROM clientes WHERE criado_em > datetime('now','-7 days')`),
    admins: n(`SELECT COUNT(*) n FROM clientes WHERE papel = 'admin'`),
    inativos: n('SELECT COUNT(*) n FROM clientes WHERE ativo = 0'),
    sessoes: n(`SELECT COUNT(*) n FROM sessoes WHERE expira_em > datetime('now')`)
  });
}

function listarClientes(req, res) {
  if (!exigirAdmin(req, res)) return;
  json(res, 200, {
    clientes: db.prepare(`
      SELECT id, nome, email, papel, telefone, empresa, ativo, criado_em, ultimo_acesso
        FROM clientes ORDER BY criado_em DESC LIMIT 500
    `).all()
  });
}

const contaAdmins = () =>
  db.prepare(`SELECT COUNT(*) n FROM clientes WHERE papel='admin' AND ativo=1`).get().n;

const SITUACOES = ['novo', 'em_andamento', 'fechado', 'perdido'];

function listarOrcamentos(req, res) {
  if (!exigirAdmin(req, res)) return;
  const linhas = db.prepare(`
    SELECT o.id, o.itens, o.total_itens, o.situacao, o.criado_em,
           c.nome AS cliente_nome, c.email AS cliente_email, c.empresa AS cliente_empresa
      FROM orcamentos o
      LEFT JOIN clientes c ON c.id = o.cliente_id
     ORDER BY o.criado_em DESC LIMIT 200
  `).all();
  json(res, 200, { orcamentos: linhas.map(o => ({ ...o, itens: JSON.parse(o.itens) })) });
}

async function editarOrcamento(req, res, id) {
  if (!exigirAdmin(req, res)) return;
  const { situacao } = await lerJson(req);
  if (!SITUACOES.includes(situacao)) return erro(res, 400, 'Situação inválida.');

  const r = db.prepare('UPDATE orcamentos SET situacao = ? WHERE id = ?').run(situacao, id);
  if (!r.changes) return erro(res, 404, 'Orçamento não encontrado.');
  json(res, 200, { id, situacao });
}

function listarMensagens(req, res) {
  if (!exigirAdmin(req, res)) return;
  json(res, 200, {
    mensagens: db.prepare(`
      SELECT id, nome, email, telefone, empresa, cnpj, assunto, mensagem, lida, criado_em
        FROM mensagens ORDER BY criado_em DESC LIMIT 200
    `).all()
  });
}

async function editarMensagem(req, res, id) {
  if (!exigirAdmin(req, res)) return;
  const { lida } = await lerJson(req);
  const r = db.prepare('UPDATE mensagens SET lida = ? WHERE id = ?').run(lida ? 1 : 0, id);
  if (!r.changes) return erro(res, 404, 'Mensagem não encontrada.');
  json(res, 200, { id, lida: lida ? 1 : 0 });
}

async function editarCliente(req, res, id) {
  const admin = exigirAdmin(req, res);
  if (!admin) return;

  const alvo = db.prepare('SELECT * FROM clientes WHERE id = ?').get(id);
  if (!alvo) return erro(res, 404, 'Cliente não encontrado.');

  const corpo = await lerJson(req);
  const papel = corpo.papel === undefined ? alvo.papel : String(corpo.papel);
  const ativo = corpo.ativo === undefined ? alvo.ativo : (corpo.ativo ? 1 : 0);

  if (!['cliente', 'admin'].includes(papel)) return erro(res, 400, 'Papel inválido.');

  // Trava anti-lockout: não deixa sumir o último admin ativo.
  const perdeuAdmin = alvo.papel === 'admin' && alvo.ativo &&
                      (papel !== 'admin' || ativo === 0);
  if (perdeuAdmin && contaAdmins() <= 1) {
    return erro(res, 409, 'Este é o único admin ativo. Promova outro antes.');
  }

  db.prepare('UPDATE clientes SET papel = ?, ativo = ? WHERE id = ?')
    .run(papel, ativo, id);

  // Desativado ou rebaixado perde as sessões abertas na hora.
  if (ativo === 0 || papel !== alvo.papel) auth.encerrarTodasDoCliente(id);

  json(res, 200, {
    cliente: db.prepare(`
      SELECT id, nome, email, papel, telefone, empresa, ativo, criado_em, ultimo_acesso
        FROM clientes WHERE id = ?
    `).get(id)
  });
}

function removerCliente(req, res, id) {
  const admin = exigirAdmin(req, res);
  if (!admin) return;
  if (admin.id === id) return erro(res, 409, 'Você não pode remover a própria conta.');

  const alvo = db.prepare('SELECT * FROM clientes WHERE id = ?').get(id);
  if (!alvo) return erro(res, 404, 'Cliente não encontrado.');
  if (alvo.papel === 'admin' && contaAdmins() <= 1) {
    return erro(res, 409, 'Este é o único admin ativo.');
  }

  db.prepare('DELETE FROM clientes WHERE id = ?').run(id);  // sessões caem por cascade
  res.writeHead(204); res.end();
}

/* ---- 7. Roteador ------------------------------------------------------- */

const ROTAS = [
  ['POST',   /^\/api\/auth\/cadastrar$/, (rq, rs, m, ip) => cadastrar(rq, rs, ip)],
  ['POST',   /^\/api\/auth\/entrar$/,    (rq, rs, m, ip) => entrar(rq, rs, ip)],
  ['POST',   /^\/api\/auth\/sair$/,      (rq, rs) => sair(rq, rs)],
  ['GET',    /^\/api\/auth\/eu$/,        (rq, rs) => eu(rq, rs)],
  ['PATCH',  /^\/api\/auth\/eu$/,        (rq, rs) => editarEu(rq, rs)],
  ['PATCH',  /^\/api\/auth\/senha$/,     (rq, rs) => trocarSenha(rq, rs)],

  ['POST',   /^\/api\/orcamentos$/,       (rq, rs, m, ip) => criarOrcamento(rq, rs, ip)],
  ['POST',   /^\/api\/mensagens$/,        (rq, rs, m, ip) => criarMensagem(rq, rs, ip)],
  ['GET',    /^\/api\/meus\/orcamentos$/, (rq, rs) => meusOrcamentos(rq, rs)],

  ['GET',    /^\/api\/admin\/resumo$/,        (rq, rs) => resumo(rq, rs)],
  ['GET',    /^\/api\/admin\/clientes$/,      (rq, rs) => listarClientes(rq, rs)],
  ['PATCH',  /^\/api\/admin\/clientes\/(\d+)$/, (rq, rs, m) => editarCliente(rq, rs, +m[1])],
  ['DELETE', /^\/api\/admin\/clientes\/(\d+)$/, (rq, rs, m) => removerCliente(rq, rs, +m[1])],

  ['GET',    /^\/api\/admin\/orcamentos$/,        (rq, rs) => listarOrcamentos(rq, rs)],
  ['PATCH',  /^\/api\/admin\/orcamentos\/(\d+)$/, (rq, rs, m) => editarOrcamento(rq, rs, +m[1])],
  ['GET',    /^\/api\/admin\/mensagens$/,         (rq, rs) => listarMensagens(rq, rs)],
  ['PATCH',  /^\/api\/admin\/mensagens\/(\d+)$/,  (rq, rs, m) => editarMensagem(rq, rs, +m[1])]
];

/** Devolve true se tratou o pedido. */
async function tratarApi(req, res, caminho, ip) {
  // O caminho pode aparecer em mais de uma rota (PATCH e DELETE em
  // /clientes/:id, por exemplo). Só é 405 se nenhuma delas aceitar o método.
  let caminhoExiste = false;

  for (const [metodo, re, fn] of ROTAS) {
    const m = caminho.match(re);
    if (!m) continue;
    caminhoExiste = true;
    if (req.method !== metodo) continue;

    try {
      await fn(req, res, m, ip);
    } catch (e) {
      if (e instanceof SyntaxError) erro(res, 400, 'JSON inválido.');
      else {
        console.error('[api]', caminho, e);
        if (!res.headersSent) erro(res, 500, 'Erro interno.');
      }
    }
    return true;
  }

  if (caminhoExiste) { erro(res, 405, 'Método não permitido.'); return true; }
  if (caminho.startsWith('/api/')) { erro(res, 404, 'Rota inexistente.'); return true; }
  return false;
}

module.exports = { tratarApi };
