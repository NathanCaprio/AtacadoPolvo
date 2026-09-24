/* =========================================================================
   Testes de ponta a ponta: recuperação de senha, direitos do titular
   (LGPD) e exportação CSV do painel.

       node --test server/recuperacao.test.js

   Mesma infra do api.test.js — servidor de verdade, banco temporário,
   porta livre, conversa por HTTP. Fica em arquivo separado porque as duas
   suítes sobem processos próprios e não compartilham estado.

   O foco é o que quebra em silêncio:
     - o fluxo de redefinição não pode virar um verificador de cadastro
       ("esse e-mail existe?")
     - um token não pode servir duas vezes, nem sobreviver ao próprio uso
     - excluir a conta não pode deixar rastro pessoal para trás, nem
       derrubar o último admin
     - a exportação do cliente não pode conter dado de outro cliente
   ========================================================================= */

'use strict';

const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

let processo, BASE, banco;

/* ---- Infra -------------------------------------------------------------- */

function criarCliente() {
  let cookie = '';
  return async function req(caminho, { metodo = 'GET', corpo, bruto = false } = {}) {
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
      cookie = valor === '' ? '' : `${nome}=${valor}`;
    }

    if (bruto) {
      // Em bytes: res.text() decodifica e come o BOM, que é justamente
      // o que alguns testes precisam conferir.
      const bytes = Buffer.from(await res.arrayBuffer());
      return { status: res.status, bytes, texto: bytes.toString('utf8'), headers: res.headers };
    }

    const texto = await res.text();

    let dados = null;
    try { dados = JSON.parse(texto); } catch { dados = texto; }
    return { status: res.status, dados };
  };
}

async function esperarSubir(url, tentativas = 60) {
  for (let i = 0; i < tentativas; i++) {
    try { await fetch(url + '/api/auth/eu'); return; }
    catch { await new Promise(r => setTimeout(r, 100)); }
  }
  throw new Error('o servidor não subiu a tempo');
}

