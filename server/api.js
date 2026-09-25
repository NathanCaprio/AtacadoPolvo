/* =========================================================================
   Rotas da API.

     POST   /api/auth/cadastrar        cria conta e já entra
     POST   /api/auth/entrar           login
     POST   /api/auth/sair             logout
     GET    /api/auth/eu               quem está logado
     PATCH  /api/auth/eu               edita os próprios dados
     PATCH  /api/auth/senha            troca a senha
     POST   /api/auth/recuperar        pede link de redefinição
     POST   /api/auth/redefinir        redefine a senha com o token do link
     GET    /api/auth/eu/dados         exporta os próprios dados (LGPD)
     DELETE /api/auth/eu               exclui a própria conta (LGPD)

     POST   /api/orcamentos            grava um pedido de orçamento
     POST   /api/mensagens             grava uma mensagem de contato
     GET    /api/meus/orcamentos       orçamentos do cliente logado

     GET    /api/admin/resumo          contagens para o painel
     GET    /api/admin/clientes        lista de clientes
     PATCH  /api/admin/clientes/:id    muda papel / ativa / desativa
     DELETE /api/admin/clientes/:id    remove cliente
     GET    /api/admin/orcamentos      todos os orçamentos
     PATCH  /api/admin/orcamentos/:id  muda a situação
     DELETE /api/admin/orcamentos/:id  exclui o orçamento
     GET    /api/admin/mensagens       todas as mensagens
     PATCH  /api/admin/mensagens/:id   marca lida / não lida
     POST   /api/admin/clientes/:id/recuperacao   gera link de redefinição
     GET    /api/admin/exportar?tipo=  baixa CSV de leads / clientes

   Tudo devolve JSON. Erros usam { erro: "mensagem" } com o status HTTP certo.
   ========================================================================= */

'use strict';

const { StringDecoder } = require('node:string_decoder');
const crypto = require('node:crypto');
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

// Valores aceitos em mensagens.origem / mensagens.segmento. São listas
// fechadas de propósito: o campo vem do navegador e alimenta relatório.
const ORIGENS = ['contato', 'landing', 'orcamento', 'rodape', 'calculadora',
                 'recorrencia', 'cupom'];
const SEGMENTOS = ['condominio', 'escola', 'empresa', 'residencial',
                   'restaurante', 'hotel', 'pet', 'revenda'];
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

/* Os tetos são configuráveis por variável de ambiente. O padrão é o valor
   restritivo; afrouxar é uma escolha explícita de quem sobe o servidor (os
   testes elevam os limites para conseguir criar várias contas seguidas). */
