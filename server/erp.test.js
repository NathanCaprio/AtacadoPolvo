/* =========================================================================
   Testes da sincronização com o ERP (server/erp.js).

       node --test server/erp.test.js

   Sobe o servidor de verdade num banco temporário, apontado (ERP_URL) para
   um ERP falso que roda aqui mesmo, por HTTP, com as mesmas rotas e o mesmo
   formato de resposta do Empresarius. O ERP de verdade não entra em teste:
   ele é da loja e não pode receber tráfego de suíte.

   O que importa travar:
   - o ERP só recebe login e leitura (nenhum POST/PUT/DELETE além do login);
   - preço, custo e estoque nunca chegam ao site;
   - produto inativo não aparece;
   - ERP com defeito não apaga o catálogo que já estava no ar;
   - as rotas de admin respondem 401/403 como as outras.
   ========================================================================= */

'use strict';

const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');

let processo, erpFalso, BASE, banco;

/* ---- ERP falso ------------------------------------------------------------ */

const S3 = 'https://empresarius.s3.sa-east-1.amazonaws.com/empresa/fotos-produtos/';

const PRODUTOS = [
  { id: 'aaaaaaaa-0000-0000-0000-000000000001', situacao: 'A', codigo: 7891,
    descricao: 'DETERGENTE NEUTRO 500ML YPE', gruposProdutosDescricao: 'LIMPEZA',
    categoriasProdutosDescricao: 'DETERGENTES', vendaUnidadesMedidasUnidade: 'UN',
    precoCompra: 1.23, precoCustoFinal: 1.31, precoVenda: 4.56, quantidadeAtualEstoque: 87 },
  { id: 'aaaaaaaa-0000-0000-0000-000000000002', situacao: 'A', codigo: 7892,
    descricao: 'SACO DE LIXO 100L <b>PRETO</b> "REFORCADO"', gruposProdutosDescricao: 'SACOS DE LIXO',
    categoriasProdutosDescricao: 'SACO DE LIXO PRETO', vendaUnidadesMedidasUnidade: 'PCT',
    precoCompra: 9.87, precoVenda: 19.9, quantidadeAtualEstoque: 3 },
  { id: 'aaaaaaaa-0000-0000-0000-000000000003', situacao: 'I', codigo: 7893,
    descricao: 'PRODUTO FORA DE LINHA', gruposProdutosDescricao: 'LIMPEZA', precoVenda: 1 },
  { id: 'aaaaaaaa-0000-0000-0000-000000000004', situacao: 'A', codigo: 7894,
    descricao: 'ITEM DE GRUPO NOVO', gruposProdutosDescricao: 'GRUPO NOVO DO ERP', precoVenda: 2 },
  // Mesmo código em dois produtos: o site tem que cair para o uuid.
  { id: 'aaaaaaaa-0000-0000-0000-000000000005', situacao: 'A', codigo: 5555,
    descricao: 'RODO 40CM', gruposProdutosDescricao: 'VASSOURA - RODO - PA - BRUXA', precoVenda: 3 },
  { id: 'aaaaaaaa-0000-0000-0000-000000000006', situacao: 'A', codigo: 5555,
    descricao: 'RODO 60CM', gruposProdutosDescricao: 'VASSOURA - RODO - PA - BRUXA', precoVenda: 4 },
  { id: 'aaaaaaaa-0000-0000-0000-000000000007', situacao: 'A', codigo: 7897,
    descricao: 'AGUA SANITARIA 5L QBOA', gruposProdutosDescricao: 'LIMPEZA',
    categoriasProdutosDescricao: 'SAPONACEOS', precoVenda: 5 }
];

const FICHAS = {
  'aaaaaaaa-0000-0000-0000-000000000001': {
    unidade: 'UNIDADE', fotos: [S3 + 'foto1.jpg']
  },
  'aaaaaaaa-0000-0000-0000-000000000002': {
    unidade: 'PACOTE', fotos: ['https://outro-site.example.com/foto.jpg']   // host fora da lista
  }
};

