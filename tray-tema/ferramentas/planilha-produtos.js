// Monta a planilha de importação da Tray com 469 produtos novos (500 - 31 que já existem).
// Uso: node tray-tema/ferramentas/planilha-produtos.js <raiz do repo> <mercadorias.json> <saida-dir>
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');
const { DatabaseSync } = require('node:sqlite');

const [RAIZ, MERC, SAIDA] = process.argv.slice(2);
const LIMITE_NOVOS = 469;
const RAW = 'https://raw.githubusercontent.com/NathanCaprio/AtacadoPolvo/main/assets/img/produtos/';

// nomeSite/GRUPOS/frase de server/erp.js sem abrir o banco pelo db.js (que migra).
const fonte = fs.readFileSync(path.join(RAIZ, 'server/erp.js'), 'utf8')
  + '\n;module.exports.__ = { nomeSite, frase, GRUPOS, chave: typeof chave === "function" ? chave : null };';
const mod = { exports: {} };
vm.runInThisContext(`(function (require, module, exports, __dirname, process) {${fonte}\n})`)(
  (n) => n === './db' ? { db: { prepare: () => ({ run() {}, get() {}, all: () => [] }), exec() {} } } : require(n), mod, mod.exports, path.join(RAIZ, 'server'), process);
const { nomeSite, GRUPOS, chave } = mod.exports.__;

const db = new DatabaseSync(path.join(RAIZ, 'dados/polvo.db'), { readOnly: true });
const local = new Map(db.prepare(`SELECT e.erp_id, e.fotos, s.nome AS nome_site, s.descricao, s.foto_oculta
  FROM produtos_erp e LEFT JOIN produtos_site s ON s.erp_id = e.erp_id`).all().map(r => [r.erp_id, r]));

const JA_NA_TRAY = new Set(fs.readFileSync(path.join(RAIZ, 'tray-tema/PRODUTOS.md'), 'utf8')
  .match(/^\| \d{8,13} /gm).map(s => s.replace(/\D/g, '')).concat(['7898556040334']));

const porGrupo = new Map(GRUPOS.map(g => [g.erp, g]));
const nomeCategoria = (grupo) => {
  const g = porGrupo.get(chave(grupo));
  return g ? g.nome : 'Diversos';
};

function gtinValido(c) {
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(c)) return false;
  const d = c.split('').map(Number); const v = d.pop();
  const s = d.reverse().reduce((t, n, i) => t + n * (i % 2 ? 1 : 3), 0);
  return (10 - (s % 10)) % 10 === v;
}

// Peso/medidas estimados pelo nome (o ERP não tem peso).
function pesoGramas(nome) {
  const n = nome.toUpperCase().replace(',', '.');
  let m;
  if ((m = n.match(/(\d+(?:\.\d+)?)\s*(L|LT|LTS|LITROS?)\b/))) return Math.round(+m[1] * 1080);
  if ((m = n.match(/(\d+(?:\.\d+)?)\s*ML\b/))) return Math.round(+m[1] * 1.15 + 20);
  if ((m = n.match(/(\d+(?:\.\d+)?)\s*KG\b/))) return Math.round(+m[1] * 1050);
  if ((m = n.match(/(\d+(?:\.\d+)?)\s*(G|GR)\b/))) return Math.round(+m[1] * 1.1 + 10);
  return 300;
}
function medidas(g) {
  if (g <= 500) return [10, 15, 20];
  if (g <= 2000) return [25, 15, 20];
  if (g <= 6000) return [30, 25, 25];
  return [40, 40, 30];
}