const TETO = {
  login: Number(process.env.LIMITE_LOGIN) || 10,
  cadastro: Number(process.env.LIMITE_CADASTRO) || 5,
  orcamento: Number(process.env.LIMITE_ORCAMENTO) || 20,
  mensagem: Number(process.env.LIMITE_MENSAGEM) || 10,
  cupom: Number(process.env.LIMITE_CUPOM) || 5,
  recuperacao: Number(process.env.LIMITE_RECUPERACAO) || 5
};

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
  if (!limitar(ip, 'cadastro', TETO.cadastro, 60 * 60 * 1000)) {
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
  if (!limitar(ip, 'login', TETO.login, 15 * 60 * 1000)) {
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

/* ---- 5b. Recuperação de senha ------------------------------------------

   Não existe envio de e-mail aqui (o projeto não tem dependências e o SMTP
   ainda não foi contratado). O link é entregue de duas formas:

     - impresso no console do servidor, para quem está com o terminal aberto;
     - gerado sob demanda pelo admin no painel, para repassar no WhatsApp.

   Quando houver SMTP, o único ponto a mexer é entregarLink().              */

function baseDoSite(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, '');
  const host = req.headers.host || '127.0.0.1';
  // Sem proxy declarado não dá para confiar no x-forwarded-proto; em produção
  // o certo é fixar SITE_URL.
  const protocolo = PRODUCAO ? 'https' : 'http';
  return `${protocolo}://${host}`;
}

const linkRedefinir = (req, token) =>
  `${baseDoSite(req)}/recuperar.html?token=${encodeURIComponent(token)}`;

function entregarLink(email, link, expira) {
  console.log(
    `\n  [recuperação de senha] ${email}\n  ${link}\n  vale até ${expira}\n`
  );
}

/* Responde 200 mesmo quando o e-mail não existe: dizer "não encontramos essa
   conta" transformaria a tela em um verificador de cadastro. O rate limit
   segura a varredura em massa.                                             */
async function pedirRecuperacao(req, res, ip) {
  if (!limitar(ip, 'recuperacao', TETO.recuperacao, 60 * 60 * 1000)) {
    return erro(res, 429, 'Muitos pedidos. Tente de novo mais tarde.');
  }
  const corpo = await lerJson(req);
  const email = texto(corpo.email).toLowerCase();

  const resposta = {
    ok: true,
    mensagem: 'Se existir uma conta com esse e-mail, o link de redefinição foi enviado.'
  };

  if (!EMAIL_RE.test(email)) return json(res, 200, resposta);

  const c = db.prepare('SELECT id, email, ativo FROM clientes WHERE email = ?').get(email);
  if (!c || !c.ativo) return json(res, 200, resposta);

  const { token, expira } = auth.criarRecuperacao(c.id, 'cliente');
  entregarLink(c.email, linkRedefinir(req, token), expira);

  // Só para desenvolvimento e para os testes: devolve o link no corpo. A
  // trava por NODE_ENV existe para isso não sobreviver a um deploy distraído.
  if (process.env.RECUPERACAO_NO_CORPO === '1' && !PRODUCAO) {
    resposta.link = linkRedefinir(req, token);
  }
  json(res, 200, resposta);
}

/** Confere se o token do link ainda vale, sem gastá-lo (a tela usa no boot). */
async function conferirToken(req, res) {
  const token = texto(new URL(req.url, 'http://x').searchParams.get('token'));
  const r = auth.recuperacaoValida(token);
  if (!r) return erro(res, 400, 'Este link expirou ou já foi usado.');
  json(res, 200, { ok: true, email: r.email, nome: r.nome });
}

async function redefinirSenha(req, res, ip) {
  if (!limitar(ip, 'recuperacao', TETO.recuperacao * 4, 60 * 60 * 1000)) {
    return erro(res, 429, 'Muitas tentativas. Tente de novo mais tarde.');
  }
  const corpo = await lerJson(req);
  const token = texto(corpo.token);
  const senha = typeof corpo.senha === 'string' ? corpo.senha : '';

  if (senha.length < 8) return erro(res, 400, 'A senha precisa de ao menos 8 caracteres.');
  if (senha.length > 200) return erro(res, 400, 'Senha longa demais.');

  const r = auth.recuperacaoValida(token);
  if (!r) return erro(res, 400, 'Este link expirou ou já foi usado.');

  db.prepare('UPDATE clientes SET senha_hash = ? WHERE id = ?')
    .run(await auth.gerarHash(senha), r.cliente_id);

  auth.marcarRecuperacaoUsada(r.id);
  // Quem pediu redefinição pode ter sido invadido: derruba tudo que estava
  // aberto e abre uma sessão nova só para quem acabou de provar o acesso.
  auth.encerrarTodasDoCliente(r.cliente_id);

  const c = db.prepare('SELECT id, nome, email, papel FROM clientes WHERE id = ?')
    .get(r.cliente_id);
  entrarComSessao(res, c.id, req, { cliente: c });
}

/* ---- 5c. Direitos do titular (LGPD) ------------------------------------
   Art. 18 da LGPD: o cliente pode ver e levar embora o que é dele, e pode
   pedir a exclusão. Deixar isso só no "fale com a gente" é o que costuma
   travar contrato com administradora e com escola, que auditam fornecedor. */

function exportarMeusDados(req, res) {
  const c = clienteAtual(req);
  if (!c) return erro(res, 401, 'Não autenticado.');

  const orcamentos = db.prepare(`
    SELECT id, itens, total_itens, situacao, contato_nome, contato_email,
           contato_tel, aceite_em, criado_em
      FROM orcamentos WHERE cliente_id = ? ORDER BY criado_em DESC
  `).all(c.id).map(o => ({ ...o, itens: JSON.parse(o.itens) }));

  const mensagens = db.prepare(`
    SELECT id, nome, email, telefone, empresa, cnpj, assunto, mensagem,
           origem, segmento, aceite_em, criado_em
      FROM mensagens WHERE cliente_id = ? ORDER BY criado_em DESC
  `).all(c.id);

  const sessoes = db.prepare(`
    SELECT criada_em, expira_em, user_agent FROM sessoes
     WHERE cliente_id = ? ORDER BY criada_em DESC
  `).all(c.id);

  const dados = {
    geradoEm: new Date().toISOString(),
    aviso: 'Exportação de dados pessoais — LGPD, art. 18, V (portabilidade).',
    cadastro: c,
    orcamentos,
    mensagens,
    sessoes
  };

  const txt = JSON.stringify(dados, null, 2);
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(txt),
    'Cache-Control': 'no-store',
    'Content-Disposition': 'attachment; filename="meus-dados-atacado-polvo.json"'
  });
  res.end(txt);
}

