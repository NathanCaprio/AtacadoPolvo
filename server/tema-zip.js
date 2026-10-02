/* =========================================================================
   Empacota tray-tema/ num ZIP para subir na Tray (editor HTML do tema >
   Ações > Enviar tema). Uso: npm run tema-zip  →  tray-tema.zip na raiz.
   Escrito à mão (zip "deflate" simples) porque o projeto não tem
   dependências e o Compress-Archive do Windows grava "\" nos caminhos, que
   a Tray não entende. Só entram as pastas do tema; anotações nossas na
   raiz de tray-tema/ (ex.: CLAUDE.md) ficam de fora.
   ========================================================================= */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const RAIZ = path.join(__dirname, '..');
const ORIGEM = path.join(RAIZ, 'tray-tema');
const DESTINO = path.join(RAIZ, 'tray-tema.zip');
const PASTAS = ['configs', 'css', 'elements', 'img', 'js', 'layouts', 'pages'];

function arquivos(pasta) {
  return fs.readdirSync(pasta, { withFileTypes: true }).flatMap(e => {
    const p = path.join(pasta, e.name);
    return e.isDirectory() ? arquivos(p) : [p];
  });
}

/** Data/hora no formato do MS-DOS que o ZIP usa. */
function horaDos(d) {
  return {
    hora: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    data: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
  };
}

/* Sempre o tema inteiro: a Tray recusa ZIP só com alguns arquivos ("estrutura
   do arquivo ZIP é inválida"), mesmo substituindo só os de mesmo nome. */
function empacotar() {
  const lista = PASTAS.flatMap(p => arquivos(path.join(ORIGEM, p))).sort();
  const partes = [];
  const central = [];
  let posicao = 0;
  const { hora, data } = horaDos(new Date());

  for (const arq of lista) {
    const nome = Buffer.from(path.relative(ORIGEM, arq).split(path.sep).join('/'), 'utf8');
    const bruto = fs.readFileSync(arq);
    const comprimido = zlib.deflateRawSync(bruto, { level: 9 });
    const crc = zlib.crc32(bruto);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);            // versão necessária
    local.writeUInt16LE(0x0800, 6);        // nomes em UTF-8
    local.writeUInt16LE(8, 8);             // deflate
    local.writeUInt16LE(hora, 10);
    local.writeUInt16LE(data, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comprimido.length, 18);
    local.writeUInt32LE(bruto.length, 22);
    local.writeUInt16LE(nome.length, 26);
    local.writeUInt16LE(0, 28);

    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(20, 6);
    dir.writeUInt16LE(0x0800, 8);
    dir.writeUInt16LE(8, 10);
    dir.writeUInt16LE(hora, 12);
    dir.writeUInt16LE(data, 14);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(comprimido.length, 20);
    dir.writeUInt32LE(bruto.length, 24);
    dir.writeUInt16LE(nome.length, 28);
    dir.writeUInt32LE(posicao, 42);        // onde está o cabeçalho local

    partes.push(local, nome, comprimido);
    central.push(dir, nome);
    posicao += local.length + nome.length + comprimido.length;
  }

  const tamCentral = central.reduce((n, b) => n + b.length, 0);
  const fim = Buffer.alloc(22);
  fim.writeUInt32LE(0x06054b50, 0);
  fim.writeUInt16LE(lista.length, 8);
  fim.writeUInt16LE(lista.length, 10);
  fim.writeUInt32LE(tamCentral, 12);
  fim.writeUInt32LE(posicao, 16);

  fs.writeFileSync(DESTINO, Buffer.concat([...partes, ...central, fim]));
  return { arquivos: lista.length, bytes: fs.statSync(DESTINO).size };
}

if (require.main === module) {
  const r = empacotar();
  console.log(`tray-tema.zip: ${r.arquivos} arquivos, ${(r.bytes / 1024).toFixed(0)} KB`);
}

module.exports = { empacotar };