const erp = {
  chamadas: [],          // [método, caminho]
  logins: 0,
  listaComDefeito: false,
  derrubarSessao: false, // próxima leitura responde 401 (força novo login)
  loginPedeCodigo: false
};

function jwtFalso() {
  const corpo = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 12 * 3600 }))
    .toString('base64url');
  return `cabecalho.${corpo}.assinatura`;
}

function responder(res, status, corpo) {
  const txt = JSON.stringify(corpo);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(txt);
}

function tratarErp(req, res) {
  erp.chamadas.push([req.method, req.url]);
  let bruto = '';
  req.on('data', c => { bruto += c; });
  req.on('end', () => {
    if (req.method === 'POST' && req.url === '/api/Auth/Login') {
      const b = JSON.parse(bruto || '{}');
      erp.logins++;
      if (b.email !== 'site@polvo.test' || b.senha !== 'senha-do-site') {
        return responder(res, 401, { message: 'Usuário ou senha inválidos' });
      }
      if (erp.loginPedeCodigo) {
        return responder(res, 200, { message: 'Código de verificação enviado para o e-mail', data: {} });
      }
      return responder(res, 200, { message: 'ok', data: {
        token: jwtFalso(),
        configuracoesEmail: { senha: 'segredo-do-smtp' }
      } });
    }

    if (!/^Bearer cabecalho\./.test(req.headers.authorization || '')) return responder(res, 401, {});
    if (erp.derrubarSessao) { erp.derrubarSessao = false; return responder(res, 401, {}); }

    if (req.method === 'GET' && req.url === '/api/Produtos/ListMercadoriasToSelect') {
      if (erp.listaComDefeito) return responder(res, 500, { message: 'erro interno' });
      return responder(res, 200, { message: 'ok', data: PRODUTOS });
    }

    const m = /^\/api\/Produtos\/Mercadorias\/([\w-]+)$/.exec(req.url);
    if (req.method === 'GET' && m) {
      const p = PRODUTOS.find(x => x.id === m[1]);
      if (!p) return responder(res, 404, {});
      const f = FICHAS[p.id] || { unidade: '', fotos: [] };
      return responder(res, 200, { message: 'ok', data: {
        id: p.id, descricao: p.descricao, precoCompra: p.precoCompra, precoVenda: p.precoVenda,
        produtosFotos: f.fotos.map((url, i) => ({ id: String(i), produtosId: p.id, url })),
        mercadorias: {
          quantidadeAtualEstoque: p.quantidadeAtualEstoque,
          vendaUnidadesMedidas: f.unidade ? { descricao: f.unidade } : null
        }
      } });
    }

    responder(res, 404, {});
  });
}

/* ---- Infra ---------------------------------------------------------------- */