/* Exclusão pedida pelo próprio cliente. Pede a senha de novo: é uma ação
   sem volta, e um clique acidental (ou uma sessão esquecida aberta) não
   pode apagar a conta.                                                    */
async function excluirMinhaConta(req, res) {
  const c = clienteAtual(req);
  if (!c) return erro(res, 401, 'Não autenticado.');

  const corpo = await lerJson(req);
  const senha = typeof corpo.senha === 'string' ? corpo.senha : '';

  const linha = db.prepare('SELECT senha_hash FROM clientes WHERE id = ?').get(c.id);
  if (!await auth.conferirSenha(senha, linha.senha_hash)) {
    return erro(res, 401, 'Senha incorreta.');
  }

  // Mesma trava do painel: sumir com o último admin deixaria o site sem dono.
  if (c.papel === 'admin' && contaAdmins() <= 1) {
    return erro(res, 409, 'Você é o único admin ativo. Promova outro antes de excluir a conta.');
  }

  // Orçamentos e mensagens ficam, com cliente_id virando NULL (ON DELETE SET
  // NULL): o dado deixa de ser pessoal e o histórico comercial não some. Nome
  // e e-mail gravados na mensagem, esses sim, são apagados.
  db.prepare(`
    UPDATE mensagens SET nome = 'Conta excluída', email = '', telefone = NULL,
                         empresa = NULL, cnpj = NULL
     WHERE cliente_id = ?
  `).run(c.id);
  db.prepare('DELETE FROM clientes WHERE id = ?').run(c.id);

  res.writeHead(204, { 'Set-Cookie': auth.cookieLimpo() });
  res.end();
}

/* ---- 6. Leads: orçamentos e mensagens ---------------------------------- */

/* Gravado também para visitante anônimo: um orçamento montado e não enviado
   é carrinho abandonado, e isso é informação comercial. O POST nunca deve
   atrapalhar o fluxo do WhatsApp, então erro aqui é sempre silencioso no
   front — ver assets/js/catalogo.js.                                       */
