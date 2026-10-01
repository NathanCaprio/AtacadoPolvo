/* =========================================================================
   Catálogo vindo do ERP (Empresarius, da WME Sistemas) — SOMENTE LEITURA.

   O Empresarius não tem API pública. Usamos a mesma API que o próprio
   sistema web usa (empresarius.azurewebsites.net/api), logando com um
   usuário criado só para o site:

       ERP_EMAIL / ERP_SENHA   usuário do ERP (sem isso, o site segue com o
                               catálogo de exemplo de assets/js/data.js)
       ERP_INTERVALO_HORAS     de quanto em quanto tempo sincroniza (12)
       ERP_AUTO=0              não sincroniza sozinho (só pelo botão do admin)
       ERP_URL                 outra base da API (os testes apontam para um
                               ERP falso local)

   Regra que não se quebra: daqui só sai o POST de login e GETs. Nenhuma
   rota que grave no ERP pode ser chamada — o painel do ERP é da loja e
   qualquer escrita lá mexe em nota fiscal, estoque e financeiro.

   Por que funciona assim:
   - Uma chamada traz a lista inteira (~2.900 produtos, ~2 MB); as fotos só
     vêm na ficha de cada produto, então a sincronização abre a ficha dos
     ativos, poucas de cada vez, para não pesar no ERP.
   - O resultado vai inteiro para a tabela produtos_erp. Se o ERP falhar no
     meio, a tabela anterior continua valendo: o site nunca fica sem
     catálogo por causa de uma sincronização ruim.
   - Preço, custo e estoque chegam nas respostas do ERP mas são descartados
     aqui mesmo. O site não mostra nenhum dos três (preço sob consulta).
   ========================================================================= */

'use strict';

const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { db } = require('./db');

const URL_ERP = (process.env.ERP_URL || 'https://empresarius.azurewebsites.net/api').replace(/\/+$/, '');

// As fotos ficam no S3 do Empresarius, públicas. Só URL deste endereço passa
// para o site (e é este o domínio liberado no CSP do server.js).
const ORIGEM_FOTOS = 'https://empresarius.s3.sa-east-1.amazonaws.com';
const FOTO_RE = /^https:\/\/empresarius\.s3\.sa-east-1\.amazonaws\.com\/[A-Za-z0-9._~\/-]+$/;

const PARALELO = 3;              // fichas abertas ao mesmo tempo
const TEMPO_LIMITE = 30_000;     // ms por chamada ao ERP
const VITRINE = 8;               // produtos marcados como "mais vendido"

const credenciais = () => ({ email: process.env.ERP_EMAIL || '', senha: process.env.ERP_SENHA || '' });
const configurado = () => !!(credenciais().email && credenciais().senha);

/* ---- 1. Cliente do ERP --------------------------------------------------- */

let token = null;
let tokenVence = 0;

function vencimento(jwt) {
  try {
    const { exp } = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString());
    if (Number.isFinite(exp)) return exp * 1000;
  } catch { /* token num formato que não conhecemos: usa o prazo padrão */ }
  return Date.now() + 11 * 60 * 60 * 1000;
}

/* A resposta do login traz também configurações da empresa (inclusive a
   senha do SMTP dela). Daqui só se tira o token; o resto não é guardado
   nem logado. */
async function entrar() {
  const { email, senha } = credenciais();
  const res = await fetch(URL_ERP + '/Auth/Login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, senha, codigo: null, reenviarCodigo: false }),
    signal: AbortSignal.timeout(TEMPO_LIMITE)
  });
  let corpo = null;
  try { corpo = await res.json(); } catch { /* sem corpo */ }

  const novo = corpo && corpo.data && corpo.data.token;
  if (!res.ok || typeof novo !== 'string') {
    // Sem token com 200 = o ERP pediu algo a mais (código de verificação
    // por e-mail, troca de senha). A mensagem dele vai para o painel.
    const msg = corpo && typeof corpo.message === 'string' ? corpo.message.slice(0, 200) : '';
    throw new Error(`login no ERP recusado (HTTP ${res.status}${msg ? ': ' + msg : ''})`);
  }
  token = novo;
  tokenVence = vencimento(novo);
}

