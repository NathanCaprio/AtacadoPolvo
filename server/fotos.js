/* =========================================================================
   Busca automática de fotos para os produtos que não têm foto no ERP.

     node server/fotos.js                    busca para todos os que faltam
     node server/fotos.js --limite 50        só os 50 primeiros
     node server/fotos.js --grupo LIMPEZA    só um grupo do ERP
     node server/fotos.js --so 7891,7892     só estes códigos (refaz a foto)
     node server/fotos.js --de-novo          tenta de novo quem não achou antes
     node server/fotos.js --folha            folha de contato para revisão visual
     node server/fotos.js --revisar --recusar 3,7 --aprovar 12

   Como funciona: procura no Bing Imagens pelo código de barras (quando o
   código do ERP é um EAN válido) e pelo nome do produto; dá nota a cada
   resultado comparando o título com o nome do ERP (marca, volume, cor...)
   e só põe no ar quando a nota passa do mínimo e nada essencial falta
   (número, marca, cor). Faltou uma palavra só: a foto fica em
   dados/fotos-duvida/ até a revisão visual (--folha / --revisar). Sem
   resultado bom, o produto segue com a ilustração — foto errada é pior
   que nenhuma.

   A foto sai na miniatura do próprio Bing (600 px, JPEG), salva em
   assets/img/produtos/<uuid do ERP>.jpg; o site pega na hora (erp.js).
   Foto errada: esconder pelo painel (aba Produtos no site), ou apagar o
   arquivo e rodar de novo com --so.

   Não fala com o ERP: só lê o espelho produtos_erp do nosso banco. O que
   foi feito fica em dados/fotos-busca.jsonl (de onde veio cada foto).
   ========================================================================= */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { db, ARQUIVO } = require('./db');
const { PASTA_FOTOS } = require('./erp');

const REGISTRO = path.join(path.dirname(ARQUIVO), 'fotos-busca.jsonl');
const PASTA_DUVIDA = path.join(path.dirname(ARQUIVO), 'fotos-duvida');   // esperando revisão
const NOTA_MINIMA = 0.6;
const PAUSA = 1200;              // ms entre buscas, para não martelar o Bing
const LADO = 600;                // px da miniatura baixada
const NAVEGADOR = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
                  '(KHTML, like Gecko) Chrome/128.0 Safari/537.36';

const esperar = ms => new Promise(ok => setTimeout(ok, ms));

/* ---- Texto ---------------------------------------------------------------- */

const UNIDADES = [
  [/^(ML)$/, 'ML'], [/^(L|LT|LTS|LITRO|LITROS)$/, 'L'], [/^(KG|KILO|KILOS)$/, 'KG'],
  [/^(G|GR|GRS|GRAMAS)$/, 'G'], [/^(M|MT|MTS|METROS)$/, 'M'], [/^(CM)$/, 'CM'], [/^(MM)$/, 'MM'],
  [/^(UN|UND|UNID|UNIDADES|UNIDS)$/, 'UN'], [/^(F|FL|FLS|FOLHAS)$/, 'FL']
];
const PALAVRAS_VAZIAS = new Set(['C', 'COM', 'DE', 'DA', 'DO', 'DAS', 'DOS', 'P', 'PARA', 'E', 'X',
  'EM', 'NA', 'NO', 'A', 'O', 'CX', 'PCT', 'UN', 'MOD', 'REF', 'NOVO', 'NOVA']);
// Abreviações do cadastro do ERP: a loja quase nunca escreve assim.
const ABREVIACOES = new Set(['LIQ', 'INT', 'EXT', 'CONC', 'PLAST', 'DESINF', 'DET', 'AMAC', 'PERF',
  'MULT', 'ROL', 'PCTE', 'EMB', 'TRANSP', 'DESC', 'AUT', 'ECON', 'AZ', 'VERM', 'AM', 'BCO', 'PTO',
  'SQ', 'FD', 'FR', 'GL', 'CJ', 'KIT', 'REF', 'TAM', 'UND', 'PAR', 'PRE', 'SUP', 'ESP']);