async function criarOrcamento(req, res, ip) {
  if (!limitar(ip, 'orcamento', TETO.orcamento, 60 * 60 * 1000)) {
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

  // Contato opcional, digitado por quem não tem conta. Só entra se houver
  // e-mail ou telefone: um nome solto não serve para retornar, e gravá-lo
  // faria o painel mostrar um lead que não dá para contatar.
  const contato = corpo.contato && typeof corpo.contato === 'object' ? corpo.contato : {};
  const email = texto(contato.email).toLowerCase().slice(0, 160);
  const tel = texto(contato.tel || contato.telefone).slice(0, 40);
  const temContato = !c && (EMAIL_RE.test(email) || tel.replace(/\D/g, '').length >= 10);

  const r = db.prepare(`
    INSERT INTO orcamentos (cliente_id, itens, total_itens,
                            contato_nome, contato_email, contato_tel, aceite_em)
    VALUES (?, ?, ?, ?, ?, ?, ` + "CASE WHEN ? THEN datetime('now') END)" + `
  `).run(
    c ? c.id : null, JSON.stringify(itens), total,
    temContato ? (texto(contato.nome).slice(0, 120) || null) : null,
    temContato && EMAIL_RE.test(email) ? email : null,
    temContato && tel ? tel : null,
    temContato ? 1 : 0
  );

  json(res, 201, {
    id: Number(r.lastInsertRowid), total_itens: total, contato: temContato
  });
}

async function criarMensagem(req, res, ip) {
  if (!limitar(ip, 'mensagem', TETO.mensagem, 60 * 60 * 1000)) {
    return erro(res, 429, 'Muitos envios. Tente de novo mais tarde.');
  }
  const b = await lerJson(req, 32 * 1024);
  const nome = texto(b.nome).slice(0, 120);
  const email = texto(b.email).toLowerCase().slice(0, 160);
  const mensagem = texto(b.mensagem).slice(0, 4000);

  if (nome.length < 2) return erro(res, 400, 'Informe seu nome.');
  if (!EMAIL_RE.test(email)) return erro(res, 400, 'E-mail inválido.');
  if (mensagem.length < 5) return erro(res, 400, 'Escreva sua mensagem.');

  // De onde veio. Vem do front, então entra numa lista fechada: senão vira
  // campo livre e o relatório por origem deixa de somar.
  const origem = ORIGENS.includes(texto(b.origem)) ? texto(b.origem) : 'contato';
  const segmento = SEGMENTOS.includes(texto(b.segmento)) ? texto(b.segmento) : null;

  // O checkbox chega como true (JSON), 'on' (FormData) ou '1'. O carimbo é do
  // servidor, não do cliente: data vinda do navegador não serve como prova.
  const marcou = b.aceite === true || b.aceite === 'on' ||
                 b.aceite === '1' || b.aceite === 1;

  const c = clienteAtual(req);
  const r = db.prepare(`
    INSERT INTO mensagens (cliente_id, nome, email, telefone, empresa, cnpj,
                           assunto, mensagem, origem, segmento, aceite_em)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? THEN datetime('now') END)
  `).run(c ? c.id : null, nome, email,
         texto(b.tel || b.telefone).slice(0, 40) || null,
         texto(b.empresa).slice(0, 120) || null,
         texto(b.cnpj).slice(0, 24) || null,
         texto(b.assunto).slice(0, 80) || null,
         mensagem, origem, segmento, marcou ? 1 : 0);

  json(res, 201, { id: Number(r.lastInsertRowid) });
}

/* Cupom de primeira compra, pedido pelo pop-up do site. Só nome, WhatsApp e
   segmento — o lead entra em mensagens (origem 'cupom') para cair no mesmo
   painel. O desconto em si não mora aqui: o vendedor confere o código no
   painel e aplica na proposta; o valor anunciado fica em config.js.        */

// Sem 0/O e 1/I: o código é ditado por telefone e digitado no WhatsApp.
const ALFABETO_CUPOM = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function gerarCupom() {
  let s = '';
  for (let i = 0; i < 5; i++) s += ALFABETO_CUPOM[crypto.randomInt(ALFABETO_CUPOM.length)];
  return 'POLVO-' + s;
}

/** Só dígitos, sem o 55 do Brasil. Aceita fixo (10) e celular (11).
    DDD não tem zero, celular começa com 9 e número repetido (00000-0000,
    99999-9999) é preenchimento de fachada, não contato.                  */
function normalizarWhats(v) {
  let d = texto(v).replace(/\D/g, '');
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return null;
  if (!/^[1-9]{2}/.test(d)) return null;
  if (d.length === 11 && d[2] !== '9') return null;
  if (/^(\d)\1+$/.test(d.slice(2))) return null;
  return d;
}

async function criarCupom(req, res, ip) {
  if (!limitar(ip, 'cupom', TETO.cupom, 60 * 60 * 1000)) {
    return erro(res, 429, 'Muitos pedidos. Tente de novo mais tarde.');
  }
  const b = await lerJson(req, 8 * 1024);
  const nome = texto(b.nome).slice(0, 120);
  const whats = normalizarWhats(b.whatsapp);
  const segmento = texto(b.segmento);
  const marcou = b.aceite === true || b.aceite === 'on' || b.aceite === '1' || b.aceite === 1;

  if (nome.length < 2) return erro(res, 400, 'Informe seu nome.');
  if (!whats) return erro(res, 400, 'WhatsApp inválido. Use DDD + número.');
  if (!SEGMENTOS.includes(segmento)) return erro(res, 400, 'Escolha o seu segmento.');
  if (!marcou) return erro(res, 400, 'É preciso aceitar a política de privacidade.');

  // Um cupom por WhatsApp: quem pede de novo recebe o mesmo código, em vez
  // de colecionar descontos de "primeira" compra.
  const ja = db.prepare(`
    SELECT cupom FROM mensagens WHERE origem = 'cupom' AND telefone = ? LIMIT 1
  `).get(whats);
  if (ja) return json(res, 200, { cupom: ja.cupom, novo: false });

  const inserir = db.prepare(`
    INSERT INTO mensagens (cliente_id, nome, email, telefone, mensagem,
                           origem, segmento, cupom, aceite_em)
    VALUES (?, ?, '', ?, ?, 'cupom', ?, ?, datetime('now'))
  `);
  const c = clienteAtual(req);
  // Colisão é improvável (32^5 ≈ 33 mi), mas o índice único é quem manda.
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const cupom = gerarCupom();
    try {
      inserir.run(c ? c.id : null, nome, whats,
                  `Pediu o cupom de primeira compra ${cupom} pelo pop-up do site.`,
                  segmento, cupom);
      return json(res, 201, { cupom, novo: true });
    } catch (e) {
      if (!/UNIQUE/i.test(e.message)) throw e;
    }
  }
  erro(res, 500, 'Não foi possível gerar o cupom. Tente de novo.');
}

