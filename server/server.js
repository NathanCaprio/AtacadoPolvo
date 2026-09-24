/* =========================================================================
   Servidor — serve o site estático e a API, no mesmo processo e na mesma
   origem (por isso o cookie SameSite=Lax já cobre o grosso de CSRF).

       node server/server.js            porta 3000
       PORTA=8080 node server/server.js

   Não há dependências: tudo vem dos módulos nativos do Node 22.
   ========================================================================= */

'use strict';

const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

const { tratarApi } = require('./api');
const { limparSessoes, ARQUIVO } = require('./db');
const backup = require('./backup');

const RAIZ = path.join(__dirname, '..');
const PORTA = Number(process.env.PORTA || 3000);
const HOST = process.env.HOST || '127.0.0.1';

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json'
};

// Nada aqui é servido, mesmo que alguém acerte o caminho.
const BLOQUEADOS = [/^\/server\//, /^\/dados\//, /^\/\./, /\/\./];

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'"
].join('; ');

function cabecalhosBase() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': CSP
  };
}

/* ---- Estáticos --------------------------------------------------------- */

// HTML, CSS e JS mudam a cada edição: revalidam sempre (com ETag, então o
// custo é um 304 vazio). Imagem e fonte têm nome estável e podem cachear.
const REVALIDA = new Set(['.html', '.css', '.js', '.json']);

async function servirArquivo(req, res, absoluto, ext) {
  const info = await fsp.stat(absoluto);
  const etag = `W/"${info.mtimeMs.toString(36)}-${info.size.toString(36)}"`;

  const cabecalhos = {
    ...cabecalhosBase(),
    'Content-Type': TIPOS[ext] || 'application/octet-stream',
    'Cache-Control': REVALIDA.has(ext) ? 'no-cache' : 'public, max-age=86400',
    'ETag': etag
  };

  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, cabecalhos);
    return res.end();
  }

  res.writeHead(200, { ...cabecalhos, 'Content-Length': info.size });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(absoluto).pipe(res);
}

async function tratarEstatico(req, res, caminho) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, cabecalhosBase()); res.end('Método não permitido');
    return;
  }
  if (BLOQUEADOS.some(re => re.test(caminho))) {
    res.writeHead(404, cabecalhosBase()); res.end('Não encontrado');
    return;
  }

  let rel = caminho === '/' ? '/index.html' : caminho;
  let absoluto = path.join(RAIZ, decodeURIComponent(rel));

  // Barreira contra path traversal: o alvo tem que ficar dentro da raiz.
  if (!absoluto.startsWith(RAIZ + path.sep) && absoluto !== RAIZ) {
    res.writeHead(403, cabecalhosBase()); res.end('Proibido');
    return;
  }

  let ext = path.extname(absoluto).toLowerCase();
  if (!ext) {                                  // /entrar -> entrar.html
    absoluto += '.html';
    ext = '.html';
  }

  try {
    await servirArquivo(req, res, absoluto, ext);
  } catch {
    // Página 404 de verdade. Devolver a home aqui seria pior: o visitante
    // acharia que chegou onde queria, e o buscador veria conteúdo duplicado.
    try {
      const html = await fsp.readFile(path.join(RAIZ, '404.html'));
      res.writeHead(404, {
        ...cabecalhosBase(),
        'Content-Type': TIPOS['.html'],
        'Cache-Control': 'no-cache'
      });
      res.end(html);
    } catch {
      res.writeHead(404, cabecalhosBase()); res.end('Não encontrado');
    }
  }
}

/* ---- Servidor ---------------------------------------------------------- */

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const caminho = url.pathname;

  // IP direto do socket, de propósito: confiar em X-Forwarded-For sem um proxy
  // na frente deixaria qualquer um furar o rate limit trocando o cabeçalho.
  const ip = req.socket.remoteAddress || 'desconhecido';

  try {
    if (await tratarApi(req, res, caminho, ip)) return;
    await tratarEstatico(req, res, caminho);
  } catch (e) {
    console.error('[servidor]', caminho, e);
    if (!res.headersSent) { res.writeHead(500, cabecalhosBase()); res.end('Erro interno'); }
  }
});

limparSessoes();
setInterval(limparSessoes, 60 * 60 * 1000).unref();

servidor.listen(PORTA, HOST, () => {
  console.log(`\n  Atacado Polvo`);
  console.log(`  site   http://${HOST}:${PORTA}`);
  console.log(`  admin  http://${HOST}:${PORTA}/admin`);
  console.log(`  banco  ${ARQUIVO}\n`);

  // Depois do listen, de propósito: se o backup travar, o site já está no ar.
  backup.agendar();
});

for (const sinal of ['SIGINT', 'SIGTERM']) {
  process.on(sinal, () => servidor.close(() => process.exit(0)));
}