function portaLivre() {
  return new Promise(resolve => {
    const s = http.createServer().listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

function criarCliente() {
  let cookie = '';
  return async function req(caminho, { metodo = 'GET', corpo, cabecalhos = {} } = {}) {
    const res = await fetch(BASE + caminho, {
      method: metodo,
      headers: {
        ...(corpo ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        ...cabecalhos
      },
      body: corpo ? JSON.stringify(corpo) : undefined
    });
    for (const c of res.headers.getSetCookie()) {
      const [par] = c.split(';');
      cookie = par.endsWith('=') ? '' : par;
    }
    const texto = await res.text();
    let dados = texto;
    try { dados = JSON.parse(texto); } catch { /* não é JSON */ }
    return { status: res.status, dados, texto, headers: res.headers };
  };
}

let sequencia = 0;
async function novaConta() {
  const req = criarCliente();
  const email = `erp${++sequencia}.${Date.now()}@exemplo.com`;
  const r = await req('/api/auth/cadastrar', {
    metodo: 'POST', corpo: { nome: 'Teste ERP', email, senha: 'senhaboa123' }
  });
  assert.equal(r.status, 201, JSON.stringify(r.dados));
  return { req, email };
}

async function novoAdmin() {
  const conta = await novaConta();
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(banco);
  db.prepare(`UPDATE clientes SET papel = 'admin' WHERE email = ?`).run(conta.email);
  db.close();
  return conta.req;
}

/** Dispara uma sincronização e espera ela terminar. Devolve a situação final. */
async function sincronizar(admin) {
  const r = await admin('/api/admin/erp/sincronizar', { metodo: 'POST' });
  assert.equal(r.status, 202, JSON.stringify(r.dados));
  for (let i = 0; i < 100; i++) {
    const s = await admin('/api/admin/erp');
    if (!s.dados.rodando) return s.dados;
    await new Promise(ok => setTimeout(ok, 50));
  }
  throw new Error('a sincronização não terminou a tempo');
}

/** Roda o /catalogo-erp.js como o navegador rodaria, depois do data.js. */
function rodarCatalogo(js) {
  const exemplo = { categorias: [], produtos: [{ id: 'c01' }] };
  const ctx = { window: { CATALOGO: exemplo } };
  vm.createContext(ctx);
  vm.runInContext(js, ctx);
  return { window: ctx.window, exemplo };
}

before(async () => {
  erpFalso = http.createServer(tratarErp);
  await new Promise(ok => erpFalso.listen(0, '127.0.0.1', ok));

  banco = path.join(os.tmpdir(), `polvo-erp-${process.pid}-${Date.now()}.db`);
  const porta = await portaLivre();
  BASE = `http://127.0.0.1:${porta}`;

  processo = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
    env: {
      ...process.env,
      BANCO: banco,
      PORTA: String(porta),
      ERP_URL: `http://127.0.0.1:${erpFalso.address().port}/api`,
      ERP_EMAIL: 'site@polvo.test',
      ERP_SENHA: 'senha-do-site',
      ERP_AUTO: '0',              // cada teste dispara a sua rodada
      BACKUP_AUTO: '0',
      LIMITE_CADASTRO: '500',
      LIMITE_LOGIN: '500'
    },
    stdio: 'ignore'
  });

  for (let i = 0; i < 60; i++) {
    try { await fetch(BASE + '/api/auth/eu'); return; }
    catch { await new Promise(ok => setTimeout(ok, 100)); }
  }
  throw new Error('o servidor não subiu a tempo');
});

after(() => {
  if (processo) processo.kill();
  if (erpFalso) erpFalso.close();
  for (const sufixo of ['', '-wal', '-shm']) {
    try { fs.unlinkSync(banco + sufixo); } catch { /* pode não existir */ }
  }
});

/* ---- Testes ----------------------------------------------------------------- */

describe('catálogo do ERP', () => {
  test('antes da primeira sincronização o site fica com o catálogo de exemplo', async () => {
    const r = await criarCliente()('/catalogo-erp.js');
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type'), /javascript/);
    const { window, exemplo } = rodarCatalogo(r.texto);
    assert.equal(window.CATALOGO, exemplo);

    const mapa = await criarCliente()('/sitemap-produtos.xml');
    assert.equal(mapa.status, 200);
    assert.doesNotMatch(mapa.texto, /<url>/);
  });

  test('rotas do ERP no admin: 401 sem login, 403 para cliente comum', async () => {
    const anon = criarCliente();
    assert.equal((await anon('/api/admin/erp')).status, 401);
    assert.equal((await anon('/api/admin/erp/sincronizar', { metodo: 'POST' })).status, 401);

    const { req } = await novaConta();
    assert.equal((await req('/api/admin/erp')).status, 403);
    assert.equal((await req('/api/admin/erp/sincronizar', { metodo: 'POST' })).status, 403);
  });

  test('publica só os ativos, sem preço, custo nem estoque', async () => {
    const admin = await novoAdmin();
    const s = await sincronizar(admin);
    assert.equal(s.historico[0].situacao, 'ok', s.historico[0].mensagem);
    assert.equal(s.produtos, 6);
    assert.equal(s.comFoto, 1);

    const r = await criarCliente()('/catalogo-erp.js');
    for (const proibido of ['preco', '4.56', '1.23', '19.9', 'Estoque', 'segredo-do-smtp', 'FORA DE LINHA']) {
      assert.ok(!r.texto.toLowerCase().includes(proibido.toLowerCase()), `vazou "${proibido}"`);
    }

    const { window, exemplo } = rodarCatalogo(r.texto);
    const cat = window.CATALOGO;
    assert.equal(cat.origem, 'erp');
    assert.equal(window.CATALOGO_REFERENCIA, exemplo, 'a calculadora perderia os itens de referência');
    assert.equal(cat.produtos.length, 6);

    const detergente = cat.produtos.find(p => p.id === '7891');
    assert.equal(detergente.nome, 'Detergente Neutro 500ml Ype');
    assert.equal(detergente.cat, 'limpeza');
    assert.equal(detergente.desc, 'Detergentes');
    assert.equal(detergente.caixa, 'Unidade');
    assert.equal(detergente.foto, S3 + 'foto1.jpg');

    // O ERP grava sem acento; as palavras comuns ganham o acento no site.
    const agua = cat.produtos.find(p => p.id === '7897');
    assert.equal(agua.nome, 'Água Sanitária 5L Qboa');
    assert.equal(agua.desc, 'Saponáceos');
    assert.equal(agua.texto, undefined);

    const saco = cat.produtos.find(p => p.id === '7892');
    assert.ok(!/[<>"]/.test(saco.nome), `nome sem escapar: ${saco.nome}`);
    assert.equal(saco.foto, undefined, 'foto de fora do S3 do ERP não pode passar');
    assert.equal(saco.caixa, 'Pacote');

    // Código repetido no ERP: os dois ficam, cada um com o seu uuid.
    const rodos = cat.produtos.filter(p => p.nome.startsWith('Rodo'));
    // Array.from: o array do vm tem outro protótipo e o deepEqual estrito recusa.
    assert.deepEqual(Array.from(rodos, p => p.id).sort(),
      ['aaaaaaaa-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000006']);

    // Grupo que o site não conhece vira categoria sozinho, no fim da lista.
    const ids = cat.categorias.map(c => c.id);
    assert.ok(ids.includes('grupo-novo-do-erp'), ids.join(','));
    assert.equal(ids.at(-1), 'grupo-novo-do-erp');
    for (const p of cat.produtos) assert.ok(ids.includes(p.cat), `${p.id} sem categoria`);

    assert.ok(cat.produtos.some(p => p.tag === 'mais-vendido'), 'a vitrine da home ficaria vazia');

    const mapa = await criarCliente()('/sitemap-produtos.xml');
    assert.match(mapa.texto, /produto\.html\?id=7891<\/loc>/);
    assert.doesNotMatch(mapa.texto, /7893/);
  });

  test('o ERP só recebe login e leitura', () => {
    assert.ok(erp.chamadas.length > 0);
    for (const [metodo, caminho] of erp.chamadas) {
      const permitido = metodo === 'GET' || (metodo === 'POST' && caminho === '/api/Auth/Login');
      assert.ok(permitido, `chamada proibida ao ERP: ${metodo} ${caminho}`);
    }
  });

  test('ERP com defeito não apaga o catálogo que está no ar', async () => {
    const admin = await novoAdmin();
    erp.listaComDefeito = true;
    try {
      const s = await sincronizar(admin);
      assert.equal(s.historico[0].situacao, 'erro');
      assert.match(s.historico[0].mensagem, /HTTP 500/);
      assert.equal(s.produtos, 6);
    } finally {
      erp.listaComDefeito = false;
    }
    const { window } = rodarCatalogo((await criarCliente()('/catalogo-erp.js')).texto);
    assert.equal(window.CATALOGO.produtos.length, 6);
  });

  test('sessão derrubada no ERP: entra de novo sozinho', async () => {
    const admin = await novoAdmin();
    const antes = erp.logins;
    erp.derrubarSessao = true;
    const s = await sincronizar(admin);
    assert.equal(s.historico[0].situacao, 'ok', s.historico[0].mensagem);
    assert.equal(erp.logins, antes + 1);
  });

  test('ERP pedindo código de verificação aparece no painel', async () => {
    const admin = await novoAdmin();
    erp.loginPedeCodigo = true;
    erp.derrubarSessao = true;
    try {
      const s = await sincronizar(admin);
      assert.equal(s.historico[0].situacao, 'erro');
      assert.match(s.historico[0].mensagem, /login no ERP recusado.*Código de verificação/);
    } finally {
      erp.loginPedeCodigo = false;
    }
  });

  test('catálogo vai comprimido e revalida com ETag', async () => {
    const res = await fetch(BASE + '/catalogo-erp.js', { headers: { 'Accept-Encoding': 'gzip' } });
    // fetch descomprime sozinho; o cabeçalho é o que prova que veio gzip.
    assert.equal(res.headers.get('content-encoding'), 'gzip');
    assert.match(await res.text(), /window\.CATALOGO = c/);

    const etag = res.headers.get('etag');
    assert.ok(etag);
    const revalidado = await fetch(BASE + '/catalogo-erp.js', { headers: { 'If-None-Match': etag } });
    assert.equal(revalidado.status, 304);
  });

  test('nome e descrição do painel: gravam só no site e sobrevivem à sincronização', async () => {
    const ID = 'aaaaaaaa-0000-0000-0000-000000000001';
    const caminho = `/api/admin/produtos/${ID}`;
    const anon = criarCliente();
    assert.equal((await anon('/api/admin/produtos')).status, 401);
    assert.equal((await anon(caminho, { metodo: 'PUT', corpo: { nome: 'x' } })).status, 401);
    const { req } = await novaConta();
    assert.equal((await req('/api/admin/produtos')).status, 403);
    assert.equal((await req(caminho, { metodo: 'PUT', corpo: { nome: 'x' } })).status, 403);

    const admin = await novoAdmin();
    const chamadasAntes = erp.chamadas.length;
    const lista = (await admin('/api/admin/produtos')).dados.produtos;
    const det = lista.find(p => p.erpId === ID);
    assert.deepEqual([det.id, det.nomeErp, det.nomeAuto, det.nome, det.grupo],
      ['7891', 'DETERGENTE NEUTRO 500ML YPE', 'Detergente Neutro 500ml Ype', '', 'Limpeza']);

    const r = await admin(caminho, { metodo: 'PUT', corpo: {
      nome: '  Detergente Neutro Ypê 500 ml ',
      descricao: 'Para louças e superfícies.\r\n\n\n\nRende <b>muito</b>.'
    } });
    assert.equal(r.status, 200, JSON.stringify(r.dados));
    assert.equal(r.dados.nome, 'Detergente Neutro Ypê 500 ml');
    assert.equal(r.dados.descricao, 'Para louças e superfícies.\n\nRende bmuito/b.');

    // O catálogo público muda na hora, sem esperar o cache de 10 minutos.
    const ver = async () => rodarCatalogo((await criarCliente()('/catalogo-erp.js')).texto)
      .window.CATALOGO.produtos.find(p => p.id === '7891');
    let p = await ver();
    assert.equal(p.nome, 'Detergente Neutro Ypê 500 ml');
    assert.equal(p.texto, 'Para louças e superfícies.\n\nRende bmuito/b.');
    assert.equal(p.desc, 'Detergentes', 'o card do catálogo continua com o texto curto');

    // Sincronizar de novo regrava produtos_erp, mas o ajuste fica.
    const s = await sincronizar(admin);
    assert.equal(s.historico[0].situacao, 'ok', s.historico[0].mensagem);
    assert.equal((await ver()).nome, 'Detergente Neutro Ypê 500 ml');

    const longo = await admin(caminho, { metodo: 'PUT', corpo: { nome: 'x'.repeat(121) } });
    assert.equal(longo.status, 400);
    const naoTexto = await admin(caminho, { metodo: 'PUT', corpo: { descricao: { a: 1 } } });
    assert.equal(naoTexto.status, 400);
    const inexistente = await admin('/api/admin/produtos/bbbbbbbb-0000-0000-0000-000000000009',
      { metodo: 'PUT', corpo: { nome: 'x' } });
    assert.equal(inexistente.status, 404);

    // Nome igual ao automático não prende; vazio nos dois volta ao automático.
    const igual = await admin(caminho, { metodo: 'PUT', corpo: { nome: 'Detergente Neutro 500ml Ype' } });
    assert.equal(igual.dados.nome, '');
    await admin(caminho, { metodo: 'PUT', corpo: { nome: '', descricao: '' } });
    p = await ver();
    assert.equal(p.nome, 'Detergente Neutro 500ml Ype');
    assert.equal(p.texto, undefined);

    // Nada disso chega ao ERP: só a sincronização, que é login e leitura.
    for (const [metodo, rota] of erp.chamadas.slice(chamadasAntes)) {
      assert.ok(metodo === 'GET' || rota === '/api/Auth/Login', `chamada proibida ao ERP: ${metodo} ${rota}`);
    }
  });

  test('calculadora ligada a produtos do ERP: grava só no site e sai no catálogo', async () => {
    const ID = 'aaaaaaaa-0000-0000-0000-000000000002';      // saco de lixo, código 7892
    const anon = criarCliente();
    assert.equal((await anon('/api/admin/calculadora')).status, 401);
    assert.equal((await anon('/api/admin/calculadora/d04', { metodo: 'PUT', corpo: {} })).status, 401);
    const { req } = await novaConta();
    assert.equal((await req('/api/admin/calculadora')).status, 403);
    assert.equal((await req('/api/admin/calculadora/d04', { metodo: 'DELETE' })).status, 403);

    const admin = await novoAdmin();
    const chamadasAntes = erp.chamadas.length;
    const ligar = corpo => admin('/api/admin/calculadora/d04', { metodo: 'PUT', corpo });

    assert.equal((await ligar({ erpId: 'bbbbbbbb-0000-0000-0000-000000000009', rende: 1 })).status, 404);
    assert.equal((await ligar({ erpId: ID, rende: 0 })).status, 400);
    assert.equal((await ligar({ erpId: ID, rende: 'muito' })).status, 400);
    assert.equal((await admin('/api/admin/calculadora/xx', { metodo: 'PUT', corpo: {} })).status, 404);

    const r = await ligar({ erpId: ID, rende: 5 });
    assert.equal(r.status, 200, JSON.stringify(r.dados));
    assert.equal(r.dados.item, 'd04');
    assert.equal(r.dados.rende, 5);
    assert.equal(r.dados.codigo, '7892');
    assert.equal(r.dados.caixa, 'Pacote');

    const catalogo = async () => rodarCatalogo((await criarCliente()('/catalogo-erp.js')).texto).window.CATALOGO;
    assert.deepEqual({ ...(await catalogo()).calculadora.d04 }, { produto: '7892', rende: 5 });

    // Sobrevive à sincronização, que apaga e regrava produtos_erp.
    await sincronizar(admin);
    assert.equal((await catalogo()).calculadora.d04.produto, '7892');
    assert.equal((await admin('/api/admin/calculadora')).dados.ligacoes.length, 1);

    assert.equal((await admin('/api/admin/calculadora/d04', { metodo: 'DELETE' })).status, 204);
    assert.equal((await admin('/api/admin/calculadora/d04', { metodo: 'DELETE' })).status, 404);
    assert.equal((await catalogo()).calculadora.d04, undefined);

    for (const [metodo, rota] of erp.chamadas.slice(chamadasAntes)) {
      assert.ok(metodo === 'GET' || rota === '/api/Auth/Login', `chamada proibida ao ERP: ${metodo} ${rota}`);
    }
  });

  test('o CSP libera as fotos do S3 do ERP e nada além', async () => {
    const res = await fetch(BASE + '/produtos.html');
    const csp = res.headers.get('content-security-policy');
    const img = csp.split(';').map(s => s.trim()).find(s => s.startsWith('img-src'));
    assert.equal(img, "img-src 'self' data: https://empresarius.s3.sa-east-1.amazonaws.com");
  });
});