async function ler(caminho) {
  const pedir = () => fetch(URL_ERP + caminho, {
    headers: { Accept: 'application/json', Authorization: 'Bearer ' + token },
    signal: AbortSignal.timeout(TEMPO_LIMITE)
  });

  if (!token || Date.now() > tokenVence - 5 * 60 * 1000) await entrar();
  let res = await pedir();
  if (res.status === 401) {                 // sessão derrubada do lado de lá
    await entrar();
    res = await pedir();
  }
  if (!res.ok) throw new Error(`ERP respondeu HTTP ${res.status} em ${caminho.split('/').slice(0, 3).join('/')}`);
  const corpo = await res.json();
  return corpo ? corpo.data : null;
}

async function emParalelo(itens, n, fn) {
  let i = 0;
  const trabalhador = async () => {
    while (i < itens.length) await fn(itens[i++]);
  };
  await Promise.all(Array.from({ length: Math.min(n, itens.length) }, trabalhador));
}

/* ---- 2. Sincronização --------------------------------------------------- */

// Servidor que caiu no meio de uma rodada deixa a linha "rodando" para trás.
db.prepare(`UPDATE erp_sincronizacoes
               SET situacao = 'erro', fim = datetime('now'),
                   mensagem = 'interrompida (o servidor reiniciou)'
             WHERE situacao = 'rodando'`).run();

let emAndamento = null;

/** Roda uma sincronização; se já houver uma em curso, devolve a mesma. */
function sincronizar() {
  if (!configurado()) return Promise.reject(new Error('ERP_EMAIL e ERP_SENHA não estão definidos no servidor.'));
  if (!emAndamento) emAndamento = executar().finally(() => { emAndamento = null; });
  return emAndamento;
}

const fotosValidas = lista =>
  (Array.isArray(lista) ? lista : [])
    .map(f => f && f.url)
    .filter(u => typeof u === 'string' && FOTO_RE.test(u));

