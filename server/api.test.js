/* =========================================================================
   Testes de ponta a ponta da API.

       node --test server/

   Sobe o servidor de verdade num banco temporário e numa porta livre, e
   conversa com ele por HTTP. Nada é dublado: se passar aqui, passa em uso.

   O foco é travar o comportamento de segurança — gate de papel, travas
   anti-lockout, regras de senha e o que não pode ser servido. Essas são as
   partes que quebram em silêncio numa refatoração.
   ========================================================================= */

'use strict';

const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

let processo, BASE, banco;

/* ---- Infra -------------------------------------------------------------- */

/** Cliente HTTP com cookie jar próprio — um por "usuário" no teste. */
function criarCliente() {
  let cookie = '';
  return async function req(caminho, { metodo = 'GET', corpo } = {}) {
    const res = await fetch(BASE + caminho, {
      method: metodo,
      redirect: 'manual',
      headers: {
        ...(corpo ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie } : {})
      },
      body: corpo ? JSON.stringify(corpo) : undefined
    });

    const set = typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie() : [];
    for (const c of set) {
      const [par] = c.split(';');
      const [nome, valor] = par.split('=');
      if (valor === '') cookie = '';                 // servidor limpou o cookie
      else cookie = `${nome}=${valor}`;
    }

    let dados = null;
    const texto = await res.text();
    try { dados = JSON.parse(texto); } catch { dados = texto; }
    return { status: res.status, dados };
  };
}

async function esperarSubir(url, tentativas = 60) {
  for (let i = 0; i < tentativas; i++) {
    try {
      await fetch(url + '/api/auth/eu');
      return;
    } catch {
      await new Promise(r => setTimeout(r, 100));
    }
  }
  throw new Error('o servidor não subiu a tempo');
}

before(async () => {
  banco = path.join(os.tmpdir(), `polvo-teste-${process.pid}-${Date.now()}.db`);
  const porta = 3200 + (process.pid % 500);
  BASE = `http://127.0.0.1:${porta}`;

  processo = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
    env: {
      ...process.env,
      BANCO: banco,
      PORTA: String(porta),
      // Sem isso o rate limit derruba o próprio teste: são muitas contas
      // criadas do mesmo IP em poucos segundos.
      LIMITE_CADASTRO: '500',
      LIMITE_LOGIN: '500',
      LIMITE_ORCAMENTO: '500',
      LIMITE_MENSAGEM: '500',
      LIMITE_CUPOM: '500',
      // O servidor faz um backup no boot; aqui ele só sujaria backups/ com
      // cópias do banco de teste. O backup tem testes próprios.
      BACKUP_AUTO: '0'
    },
    stdio: 'ignore'
  });

  await esperarSubir(BASE);
});

after(() => {
  if (processo) processo.kill();
  for (const sufixo of ['', '-wal', '-shm']) {
    try { fs.unlinkSync(banco + sufixo); } catch { /* pode não existir */ }
  }
});

/** Cria uma conta nova e devolve o cliente HTTP já logado. */
let sequencia = 0;
async function novaConta(extra = {}) {
  const req = criarCliente();
  const email = `t${++sequencia}.${Date.now()}@exemplo.com`;
  const r = await req('/api/auth/cadastrar', {
    metodo: 'POST',
    corpo: { nome: 'Fulano de Teste', email, senha: 'senhaboa123', ...extra }
  });
  assert.equal(r.status, 201, `cadastro falhou: ${JSON.stringify(r.dados)}`);
  return { req, email, id: r.dados.cliente.id };
}

/* ---- Cadastro e login ---------------------------------------------------- */