const merc = JSON.parse(fs.readFileSync(MERC, 'utf8')).data.filter(x => x.situacao === 'A');
const candidatos = [];
const fora = [];
for (const x of merc) {
  const ref = String(x.codigo);
  if (JA_NA_TRAY.has(ref)) continue;
  const l = local.get(x.id) || {};
  const fotosErp = l.fotos ? JSON.parse(l.fotos) : [];
  const temLocal = !l.foto_oculta && fs.existsSync(path.join(RAIZ, 'assets/img/produtos', x.id + '.jpg'));
  const WEBP = new Set(fs.existsSync(path.join(SAIDA, 'webp.json')) ? JSON.parse(fs.readFileSync(path.join(SAIDA, 'webp.json'), 'utf8')) : []);
  const foto = WEBP.has(ref) ? '' : fotosErp[0] || (temLocal ? RAW + x.id + '.jpg' : '');
  const estoque = Math.max(0, Math.floor(x.quantidadeAtualEstoque || 0));
  const item = {
    id: x.id, ref, nomeErp: x.descricao,
    nome: (l.nome_site || nomeSite(x.descricao).replace(/&(\p{Ll})/gu, (_, c) => '&' + c.toUpperCase())).slice(0, 200),
    descricao: l.descricao || '',
    categoria: nomeCategoria(x.gruposProdutosDescricao || ''),
    preco: Math.round(x.precoVenda * 100) / 100,
    estoque, foto, fotoErp: !!fotosErp[0],
    marca: x.marcasProdutosDescricao ? nomeSite(x.marcasProdutosDescricao) : '',
    ncm: (x.ncm || '').replace(/\D/g, ''),
    ean: gtinValido(ref) ? ref : (gtinValido(x.codigoBarras || '') ? x.codigoBarras : ''),
    valor: x.precoVenda * estoque
  };
  if (!(item.preco > 0)) { fora.push({ ...item, motivo: 'sem preço' }); continue; }
  candidatos.push(item);
}

// Prioridade: com estoque e foto > com estoque > com foto > resto; dentro, maior valor em estoque.
// Rodízio entre categorias para a loja não ficar só com Limpeza.
const nivel = (i) => (i.estoque > 0 ? 0 : 2) + (i.foto ? 0 : 1);
const escolhidos = [];
for (let n = 0; n <= 3 && escolhidos.length < LIMITE_NOVOS; n++) {
  const filas = new Map();
  for (const i of candidatos.filter(c => nivel(c) === n).sort((a, b) => b.valor - a.valor)) {
    if (!filas.has(i.categoria)) filas.set(i.categoria, []);
    filas.get(i.categoria).push(i);
  }
  // Proporcional ao tamanho de cada categoria: a próxima vaga vai para a fila
  // que tem a menor fração já escolhida.
  const total = new Map([...filas].map(([k, f]) => [k, f.length]));
  const pegos = new Map([...filas.keys()].map(k => [k, 0]));
  while (escolhidos.length < LIMITE_NOVOS && [...filas.values()].some(f => f.length)) {
    const [k] = [...filas].filter(([, f]) => f.length)
      .sort(([a], [b]) => pegos.get(a) / total.get(a) - pegos.get(b) / total.get(b))[0];
    escolhidos.push(filas.get(k).shift()); pegos.set(k, pegos.get(k) + 1);
  }
}
const sel = new Set(escolhidos);
for (const c of candidatos) if (!sel.has(c)) fora.push({ ...c, motivo: 'limite de 500' });

// Nomes repetidos confundem a vinculação por nome; acrescenta o código.
const vezes = new Map();
for (const i of escolhidos) vezes.set(i.nome, (vezes.get(i.nome) || 0) + 1);
for (const i of escolhidos) if (vezes.get(i.nome) > 1) i.nome = `${i.nome} (${i.ref})`;