// Nome genérico de produto, que a loja descreve de mil jeitos. Toda outra
// palavra de 3+ letras é obrigatória — inclusive marca que aparece em metade
// do catálogo (SAIF, GOTA LIMPA, NOBRE) e cor. Faltar algo aqui só custa
// foto, nunca põe foto errada no ar.
const GENERICAS = new Set(['SACO', 'SACOS', 'PAPEL', 'LIXO', 'PREMIUM', 'AROMATIZADOR', 'MOP', 'SABONETE',
  'SABAO', 'LIXEIRA', 'DESINFETANTE', 'TOALHA', 'LUVA', 'PLASTICA', 'PLASTICO', 'LIQUIDO', 'LIQUIDA',
  'PROFISSIONAL', 'MULTIUSO', 'TRADICIONAL', 'UNITARIO', 'UNITARIA', 'AVULSO', 'AVULSA', 'PACOTE',
  'CAIXA', 'FRASCO', 'GALAO', 'REFIL', 'ROLO', 'TAMPA', 'ALCA', 'CABO']);
const PACOTE = /\b(KIT|COMBO|LEVE|PAGUE|PROMO|ATACADO)\b/;

const semAcento = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

/** "Sabão 1,6 Kg" -> ["SABAO", "1.6KG"]. Número e unidade viram uma palavra só. */
function palavras(texto) {
  const t = semAcento(texto)
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/(\d)\s*\*\s*(\d)/g, '$1X$2')
    .replace(/(\d+(?:\.\d+)?)\s*([A-Z]+)\b/g, (m, n, u) => {
      const canon = UNIDADES.find(([re]) => re.test(u));
      return canon ? ` ${Number(n)}${canon[1]} ` : m;
    });
  return t.split(/[^A-Z0-9.]+/).map(p => p.replace(/^\.+|\.+$/g, '')).filter(Boolean);
}

const unidadeDe = p => (/^\d+(?:\.\d+)?([A-Z]+)$/.exec(p) || [])[1] || null;

/* Nota de 0 a ~1,5: quanto do nome do ERP aparece no título do resultado.
   Número com unidade pesa mais (volume errado é produto errado). Volta
   também o que faltou e é obrigatório: medida (750ML, 5L, 100UN) ou palavra
   de 3+ letras que não seja abreviação nem genérica (marca, cor, linha).
   Faltou algo obrigatório, só vale se o código de barras bater. */
function nota(nomeErp, ean, r) {
  const doNome = [...new Set(palavras(nomeErp))].filter(p => !PALAVRAS_VAZIAS.has(p));
  const textoResultado = `${r.titulo} ${decodeURIComponent(r.pagina || '').replace(/[-_/]/g, ' ')}`;
  const doTitulo = new Set(palavras(textoResultado));
  const titulo = [...doTitulo];

  let total = 0, achou = 0, penalidade = 0;
  const falta = [];
  for (const p of doNome) {
    const peso = /\d/.test(p) ? 2 : p.length <= 3 ? 0.5 : 1;
    total += peso;
    // Abreviação do ERP casa com a palavra inteira (LIQ -> LIQUIDA), mas não
    // o contrário: FORTPINE não pode casar com FORT.
    const bate = doTitulo.has(p) ||
      (!/\d/.test(p) && p.length >= 3 && titulo.some(t => t.length > p.length && t.startsWith(p)));
    if (bate) achou += peso;
    else {
      if (unidadeDe(p) && titulo.some(t => unidadeDe(t) === unidadeDe(p))) penalidade += 0.3;
      if (unidadeDe(p) || (!/\d/.test(p) && p.length >= 3 && !ABREVIACOES.has(p) &&
                           !GENERICAS.has(p))) falta.push(p);
    }
  }
  if (PACOTE.test(semAcento(textoResultado)) && !PACOTE.test(semAcento(nomeErp))) penalidade += 0.25;

  let n = total ? achou / total : 0;
  const eanBate = !!ean && `${textoResultado} ${r.imagem}`.includes(ean);
  if (eanBate) n += 0.5;
  if (r.quadrada) n += 0.05;
  n = Math.round((n - penalidade) * 100) / 100;
  const serve = n >= NOTA_MINIMA && (eanBate || !falta.length);
  // Faltou uma palavra só, e não é número: pode ser nome de linha que a loja
  // não escreve ("ECONOMY") ou pode ser a marca. Vai para revisão visual.
  const duvida = !serve && n >= 0.75 && falta.length === 1 && !/\d/.test(falta[0]);
  return { nota: n, falta, serve, duvida, nivel: serve ? 2 : duvida ? 1 : 0 };
}

/** EAN-8/12/13/14 com dígito verificador certo. */
function eanValido(codigo) {
  const c = String(codigo || '');
  if (!/^(\d{8}|\d{12,14})$/.test(c)) return false;
  const d = [...c].map(Number);
  const verificador = d.pop();
  const soma = d.reverse().reduce((s, n, i) => s + n * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (soma % 10)) % 10 === verificador;
}

