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
      LIMITE_PROPOSTA: '500',
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

  test('recusa senha óbvia e senha igual ao e-mail', async () => {
    const email = `obvia.${Date.now()}@exemplo.com`;
    for (const senha of ['12345678', 'Senha123', 'aaaaaaaaaa', email, email.split('@')[0]]) {
      const r = await criarCliente()('/api/auth/cadastrar', {
        metodo: 'POST', corpo: { nome: 'Teste', email, senha }
      });
      assert.equal(r.status, 400, `"${senha}" deveria ser recusada`);
    }
  });

  /* Login por cima de uma sessão aberta: o cookie novo substitui o velho no
     navegador, mas o velho seguia valendo no banco — quem tivesse copiado
     (ou plantado) aquele token continuava dentro. */
  test('entrar de novo derruba a sessão que o navegador já tinha', async () => {
    const { email } = await novaConta();
    const entrar = cookie => fetch(`${BASE}/api/auth/entrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify({ email, senha: 'senhaboa123' })
    }).then(r => r.headers.getSetCookie()[0].split(';')[0]);
    const eu = cookie => fetch(`${BASE}/api/auth/eu`, { headers: { Cookie: cookie } })
      .then(r => r.status);

    const velho = await entrar();
    const novo = await entrar(velho);
    assert.equal(await eu(velho), 401);
    assert.equal(await eu(novo), 200);
  });

  test('sessão de admin dura menos que a de cliente', async () => {
    const { email } = await novaConta();
    const maxAge = async () => {
      const res = await fetch(`${BASE}/api/auth/entrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha: 'senhaboa123' })
      });
      return Number(/Max-Age=(\d+)/.exec(res.headers.getSetCookie()[0])[1]);
    };
    assert.equal(await maxAge(), 30 * 86400);

    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(banco);
    db.prepare(`UPDATE clientes SET papel = 'admin' WHERE email = ?`).run(email);
    db.close();
    assert.equal(await maxAge(), 7 * 86400);
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

  test('aceita envio anônimo com contato', async () => {
    const r = await criarCliente()('/api/orcamentos', {
      metodo: 'POST', corpo: { itens: ITENS, contato: { nome: 'Ana', tel: '(11) 98888-7777' } }
    });
    assert.equal(r.status, 201);
    assert.equal(r.dados.total_itens, 3);
    assert.equal(r.dados.contato, true);
  });

  test('recusa envio anônimo sem contato', async () => {
    const cli = criarCliente();
    assert.equal((await cli('/api/orcamentos', { metodo: 'POST', corpo: { itens: ITENS } })).status, 400);
    const soNome = await cli('/api/orcamentos', { metodo: 'POST', corpo: { itens: ITENS, contato: { nome: 'Ana' } } });
    assert.equal(soNome.status, 400);
    const semNome = await cli('/api/orcamentos', { metodo: 'POST', corpo: { itens: ITENS, contato: { tel: '11988887777' } } });
    assert.equal(semNome.status, 400);
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

describe('orçamento enviado ao cliente', () => {
  const ITENS = [
    { id: 'c01', nome: 'Detergente Neutro 500ml', caixa: 'Caixa com 24 un.', qtd: 3, preco: 4590 },
    { id: 'b01', nome: 'Desinfetante Pinho 2L', caixa: 'Caixa com 6 un.', qtd: 2, preco: 5200 }
  ];

  async function novoAdmin() {
    const conta = await novaConta();
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(banco);
    db.prepare(`UPDATE clientes SET papel = 'admin' WHERE email = ?`).run(conta.email);
    db.close();
    return conta;
  }

  async function novaProposta(extra = {}) {
    const { req } = await novoAdmin();
    const r = await req('/api/admin/orcamentos', {
      metodo: 'POST',
      corpo: { itens: ITENS, contato: { nome: 'Condomínio Teste' }, ...extra }
    });
    assert.equal(r.status, 200, JSON.stringify(r.dados));
    return { admin: req, token: r.dados.token, id: r.dados.id };
  }

  test('resumo traz a série mensal de orçamentos', async () => {
    const { admin } = await novaProposta();
    const r = await admin('/api/admin/resumo');
    assert.equal(r.status, 200);
    const serie = r.dados.porMes;
    assert.equal(serie.length, 24);
    assert.match(serie[23].mes, /^\d{4}-\d{2}$/);
    assert.ok(serie[23].n >= 1, 'o orçamento de agora deveria cair no mês atual');
    assert.ok(serie[0].mes < serie[23].mes);
  });

  test('só admin cria e envia proposta', async () => {
    const anon = criarCliente();
    assert.equal((await anon('/api/admin/orcamentos', { metodo: 'POST', corpo: { itens: ITENS } })).status, 401);
    const { req } = await novaConta();
    assert.equal((await req('/api/admin/orcamentos/1/proposta', { metodo: 'PUT', corpo: { itens: ITENS } })).status, 403);
  });

  test('cliente abre pelo link sem conta', async () => {
    const { token } = await novaProposta({ observacao: 'Entrega na terça.' });
    const r = await criarCliente()(`/api/proposta/${token}`);
    assert.equal(r.status, 200);
    assert.equal(r.dados.orcamento.itens.length, 2);
    assert.equal(r.dados.orcamento.itens[0].preco, 4590);
    assert.equal(r.dados.orcamento.editavel, true);
  });

  test('token desconhecido dá 404', async () => {
    const r = await criarCliente()('/api/proposta/' + 'x'.repeat(24));
    assert.equal(r.status, 404);
  });

  test('cliente muda quantidade e remove item, mas não mexe em preço', async () => {
    const { token } = await novaProposta();
    const cli = criarCliente();
    const r = await cli(`/api/proposta/${token}`, {
      metodo: 'PATCH',
      corpo: { itens: [{ id: '#1', qtd: 7, preco: 1, nome: 'Outro' }, { id: '#9', qtd: 5 }] }
    });
    assert.equal(r.status, 200);
    const itens = r.dados.orcamento.itens;
    assert.equal(itens.length, 1);
    assert.equal(itens[0].nome, 'Desinfetante Pinho 2L');
    assert.equal(itens[0].qtd, 7);
    assert.equal(itens[0].preco, 5200);
    assert.ok(r.dados.orcamento.alterado_em);
  });

  test('não deixa esvaziar nem quantidade inválida', async () => {
    const { token } = await novaProposta();
    const cli = criarCliente();
    assert.equal((await cli(`/api/proposta/${token}`, { metodo: 'PATCH', corpo: { itens: [] } })).status, 400);
    assert.equal((await cli(`/api/proposta/${token}`, { metodo: 'PATCH', corpo: { itens: [{ id: '#0', qtd: 0 }] } })).status, 400);
  });

  test('depois de aprovado, trava; a loja editando destrava', async () => {
    const { admin, token, id } = await novaProposta();
    const cli = criarCliente();
    assert.equal((await cli(`/api/proposta/${token}/aprovar`, { metodo: 'POST' })).status, 200);
    const r = await cli(`/api/proposta/${token}`, { metodo: 'PATCH', corpo: { itens: [{ id: '#0', qtd: 1 }] } });
    assert.equal(r.status, 409);

    const reenvio = await admin(`/api/admin/orcamentos/${id}/proposta`, { metodo: 'PUT', corpo: { itens: ITENS } });
    assert.equal(reenvio.dados.token, token, 'o link continua o mesmo');
    assert.equal((await cli(`/api/proposta/${token}`)).dados.orcamento.editavel, true);
  });

  test('proposta vencida não aceita alteração', async () => {
    const { token } = await novaProposta({ validade: '2000-01-01' });
    const r = await criarCliente()(`/api/proposta/${token}`, { metodo: 'PATCH', corpo: { itens: [{ id: '#0', qtd: 1 }] } });
    assert.equal(r.status, 409);
  });

  test('link desativado some', async () => {
    const { admin, token, id } = await novaProposta();
    assert.equal((await admin(`/api/admin/orcamentos/${id}/proposta`, { metodo: 'DELETE' })).status, 204);
    assert.equal((await criarCliente()(`/api/proposta/${token}`)).status, 404);
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

  test('só admin exclui; some da lista', async () => {
    const { id } = (await criarCliente()('/api/mensagens', { metodo: 'POST', corpo: VALIDA })).dados;
    const comum = (await novaConta()).req;
    assert.equal((await comum(`/api/admin/mensagens/${id}`, { metodo: 'DELETE' })).status, 403);

    const conta = await novaConta();
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(banco);
    db.prepare(`UPDATE clientes SET papel = 'admin' WHERE email = ?`).run(conta.email);
    db.close();

    assert.equal((await conta.req(`/api/admin/mensagens/${id}`, { metodo: 'DELETE' })).status, 204);
    assert.equal((await conta.req(`/api/admin/mensagens/${id}`, { metodo: 'DELETE' })).status, 404);
    const lista = (await conta.req('/api/admin/mensagens')).dados.mensagens;
    assert.ok(!lista.some(m => m.id === id));
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

  /* O pop-up (assets/js/cupom.js) valida antes de mandar. Se ele aceitar um
     número que o servidor recusa, o cliente vê "Número inválido" vindo do
     nada depois de clicar; se recusar um que o servidor aceita, o cliente
     simplesmente não consegue o cupom. Mesma coisa com a lista de segmentos. */
  test('o pop-up e o servidor concordam sobre WhatsApp e segmento', async () => {
    const nada = () => {};
    const win = {
      SITE: {},
      localStorage: { getItem: () => null, setItem: nada },
      document: { readyState: 'loading', addEventListener: nada }
    };
    win.window = win;
    const vm = require('node:vm');
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'cupom.js'), 'utf8'), vm.createContext(win));
    const { SEGMENTOS, whatsValido } = win.CUPOM;

    const numeros = [
      '(51) 99123-4501', '51991234502', '+55 51 99123-4503', '5551991234504', '(51) 3123-4505',
      '99123-4506', '(51) 81234-5678', '(00) 99123-4507', '(51) 99999-9999', '(51) 3333-333',
      '(51) 991234-50899', '(05) 99123-4509', '55 (51) 3123-4510', '(11) 91234-5611', ''
    ];
    for (const whatsapp of numeros) {
      const r = await pedir({ ...VALIDO, whatsapp });
      assert.equal(r.status < 300, whatsValido(whatsapp), `"${whatsapp}": pop-up ${whatsValido(whatsapp)}, servidor ${r.status}`);
    }

    assert.ok(SEGMENTOS.length >= 5);
    for (const [i, segmento] of SEGMENTOS.entries()) {
      const r = await pedir({ ...VALIDO, segmento, whatsapp: `(51) 99777-${String(1000 + i)}` });
      assert.ok(r.status < 300, `segmento "${segmento}" do pop-up recusado pelo servidor (${r.status})`);
    }
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

  /* Os desvios que furavam a lista de bloqueio antiga: maiúscula (o disco do
     Windows não diferencia), letra codificada (a lista era conferida antes do
     decode), stream alternativo do NTFS e pasta que nunca foi bloqueada. */
  test('não serve o banco nem o código por caminho disfarçado', async () => {
    const anon = criarCliente();
    for (const caminho of [
      '/Dados/polvo.db', '/%64ados/polvo.db', '/SERVER/db.js', '/%73erver/db.js',
      '/server%2fdb.js', '/%2eenv', '/index.html::$DATA', '/assets/..%5c..%5cserver/db.js',
      '/backups/', '/package.json', '/README.md', '/CLAUDE.md', '/testes/consumo.test.js'
    ]) {
      const r = await anon(caminho);
      assert.equal(r.status, 404, `${caminho} não deveria ser servido`);
    }
    // E o que é público continua saindo.
    for (const caminho of ['/', '/entrar', '/assets/js/main.js', '/robots.txt']) {
      assert.equal((await fetch(BASE + caminho)).status, 200, caminho);
    }
  });

  test('Host malformado não derruba o servidor', async () => {
    const http = require('node:http');
    const { port } = new URL(BASE);
    await new Promise(resolve => {
      http.get({ host: '127.0.0.1', port, path: '/', headers: { Host: '[' } }, r => {
        r.resume(); r.on('end', resolve);
      }).on('error', resolve);
    });
    assert.equal((await fetch(BASE + '/')).status, 200, 'o servidor caiu');
  });

  test('recusa POST vindo de outro site (CSRF)', async () => {
    for (const cab of [{ Origin: 'https://evil.example' }, { Origin: 'null' },
                       { 'Sec-Fetch-Site': 'cross-site' }]) {
      const res = await fetch(`${BASE}/api/auth/entrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...cab },
        body: JSON.stringify({ email: 'x@y.com', senha: 'qualquer1' })
      });
      assert.equal(res.status, 403, JSON.stringify(cab));
    }
    const mesma = await fetch(`${BASE}/api/auth/entrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: BASE, 'Sec-Fetch-Site': 'same-origin' },
      body: JSON.stringify({ email: 'x@y.com', senha: 'qualquer1' })
    });
    assert.equal(mesma.status, 401, 'a própria origem tem que passar');
  });

  test('corpo grande demais dá 413', async () => {
    const res = await fetch(`${BASE}/api/auth/entrar`, {
      method: 'POST', body: 'a'.repeat(70 * 1024)
    });
    assert.equal(res.status, 413);
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

  /* script-src e style-src sem 'unsafe-inline'. O par em testes/estilos.test.js
     garante que o HTML não tem style=""/<style>, senão a página quebra. */
  test('o CSP não aceita script nem estilo inline', async () => {
    const csp = (await fetch(BASE + '/')).headers.get('content-security-policy');
    for (const dir of ['script-src', 'style-src']) {
      const d = csp.split(';').map(x => x.trim()).find(x => x.startsWith(dir + ' '));
      assert.ok(d, `${dir} precisa ser explícito`);
      assert.doesNotMatch(d, /unsafe-inline/, dir);
    }
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

/* ---- Auditoria ----------------------------------------------------------- */

describe('auditoria do painel', () => {
  async function promover(email) {
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(banco);
    db.prepare(`UPDATE clientes SET papel = 'admin' WHERE email = ?`).run(email);
    db.close();
  }
  const acoes = async (req, acao) =>
    (await req('/api/admin/auditoria')).dados.registros.filter(r => r.acao === acao);

  test('ação do admin fica registrada com quem fez', async () => {
    const admin = await novaConta();
    await promover(admin.email);
    const alvo = await novaConta();

    const link = await admin.req(`/api/admin/clientes/${alvo.id}/recuperacao`, { metodo: 'POST' });
    assert.equal(link.status, 201);
    assert.equal((await admin.req('/api/admin/exportar?tipo=clientes')).status, 200);
    assert.equal((await admin.req(`/api/admin/clientes/${alvo.id}`, { metodo: 'DELETE' })).status, 204);

    for (const [acao, sobre] of [['link_senha_gerado', alvo.email], ['exportou_csv', 'clientes'],
                                 ['cliente_removido', alvo.email]]) {
      const r = (await acoes(admin.req, acao)).find(x => x.alvo === sobre);
      assert.ok(r, `${acao} deveria estar no registro`);
      assert.equal(r.admin_email, admin.email);
    }
  });

  test('senha errada em conta de admin fica registrada; em conta comum, não', async () => {
    const admin = await novaConta();
    await promover(admin.email);
    const comum = await novaConta();
    for (const email of [admin.email, comum.email]) {
      await criarCliente()('/api/auth/entrar', { metodo: 'POST', corpo: { email, senha: 'errada123' } });
    }
    const falhas = await acoes(admin.req, 'login_falhou');
    assert.ok(falhas.some(f => f.admin_email === admin.email));
    assert.ok(!falhas.some(f => f.admin_email === comum.email));
  });

  test('só admin lê, e ninguém apaga', async () => {
    const { req } = await novaConta();
    assert.equal((await req('/api/admin/auditoria')).status, 403);
    assert.equal((await req('/api/admin/auditoria', { metodo: 'DELETE' })).status, 405);
  });
});
