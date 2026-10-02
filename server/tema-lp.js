/* =========================================================================
   Monta as landing pages da loja Tray. Uso: npm run lp
     tray-tema/lp/<nome>.json   conteúdo (dados), versionado
     tray-tema/lp/dist/<nome>.html  documento completo para colar no criador
                                de LPs da Tray ("Página em branco"), fora do git

   Por que existe: a LP "página em branco" da Tray é servida sozinha — sem o
   layout, sem o CSS do tema e com o <head> vazio — e em windows-1252, que
   troca "—" e afins por "?". Então cada LP vira um documento inteiro, com
   CSS embutido e todo caractere fora do ASCII como entidade (&#237;), o que
   torna a codificação indiferente.

   Conteúdo: tray-tema/lp/<nome>.json
     { titulo, descricao,                      <title> e meta description
       hero: { eyebrow, titulo, destaque, texto, whatsapp, selos[] },
       secoes: [
         { tipo: "cards", eyebrow, titulo, sub, tinta?, alerta?,
           itens: [{ titulo, texto, busca? }] },   busca = termo da busca da loja
         { tipo: "passos", eyebrow, titulo, sub?, tinta?, itens: [{ titulo, texto }] },
         { tipo: "planos", eyebrow, titulo, sub?, nota?,
           itens: [{ nome, prazo, desconto, texto, lista[], destaque? }] },
         { tipo: "faq", eyebrow, titulo, itens: [{ pergunta, resposta }] } ],
       cta: { titulo, texto } }
   "whatsapp" do hero é a mensagem que já vem escrita no WhatsApp (vale
   também para o botão da faixa final).
   ========================================================================= */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const RAIZ = path.join(__dirname, '..');
const PASTA = path.join(RAIZ, 'tray-tema', 'lp');
const SAIDA = path.join(PASTA, 'dist');
const BUSCA = '/loja/busca.php?loja=1544153&amp;palavra_busca=';

/** Contatos do site (fonte única: assets/js/config.js, que define window.SITE). */
function site() {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(RAIZ, 'assets', 'js', 'config.js'), 'utf8'), ctx);
  return ctx.window.SITE;
}

/** Tudo fora do ASCII vira entidade numérica (a Tray serve em windows-1252). */
const ascii = s => s.replace(/[^\x00-\x7f]/gu, c => `&#${c.codePointAt(0)};`);

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

const SETA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

function cabeca(s) {
  return `<div class="polvo-secao__cabeca">
      ${s.eyebrow ? `<span class="polvo-eyebrow">${esc(s.eyebrow)}</span>` : ''}
      <h2 class="polvo-secao__titulo">${esc(s.titulo)}</h2>
      ${s.sub ? `<p class="polvo-secao__sub">${esc(s.sub)}</p>` : ''}
    </div>`;
}

const SECOES = {
  cards: s => `<div class="polvo-segmentos">${s.itens.map(i => `
      <article class="polvo-card polvo-card--simples${s.alerta ? ' polvo-card--alerta' : ''}">
        <h3 class="polvo-card__titulo">${esc(i.titulo)}</h3>
        <p class="polvo-card__texto">${esc(i.texto)}</p>${i.busca ? `
        <a class="polvo-card__link" href="${BUSCA}${encodeURIComponent(i.busca).replace(/%20/g, '+')}">Ver produtos ${SETA}</a>` : ''}
      </article>`).join('')}
    </div>`,
  passos: s => `<ol class="polvo-passos">${s.itens.map((i, n) => `
      <li class="polvo-passo">
        <span class="polvo-passo__num" aria-hidden="true">${n + 1}</span>
        <h3 class="polvo-passo__titulo">${esc(i.titulo)}</h3>
        <p class="polvo-passo__texto">${esc(i.texto)}</p>
      </li>`).join('')}
    </ol>`,
  planos: s => `<div class="polvo-planos">${s.itens.map(i => `
      <article class="polvo-plano${i.destaque ? ' polvo-plano--destaque' : ''}">
        <h3 class="polvo-plano__nome">${esc(i.nome)}</h3>
        <p class="polvo-plano__prazo">${esc(i.prazo)}</p>
        <p class="polvo-plano__desconto">${esc(i.desconto)}</p>
        <p class="polvo-plano__texto">${esc(i.texto)}</p>
        <ul>${i.lista.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      </article>`).join('')}
    </div>${s.nota ? `
    <p class="polvo-planos__nota">${esc(s.nota)}</p>` : ''}`,
  faq: s => `<div class="polvo-faq">${s.itens.map(i => `
      <details>
        <summary>${esc(i.pergunta)}</summary>
        <p>${esc(i.resposta)}</p>
      </details>`).join('')}
    </div>`
};

/** HTML das seções a partir do JSON da LP. */
function corpoDaLp(lp, linkWpp) {
  const h = lp.hero;
  const botoes = `<div class="polvo-hero__acoes">
        <a class="polvo-btn polvo-btn--primario" href="${linkWpp}" target="_blank" rel="noopener">Pedir orçamento no WhatsApp</a>
        <a class="polvo-btn polvo-btn--contorno" href="${BUSCA}">Ver catálogo completo</a>
      </div>`;
  const hero = `<section class="polvo-hero">
  <div class="container polvo-hero__grid polvo-hero__grid--unico">
    <div class="polvo-hero__texto">
      <span class="polvo-eyebrow">${esc(h.eyebrow)}</span>
      <h1 class="polvo-hero__titulo">${esc(h.titulo)} <span class="polvo-grad">${esc(h.destaque)}</span></h1>
      <p class="polvo-hero__texto-apoio">${esc(h.texto)}</p>
      ${botoes}
      <ul class="polvo-selos">${h.selos.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    </div>
  </div>
</section>`;
  const secoes = lp.secoes.map(s => {
    if (!SECOES[s.tipo]) throw new Error(`tipo de seção desconhecido: ${s.tipo}`);
    return `<section class="polvo-secao${s.tinta ? ' polvo-secao--tinta' : ''}">
  <div class="container">
    ${cabeca(s)}
    ${SECOES[s.tipo](s)}
  </div>
</section>`;
  });
  const cta = `<section class="polvo-cta">
  <div class="container">
    <h2>${esc(lp.cta.titulo)}</h2>
    <p>${esc(lp.cta.texto)}</p>
    ${botoes}
  </div>
</section>`;
  return [hero, ...secoes, cta].join('\n\n');
}

function lerConteudo(nome) {
  const lp = JSON.parse(fs.readFileSync(path.join(PASTA, nome + '.json'), 'utf8'));
  for (const c of ['titulo', 'descricao', 'hero', 'secoes', 'cta']) {
    if (!lp[c]) throw new Error(`${nome}.json: falta "${c}"`);
  }
  return lp;
}

function css() {
  const ler = f => fs.readFileSync(f, 'utf8');
  // polvo.css: só os tokens (:root) — o resto mexe em classes do tema que a LP não tem.
  const tokens = ler(path.join(RAIZ, 'tray-tema', 'css', 'polvo.css')).match(/:root\s*\{[\s\S]*?\n\}/)[0];
  const secoes = ler(path.join(RAIZ, 'tray-tema', 'css', 'polvo-home.css'));
  const base = ler(path.join(PASTA, '_base.css'));
  return [tokens, base, secoes].join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')       // comentários
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n+/g, '\n')
    // Fora do ASCII no CSS vira escape de CSS ("✓" -> "\2713 "): entidade HTML não vale dentro de <style>.
    .replace(/[^\x00-\x7f]/gu, c => `\\${c.codePointAt(0).toString(16)} `);
}