/* ---- Bing ----------------------------------------------------------------- */

const desfazHtml = s => s.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>');

async function buscar(consulta) {
  const url = 'https://www.bing.com/images/search?form=HDRSC2&first=1&adlt=strict&cc=BR&setlang=pt-br&q=' +
    encodeURIComponent(consulta);
  const res = await fetch(url, {
    headers: { 'User-Agent': NAVEGADOR, 'Accept-Language': 'pt-BR,pt;q=0.9' },
    signal: AbortSignal.timeout(20_000)
  });
  if (!res.ok) throw new Error(`Bing respondeu ${res.status}`);
  const html = await res.text();
  const resultados = [];
  for (const m of html.matchAll(/ m="(\{[^"]+\})"/g)) {
    let j;
    try { j = JSON.parse(desfazHtml(m[1])); } catch { continue; }
    if (!j.turl || !/^https:\/\/ts?e?\d*\.mm\.bing\.net\/th\?/.test(j.turl)) continue;
    resultados.push({
      titulo: desfazHtml(String(j.t || '')).replace(/<[^>]*>/g, ''),
      pagina: String(j.purl || ''),
      imagem: String(j.murl || ''),
      miniatura: j.turl,
      // O id da miniatura termina em HaHa quando a imagem é quadrada.
      quadrada: /HaHa(&|$)/.test(j.turl)
    });
    if (resultados.length >= 15) break;
  }
  return resultados;
}

/** Largura x altura de um JPEG/PNG/WebP, ou null. */
function dimensoes(b) {
  if (b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i + 9 < b.length;) {
      if (b[i] !== 0xff) return null;
      const marca = b[i + 1], tam = b.readUInt16BE(i + 2);
      if (marca >= 0xc0 && marca <= 0xc3) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
      i += 2 + tam;
    }
    return null;
  }
  if (b.slice(1, 4).toString() === 'PNG') return [b.readUInt32BE(16), b.readUInt32BE(20)];
  return null;
}

async function baixar(miniatura) {
  const res = await fetch(`${miniatura}&w=${LADO}&h=${LADO}`, {
    headers: { 'User-Agent': NAVEGADOR }, signal: AbortSignal.timeout(20_000)
  });
  if (!res.ok) throw new Error(`miniatura respondeu ${res.status}`);
  const b = Buffer.from(await res.arrayBuffer());
  const d = dimensoes(b);
  if (!d || b[0] !== 0xff) throw new Error('a miniatura não é um JPEG');
  if (Math.min(...d) < 150) throw new Error(`miniatura pequena demais (${d.join('x')})`);
  return b;
}

/* ---- Produtos --------------------------------------------------------------- */

function argumentos(lista) {
  const a = { limite: Infinity, grupo: '', so: null, deNovo: false, folha: false, recusar: [], aprovar: [] };
  const numeros = v => String(v || '').split(',').map(Number).filter(Number.isInteger);
  for (let i = 0; i < lista.length; i++) {
    if (lista[i] === '--limite') a.limite = Number(lista[++i]) || Infinity;
    else if (lista[i] === '--grupo') a.grupo = semAcento(lista[++i]);
    else if (lista[i] === '--so') a.so = new Set(String(lista[++i] || '').split(',').map(s => s.trim()));
    else if (lista[i] === '--de-novo') a.deNovo = true;
    else if (lista[i] === '--folha') a.folha = true;
    else if (lista[i] === '--revisar') a.revisar = true;
    else if (lista[i] === '--recusar') a.recusar = numeros(lista[++i]);
    else if (lista[i] === '--aprovar') a.aprovar = numeros(lista[++i]);
    else throw new Error(`opção desconhecida: ${lista[i]}`);
  }
  return a;
}

/** Última situação de cada produto no registro: Map erpId -> linha. */
function registro() {
  const ultima = new Map();
  try {
    for (const linha of fs.readFileSync(REGISTRO, 'utf8').split('\n')) {
      if (!linha) continue;
      const r = JSON.parse(linha);
      ultima.set(r.erpId, { ...ultima.get(r.erpId), ...r });
    }
  } catch { /* primeira rodada */ }
  return ultima;
}

const anotar = linha => fs.appendFileSync(REGISTRO, JSON.stringify({ quando: new Date().toISOString(), ...linha }) + '\n');