describe('cadastro', () => {
  test('cria a conta e já abre sessão', async () => {
    const { req, email } = await novaConta();
    const eu = await req('/api/auth/eu');
    assert.equal(eu.status, 200);
    assert.equal(eu.dados.cliente.email, email);
    assert.equal(eu.dados.cliente.papel, 'cliente');
  });

  test('normaliza o e-mail para minúsculas', async () => {
    const req = criarCliente();
    const email = `MAIUSCULO.${Date.now()}@Exemplo.COM`;
    const r = await req('/api/auth/cadastrar', {
      metodo: 'POST', corpo: { nome: 'Teste', email, senha: 'senhaboa123' }
    });
    assert.equal(r.dados.cliente.email, email.toLowerCase());
  });

  test('recusa e-mail repetido', async () => {
    const { email } = await novaConta();
    const r = await criarCliente()('/api/auth/cadastrar', {
      metodo: 'POST', corpo: { nome: 'Outro', email, senha: 'senhaboa123' }
    });
    assert.equal(r.status, 409);
  });

  test('recusa senha com menos de 8 caracteres', async () => {
    const r = await criarCliente()('/api/auth/cadastrar', {
      metodo: 'POST',
      corpo: { nome: 'Teste', email: `curta.${Date.now()}@exemplo.com`, senha: '1234567' }
    });
    assert.equal(r.status, 400);
  });

  test('recusa e-mail malformado', async () => {
    const r = await criarCliente()('/api/auth/cadastrar', {
      metodo: 'POST', corpo: { nome: 'Teste', email: 'nao-e-email', senha: 'senhaboa123' }
    });
    assert.equal(r.status, 400);
  });

  test('preserva acento no nome e na empresa', async () => {
    const { req } = await novaConta({ nome: 'João Conceição', empresa: 'Condomínio Ipê' });
    const eu = await req('/api/auth/eu');
    assert.equal(eu.dados.cliente.nome, 'João Conceição');
    assert.equal(eu.dados.cliente.empresa, 'Condomínio Ipê');
  });
});

describe('login', () => {
  test('entra com a senha certa', async () => {
    const { email } = await novaConta();
    const req = criarCliente();
    const r = await req('/api/auth/entrar', {
      metodo: 'POST', corpo: { email, senha: 'senhaboa123' }
    });
    assert.equal(r.status, 200);
    assert.equal((await req('/api/auth/eu')).status, 200);
  });

  test('recusa senha errada', async () => {
    const { email } = await novaConta();
    const r = await criarCliente()('/api/auth/entrar', {
      metodo: 'POST', corpo: { email, senha: 'errada123' }
    });
    assert.equal(r.status, 401);
  });

  test('não revela se o e-mail existe', async () => {
    const { email } = await novaConta();
    const existente = await criarCliente()('/api/auth/entrar', {
      metodo: 'POST', corpo: { email, senha: 'errada123' }
    });
    const inexistente = await criarCliente()('/api/auth/entrar', {
      metodo: 'POST', corpo: { email: 'ninguem@exemplo.com', senha: 'errada123' }
    });
    assert.equal(existente.status, inexistente.status);
    assert.deepEqual(existente.dados, inexistente.dados);
  });

  test('sair encerra a sessão', async () => {
    const { req } = await novaConta();
    assert.equal((await req('/api/auth/sair', { metodo: 'POST' })).status, 204);
    assert.equal((await req('/api/auth/eu')).status, 401);
  });
});

/* ---- Troca de senha ------------------------------------------------------ */

describe('troca de senha', () => {
  test('exige a senha atual correta', async () => {
    const { req } = await novaConta();
    const r = await req('/api/auth/senha', {
      metodo: 'PATCH', corpo: { senhaAtual: 'errada123', senhaNova: 'outrasenha456' }
    });
    assert.equal(r.status, 401);
  });

  test('recusa nova senha curta', async () => {
    const { req } = await novaConta();
    const r = await req('/api/auth/senha', {
      metodo: 'PATCH', corpo: { senhaAtual: 'senhaboa123', senhaNova: 'curta' }
    });
    assert.equal(r.status, 400);
  });

  test('troca e invalida a senha antiga', async () => {
    const { req, email } = await novaConta();
    const t = await req('/api/auth/senha', {
      metodo: 'PATCH', corpo: { senhaAtual: 'senhaboa123', senhaNova: 'novasenha456' }
    });
    assert.equal(t.status, 200);

    const antiga = await criarCliente()('/api/auth/entrar', {
      metodo: 'POST', corpo: { email, senha: 'senhaboa123' }
    });
    assert.equal(antiga.status, 401, 'a senha antiga ainda funciona');

    const nova = await criarCliente()('/api/auth/entrar', {
      metodo: 'POST', corpo: { email, senha: 'novasenha456' }
    });
    assert.equal(nova.status, 200);
  });

  test('derruba as sessões abertas em outros aparelhos', async () => {
    const { req, email } = await novaConta();

    const outro = criarCliente();
    await outro('/api/auth/entrar', { metodo: 'POST', corpo: { email, senha: 'senhaboa123' } });
    assert.equal((await outro('/api/auth/eu')).status, 200);

    await req('/api/auth/senha', {
      metodo: 'PATCH', corpo: { senhaAtual: 'senhaboa123', senhaNova: 'novasenha456' }
    });
    assert.equal((await outro('/api/auth/eu')).status, 401, 'a outra sessão sobreviveu');
  });
});