const WPP_ICONE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z"/></svg>';

function documento(nome, s) {
  const lp = lerConteudo(nome);
  const meta = lp;
  const wpp = `https://wa.me/${s.whatsapp}?text=${encodeURIComponent('Olá! Vim pelo site e quero fazer um pedido.')}`;
  const wppLp = `https://wa.me/${s.whatsapp}?text=${encodeURIComponent(lp.hero.whatsapp)}`;
  const logo = fs.readFileSync(path.join(RAIZ, 'assets', 'img', 'logo-mark.svg'), 'utf8')
    .replace(/<\?xml[^>]*>/, '').replace(/<title>[\s\S]*?<\/title>/, '').replace('<svg ', '<svg aria-hidden="true" ');

  const html = `<!doctype html>
<html lang="pt-br">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(meta.titulo)}</title>
<meta name="description" content="${esc(meta.descricao)}">
<meta name="theme-color" content="#7b2fe3">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Montserrat:wght@700;800&display=swap" rel="stylesheet">
<style>
${css()}
</style>
</head>
<body>
<header class="lp-topo">
  <div class="container">
    <a class="lp-marca" href="/" aria-label="Atacado Polvo — página inicial">${logo}<span><small>Atacado da limpeza</small><strong>Polvo</strong></span></a>
    <nav>
      <a class="lp-link" href="/">Loja</a>
      <a class="lp-link" href="${BUSCA}">Todos os produtos</a>
      <a class="polvo-btn polvo-btn--primario" href="${wpp}" target="_blank" rel="noopener">WhatsApp</a>
    </nav>
  </div>
</header>
<main>
${corpoDaLp(lp, wppLp)}
</main>
<footer class="lp-rodape">
  <div class="container">
    <div>
      <h2>Atacado Polvo</h2>
      <p>Distribuidora de produtos de limpeza, descartáveis e utensílios. Preço de atacado, entrega própria em ${esc(s.cidade)} e região.</p>
    </div>
    <div>
      <h2>Atendimento</h2>
      <ul>
        <li><a href="${wpp}" target="_blank" rel="noopener">WhatsApp ${esc(s.whatsappLabel)}</a></li>
        <li>${esc(s.horarioSemana)}</li>
        <li>${esc(s.horarioSabado)}</li>
      </ul>
    </div>
    <div>
      <h2>Lojas</h2>
      <ul>
        <li>${esc(s.endereco)} — ${esc(s.bairro)}, ${esc(s.cidade)}/${esc(s.uf)}</li>
        <li>${esc(s.endereco2)} — ${esc(s.cidade2)}/${esc(s.uf2)}</li>
        <li><a href="${esc(s.instagram)}" target="_blank" rel="noopener">Instagram ${esc(s.instagramHandle)}</a></li>
      </ul>
    </div>
    <p class="lp-rodape__copy">© ${new Date().getFullYear()} Atacado Polvo. <a href="/">Voltar para a loja</a></p>
  </div>
</footer>
<a class="lp-wpp" href="${wpp}" target="_blank" rel="noopener" aria-label="Falar no WhatsApp">${WPP_ICONE}</a>
</body>
</html>
`;
  return ascii(html);
}

function montar() {
  const s = site();
  fs.mkdirSync(SAIDA, { recursive: true });
  const nomes = fs.readdirSync(PASTA).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5));
  return nomes.map(nome => {
    const html = documento(nome, s);
    if (/[^\x00-\x7f]/.test(html)) throw new Error(`${nome}: sobrou caractere fora do ASCII`);
    fs.writeFileSync(path.join(SAIDA, nome + '.html'), html);
    return { nome, kb: Math.round(Buffer.byteLength(html) / 1024) };
  });
}

if (require.main === module) {
  for (const r of montar()) console.log(`lp/dist/${r.nome}.html  ${r.kb} KB`);
}

module.exports = { montar, ascii };