before(async () => {
  banco = path.join(os.tmpdir(), `polvo-rec-${process.pid}-${Date.now()}.db`);
  const porta = 3700 + (process.pid % 200);
  BASE = `http://127.0.0.1:${porta}`;

  processo = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
    env: {
      ...process.env,
      BANCO: banco,
      PORTA: String(porta),
      LIMITE_CADASTRO: '500',
      LIMITE_LOGIN: '500',
      LIMITE_MENSAGEM: '500',
      LIMITE_ORCAMENTO: '500',
      // Sem isso o teste esbarra no limite da própria rota que ele testa.
      LIMITE_RECUPERACAO: '500',
      // Devolve o link no corpo da resposta. Só assim o teste consegue o
      // token sem ler o console do servidor — e a rota se recusa a fazer
      // isso com NODE_ENV=production, o que também é testado aqui.
      RECUPERACAO_NO_CORPO: '1',
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

let sequencia = 0;

async function novaConta(extra = {}) {
  const req = criarCliente();
  const email = `r${++sequencia}.${Date.now()}@exemplo.com`;
  const senha = 'senhaboa123';
  const r = await req('/api/auth/cadastrar', {
    metodo: 'POST', corpo: { nome: 'Fulano de Teste', email, senha, ...extra }
  });
  assert.equal(r.status, 201, `cadastro falhou: ${JSON.stringify(r.dados)}`);
  return { req, email, senha, id: r.dados.cliente.id };
}

/** Promove pelo banco: não existe rota para criar o primeiro admin. */
function promover(email) {
  const db = new DatabaseSync(banco);
  db.prepare(`UPDATE clientes SET papel = 'admin' WHERE email = ?`).run(email);
  db.close();
}

function consultar(sql, ...args) {
  const db = new DatabaseSync(banco);
  const r = db.prepare(sql).get(...args);
  db.close();
  return r;
}

/** Pede o link e devolve o token que veio dentro dele. */
async function pedirToken(email) {
  const r = await criarCliente()('/api/auth/recuperar', {
    metodo: 'POST', corpo: { email }
  });
  assert.equal(r.status, 200);
  assert.ok(r.dados.link, 'o link não veio no corpo (RECUPERACAO_NO_CORPO)');
  return new URL(r.dados.link).searchParams.get('token');
}

/* ---- 1. Pedido do link --------------------------------------------------- */

describe('pedir redefinição', () => {
  test('responde igual para e-mail que existe e que não existe', async () => {
    const { email } = await novaConta();

    const existe = await criarCliente()('/api/auth/recuperar', {
      metodo: 'POST', corpo: { email }
    });
    const naoExiste = await criarCliente()('/api/auth/recuperar', {
      metodo: 'POST', corpo: { email: `fantasma.${Date.now()}@exemplo.com` }
    });

    // Mesmo status e mesma mensagem: senão a tela vira um verificador de
    // quem é cliente da empresa.
    assert.equal(existe.status, naoExiste.status);
    assert.equal(existe.dados.mensagem, naoExiste.dados.mensagem);
    assert.equal(existe.dados.ok, true);
  });

  test('não gera token para e-mail inexistente', async () => {
    const r = await criarCliente()('/api/auth/recuperar', {
      metodo: 'POST', corpo: { email: `ninguem.${Date.now()}@exemplo.com` }
    });
    assert.equal(r.status, 200);
    assert.equal(r.dados.link, undefined);
  });

  test('e-mail malformado também responde 200, sem token', async () => {
    const r = await criarCliente()('/api/auth/recuperar', {
      metodo: 'POST', corpo: { email: 'isso-nao-e-email' }
    });
    assert.equal(r.status, 200);
    assert.equal(r.dados.link, undefined);
  });

  test('conta desativada não recebe link', async () => {
    const { email } = await novaConta();
    const db = new DatabaseSync(banco);
    db.prepare('UPDATE clientes SET ativo = 0 WHERE email = ?').run(email);
    db.close();

    const r = await criarCliente()('/api/auth/recuperar', {
      metodo: 'POST', corpo: { email }
    });
    assert.equal(r.status, 200);
    assert.equal(r.dados.link, undefined);
  });

  test('um pedido novo invalida o link anterior', async () => {
    const { email } = await novaConta();
    const primeiro = await pedirToken(email);
    const segundo = await pedirToken(email);
    assert.notEqual(primeiro, segundo);

    // O link velho pode estar numa caixa de entrada; tem que morrer.
    const r = await criarCliente()('/api/auth/redefinir', {
      metodo: 'POST', corpo: { token: primeiro, senha: 'outrasenha123' }
    });
    assert.equal(r.status, 400);
  });
});

/* ---- 2. Conferência do token -------------------------------------------- */

describe('conferir token', () => {
  test('token válido devolve o e-mail da conta', async () => {
    const { email } = await novaConta();
    const token = await pedirToken(email);

    const r = await criarCliente()(`/api/auth/recuperar?token=${token}`);
    assert.equal(r.status, 200);
    assert.equal(r.dados.email, email);
  });

  test('conferir não gasta o token', async () => {
    const { email } = await novaConta();
    const token = await pedirToken(email);

    await criarCliente()(`/api/auth/recuperar?token=${token}`);
    const r = await criarCliente()('/api/auth/redefinir', {
      metodo: 'POST', corpo: { token, senha: 'senhanova123' }
    });
    assert.equal(r.status, 200);
  });

  test('token inventado é recusado', async () => {
    const r = await criarCliente()('/api/auth/recuperar?token=nao-existe-isso');
    assert.equal(r.status, 400);
  });
});

/* ---- 3. Redefinição ------------------------------------------------------ */

describe('redefinir senha', () => {
  test('troca a senha, derruba a antiga e já abre sessão', async () => {
    const { email, senha } = await novaConta();
    const token = await pedirToken(email);

    const req = criarCliente();
    const r = await req('/api/auth/redefinir', {
      metodo: 'POST', corpo: { token, senha: 'senhanovaboa123' }
    });
    assert.equal(r.status, 200);
    assert.equal(r.dados.cliente.email, email);

    // Caiu logado: o cookie da resposta já vale.
    const eu = await req('/api/auth/eu');
    assert.equal(eu.status, 200);

    const antiga = await criarCliente()('/api/auth/entrar', {
      metodo: 'POST', corpo: { email, senha }
    });
    assert.equal(antiga.status, 401);

    const nova = await criarCliente()('/api/auth/entrar', {
      metodo: 'POST', corpo: { email, senha: 'senhanovaboa123' }
    });
    assert.equal(nova.status, 200);
  });

  test('o token não serve duas vezes', async () => {
    const { email } = await novaConta();
    const token = await pedirToken(email);

    const primeira = await criarCliente()('/api/auth/redefinir', {
      metodo: 'POST', corpo: { token, senha: 'primeirasenha123' }
    });
    assert.equal(primeira.status, 200);

    const segunda = await criarCliente()('/api/auth/redefinir', {
      metodo: 'POST', corpo: { token, senha: 'segundasenha123' }
    });
    assert.equal(segunda.status, 400);
  });

  test('derruba as sessões abertas em outros aparelhos', async () => {
    const { req, email } = await novaConta();
    assert.equal((await req('/api/auth/eu')).status, 200);

    const token = await pedirToken(email);
    await criarCliente()('/api/auth/redefinir', {
      metodo: 'POST', corpo: { token, senha: 'trocadaagora123' }
    });

    // Quem pediu redefinição pode ter sido invadido: a sessão velha cai.
    assert.equal((await req('/api/auth/eu')).status, 401);
  });

  test('recusa senha curta e mantém o token de pé', async () => {
    const { email } = await novaConta();
    const token = await pedirToken(email);

    const curta = await criarCliente()('/api/auth/redefinir', {
      metodo: 'POST', corpo: { token, senha: '1234567' }
    });
    assert.equal(curta.status, 400);

    // O erro é do usuário, não do link: obrigar a pedir outro seria punição.
    const boa = await criarCliente()('/api/auth/redefinir', {
      metodo: 'POST', corpo: { token, senha: 'agoravaibem123' }
    });
    assert.equal(boa.status, 200);
  });

  test('token vencido é recusado', async () => {
    const { email } = await novaConta();
    const token = await pedirToken(email);

    const db = new DatabaseSync(banco);
    db.prepare(`UPDATE recuperacoes SET expira_em = datetime('now','-1 minute')`).run();
    db.close();

    const r = await criarCliente()('/api/auth/redefinir', {
      metodo: 'POST', corpo: { token, senha: 'senhanovaqualquer1' }
    });
    assert.equal(r.status, 400);
  });
});

/* ---- 4. Link gerado pelo admin ------------------------------------------ */

describe('link de redefinição pelo admin', () => {
  test('cliente comum não gera link para ninguém', async () => {
    const alvo = await novaConta();
    const { req } = await novaConta();
    const r = await req(`/api/admin/clientes/${alvo.id}/recuperacao`, { metodo: 'POST' });
    assert.equal(r.status, 403);
  });

  test('sem login é 401', async () => {
    const alvo = await novaConta();
    const r = await criarCliente()(`/api/admin/clientes/${alvo.id}/recuperacao`,
      { metodo: 'POST' });
    assert.equal(r.status, 401);
  });

  test('admin gera link que redefine de verdade', async () => {
    const alvo = await novaConta();
    const admin = await novaConta();
    promover(admin.email);
    await admin.req('/api/auth/entrar', {
      metodo: 'POST', corpo: { email: admin.email, senha: admin.senha }
    });

    const r = await admin.req(`/api/admin/clientes/${alvo.id}/recuperacao`,
      { metodo: 'POST' });
    assert.equal(r.status, 201);
    assert.equal(r.dados.cliente.email, alvo.email);

    const token = new URL(r.dados.link).searchParams.get('token');
    const troca = await criarCliente()('/api/auth/redefinir', {
      metodo: 'POST', corpo: { token, senha: 'peloadmin12345' }
    });
    assert.equal(troca.status, 200);

    // Fica registrado que veio do balcão, e não do próprio cliente.
    const linha = consultar(
      'SELECT origem FROM recuperacoes WHERE cliente_id = ? ORDER BY id DESC', alvo.id);
    assert.equal(linha.origem, 'admin');
  });

  test('não gera link para conta desativada', async () => {
    const alvo = await novaConta();
    const admin = await novaConta();
    promover(admin.email);
    await admin.req('/api/auth/entrar', {
      metodo: 'POST', corpo: { email: admin.email, senha: admin.senha }
    });

    const db = new DatabaseSync(banco);
    db.prepare('UPDATE clientes SET ativo = 0 WHERE id = ?').run(alvo.id);
    db.close();

    const r = await admin.req(`/api/admin/clientes/${alvo.id}/recuperacao`,
      { metodo: 'POST' });
    assert.equal(r.status, 409);
  });
});

/* ---- 5. Direitos do titular (LGPD) -------------------------------------- */

describe('exportar os próprios dados', () => {
  test('sem login é 401', async () => {
    const r = await criarCliente()('/api/auth/eu/dados');
    assert.equal(r.status, 401);
  });

  test('vem como arquivo e traz o cadastro', async () => {
    const { req, email } = await novaConta();
    const r = await req('/api/auth/eu/dados', { bruto: true });

    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-disposition'), /attachment/);

    const dados = JSON.parse(r.texto);
    assert.equal(dados.cadastro.email, email);
    assert.ok(Array.isArray(dados.orcamentos));
    assert.ok(Array.isArray(dados.mensagens));
    assert.ok(Array.isArray(dados.sessoes));
  });

  test('não vaza dado de outro cliente', async () => {
    const outro = await novaConta();
    await outro.req('/api/orcamentos', {
      metodo: 'POST',
      corpo: { itens: [{ id: 'x', nome: 'Água sanitária', qtd: 3, caixa: '12un' }] }
    });

    const { req } = await novaConta();
    const r = await req('/api/auth/eu/dados', { bruto: true });
    const dados = JSON.parse(r.texto);

    assert.equal(dados.orcamentos.length, 0);
    assert.ok(!r.texto.includes(outro.email));
  });

  test('traz o orçamento do próprio cliente', async () => {
    const { req } = await novaConta();
    await req('/api/orcamentos', {
      metodo: 'POST',
      corpo: { itens: [{ id: 'y', nome: 'Desinfetante', qtd: 5, caixa: '6un' }] }
    });

    const r = await req('/api/auth/eu/dados', { bruto: true });
    const dados = JSON.parse(r.texto);
    assert.equal(dados.orcamentos.length, 1);
    assert.equal(dados.orcamentos[0].itens[0].nome, 'Desinfetante');
  });
});

describe('excluir a própria conta', () => {
  test('sem login é 401', async () => {
    const r = await criarCliente()('/api/auth/eu', { metodo: 'DELETE' });
    assert.equal(r.status, 401);
  });

  test('senha errada não exclui', async () => {
    const { req, email } = await novaConta();
    const r = await req('/api/auth/eu', {
      metodo: 'DELETE', corpo: { senha: 'nao-e-essa' }
    });
    assert.equal(r.status, 401);
    assert.ok(consultar('SELECT id FROM clientes WHERE email = ?', email));
  });

  test('exclui, derruba a sessão e some do banco', async () => {
    const { req, email, senha } = await novaConta();
    const r = await req('/api/auth/eu', { metodo: 'DELETE', corpo: { senha } });
    assert.equal(r.status, 204);

    assert.equal(consultar('SELECT id FROM clientes WHERE email = ?', email), undefined);
    assert.equal((await req('/api/auth/eu')).status, 401);

    // Não dá para entrar com uma conta que não existe mais.
    const volta = await criarCliente()('/api/auth/entrar', {
      metodo: 'POST', corpo: { email, senha }
    });
    assert.equal(volta.status, 401);
  });

  test('apaga o dado pessoal das mensagens e preserva o histórico', async () => {
    const { req, id, senha } = await novaConta();
    await req('/api/mensagens', {
      metodo: 'POST',
      corpo: {
        nome: 'Síndico Fulano', email: 'sindico@predio.com.br',
        telefone: '51999998888', empresa: 'Ed. Girassol', cnpj: '11.111.111/0001-11',
        mensagem: 'Preciso de material para o prédio.', aceite: true,
        origem: 'landing', segmento: 'condominio'
      }
    });

    const antes = consultar('SELECT id, nome FROM mensagens WHERE cliente_id = ?', id);
    assert.equal(antes.nome, 'Síndico Fulano');

    await req('/api/auth/eu', { metodo: 'DELETE', corpo: { senha } });

    // A linha continua (é histórico comercial), mas sem nada que identifique.
    const depois = consultar('SELECT * FROM mensagens WHERE id = ?', antes.id);
    assert.ok(depois, 'a mensagem não devia sumir');
    assert.equal(depois.cliente_id, null);
    assert.equal(depois.nome, 'Conta excluída');
    assert.equal(depois.email, '');
    assert.equal(depois.telefone, null);
    assert.equal(depois.cnpj, null);
    // O que não é pessoal fica: é disso que o relatório por segmento vive.
    assert.equal(depois.segmento, 'condominio');
  });

  test('o último admin ativo não consegue se excluir', async () => {
    // Zera os admins para o teste não depender da ordem dos outros.
    const db = new DatabaseSync(banco);
    db.prepare(`UPDATE clientes SET papel = 'cliente' WHERE papel = 'admin'`).run();
    db.close();

    const admin = await novaConta();
    promover(admin.email);
    await admin.req('/api/auth/entrar', {
      metodo: 'POST', corpo: { email: admin.email, senha: admin.senha }
    });

    const r = await admin.req('/api/auth/eu', {
      metodo: 'DELETE', corpo: { senha: admin.senha }
    });
    assert.equal(r.status, 409);
    assert.ok(consultar('SELECT id FROM clientes WHERE email = ?', admin.email));
  });
});

/* ---- 6. Consentimento (LGPD) -------------------------------------------- */

describe('aceite da política', () => {
  test('carimba a data quando o aceite vem marcado', async () => {
    const r = await criarCliente()('/api/mensagens', {
      metodo: 'POST',
      corpo: {
        nome: 'Diretora Teste', email: 'diretora@escola.com.br',
        mensagem: 'Cotação para a escola.', aceite: true,
        origem: 'landing', segmento: 'escola'
      }
    });
    assert.equal(r.status, 201);

    const linha = consultar('SELECT aceite_em, origem, segmento FROM mensagens WHERE id = ?',
      r.dados.id);
    assert.ok(linha.aceite_em, 'o aceite devia estar carimbado');
    assert.equal(linha.origem, 'landing');
    assert.equal(linha.segmento, 'escola');
  });

  test('fica nulo quando o aceite não vem', async () => {
    const r = await criarCliente()('/api/mensagens', {
      metodo: 'POST',
      corpo: {
        nome: 'Sem Aceite', email: 'semaceite@exemplo.com',
        mensagem: 'Mandou sem marcar o aceite.'
      }
    });
    const linha = consultar('SELECT aceite_em FROM mensagens WHERE id = ?', r.dados.id);
    assert.equal(linha.aceite_em, null);
  });

  test('origem e segmento fora da lista caem no padrão', async () => {
    const r = await criarCliente()('/api/mensagens', {
      metodo: 'POST',
      corpo: {
        nome: 'Valor Inventado', email: 'inventado@exemplo.com',
        mensagem: 'Mandou origem e segmento que não existem.',
        origem: 'sei-la-de-onde', segmento: 'nao-existe'
      }
    });
    const linha = consultar('SELECT origem, segmento FROM mensagens WHERE id = ?', r.dados.id);
    assert.equal(linha.origem, 'contato');
    assert.equal(linha.segmento, null);
  });
});

/* ---- 7. Exportação CSV --------------------------------------------------- */

describe('exportar CSV', () => {
  async function comoAdmin() {
    const admin = await novaConta();
    promover(admin.email);
    await admin.req('/api/auth/entrar', {
      metodo: 'POST', corpo: { email: admin.email, senha: admin.senha }
    });
    return admin.req;
  }

  test('cliente comum não baixa', async () => {
    const { req } = await novaConta();
    const r = await req('/api/admin/exportar?tipo=mensagens');
    assert.equal(r.status, 403);
  });

  test('sem login é 401', async () => {
    const r = await criarCliente()('/api/admin/exportar?tipo=mensagens');
    assert.equal(r.status, 401);
  });

  test('vem como CSV, com BOM e cabeçalho', async () => {
    const req = await comoAdmin();
    const r = await req('/api/admin/exportar?tipo=mensagens', { bruto: true });

    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type'), /text\/csv/);
    assert.match(r.headers.get('content-disposition'), /attachment; filename="leads-/);
    // O BOM é o que faz o Excel no Windows abrir em UTF-8 e não comer acento.
    assert.deepEqual([...r.bytes.subarray(0, 3)], [0xEF, 0xBB, 0xBF]);
    assert.match(r.texto, /"id";"data";"origem";"segmento"/);
  });

  test('os três tipos respondem', async () => {
    const req = await comoAdmin();
    for (const tipo of ['mensagens', 'orcamentos', 'clientes']) {
      const r = await req(`/api/admin/exportar?tipo=${tipo}`, { bruto: true });
      assert.equal(r.status, 200, `tipo ${tipo} falhou`);
    }
  });

  test('tipo inválido é 400', async () => {
    const req = await comoAdmin();
    const r = await req('/api/admin/exportar?tipo=tudo');
    assert.equal(r.status, 400);
  });

  test('neutraliza valor que o Excel leria como fórmula', async () => {
    // Nome começando com "=" vira execução ao abrir a planilha, se for
    // gravado cru. O prefixo de apóstrofo desarma isso.
    await criarCliente()('/api/mensagens', {
      metodo: 'POST',
      corpo: {
        nome: '=HYPERLINK("http://mau.example","clique")',
        email: 'formula@exemplo.com', mensagem: 'Tentando injetar fórmula.'
      }
    });

    const req = await comoAdmin();
    const r = await req('/api/admin/exportar?tipo=mensagens', { bruto: true });
    assert.ok(r.texto.includes(`"'=HYPERLINK`), 'a fórmula devia sair escapada');
    assert.ok(!r.texto.includes(`;"=HYPERLINK`), 'a fórmula saiu crua');
  });
});

/* ---- 8. Produção não devolve o link ------------------------------------- */

describe('trava de produção', () => {
  test('com NODE_ENV=production o link não vai no corpo', async () => {
    // Sobe um segundo servidor só para este caso: a variável é lida no boot.
    const bancoProd = path.join(os.tmpdir(), `polvo-prod-${process.pid}-${Date.now()}.db`);
    const porta = 3900 + (process.pid % 90);
    const base = `http://127.0.0.1:${porta}`;

    const proc = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
      env: {
        ...process.env,
        BANCO: bancoProd,
        PORTA: String(porta),
        NODE_ENV: 'production',
        // Ligado de propósito: o teste prova que a trava de produção vence
        // a variável de desenvolvimento, e não o contrário.
        RECUPERACAO_NO_CORPO: '1',
        LIMITE_CADASTRO: '500',
        LIMITE_RECUPERACAO: '500',
        BACKUP_AUTO: '0'
      },
      stdio: 'ignore'
    });

    try {
      await esperarSubir(base);

      const email = `prod.${Date.now()}@exemplo.com`;
      await fetch(base + '/api/auth/cadastrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: 'Produção', email, senha: 'senhaboa123' })
      });

      const res = await fetch(base + '/api/auth/recuperar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const dados = await res.json();

      assert.equal(res.status, 200);
      assert.equal(dados.ok, true);
      assert.equal(dados.link, undefined, 'o link não pode vazar em produção');
    } finally {
      proc.kill();
      for (const sufixo of ['', '-wal', '-shm']) {
        try { fs.unlinkSync(bancoProd + sufixo); } catch { /* pode não existir */ }
      }
    }
  });
});