/* ---- Controle de acesso -------------------------------------------------- */

describe('acesso ao admin', () => {
  const ROTAS = [
    ['GET', '/api/admin/resumo'],
    ['GET', '/api/admin/clientes'],
    ['GET', '/api/admin/orcamentos'],
    ['GET', '/api/admin/mensagens']
  ];

  test('bloqueia quem não está logado (401)', async () => {
    const anon = criarCliente();
    for (const [metodo, rota] of ROTAS) {
      const r = await anon(rota, { metodo });
      assert.equal(r.status, 401, `${rota} deveria dar 401`);
    }
  });

  test('bloqueia cliente comum (403)', async () => {
    const { req } = await novaConta();
    for (const [metodo, rota] of ROTAS) {
      const r = await req(rota, { metodo });
      assert.equal(r.status, 403, `${rota} deveria dar 403`);
    }
  });

  test('cliente comum não remove ninguém', async () => {
    const { req } = await novaConta();
    const alvo = await novaConta();
    const r = await req(`/api/admin/clientes/${alvo.id}`, { metodo: 'DELETE' });
    assert.equal(r.status, 403);
  });
});

/* ---- Leads ---------------------------------------------------------------- */

describe('orçamentos', () => {
  const ITENS = [{ id: 'c01', nome: 'Detergente Neutro 500ml', caixa: 'Caixa com 24 un.', qtd: 3 }];

  test('aceita envio anônimo', async () => {
    const r = await criarCliente()('/api/orcamentos', { metodo: 'POST', corpo: { itens: ITENS } });
    assert.equal(r.status, 201);
    assert.equal(r.dados.total_itens, 3);
  });

  test('recusa lista vazia', async () => {
    const r = await criarCliente()('/api/orcamentos', { metodo: 'POST', corpo: { itens: [] } });
    assert.equal(r.status, 400);
  });

  test('vincula à conta de quem está logado', async () => {
    const { req } = await novaConta();
    await req('/api/orcamentos', { metodo: 'POST', corpo: { itens: ITENS } });

    const meus = await req('/api/meus/orcamentos');
    assert.equal(meus.status, 200);
    assert.equal(meus.dados.orcamentos.length, 1);
    assert.equal(meus.dados.orcamentos[0].itens[0].nome, 'Detergente Neutro 500ml');
  });

  test('um cliente não vê o orçamento do outro', async () => {
    const a = await novaConta();
    const b = await novaConta();
    await a.req('/api/orcamentos', { metodo: 'POST', corpo: { itens: ITENS } });

    const deB = await b.req('/api/meus/orcamentos');
    assert.equal(deB.dados.orcamentos.length, 0);
  });

  test('normaliza quantidade fora da faixa', async () => {
    const { req } = await novaConta();
    await req('/api/orcamentos', {
      metodo: 'POST',
      corpo: { itens: [{ id: 'x', nome: 'Item', caixa: '', qtd: -5 }] }
    });
    const meus = await req('/api/meus/orcamentos');
    assert.equal(meus.dados.orcamentos[0].itens[0].qtd, 1);
  });

  test('exige login para listar os próprios', async () => {
    const r = await criarCliente()('/api/meus/orcamentos');
    assert.equal(r.status, 401);
  });
});

describe('mensagens de contato', () => {
  const VALIDA = {
    nome: 'Síndico João', email: 'joao@predio.com.br',
    mensagem: 'Preciso de orçamento para o condomínio.'
  };

  test('aceita mensagem válida', async () => {
    const r = await criarCliente()('/api/mensagens', { metodo: 'POST', corpo: VALIDA });
    assert.equal(r.status, 201);
  });

  test('recusa e-mail inválido', async () => {
    const r = await criarCliente()('/api/mensagens', {
      metodo: 'POST', corpo: { ...VALIDA, email: 'nao-e-email' }
    });
    assert.equal(r.status, 400);
  });

  test('recusa mensagem vazia', async () => {
    const r = await criarCliente()('/api/mensagens', {
      metodo: 'POST', corpo: { ...VALIDA, mensagem: '' }
    });
    assert.equal(r.status, 400);
  });
});