async function executar() {
  const inicio = Date.now();
  const id = db.prepare(`INSERT INTO erp_sincronizacoes (situacao) VALUES ('rodando')`).run().lastInsertRowid;

  try {
    const lista = await ler('/Produtos/ListMercadoriasToSelect');
    if (!Array.isArray(lista)) throw new Error('a lista de produtos veio num formato inesperado');

    const ativos = lista.filter(p => p && p.situacao === 'A' && typeof p.id === 'string' && p.descricao);
    // Lista vazia é quase certamente problema do lado de lá; apagar o
    // catálogo do site por causa disso seria pior que ficar desatualizado.
    if (!ativos.length) throw new Error('o ERP não devolveu nenhum produto ativo; catálogo anterior mantido');

    const anteriores = new Map(
      db.prepare('SELECT erp_id, fotos, unidade FROM produtos_erp').all().map(r => [r.erp_id, r])
    );

    const fichas = new Map();
    let falhas = 0;
    await emParalelo(ativos, PARALELO, async p => {
      try { fichas.set(p.id, await ler('/Produtos/Mercadorias/' + encodeURIComponent(p.id))); }
      catch { falhas++; }
    });
    if (falhas > ativos.length / 2) {
      throw new Error(`${falhas} de ${ativos.length} fichas falharam; catálogo anterior mantido`);
    }

    // Ficha que falhou desta vez: fica com a foto e a unidade da rodada anterior.
    const linhas = ativos.map(p => {
      const ficha = fichas.get(p.id);
      const ant = anteriores.get(p.id);
      const merc = ficha && ficha.mercadorias;
      const unidade = (merc && merc.vendaUnidadesMedidas && merc.vendaUnidadesMedidas.descricao)
        || (ant && ant.unidade) || p.vendaUnidadesMedidasUnidade || '';
      const fotos = ficha ? fotosValidas(ficha.produtosFotos) : (ant ? JSON.parse(ant.fotos) : []);
      return [
        p.id,
        p.codigo == null ? '' : String(p.codigo),
        String(p.descricao),
        String(p.gruposProdutosDescricao || ''),
        String(p.categoriasProdutosDescricao || ''),
        String(unidade),
        JSON.stringify(fotos)
      ];
    });

    db.exec('BEGIN');
    try {
      db.exec('DELETE FROM produtos_erp');
      const inserir = db.prepare(`INSERT INTO produtos_erp
        (erp_id, codigo, nome, grupo, categoria, unidade, fotos) VALUES (?, ?, ?, ?, ?, ?, ?)`);
      for (const l of linhas) inserir.run(...l);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    publico = null;

    const resultado = {
      produtos: linhas.length,
      comFoto: linhas.filter(l => l[6] !== '[]').length,
      falhas,
      segundos: Math.round((Date.now() - inicio) / 1000)
    };
    db.prepare(`UPDATE erp_sincronizacoes
                   SET situacao = 'ok', fim = datetime('now'), produtos = ?, com_foto = ?, falhas = ?
                 WHERE id = ?`).run(resultado.produtos, resultado.comFoto, falhas, id);
    podarHistorico();
    return resultado;
  } catch (e) {
    const msg = e.name === 'TimeoutError' ? 'o ERP demorou demais para responder' : e.message;
    db.prepare(`UPDATE erp_sincronizacoes SET situacao = 'erro', fim = datetime('now'), mensagem = ?
                 WHERE id = ?`).run(String(msg).slice(0, 300), id);
    podarHistorico();
    throw new Error(msg);
  }
}

function podarHistorico() {
  db.prepare(`DELETE FROM erp_sincronizacoes
               WHERE id NOT IN (SELECT id FROM erp_sincronizacoes ORDER BY id DESC LIMIT 100)`).run();
}

/** Primeira rodada no boot e depois a cada ERP_INTERVALO_HORAS. Falha só
    vira log: o site continua com o último catálogo bom. */
function agendar(log = console.log) {
  if (!configurado()) {
    const { n } = db.prepare('SELECT COUNT(*) AS n FROM produtos_erp').get();
    log('[erp] ERP_EMAIL/ERP_SENHA não definidos: sem sincronização. ' + (n
      ? `O site segue com o último catálogo gravado (${n} produtos).`
      : 'O site usa o catálogo de exemplo (data.js).'));
    return null;
  }
  if (process.env.ERP_AUTO === '0') return null;

  const horas = Number(process.env.ERP_INTERVALO_HORAS || 12);
  const rodar = () => sincronizar().then(
    r => log(`[erp] ${r.produtos} produtos (${r.comFoto} com foto) em ${r.segundos}s` +
             (r.falhas ? ` — ${r.falhas} ficha(s) sem resposta` : '')),
    e => log(`[erp] sincronização falhou: ${e.message}`)
  );
  rodar();
  return setInterval(rodar, horas * 60 * 60 * 1000).unref();
}

function situacao() {
  const colunas = 'id, inicio, fim, situacao, produtos, com_foto AS comFoto, falhas, mensagem';
  const n = db.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(fotos <> '[]'), 0) AS f FROM produtos_erp`).get();
  return {
    configurado: configurado(),
    automatico: configurado() && process.env.ERP_AUTO !== '0',
    intervaloHoras: Number(process.env.ERP_INTERVALO_HORAS || 12),
    rodando: !!emAndamento,
    produtos: n.n,
    comFoto: n.f,
    ultimaOk: db.prepare(`SELECT ${colunas} FROM erp_sincronizacoes WHERE situacao = 'ok'
                           ORDER BY id DESC LIMIT 1`).get() || null,
    historico: db.prepare(`SELECT ${colunas} FROM erp_sincronizacoes ORDER BY id DESC LIMIT 10`).all()
  };
}

/* ---- 3. Do ERP para o formato do site ------------------------------------
   O site (catálogo, home, página de produto, admin) lê window.CATALOGO no
   formato de assets/js/data.js: { categorias: [...], produtos: [...] }.
   O que está abaixo só traduz: grupo do ERP vira categoria do site, nome em
   maiúsculas vira nome legível.                                            */

const chave = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toUpperCase().replace(/\s+/g, ' ').trim();

// Texto vindo do ERP vai parar em innerHTML no site: tira o que abriria tag
// ou fecharia atributo.
const limpo = s => String(s || '').replace(/[<>]/g, '').replace(/"/g, '″').replace(/\s+/g, ' ').trim();

/* Grupos do ERP, na ordem em que aparecem no site; os 8 primeiros viram card
   na home. Os ids estão em links fixos dos .html (rodapé, landings): trocar
   um id exige procurar o antigo nas páginas. Grupo novo criado no ERP
   aparece sozinho no fim, com nome automático; para dar nome, ícone (um de
   window.ICONS, em main.js) e texto, basta acrescentar uma linha aqui.     */
const GRUPOS = [
  ['LIMPEZA',                          'limpeza',        'Limpeza',                     'floor',  'Detergentes, desinfetantes, multiuso, ceras e limpadores perfumados.'],
  ['LAVANDERIA',                       'lavanderia',     'Lavanderia',                  'shirt',  'Sabão em pó, líquido e em barra, amaciantes e alvejantes.'],
  ['PAPEIS',                           'papeis',         'Papéis',                      'roll',   'Papel higiênico, toalha interfolhada e em bobina, guardanapos.'],
  ['DESCARTAVEIS',                     'descartaveis',   'Descartáveis',                'dish',   'Copos, pratos, talheres, canudos, potes e marmitas.'],
  ['SACOS DE LIXO',                    'sacos-de-lixo',  'Sacos de Lixo',               'bag',    'Sacos de lixo preto, azul e alvejado, em várias capacidades.'],
  ['VASSOURA - RODO - PA - BRUXA',     'vassouras',      'Vassouras, Rodos e Pás',      'broom',  'Vassouras, rodos, pás de lixo e bruxas.'],
  ['BALDE - BACIA - MOP - CESTO',      'baldes-e-mops',  'Baldes, Bacias e Mops',       'bucket', 'Baldes, bacias, mops e cestos.'],
  ['PANOS',                            'panos',          'Panos e Flanelas',            'floor',  'Panos de chão, perfex, microfibra e flanelas.'],
  ['ESPONJAS - FIBRAS - ESFREGOES',    'esponjas',       'Esponjas e Fibras',           'soap',   'Esponjas, fibras e esfregões.'],
  ['HIGIENE',                          'higiene',        'Higiene Pessoal',             'soap',   'Sabonetes, álcool em gel e itens de higiene pessoal.'],
  ['SANITARIOS',                       'sanitarios',     'Sanitários',                  'drop',   'Pastilhas e gel adesivo para vaso, desentupidores e escovas.'],
  ['AROMATIZANTES',                    'aromatizantes',  'Aromatizantes',               'drop',   'Aromatizadores, sprays, difusores e incensos.'],
  ['DISPENSER - FRASCO - PULVERIZADOR','dispensers',     'Dispensers e Pulverizadores', 'gallon', 'Dispensers de papel, sabonete e copos, frascos e pulverizadores.'],
  ['LIXEIRAS / COLETORAS',             'lixeiras',       'Lixeiras e Coletores',        'bucket', 'Lixeiras e coletores para coleta seletiva.'],
  ["EPI'S",                            'epis',           'EPIs',                        'shield', 'Luvas de procedimento e de limpeza e proteção individual.'],
  ['INSETICIDAS E PRAGUICIDAS',        'inseticidas',    'Inseticidas',                 'bug',    'Inseticidas e controle de pragas.'],
  ['SACOLAS',                          'sacolas',        'Sacolas',                     'bag',    'Sacolas plásticas, de rancho e kraft.'],
  ['EMBALAGENS',                       'embalagens',     'Embalagens',                  'box',    'Filme plástico, papel alumínio, sacos e embalagens.'],
  ['ESCRITORIO',                       'escritorio',     'Escritório',                  'pen',    'Papel A4, canetas, grampeadores, recibos e bobinas de impressão.'],
  ['PISCINA',                          'piscina',        'Piscina',                     'drop',   'Produtos para tratamento de piscina.'],
  ['AUTOMOTIVO',                       'automotivo',     'Automotivo',                  'gallon', 'Limpeza e cuidado automotivo.'],
  ['ALIMENTICIO',                      'alimenticio',    'Alimentício',                 'dish',   'Itens de copa e coffee break.'],
  ['CAIXAS ORGANIZADORAS / POTES',     'caixas-e-potes', 'Caixas e Potes',              'box',    'Caixas organizadoras e potes.'],
  ['DIVERSOS',                         'diversos',       'Diversos',                    'box',    'Utilidades, pilhas, lâmpadas e itens do dia a dia.']
].map(([erp, id, nome, icone, desc], ordem) => ({ erp, id, nome, icone, desc, ordem }));

// As mesmas cores das categorias antigas de data.js, em rodízio.
const PALETA = ['#7B2FE3', '#5B21B6', '#C026D3', '#8B5CF6', '#A16207', '#DB2777', '#6D28D9', '#3B1A6B'];

const PALAVRA_MINUSCULA = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'com', 'para', 'por',
  'a', 'o', 'na', 'no', 'c/', 'p/', 's/', 'x']);
const UNIDADES = { ml: 'ml', l: 'L', lt: 'L', lts: 'L', kg: 'kg', g: 'g', gr: 'g', mm: 'mm',
  cm: 'cm', m: 'm', un: 'un', und: 'un', pct: 'pct', cx: 'cx', fd: 'fd' };
const SIGLAS = new Set(['tnt', 'pvc', 'pead', 'abs', 'led', 'uv', 'epi', 'pp', 'ps']);

/* "DETERGENTE NEUTRO 500ML YPE" -> "Detergente Neutro 500ml Ype". Acento que
   o ERP não tem não dá para adivinhar ("ABRACADEIRA" fica "Abracadeira"). */
function nomeSite(bruto) {
  return limpo(bruto).toLowerCase().split(' ').map((p, i) => {
    if (!p) return p;
    if (/^[a-z]+\d/.test(p)) return p.toUpperCase();                  // a4, n95, pff2
    if (/\d/.test(p)) return p.replace(/(\d)(l|lt|lts)\b/g, '$1L');   // 5l -> 5L, 500ml
    if (UNIDADES[p] && i > 0) return UNIDADES[p];
    if (SIGLAS.has(p)) return p.toUpperCase();                         // TNT, PVC
    if (i > 0 && PALAVRA_MINUSCULA.has(p)) return p;
    return p.charAt(0).toUpperCase() + p.slice(1);
  }).join(' ');
}

/* "LIMPADORES PERFUMADOS" -> "Limpadores perfumados" */
function frase(bruto) {
  const t = limpo(bruto).toLowerCase();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
}

const SIGLAS_UNIDADE = { UN: 'Unidade', PCT: 'Pacote', CX: 'Caixa', BB: 'Bobina', GL: 'Galão',
  RO: 'Rolo', FD: 'Fardo', SC: 'Saco', KG: 'Quilo', LT: 'Litro', PC: 'Peça', DZ: 'Dúzia' };

function unidadeSite(bruto) {
  const t = limpo(bruto);
  if (!t) return 'Unidade';
  return SIGLAS_UNIDADE[t.toUpperCase()] || frase(t);
}

/* Ilustração usada enquanto o produto não tem foto (window.artProduto). */
const ARTES = [
  [/SPRAY|AEROSOL|PULVERIZADOR|GATILHO/, 'spray'],
  [/LUVA/, 'glove'],
  [/VASSOURA|RODO\b|ESCOVA|ESPANADOR|\bMOP\b|\bPA\b|BRUXA|DESENTUPIDOR/, 'broom'],
  [/BALDE|BACIA|CESTO|LIXEIRA|COLETOR/, 'bucket'],
  [/SACOLA|SACO\b|SACOS\b/, 'bag'],
  [/PAPEL|BOBINA|TOALHA|GUARDANAPO|ROLO|HIGIENICO|FITA/, 'roll'],
  [/COPO|PRATO|TALHER|GARFO|FACA|COLHER|POTE|MARMITA|CUMBUCA|TAMPA|CANUDO|MEXEDOR/, 'cup'],
  [/ESPONJA|FIBRA|ESFREGAO|PALHA/, 'sponge'],
  [/PANO|FLANELA|PERFEX|MICROFIBRA|ESTOPA/, 'cloth'],
  [/GALAO|BOMBONA|\b([2-9]|[1-9]\d)\s?(L|LT|LTS)\b/, 'gallon'],          // 2L ou mais
  [/LIQUID|GEL\b|ALCOOL|DETERGENTE|DESINFETANTE|AMACIANTE|AGUA SANITARIA/, 'bottle'],
  [/BARRA|PEDRA|SABONETE/, 'bar'],
  [/\bPO\b|CAIXA|LENCO/, 'box']
];
const artePara = texto => (ARTES.find(([re]) => re.test(texto)) || [null, 'bottle'])[1];

/* "Mais vendidos" da home: os mais pedidos nos orçamentos do site nos
   últimos 180 dias. Enquanto houver poucos pedidos, completa com produtos
   que têm foto e depois com um de cada categoria. */
function maisPedidos(ids) {
  const conta = new Map();
  const linhas = db.prepare(`SELECT itens FROM orcamentos WHERE criado_em >= datetime('now', '-180 days')`).all();
  for (const { itens } of linhas) {
    let lista = [];
    try { lista = JSON.parse(itens); } catch { continue; }
    for (const id of new Set(lista.map(i => i && String(i.id)))) {
      if (ids.has(id)) conta.set(id, (conta.get(id) || 0) + 1);
    }
  }
  return [...conta].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

function montarCatalogo() {
  const linhas = db.prepare('SELECT erp_id, codigo, nome, grupo, categoria, unidade, fotos FROM produtos_erp').all();
  if (!linhas.length) return null;

  const porChave = new Map(GRUPOS.map(g => [g.erp, g]));
  const categorias = new Map();
  const categoriaDe = grupo => {
    const k = chave(grupo);
    if (!categorias.has(k)) {
      const conhecido = porChave.get(k);
      const nome = conhecido ? conhecido.nome : (k ? frase(grupo) : 'Outros produtos');
      const id = conhecido ? conhecido.id
        : (chave(nome).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'outros');
      categorias.set(k, {
        id, nome,
        icone: conhecido ? conhecido.icone : 'drop',
        desc: conhecido ? conhecido.desc : '',
        ordem: conhecido ? conhecido.ordem : GRUPOS.length
      });
    }
    return categorias.get(k);
  };

  // Código do ERP como id (é o que o vendedor procura lá); repetido ou
  // esquisito, cai para o uuid, que nunca muda.
  const vezes = new Map();
  for (const l of linhas) vezes.set(l.codigo, (vezes.get(l.codigo) || 0) + 1);
  const idDe = l => (/^[A-Za-z0-9_-]{1,40}$/.test(l.codigo) && vezes.get(l.codigo) === 1) ? l.codigo : l.erp_id;

  const produtos = linhas.map(l => {
    const cat = categoriaDe(l.grupo);
    const fotos = JSON.parse(l.fotos);
    const p = {
      id: idDe(l),
      nome: nomeSite(l.nome),
      cat: cat.id,
      art: artePara(chave(l.nome + ' ' + l.categoria)),
      desc: frase(l.categoria),
      emb: '',
      caixa: unidadeSite(l.unidade)
    };
    if (fotos.length) p.foto = fotos[0];
    return p;
  });

  const lista = [...categorias.values()]
    .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt-BR'))
    .map(({ ordem, ...c }, i) => ({ ...c, cor: PALETA[i % PALETA.length] }));
  const posicao = new Map(lista.map((c, i) => [c.id, i]));
  produtos.sort((a, b) => posicao.get(a.cat) - posicao.get(b.cat) || a.nome.localeCompare(b.nome, 'pt-BR'));

  const destaque = maisPedidos(new Set(produtos.map(p => p.id)));
  const marcar = id => { if (destaque.length < VITRINE && !destaque.includes(id)) destaque.push(id); };
  // Completa alternando as categorias: em ordem alfabética, as oito
  // primeiras fotos seriam todas de água sanitária.
  const comFoto = lista.map(c => produtos.filter(p => p.cat === c.id && p.foto));
  for (let i = 0; destaque.length < VITRINE && comFoto.some(l => l[i]); i++) {
    comFoto.forEach(l => { if (l[i]) marcar(l[i].id); });
  }
  lista.forEach(c => { const p = produtos.find(x => x.cat === c.id); if (p) marcar(p.id); });
  const vitrine = new Set(destaque.slice(0, VITRINE));
  produtos.forEach(p => { if (vitrine.has(p.id)) p.tag = 'mais-vendido'; });

  return { categorias: lista, produtos };
}

/* ---- 4. O que o site baixa -------------------------------------------------
   /catalogo-erp.js e /sitemap-produtos.xml (rotas em api.js). Ficam fora de
   /api/ de propósito: o robots.txt bloqueia /api/, e o Google precisa ler o
   catálogo para indexar as páginas de produto. Montados uma vez e guardados
   prontos (com gzip) até a próxima sincronização ou por 10 minutos — o
   prazo é para a vitrine acompanhar os orçamentos novos.                   */

let publico = null;

function empacotar(texto) {
  const corpo = Buffer.from(texto, 'utf8');
  return {
    corpo,
    gzip: zlib.gzipSync(corpo),
    etag: `W/"${crypto.createHash('sha1').update(corpo).digest('base64url').slice(0, 16)}"`
  };
}

function arquivosPublicos() {
  if (publico && Date.now() - publico.criado < 10 * 60 * 1000) return publico;

  const cat = montarCatalogo();
  const ultima = db.prepare(`SELECT fim FROM erp_sincronizacoes WHERE situacao = 'ok'
                              ORDER BY id DESC LIMIT 1`).get();
  const base = (process.env.SITE_URL || 'https://www.atacadopolvo.com.br').replace(/\/+$/, '');

  // Sem catálogo sincronizado o script não troca nada: o site segue com o
  // de exemplo (data.js). Com catálogo, o de exemplo fica guardado em
  // CATALOGO_REFERENCIA — a calculadora de consumo ainda trabalha com ele.
  const js = cat
    ? `/* Catálogo do ERP, gerado pelo servidor (server/erp.js). Não editar. */\n` +
      `(function (c) { window.CATALOGO_REFERENCIA = window.CATALOGO; window.CATALOGO = c; })(` +
      JSON.stringify({ origem: 'erp', atualizado: ultima ? ultima.fim : null, ...cat }) + ');\n'
    : '/* Catálogo do ERP ainda não sincronizado: o site usa o de exemplo (data.js). */\n';

  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const lastmod = ultima ? `<lastmod>${ultima.fim.slice(0, 10)}</lastmod>` : '';
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    (cat ? cat.produtos : []).map(p =>
      `  <url><loc>${esc(`${base}/produto.html?id=${encodeURIComponent(p.id)}`)}</loc>${lastmod}` +
      '<changefreq>weekly</changefreq><priority>0.6</priority></url>\n').join('') +
    '</urlset>\n';

  publico = { criado: Date.now(), js: empacotar(js), xml: empacotar(xml) };
  return publico;
}

module.exports = { sincronizar, agendar, situacao, configurado, arquivosPublicos, ORIGEM_FOTOS };
