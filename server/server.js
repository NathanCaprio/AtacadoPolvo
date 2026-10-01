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
const { limparSessoes, limparAuditoria, ARQUIVO } = require('./db');
const backup = require('./backup');
const erp = require('./erp');

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

/* Lista do que PODE ser servido, não do que é proibido. A lista de bloqueio
   antiga era conferida antes do decodeURIComponent e de forma sensível a
   maiúsculas — num disco do Windows, /Dados/polvo.db e /%64ados/polvo.db
   entregavam o banco inteiro (hash de senha, cadastro, leads), e o mesmo
   valia para backups/, server/ e os .md. Agora só passa:
     - arquivo na raiz com extensão de página (index.html, robots.txt...);
     - qualquer coisa dentro de assets/ com extensão conhecida.
   Pasta nova com conteúdo público precisa entrar em PASTAS_PUBLICAS.      */
const PASTAS_PUBLICAS = new Set(['assets']);
const EXT_RAIZ = new Set(['.html', '.xml', '.txt', '.ico', '.webmanifest']);

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  // Fotos dos produtos: vêm do ERP e ficam no S3 dele (server/erp.js).
  `img-src 'self' data: ${erp.ORIGEM_FOTOS}`,
  "connect-src 'self'",
  "form-action 'self'",
  // Os mapas das duas lojas em contato.html. Sem isto o iframe é bloqueado
  // e o mapa fica em branco — só quando servido pelo servidor, o que torna
  // o defeito invisível para quem testa abrindo o HTML direto do disco.
  // É só o embed do Maps: nenhum outro domínio pode ser embutido.
  "frame-src https://www.google.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  // Sem <object>/<embed>: o site não usa, e plugin é porta clássica de XSS.
  "object-src 'none'"
].join('; ');

const PRODUCAO = process.env.NODE_ENV === 'production';

function cabecalhosBase() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': CSP,
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    // Só em produção: HSTS num http://localhost faria o navegador insistir
    // em https para 127.0.0.1 por um ano.
    ...(PRODUCAO ? { 'Strict-Transport-Security': 'max-age=31536000' } : {})
  };
}

/** Caminho relativo seguro dentro da raiz, ou null se não for público. */
function caminhoPublico(caminho) {
  let rel;
  try { rel = decodeURIComponent(caminho); } catch { return null; }
  // \ vira separador no Windows; : abre stream alternativo (index.html::$DATA);
  // \0 corta o nome em algumas APIs.
  if (/[\\:\0]/.test(rel)) return null;

  rel = path.posix.normalize(rel === '/' ? '/index.html' : rel).replace(/^\/+/, '');
  const partes = rel.split('/');
  // Nada que comece com ponto (.env, .git), nem ".." que tenha sobrado, nem
  // nome terminado em ponto ou espaço (o Windows ignora: "assets." = "assets").
  if (partes.some(p => !p || p.startsWith('.') || /[. ]$/.test(p))) return null;

  let ext = path.extname(rel).toLowerCase();
  if (!ext) { rel += '.html'; ext = '.html'; }   // /entrar -> entrar.html

  if (partes.length === 1) return EXT_RAIZ.has(ext) ? { rel, ext } : null;
  // Comparação exata: no Windows /ASSETS/ chegaria ao mesmo lugar, mas aqui
  // não passa — e nem precisa, nenhum link do site usa maiúscula.
  return PASTAS_PUBLICAS.has(partes[0]) && TIPOS[ext] ? { rel, ext } : null;
}

/* ---- Estáticos --------------------------------------------------------- */

// HTML, CSS e JS mudam a cada edição: revalidam sempre (com ETag, então o
// custo é um 304 vazio). Imagem e fonte têm nome estável e podem cachear.
const REVALIDA = new Set(['.html', '.css', '.js', '.json']);

async function servirArquivo(req, res, absoluto, ext) {
  const info = await fsp.stat(absoluto);
  // Pasta com ponto no nome passaria pelo stat; o createReadStream daria
  // EISDIR depois do 200 e derrubaria o processo.
  if (!info.isFile()) throw new Error('não é arquivo');
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
  // Erro de leitura no meio do envio (arquivo apagado, disco) não pode virar
  // exceção sem dono: isso derruba o servidor inteiro.
  fs.createReadStream(absoluto).on('error', () => res.destroy()).pipe(res);
}

async function tratarEstatico(req, res, caminho) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, cabecalhosBase()); res.end('Método não permitido');
    return;
  }
  const alvo = caminhoPublico(caminho);
  const absoluto = alvo && path.join(RAIZ, alvo.rel);

  try {
    // Segunda barreira contra path traversal: o alvo tem que ficar na raiz.
    if (!alvo || !absoluto.startsWith(RAIZ + path.sep)) throw new Error('fora');
    await servirArquivo(req, res, absoluto, alvo.ext);
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

/* IP direto do socket por padrão: confiar em X-Forwarded-For sem um proxy na
   frente deixaria qualquer um furar o rate limit trocando o cabeçalho. Atrás
   de nginx/Caddy, PROXY_CONFIAVEL=1 lê o último salto do X-Forwarded-For (o
   que o próprio proxy acrescentou) — sem isso todo visitante teria o IP do
   proxy e o rate limit viraria um limite global. */
const PROXY_CONFIAVEL = process.env.PROXY_CONFIAVEL === '1';

function ipDe(req) {
  if (PROXY_CONFIAVEL) {
    const saltos = String(req.headers['x-forwarded-for'] || '').split(',')
      .map(s => s.trim()).filter(Boolean);
    if (saltos.length) return saltos[saltos.length - 1].slice(0, 64);
  }
  return req.socket.remoteAddress || 'desconhecido';
}

const servidor = http.createServer(async (req, res) => {
  let caminho = '/';
  try {
    // Base fixa, nunca o Host do pedido: "Host: [" fazia o new URL lançar
    // fora do try e um único pedido derrubava o processo.
    caminho = new URL(req.url, 'http://localhost').pathname;
    const ip = ipDe(req);
    if (await tratarApi(req, res, caminho, ip)) return;
    await tratarEstatico(req, res, caminho);
  } catch (e) {
    console.error('[servidor]', caminho, e);
    if (!res.headersSent) { res.writeHead(500, cabecalhosBase()); res.end('Erro interno'); }
  }
});

/* Os padrões do Node (60 s para os cabeçalhos, 5 min para o pedido inteiro)
   deixam um atacante segurar centenas de conexões abertas mandando um byte
   de cada vez. O maior corpo aceito aqui tem 64 KB: 30 s sobra. */
servidor.headersTimeout = 15 * 1000;
servidor.requestTimeout = 30 * 1000;

limparSessoes();
limparAuditoria();
setInterval(() => { limparSessoes(); limparAuditoria(); }, 60 * 60 * 1000).unref();

servidor.listen(PORTA, HOST, () => {
  console.log(`\n  Atacado Polvo`);
  console.log(`  site   http://${HOST}:${PORTA}`);
  console.log(`  admin  http://${HOST}:${PORTA}/admin`);
  console.log(`  banco  ${ARQUIVO}\n`);
  if (PRODUCAO && !process.env.SITE_URL) {
    console.warn('  [aviso] defina SITE_URL: sem ela o link de recuperação de senha usa o Host do pedido.\n');
  }

  // Depois do listen, de propósito: se o backup travar, o site já está no ar.
  backup.agendar();
  // Mesmo raciocínio: o ERP fora do ar não pode segurar o boot do site.
  erp.agendar();
});

for (const sinal of ['SIGINT', 'SIGTERM']) {
  process.on(sinal, () => servidor.close(() => process.exit(0)));
}