describe('cupom de primeira compra', () => {
  const VALIDO = {
    nome: 'Marcos', whatsapp: '(51) 99876-5432', segmento: 'revenda', aceite: true
  };
  const pedir = corpo => criarCliente()('/api/cupom', { metodo: 'POST', corpo });

  test('gera um código novo', async () => {
    const r = await pedir(VALIDO);
    assert.equal(r.status, 201);
    assert.equal(r.dados.novo, true);
    assert.match(r.dados.cupom, /^POLVO-[A-HJ-NP-Z2-9]{5}$/);
  });

  test('mesmo WhatsApp, mesmo cupom — mesmo escrito de outro jeito', async () => {
    const a = await pedir({ ...VALIDO, whatsapp: '51 3333-4444' });
    const b = await pedir({ ...VALIDO, whatsapp: '+55 (51) 3333-4444', nome: 'Outro' });
    assert.equal(a.status, 201);
    assert.equal(b.status, 200);
    assert.equal(b.dados.novo, false);
    assert.equal(b.dados.cupom, a.dados.cupom);
  });

  test('recusa WhatsApp sem DDD', async () => {
    const r = await pedir({ ...VALIDO, whatsapp: '99876-5432' });
    assert.equal(r.status, 400);
  });

  test('recusa número de fachada', async () => {
    for (const whatsapp of ['(00) 00000-0000', '(51) 99999-9999', '(51) 3333-333', '(51) 81234-5678']) {
      const r = await pedir({ ...VALIDO, whatsapp });
      assert.equal(r.status, 400, whatsapp);
    }
  });

  test('recusa segmento fora da lista', async () => {
    const r = await pedir({ ...VALIDO, whatsapp: '51 98888-1111', segmento: 'qualquer' });
    assert.equal(r.status, 400);
  });

  test('recusa sem aceite da política', async () => {
    const r = await pedir({ ...VALIDO, whatsapp: '51 98888-2222', aceite: false });
    assert.equal(r.status, 400);
  });
});

/* ---- Roteamento e estáticos ---------------------------------------------- */

describe('servidor', () => {
  test('não serve o código nem o banco', async () => {
    const anon = criarCliente();
    for (const caminho of ['/server/auth.js', '/server/db.js', '/dados/polvo.db', '/.gitignore']) {
      const r = await anon(caminho);
      assert.equal(r.status, 404, `${caminho} não deveria ser servido`);
    }
  });

  test('bloqueia path traversal', async () => {
    const res = await fetch(`${BASE}/../server/auth.js`);
    assert.ok(res.status === 403 || res.status === 404, `status inesperado: ${res.status}`);
  });

  test('método errado numa rota existente dá 405, não 404', async () => {
    const r = await criarCliente()('/api/auth/entrar', { metodo: 'GET' });
    assert.equal(r.status, 405);
  });

  test('rota de API inexistente dá 404 em JSON', async () => {
    const r = await criarCliente()('/api/nao/existe');
    assert.equal(r.status, 404);
    assert.ok(r.dados && r.dados.erro, 'deveria responder JSON com erro');
  });

  test('página inexistente devolve o 404 do site', async () => {
    const res = await fetch(`${BASE}/nao-existe-mesmo`);
    assert.equal(res.status, 404);
    const html = await res.text();
    assert.match(html, /Erro 404/, 'deveria servir a página 404.html');
  });

  test('robots e sitemap respondem', async () => {
    for (const [caminho, trecho] of [['/robots.txt', 'Sitemap:'], ['/sitemap.xml', '<urlset']]) {
      const res = await fetch(BASE + caminho);
      assert.equal(res.status, 200, caminho);
      assert.match(await res.text(), new RegExp(trecho));
    }
  });

  test('manda os cabeçalhos de segurança', async () => {
    const res = await fetch(BASE + '/');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.ok(res.headers.get('content-security-policy'));
  });

  /* O CSP ganhou um frame-src por causa do mapa das lojas. Um frame-src
     larguinho demais ('self' https: ou um curinga) deixa qualquer página de
     terceiro ser embutida no site — e isso não quebra nada visivelmente,
     então só um teste pega. */
  test('o CSP só libera frame para o mapa do Google', async () => {
    const csp = (await fetch(BASE + '/')).headers.get('content-security-policy');
    const frameSrc = csp.split(';').map(d => d.trim())
      .find(d => d.startsWith('frame-src '));

    assert.ok(frameSrc, 'frame-src precisa ser explícito, não herdar do default-src');
    assert.deepEqual(frameSrc.split(/\s+/).slice(1), ['https://www.google.com']);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.doesNotMatch(csp, /frame-src[^;]*\*/);
  });

  test('o cookie de sessão é httpOnly e SameSite', async () => {
    const { email } = await novaConta();
    const res = await fetch(`${BASE}/api/auth/entrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha: 'senhaboa123' })
    });
    const cookie = res.headers.getSetCookie().join(';');
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Lax/i);
  });
});