/** Orçamentos do próprio cliente logado. */
function meusOrcamentos(req, res) {
  const c = clienteAtual(req);
  if (!c) return erro(res, 401, 'Não autenticado.');
  const linhas = db.prepare(`
    SELECT id, itens, total_itens, situacao, contato_nome, contato_email,
           contato_tel, aceite_em, criado_em
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
    sessoes: n(`SELECT COUNT(*) n FROM sessoes WHERE expira_em > datetime('now')`),

    // O que o negócio quer saber: as landings de condomínio e escola estão
    // trazendo lead? Sem este recorte o painel mostra só um balaio de
    // "mensagens" e não dá para decidir onde insistir.
    porSegmento: db.prepare(`
      SELECT COALESCE(segmento, 'outros') seg, COUNT(*) n,
             SUM(CASE WHEN criado_em > datetime('now','-30 days') THEN 1 ELSE 0 END) n30
        FROM mensagens GROUP BY seg ORDER BY n DESC
    `).all(),
    // Mesmo recorte, por canal de entrada. Segmento diz QUEM pediu; origem
    // diz O QUE fez pedir. Sem os dois não dá para saber se a calculadora
    // está puxando lead ou só enfeitando a landing.
    porOrigem: db.prepare(`
      SELECT origem, COUNT(*) n,
             SUM(CASE WHEN criado_em > datetime('now','-30 days') THEN 1 ELSE 0 END) n30
        FROM mensagens GROUP BY origem ORDER BY n DESC
    `).all(),
    leadsLanding30d: n(`
      SELECT COUNT(*) n FROM mensagens
       WHERE origem IN ('landing', 'calculadora')
         AND criado_em > datetime('now','-30 days')`)
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
           o.contato_nome, o.contato_email, o.contato_tel, o.aceite_em,
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

/* Exclui de vez — para teste, duplicado ou spam. "Perdido" continua sendo o
   caminho para pedido real que não fechou, porque mantém o histórico.   */
function excluirOrcamento(req, res, id) {
  if (!exigirAdmin(req, res)) return;
  const r = db.prepare('DELETE FROM orcamentos WHERE id = ?').run(id);
  if (!r.changes) return erro(res, 404, 'Orçamento não encontrado.');
  res.writeHead(204); res.end();
}

function listarMensagens(req, res) {
  if (!exigirAdmin(req, res)) return;
  json(res, 200, {
    mensagens: db.prepare(`
      SELECT id, nome, email, telefone, empresa, cnpj, assunto, mensagem,
             origem, segmento, cupom, aceite_em, lida, criado_em
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

/* Link de redefinição gerado pelo admin, para repassar no WhatsApp. É o
   caminho que existe enquanto não há SMTP: o cliente liga dizendo que
   perdeu a senha e o atendente devolve o link na hora.
   Fica registrado com origem 'admin' — quem gerou aparece no log.        */
function gerarRecuperacaoAdmin(req, res, id) {
  const admin = exigirAdmin(req, res);
  if (!admin) return;

  const alvo = db.prepare('SELECT id, nome, email, ativo FROM clientes WHERE id = ?').get(id);
  if (!alvo) return erro(res, 404, 'Cliente não encontrado.');
  if (!alvo.ativo) return erro(res, 409, 'Conta desativada. Reative antes de redefinir a senha.');

  const { token, expira } = auth.criarRecuperacao(alvo.id, 'admin');
  console.log(`  [recuperação] ${admin.email} gerou link para ${alvo.email}`);

  json(res, 201, {
    link: linkRedefinir(req, token),
    expira_em: expira,
    horas: auth.HORAS_RECUPERACAO,
    cliente: { id: alvo.id, nome: alvo.nome, email: alvo.email }
  });
}

/* ---- Exportação CSV ----------------------------------------------------
   A dona da lista precisa poder levá-la embora: abrir no Excel, mandar para
   o vendedor, cruzar com a carteira. Sem isso o painel vira prisão do dado. */

/* Campo de CSV: aspas dobradas, e um prefixo quando o valor começa com
   caractere que o Excel interpreta como fórmula (=, +, -, @). Sem isso, um
   nome digitado como "=cmd|..." vira execução ao abrir a planilha.        */
function campoCsv(v) {
  if (v === null || v === undefined) return '""';
  let t = String(v).replace(/\r?\n/g, ' ');
  if (/^[=+\-@\t]/.test(t)) t = "'" + t;
  return '"' + t.replace(/"/g, '""') + '"';
}

const linhaCsv = valores => valores.map(campoCsv).join(';');

const CSV = {
  mensagens: {
    arquivo: 'leads',
    cabecalho: ['id', 'data', 'origem', 'segmento', 'nome', 'email', 'telefone',
                'empresa', 'cnpj', 'assunto', 'mensagem', 'aceite_em', 'lida',
                'cupom'],
    linhas: () => db.prepare(`
      SELECT id, criado_em, origem, segmento, nome, email, telefone, empresa,
             cnpj, assunto, mensagem, aceite_em, lida, cupom
        FROM mensagens ORDER BY criado_em DESC
    `).all().map(m => [m.id, m.criado_em, m.origem, m.segmento || '', m.nome,
                       m.email, m.telefone, m.empresa, m.cnpj, m.assunto,
                       m.mensagem, m.aceite_em || '', m.lida ? 'sim' : 'não',
                       m.cupom || ''])
  },
  orcamentos: {
    arquivo: 'orcamentos',
    cabecalho: ['id', 'data', 'situacao', 'itens', 'total_itens', 'cliente',
                'email', 'telefone', 'empresa', 'tem_conta'],
    linhas: () => db.prepare(`
      SELECT o.id, o.criado_em, o.situacao, o.itens, o.total_itens,
             o.contato_nome, o.contato_email, o.contato_tel,
             c.id AS cliente_id, c.nome, c.email, c.telefone, c.empresa
        FROM orcamentos o LEFT JOIN clientes c ON c.id = o.cliente_id
       ORDER BY o.criado_em DESC
    `).all().map(o => {
      const itens = JSON.parse(o.itens)
        .map(i => `${i.qtd}x ${i.nome}`).join(' | ');
      // Visitante que deixou contato vale tanto quanto cliente cadastrado:
      // numa planilha, as duas origens têm que cair nas mesmas colunas.
      return [o.id, o.criado_em, o.situacao, itens, o.total_itens,
              o.nome || o.contato_nome || 'visitante',
              o.email || o.contato_email || '',
              o.telefone || o.contato_tel || '',
              o.empresa || '',
              o.cliente_id ? 'sim' : 'não'];
    })
  },
  clientes: {
    arquivo: 'clientes',
    cabecalho: ['id', 'nome', 'email', 'telefone', 'empresa', 'papel', 'ativo',
                'criado_em', 'ultimo_acesso'],
    linhas: () => db.prepare(`
      SELECT id, nome, email, telefone, empresa, papel, ativo, criado_em, ultimo_acesso
        FROM clientes ORDER BY criado_em DESC
    `).all().map(c => [c.id, c.nome, c.email, c.telefone, c.empresa, c.papel,
                       c.ativo ? 'sim' : 'não', c.criado_em, c.ultimo_acesso])
  }
};

function exportarCsv(req, res) {
  if (!exigirAdmin(req, res)) return;

  const tipo = new URL(req.url, 'http://x').searchParams.get('tipo') || 'mensagens';
  const def = CSV[tipo];
  if (!def) return erro(res, 400, 'Tipo inválido. Use mensagens, orcamentos ou clientes.');

  const corpo = [linhaCsv(def.cabecalho), ...def.linhas().map(linhaCsv)].join('\r\n');
  // BOM na frente: sem ele o Excel no Windows abre o arquivo em ANSI e come
  // todo acento. Separador ';' pela mesma razão (locale pt-BR).
  const bytes = Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from(corpo, 'utf8')]);
  const hoje = new Date().toISOString().slice(0, 10);

  res.writeHead(200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Length': bytes.length,
    'Cache-Control': 'no-store',
    'Content-Disposition': `attachment; filename="${def.arquivo}-${hoje}.csv"`
  });
  res.end(bytes);
}