const COLUNAS = [
  ['Referência (código fornecedor)', i => i.ref],
  ['Nome do produto', i => i.nome],
  ['Código EAN/GTIN/UPC', i => i.ean],
  ['Nome da categoria - nível 1', i => i.categoria],
  ['HTML da descrição completa', i => `<p>${esc(i.descricao || `${i.nome}. Compre no atacado com preço de distribuidor na Atacado Polvo.`)}</p>`],
  ['Preço de venda em reais', i => i.preco],
  ['Estoque do produto', i => i.estoque],
  ['Marca', i => i.marca],
  ['NCM do produto', i => i.ncm],
  ['Peso do produto (gramas)', i => pesoGramas(i.nome)],
  ['Altura (cm)', i => medidas(pesoGramas(i.nome))[0]],
  ['Largura (cm)', i => medidas(pesoGramas(i.nome))[1]],
  ['Comprimento (cm)', i => medidas(pesoGramas(i.nome))[2]],
  ['Endereço da imagem principal do produto', i => i.foto],
  ['Exibir na loja', () => 'Sim'],
  ['Exibir produto ativo', () => 'Sim']
];
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

const linhas = [COLUNAS.map(c => c[0]), ...escolhidos.map(i => COLUNAS.map(c => c[1](i)))];
fs.mkdirSync(SAIDA, { recursive: true });
fs.writeFileSync(path.join(SAIDA, 'importar.xlsx'), xlsx(linhas));
fs.writeFileSync(path.join(SAIDA, 'escolhidos.json'), JSON.stringify(escolhidos, null, 1));
fs.writeFileSync(path.join(SAIDA, 'fora.json'), JSON.stringify(fora, null, 1));
const cont = (a, f) => a.filter(f).length;
console.log(`escolhidos ${escolhidos.length} (com estoque ${cont(escolhidos, i => i.estoque > 0)}, com foto ${cont(escolhidos, i => i.foto)}, foto ERP ${cont(escolhidos, i => i.fotoErp)}, com EAN ${cont(escolhidos, i => i.ean)}) | fora ${fora.length}`);
console.log([...escolhidos.reduce((m, i) => m.set(i.categoria, (m.get(i.categoria) || 0) + 1), new Map())].map(([k, v]) => `${k}:${v}`).join(' | '));

// --- XLSX mínimo (uma planilha, strings inline, números como número) ---
function xlsx(rows) {
  const col = (n) => { let s = ''; n++; while (n) { s = String.fromCharCode(65 + (n - 1) % 26) + s; n = Math.floor((n - 1) / 26); } return s; };
  const xmlEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const sheet = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'
    + rows.map((r, ri) => `<row r="${ri + 1}">` + r.map((v, ci) => {
      const ref = col(ci) + (ri + 1);
      if (typeof v === 'number') return `<c r="${ref}"><v>${v}</v></c>`;
      return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;
    }).join('') + '</row>').join('') + '</sheetData></worksheet>';
  const arquivos = {
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Produtos" sheetId="1" r:id="rId1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    'xl/worksheets/sheet1.xml': sheet
  };
  const partes = [], central = []; let pos = 0;
  for (const [n, txt] of Object.entries(arquivos)) {
    const nome = Buffer.from(n), bruto = Buffer.from(txt, 'utf8'), comp = zlib.deflateRawSync(bruto), crc = zlib.crc32(bruto);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(8, 8);
    lh.writeUInt16LE(0x21, 12); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(bruto.length, 22); lh.writeUInt16LE(nome.length, 26);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(8, 10);
    ch.writeUInt16LE(0x21, 14); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(bruto.length, 24); ch.writeUInt16LE(nome.length, 28); ch.writeUInt32LE(pos, 42);
    partes.push(lh, nome, comp); central.push(ch, nome); pos += 30 + nome.length + comp.length;
  }
  const tam = central.reduce((t, b) => t + b.length, 0), n = Object.keys(arquivos).length;
  const fim = Buffer.alloc(22); fim.writeUInt32LE(0x06054b50, 0); fim.writeUInt16LE(n, 8); fim.writeUInt16LE(n, 10); fim.writeUInt32LE(tam, 12); fim.writeUInt32LE(pos, 16);
  return Buffer.concat([...partes, ...central, fim]);
}