function produtosSemFoto(a) {
  const existentes = new Set(fs.existsSync(PASTA_FOTOS)
    ? fs.readdirSync(PASTA_FOTOS).map(n => n.replace(/\.(jpg|png|webp)$/, '')) : []);
  const reg = a.deNovo || a.so ? new Map() : registro();
  return db.prepare(`SELECT erp_id, codigo, nome, grupo FROM produtos_erp WHERE fotos = '[]' ORDER BY grupo, nome`)
    .all()
    .filter(p => a.so ? a.so.has(p.codigo) || a.so.has(p.erp_id)
                      : !existentes.has(p.erp_id) && !reg.has(p.erp_id))
    .filter(p => !a.grupo || semAcento(p.grupo) === a.grupo)
    .slice(0, a.limite);
}

/* "DESINF. 5L ACTUALY LAVANDA C/ 2UN" -> "DESINF 5L ACTUALY LAVANDA 2UN" */
const consultaDoNome = nome => semAcento(nome).replace(/\bC\//g, ' ').replace(/[^A-Z0-9,\s]/g, ' ')
  .replace(/\s+/g, ' ').trim();

async function fotoPara(p) {
  const ean = eanValido(p.codigo) ? p.codigo : null;
  let melhor = null;
  for (const consulta of [ean, consultaDoNome(p.nome)].filter(Boolean)) {
    const resultados = await buscar(consulta);
    await esperar(PAUSA);
    for (const r of resultados) {
      const n = nota(p.nome, ean, r);
      // Quem serve ganha de quem é dúvida, que ganha do resto; depois, a nota.
      if (!melhor || n.nivel > melhor.nivel || (n.nivel === melhor.nivel && n.nota > melhor.nota)) {
        melhor = { ...r, ...n, consulta };
      }
    }
    if (melhor && melhor.serve && melhor.nota >= NOTA_MINIMA + 0.2) break;   // achou bem pelo EAN: nem busca o nome
  }
  return melhor;
}

async function buscarTodos(a) {
  const lista = produtosSemFoto(a);
  fs.mkdirSync(PASTA_FOTOS, { recursive: true });
  fs.mkdirSync(PASTA_DUVIDA, { recursive: true });
  console.log(`${lista.length} produto(s) para buscar foto.`);

  const conta = { ok: 0, duvida: 0, sem: 0, erro: 0 };
  for (const [i, p] of lista.entries()) {
    const linha = { erpId: p.erp_id, codigo: p.codigo, nome: p.nome, revisada: false };
    try {
      const m = await fotoPara(p);
      if (m && (m.serve || m.duvida)) {
        const pasta = m.serve ? PASTA_FOTOS : PASTA_DUVIDA;
        fs.writeFileSync(path.join(pasta, `${p.erp_id}.jpg`), await baixar(m.miniatura));
        Object.assign(linha, { situacao: m.serve ? 'ok' : 'duvida', nota: m.nota, falta: m.falta,
                               titulo: m.titulo, pagina: m.pagina, imagem: m.imagem, consulta: m.consulta });
      } else {
        Object.assign(linha, { situacao: 'sem', nota: m ? m.nota : null, titulo: m ? m.titulo : null,
                               falta: m ? m.falta : [] });
      }
    } catch (e) {
      Object.assign(linha, { situacao: 'erro', mensagem: e.message });
    }
    conta[linha.situacao]++;
    // Erro não vai para o registro: a próxima rodada tenta de novo.
    if (linha.situacao !== 'erro') anotar(linha);
    console.log(`[${i + 1}/${lista.length}] ${linha.situacao.padEnd(6)} ${String(linha.nota ?? '').padEnd(5)} ` +
                `${p.nome}${linha.titulo ? '  ->  ' + linha.titulo : ''}` +
                `${linha.falta && linha.falta.length ? '  [falta ' + linha.falta.join(' ') + ']' : ''}` +
                `${linha.mensagem ? '  (' + linha.mensagem + ')' : ''}`);
    // Muitos erros sem nenhum acerto = o Bing cortou; melhor parar e tentar depois.
    if (conta.erro >= 10 && conta.erro === i + 1) throw new Error('10 erros seguidos; parando.');
  }
  console.log(`\nNo ar: ${conta.ok} · em dúvida (revisar): ${conta.duvida} · sem resultado bom: ${conta.sem}` +
              ` · erros: ${conta.erro}`);
}

/* ---- Revisão visual ------------------------------------------------------------
   --folha monta dados/fotos-duvida/folha.html com até 40 fotos ainda não
   revisadas (as que já estão no ar e as em dúvida), numeradas. Depois de
   olhar: --revisar --recusar 3,7 --aprovar 12 tira do ar as recusadas,
   põe no ar as aprovadas e marca a folha inteira como revisada (dúvida não
   aprovada é descartada).                                                  */

const POR_FOLHA = 40;
const FOLHA = path.join(PASTA_DUVIDA, 'folha.json');

function montarFolha() {
  const pendentes = [...registro().values()]
    .filter(r => (r.situacao === 'ok' || r.situacao === 'duvida') && !r.revisada)
    .filter(r => fs.existsSync(path.join(r.situacao === 'ok' ? PASTA_FOTOS : PASTA_DUVIDA, `${r.erpId}.jpg`)))
    .slice(0, POR_FOLHA);
  if (!pendentes.length) return console.log('Nada para revisar.');

  const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const celulas = pendentes.map((r, i) => {
    const src = r.situacao === 'ok'
      ? path.relative(PASTA_DUVIDA, path.join(PASTA_FOTOS, `${r.erpId}.jpg`)).replace(/\\/g, '/')
      : `${r.erpId}.jpg`;
    return `<figure class="${r.situacao}"><b>${i + 1}</b><img src="${esc(src)}" alt="">` +
           `<figcaption>${esc(r.nome)}</figcaption></figure>`;
  }).join('\n');
  fs.writeFileSync(path.join(PASTA_DUVIDA, 'folha.html'), `<!doctype html><meta charset="utf-8">
<title>Revisão de fotos</title>
<style>
body{margin:8px;font:12px/1.2 system-ui,sans-serif;background:#eee}
main{display:grid;grid-template-columns:repeat(8,1fr);gap:6px}
figure{margin:0;background:#fff;padding:4px;border:3px solid #fff;position:relative}
figure.duvida{border-color:#f0a020}
b{position:absolute;top:2px;left:4px;font-size:15px;background:#000;color:#fff;padding:0 4px}
img{width:100%;aspect-ratio:1;object-fit:contain;display:block}
figcaption{height:3.6em;overflow:hidden;margin-top:3px}
</style>
<main>
${celulas}
</main>`);
  fs.writeFileSync(FOLHA, JSON.stringify(pendentes.map(r => ({ erpId: r.erpId, situacao: r.situacao }))));
  const duvidas = pendentes.filter(r => r.situacao === 'duvida').length;
  console.log(`Folha com ${pendentes.length} foto(s) (${duvidas} em dúvida, borda laranja): ` +
              path.join(PASTA_DUVIDA, 'folha.html'));
}

function revisarFolha(a) {
  const folha = JSON.parse(fs.readFileSync(FOLHA, 'utf8'));
  const recusar = new Set(a.recusar), aprovar = new Set(a.aprovar);
  const conta = { tiradas: 0, postas: 0, descartadas: 0 };
  folha.forEach((f, i) => {
    const n = i + 1;
    const noAr = path.join(PASTA_FOTOS, `${f.erpId}.jpg`);
    const naDuvida = path.join(PASTA_DUVIDA, `${f.erpId}.jpg`);
    if (f.situacao === 'ok' && recusar.has(n)) {
      fs.rmSync(noAr, { force: true });
      anotar({ erpId: f.erpId, situacao: 'recusada', revisada: true });
      conta.tiradas++;
    } else if (f.situacao === 'duvida' && aprovar.has(n)) {
      fs.renameSync(naDuvida, noAr);
      anotar({ erpId: f.erpId, situacao: 'ok', revisada: true });
      conta.postas++;
    } else if (f.situacao === 'duvida') {
      fs.rmSync(naDuvida, { force: true });
      anotar({ erpId: f.erpId, situacao: 'recusada', revisada: true });
      conta.descartadas++;
    } else {
      anotar({ erpId: f.erpId, revisada: true });
    }
  });
  fs.rmSync(FOLHA);
  console.log(`Tiradas do ar: ${conta.tiradas} · dúvidas aprovadas: ${conta.postas} · ` +
              `dúvidas descartadas: ${conta.descartadas}`);
}

function principal() {
  const a = argumentos(process.argv.slice(2));
  if (a.folha) return montarFolha();
  if (a.revisar) return revisarFolha(a);
  return buscarTodos(a);
}

module.exports = { palavras, nota, eanValido };

if (require.main === module) {
  Promise.resolve().then(principal).catch(e => { console.error(e.message); process.exit(1); });
}