/* ---- 8. Roteador ------------------------------------------------------- */

const ROTAS = [
  ['POST',   /^\/api\/auth\/cadastrar$/, (rq, rs, m, ip) => cadastrar(rq, rs, ip)],
  ['POST',   /^\/api\/auth\/entrar$/,    (rq, rs, m, ip) => entrar(rq, rs, ip)],
  ['POST',   /^\/api\/auth\/sair$/,      (rq, rs) => sair(rq, rs)],
  ['GET',    /^\/api\/auth\/eu$/,        (rq, rs) => eu(rq, rs)],
  ['PATCH',  /^\/api\/auth\/eu$/,        (rq, rs) => editarEu(rq, rs)],
  ['PATCH',  /^\/api\/auth\/senha$/,     (rq, rs) => trocarSenha(rq, rs)],
  ['GET',    /^\/api\/auth\/eu\/dados$/,  (rq, rs) => exportarMeusDados(rq, rs)],
  ['DELETE', /^\/api\/auth\/eu$/,         (rq, rs) => excluirMinhaConta(rq, rs)],

  ['POST',   /^\/api\/auth\/recuperar$/,  (rq, rs, m, ip) => pedirRecuperacao(rq, rs, ip)],
  ['GET',    /^\/api\/auth\/recuperar$/,  (rq, rs) => conferirToken(rq, rs)],
  ['POST',   /^\/api\/auth\/redefinir$/,  (rq, rs, m, ip) => redefinirSenha(rq, rs, ip)],

  ['POST',   /^\/api\/orcamentos$/,       (rq, rs, m, ip) => criarOrcamento(rq, rs, ip)],
  ['POST',   /^\/api\/mensagens$/,        (rq, rs, m, ip) => criarMensagem(rq, rs, ip)],
  ['POST',   /^\/api\/cupom$/,            (rq, rs, m, ip) => criarCupom(rq, rs, ip)],
  ['GET',    /^\/api\/meus\/orcamentos$/, (rq, rs) => meusOrcamentos(rq, rs)],

  ['GET',    /^\/api\/admin\/resumo$/,        (rq, rs) => resumo(rq, rs)],
  ['GET',    /^\/api\/admin\/clientes$/,      (rq, rs) => listarClientes(rq, rs)],
  ['PATCH',  /^\/api\/admin\/clientes\/(\d+)$/, (rq, rs, m) => editarCliente(rq, rs, +m[1])],
  ['DELETE', /^\/api\/admin\/clientes\/(\d+)$/, (rq, rs, m) => removerCliente(rq, rs, +m[1])],

  ['GET',    /^\/api\/admin\/orcamentos$/,        (rq, rs) => listarOrcamentos(rq, rs)],
  ['PATCH',  /^\/api\/admin\/orcamentos\/(\d+)$/, (rq, rs, m) => editarOrcamento(rq, rs, +m[1])],
  ['DELETE', /^\/api\/admin\/orcamentos\/(\d+)$/, (rq, rs, m) => excluirOrcamento(rq, rs, +m[1])],
  ['GET',    /^\/api\/admin\/mensagens$/,         (rq, rs) => listarMensagens(rq, rs)],
  ['PATCH',  /^\/api\/admin\/mensagens\/(\d+)$/,  (rq, rs, m) => editarMensagem(rq, rs, +m[1])],

  ['POST',   /^\/api\/admin\/clientes\/(\d+)\/recuperacao$/,
             (rq, rs, m) => gerarRecuperacaoAdmin(rq, rs, +m[1])],
  ['GET',    /^\/api\/admin\/exportar$/,          (rq, rs) => exportarCsv(rq, rs)]
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
