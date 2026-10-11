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
         { tipo: "faq", eyebrow, titulo, itens: [{ pergunta, resposta }] },
         { tipo: "posts", eyebrow, titulo, itens: [{ url: "/<artigo>", tag }] } ],
       cta: { titulo, texto },
       noindex? }                              true = <meta robots noindex>
   "whatsapp" do hero é a mensagem que já vem escrita no WhatsApp (vale
   também para o botão da faixa final). hero.selos é opcional; hero.contagem
   (data ISO) põe a contagem regressiva no hero.

   Artigo do blog: no lugar de hero/secoes, um bloco "artigo"
     artigo: { categoria, titulo, resumo, data, whatsapp,
               corpo: [linhas de HTML],          confiável, vai como está
               chamada?: { texto, botao, url },  url "whatsapp" = WhatsApp
               relacionados: [{ titulo, url }] }
   "posts" do índice do blog lê título e resumo do JSON do próprio artigo.
   ========================================================================= */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const RAIZ = path.join(__dirname, '..');
const PASTA = path.join(RAIZ, 'tray-tema', 'lp');
const SAIDA = path.join(PASTA, 'dist');
const BUSCA = '/loja/busca.php?loja=1544153&amp;palavra_busca=';

/* A busca da Tray lê o termo em windows-1252 (a loja é servida assim): "é" vai
   como %E9; em UTF-8 (%C3%A9) a página mostra "Papã©is". */
function termoBusca(texto) {
  return [...texto].map(c => {
    if (/[A-Za-z0-9_.~-]/.test(c)) return c;
    if (c === ' ') return '+';
    const n = c.charCodeAt(0);
    return n < 256 ? '%' + n.toString(16).toUpperCase().padStart(2, '0') : encodeURIComponent(c);
  }).join('');
}

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
        <a class="polvo-card__link" href="${BUSCA}${termoBusca(i.busca)}">Ver produtos ${SETA}</a>` : ''}
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
    </div>`,
  posts: s => `<div class="polvo-segmentos">${s.itens.map(i => {
    const a = lerConteudo(i.url.replace(/^\//, '')).artigo;
    if (!a) throw new Error(`posts: ${i.url} não é artigo`);
    return `
      <article class="polvo-card polvo-card--simples lp-post">
        <span class="lp-post__tag">${esc(i.tag || a.categoria)}</span>
        <h3 class="polvo-card__titulo"><a href="${esc(i.url)}">${esc(a.titulo)}</a></h3>
        <p class="polvo-card__texto">${esc(a.resumo)}</p>
        <a class="polvo-card__link" href="${esc(i.url)}" aria-hidden="true" tabindex="-1">Ler o artigo ${SETA}</a>
      </article>`;
  }).join('')}
    </div>`
};

/** Contagem regressiva do hero (o número é preenchido pelo SCRIPT_CONTAGEM). */
const contagem = alvo => `<div class="lp-contagem" data-alvo="${esc(alvo)}" aria-label="Tempo até o início da campanha">
        ${['dias', 'horas', 'min', 'seg'].map(u => `<div><strong>00</strong><span>${u}</span></div>`).join('')}
      </div>`;

/** Página de artigo do blog: meta, título, corpo, chamada e "Leia também". */
function artigo(a, linkWpp) {
  const ch = a.chamada;
  const chamada = ch ? `
    <div class="lp-artigo__chamada">
      <p>${esc(ch.texto)}</p>
      <a class="polvo-btn ${ch.url === 'whatsapp' ? 'polvo-btn--wpp' : 'polvo-btn--primario'}" href="${ch.url === 'whatsapp' ? linkWpp : esc(ch.url)}"${ch.url === 'whatsapp' ? ' target="_blank" rel="noopener"' : ''}>${esc(ch.botao)}</a>
    </div>` : '';
  const relacionados = a.relacionados && a.relacionados.length ? `
    <nav class="lp-artigo__relacionados" aria-label="Leia também">
      <h2>Leia também</h2>
      <ul>${a.relacionados.map(r => `
        <li><a href="${esc(r.url)}">${esc(r.titulo)}</a></li>`).join('')}
      </ul>
    </nav>` : '';
  return `<section class="polvo-secao lp-artigo">
  <div class="container">
  <article class="lp-artigo__wrap">
    <p class="lp-artigo__meta"><a href="/blog">Blog</a> · ${esc(a.categoria)}</p>
    <h1 class="lp-artigo__titulo">${esc(a.titulo)}</h1>
    <div class="lp-artigo__corpo">
      ${a.corpo.join('\n      ')}
    </div>${chamada}${relacionados}
  </article>
  </div>
</section>`;
}

/** HTML das seções a partir do JSON da LP. */
function corpoDaLp(lp, linkWpp) {
  const h = lp.hero;
  const botoes = `<div class="polvo-hero__acoes">
        <a class="polvo-btn polvo-btn--primario" href="${linkWpp}" target="_blank" rel="noopener">Pedir orçamento no WhatsApp</a>
        <a class="polvo-btn polvo-btn--contorno" href="${BUSCA}">Ver catálogo completo</a>
      </div>`;
  const cta = `<section class="polvo-cta">
  <div class="container">
    <h2>${esc(lp.cta.titulo)}</h2>
    <p>${esc(lp.cta.texto)}</p>
    ${botoes}
  </div>
</section>`;
  if (lp.artigo) return [artigo(lp.artigo, linkWpp), cta].join('\n\n');
  const hero = `<section class="polvo-hero">
  <div class="container polvo-hero__grid polvo-hero__grid--unico">
    <div class="polvo-hero__texto">
      <span class="polvo-eyebrow">${esc(h.eyebrow)}</span>
      <h1 class="polvo-hero__titulo">${esc(h.titulo)} <span class="polvo-grad">${esc(h.destaque)}</span></h1>
      <p class="polvo-hero__texto-apoio">${esc(h.texto)}</p>
      ${h.contagem ? contagem(h.contagem) : ''}
      ${botoes}
      ${h.selos ? `<ul class="polvo-selos">${h.selos.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
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
  return [hero, ...secoes, cta].join('\n\n');
}

function lerConteudo(nome) {
  const lp = JSON.parse(fs.readFileSync(path.join(PASTA, nome + '.json'), 'utf8'));
  for (const c of ['titulo', 'descricao', 'cta', ...(lp.artigo ? [] : ['hero', 'secoes'])]) {
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

/* ---- Cabeçalho e rodapé: os mesmos do tema ------------------------------
   Menu, links e textos do rodapé vêm do tema (tray-tema/configs/settings.json),
   para a LP acompanhar o que o tema mostra; telefone, WhatsApp e e-mail vêm
   do config.js (no tema, vêm dos dados da loja no painel). Estrutura igual a
   elements/header.html e footer.html; CSS espelhado em lp/_base.css. */

const CONTA = '/central-do-cliente';
const CARRINHO = '/loja/redirect_cart_service.php?loja=1544153';

/* Páginas institucionais da Tray (bloco "pages" do rodapé, que a LP não tem
   como ler): as mesmas que a loja lista hoje. */
const INSTITUCIONAL = [
  ['Contato', '/contato'], ['Empresa', '/empresa'], ['Como comprar', '/como-comprar'],
  ['Segurança', '/seguranca'], ['Envio', '/envio'], ['Pagamento', '/pagamento'],
  ['Tempo de Garantia', '/tempo-de-garantia'], ['Trocas e devoluções', '/trocas-e-devolucoes']
];

const svg = (corpo, extra = 'fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"') =>
  `<svg viewBox="0 0 24 24" ${extra} aria-hidden="true">${corpo}</svg>`;

const ICONE = {
  wpp: svg('<path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.2-.7.1s-.7 1-.9 1.2c-.2.2-.3.2-.6.1a8 8 0 0 1-2.4-1.5 9 9 0 0 1-1.6-2c-.2-.3 0-.5.1-.6l.5-.6.3-.5v-.5l-.9-2.2c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.5 3.5 0 0 0-1.1 2.6A6.1 6.1 0 0 0 7.3 13a13.9 13.9 0 0 0 5.3 4.7c.7.3 1.3.5 1.8.6a4.2 4.2 0 0 0 1.9.1 3.2 3.2 0 0 0 2-1.4 2.6 2.6 0 0 0 .2-1.4c-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.5A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .9.9-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z"/>', 'fill="currentColor"'),
  lupa: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"'),
  conta: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  carrinho: svg('<path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2"/><circle cx="10" cy="20.5" r="1.2"/><circle cx="17" cy="20.5" r="1.2"/>'),
  insta: svg('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>'),
  email: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
  raio: svg('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>', 'fill="currentColor"'),
  local: svg('<path d="M20 10.5c0 5.5-8 12-8 12s-8-6.5-8-12a8 8 0 1 1 16 0z"/><circle cx="12" cy="10.5" r="2.8"/>'),
  tel: svg('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>'),
  relogio: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>')
};

/** O que a LP usa do tema: menu, faixa do topo e blocos do rodapé. */
function tema() {
  const c = JSON.parse(fs.readFileSync(path.join(RAIZ, 'tray-tema', 'configs', 'settings.json'), 'utf8')).current;
  const bloco = tipo => c.footer.blocks.filter(b => b.type === tipo && b.settings.enabled).map(b => b.settings);
  return {
    faixa: c.header.settings.show_message_line ? c.header.settings.message_line_content : '',
    menu: c.header.settings.navigation.items,
    sobre: bloco('polvo_footer_about')[0],
    links: bloco('polvo_footer_links').map(b => ({
      titulo: b.title,
      itens: b.links.split('\n').map(l => l.split('|').map(x => x.trim())).filter(p => p.length > 1 && p[0])
    })),
    contato: bloco('polvo_footer_contact')[0],
    copy: c.footer.settings.polvo_copy,
    instagram: c.configs.instagram
  };
}

/** logo-head.svg uma vez só, como <symbol>: cabeçalho e rodapé usam com <use>. */
function logoSimbolo() {
  const bruto = fs.readFileSync(path.join(RAIZ, 'tray-tema', 'img', 'polvo', 'logo-head.svg'), 'utf8');
  const viewBox = bruto.match(/viewBox="([^"]+)"/)[1];
  const corpo = bruto.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<title>[\s\S]*?<\/title>/, '').trim();
  return `<svg class="lp-oculto" aria-hidden="true"><symbol id="polvo-logo" viewBox="${viewBox}">${corpo}</symbol></svg>`;
}

const marca = `<svg class="polvo-marca__img" aria-hidden="true"><use href="#polvo-logo"/></svg>
      <span class="polvo-marca__txt" aria-hidden="true"><span>Atacado da Limpeza</span><b>Polvo</b></span>`;

const linkWpp = (s, msg) => `https://wa.me/${s.whatsapp}?text=${encodeURIComponent(msg)}`;
const externo = url => /^https?:/.test(url) ? ' target="_blank" rel="noopener"' : '';

function cabecalho(nome, s, t, wppOrcamento) {
  const menu = t.menu.map(i => {
    const atual = i.url === '/' + nome ? ' aria-current="page"' : '';
    return `<li><a href="${esc(i.url)}"${atual}${i.openInNewTab ? ' target="_blank" rel="noopener"' : ''}>${esc(i.label)}</a></li>`;
  }).join('\n          ');
  // Menu do celular como o do tema (snippets/polvo-menu-extra.html): categorias + WhatsApp. A LP não
  // lê as categorias da loja; usa as da coluna "Categorias" do rodapé (settings.json).
  const cats = t.links.find(l => /categ/i.test(l.titulo));
  const extra = `<div class="lp-nav__extra">${cats ? `
        <p class="lp-nav__titulo">${esc(cats.titulo)}</p>
        <ul class="lp-nav__cats">${cats.itens.map(([txt, url]) => `<li><a href="${esc(url)}"${externo(url)}>${esc(txt)}</a></li>`).join('')}</ul>` : ''}
        <a class="polvo-btn polvo-btn--wpp lp-nav__wpp" href="${wppOrcamento}" target="_blank" rel="noopener">${ICONE.wpp}<span>Pedir pelo WhatsApp</span></a>
      </div>`;
  return `${t.faixa ? `<div class="lp-faixa"><div class="container">${esc(t.faixa)}</div></div>
` : ''}<header class="lp-topo">
  <div class="container lp-topo__linha">
    <a class="polvo-marca" href="/" aria-label="Atacado Polvo — página inicial">
      ${marca}
    </a>
    <nav class="lp-nav" id="lp-nav" aria-label="Menu principal">
      <ul>
          ${menu}
          <li class="lp-nav__conta"><a href="${CONTA}">Minha conta</a></li>
      </ul>
      ${extra}
    </nav>
    <a class="polvo-header-wpp" href="${wppOrcamento}" target="_blank" rel="noopener">${ICONE.wpp}<span>Orçamento</span></a>
    <button type="button" class="lp-redondo lp-lupa" aria-label="Buscar produtos" aria-expanded="false" aria-controls="lp-busca">${ICONE.lupa}</button>
    <a class="lp-redondo lp-conta" href="${CONTA}" aria-label="Minha conta">${ICONE.conta}</a>
    <a class="lp-redondo lp-carrinho" href="${CARRINHO}" aria-label="Carrinho">${ICONE.carrinho}</a>
    <button type="button" class="lp-redondo lp-menu" aria-label="Abrir menu" aria-expanded="false" aria-controls="lp-nav"><span></span><span></span><span></span></button>
    <form class="lp-busca" id="lp-busca" action="/loja/busca.php" method="get" accept-charset="windows-1252" role="search">
      <input type="hidden" name="loja" value="1544153">
      <input type="search" name="palavra_busca" placeholder="Olá, o que você procura?" aria-label="Buscar produtos" autocomplete="off">
      <button type="submit" aria-label="Buscar">${ICONE.lupa}</button>
    </form>
  </div>
</header>`;
}

function rodape(s, t) {
  const sobre = t.sobre ? `<div class="lp-rodape__sobre">
      <a class="polvo-marca" href="/" aria-label="Atacado Polvo — página inicial">
        ${marca}
      </a>
      ${t.sobre.description ? `<p>${esc(t.sobre.description)}</p>` : ''}
      <div class="polvo-redes">
        ${t.instagram ? `<a href="${esc(t.instagram)}" target="_blank" rel="noopener" aria-label="Instagram">${ICONE.insta}</a>` : ''}
        <a href="${linkWpp(s, 'Olá! Vim pela loja.')}" target="_blank" rel="noopener" aria-label="WhatsApp">${ICONE.wpp}</a>
        <a href="mailto:${esc(s.email)}" aria-label="E-mail">${ICONE.email}</a>
      </div>
      ${t.sobre.group_text && t.sobre.group_link ? `<a class="polvo-rodape-grupo" href="${esc(t.sobre.group_link)}" target="_blank" rel="noopener">${ICONE.raio} ${esc(t.sobre.group_text)}</a>` : ''}
    </div>` : '';
  // Título com botão: no celular a coluna abre e fecha (SCRIPT); no computador o botão é só o título.
  let nColuna = 0;
  const coluna = (titulo, itens) => `<div class="lp-rodape__links">
      <h2><button type="button" class="lp-rodape__toggle" aria-expanded="false" aria-controls="lp-rodape-lista-${++nColuna}">${esc(titulo)}</button></h2>
      <ul id="lp-rodape-lista-${nColuna}">${itens.map(([txt, url]) => `
        <li><a href="${esc(url)}"${externo(url)}>${esc(txt)}</a></li>`).join('')}
      </ul>
    </div>`;
  const linhas = txt => txt.split('\n').map(esc).join('<br>');
  const c = t.contato;
  const contato = c ? `<div class="lp-rodape__contato">
      <h2>${esc(c.title || 'Contato')}</h2>
      <ul>
        ${c.address ? `<li>${ICONE.local}<span>${linhas(c.address)}</span></li>` : ''}
        <li>${ICONE.tel}<a href="tel:${esc(s.telefoneLink)}">${esc(s.telefone)}</a></li>
        <li>${ICONE.email}<a href="mailto:${esc(s.email)}">${esc(s.email)}</a></li>
        ${c.hours ? `<li>${ICONE.relogio}<span>${linhas(c.hours)}</span></li>` : ''}
      </ul>
    </div>` : '';
  const [navegacao, ...outras] = t.links;
  const colunas = [sobre, ...(navegacao ? [coluna(navegacao.titulo, navegacao.itens)] : []),
    ...outras.map(l => coluna(l.titulo, l.itens)), coluna('Institucional', INSTITUCIONAL), contato];
  return `<footer class="lp-rodape">
  <div class="container lp-rodape__cols">
    ${colunas.filter(Boolean).join('\n    ')}
  </div>
  <div class="container lp-rodape__copy">
    © ${new Date().getFullYear()} ${esc(t.copy || 'Atacado Polvo')}${t.instagram ? ` <span>· <a href="${esc(t.instagram)}" target="_blank" rel="noopener">${esc(s.instagramHandle)}</a></span>` : ''}
  </div>
</footer>`;
}

/* Lupa abre o painel de busca (Esc fecha, "/" abre, como no tema) e o ☰ abre o menu. */
const SCRIPT = `(function () {
  var topo = document.querySelector('.lp-topo');
  var lupa = topo.querySelector('.lp-lupa');
  var menu = topo.querySelector('.lp-menu');
  var campo = topo.querySelector('.lp-busca input[type=search]');
  function menuAberto(sim) {
    topo.classList.toggle('lp-topo--menu', sim);
    menu.setAttribute('aria-expanded', sim ? 'true' : 'false');
  }
  function busca(sim) {
    if (sim) menuAberto(false);
    topo.classList.toggle('lp-topo--busca', sim);
    lupa.setAttribute('aria-expanded', sim ? 'true' : 'false');
    if (sim) campo.focus();
  }
  lupa.addEventListener('click', function () { busca(!topo.classList.contains('lp-topo--busca')); });
  menu.addEventListener('click', function () {
    var sim = !topo.classList.contains('lp-topo--menu');
    if (sim) busca(false);
    menuAberto(sim);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && topo.classList.contains('lp-topo--busca')) { busca(false); lupa.focus(); }
    else if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) { e.preventDefault(); busca(true); }
  });
  document.addEventListener('click', function (e) {
    if (topo.classList.contains('lp-topo--busca') && !e.target.closest('.lp-busca') && !e.target.closest('.lp-lupa')) busca(false);
  });
  /* Rodapé no celular: Navegação, Categorias e Institucional abrem e fecham (como no tema).
     A classe liga o CSS: sem JS, tudo aberto. */
  var rodape = document.querySelector('.lp-rodape');
  var celular = window.matchMedia('(max-width: 767px)');
  if (rodape) {
    rodape.classList.add('lp-rodape--sanfona');
    rodape.addEventListener('click', function (e) {
      var b = e.target.closest('.lp-rodape__toggle');
      if (!b || !celular.matches) return;
      var aberto = b.closest('.lp-rodape__links').classList.toggle('is-aberto');
      b.setAttribute('aria-expanded', aberto ? 'true' : 'false');
    });
  }
})();`;

/* Contagem do hero: zera quando passa da data (a LP sai do ar na mão). */
const SCRIPT_CONTAGEM = `(function () {
  var caixa = document.querySelector('.lp-contagem');
  var alvo = new Date(caixa.getAttribute('data-alvo')).getTime();
  var nums = caixa.querySelectorAll('strong');
  function dois(n) { return (n < 10 ? '0' : '') + n; }
  function atualizar() {
    var d = Math.max(0, alvo - Date.now());
    var v = [Math.floor(d / 864e5), Math.floor(d % 864e5 / 36e5), Math.floor(d % 36e5 / 6e4), Math.floor(d % 6e4 / 1e3)];
    for (var i = 0; i < 4; i++) nums[i].textContent = dois(v[i]);
  }
  atualizar();
  setInterval(atualizar, 1000);
})();`;

/** JSON-LD só com ASCII: no <script> entidade HTML não vale, então acento vira \\uXXXX. */
const jsonLd = obj => `<script type="application/ld+json">${JSON.stringify(obj)
  .replace(/[^\x00-\x7f]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'))
  .replace(/</g, '\\u003c')}</script>`;

function documento(nome, s) {
  const lp = lerConteudo(nome);
  const t = tema();
  const wppLp = linkWpp(s, (lp.artigo || lp.hero).whatsapp);
  const a = lp.artigo;
  const extras = [
    lp.noindex ? '<meta name="robots" content="noindex">' : '',
    a ? jsonLd({
      '@context': 'https://schema.org', '@type': 'Article',
      headline: a.titulo, description: a.resumo, datePublished: a.data,
      author: { '@type': 'Organization', name: 'Atacado Polvo' },
      publisher: { '@type': 'Organization', name: 'Atacado Polvo' }
    }) : ''
  ].filter(Boolean).map(x => x + '\n').join('');

  // Favicon embutido em data URI: a LP é servida sozinha e o caminho dos arquivos do tema muda a cada publicação.
  function favicons() {
    const png = (n) => 'data:image/png;base64,' + fs.readFileSync(path.join(RAIZ, 'tray-tema', 'img', 'polvo', n)).toString('base64');
    return `<link rel="icon" type="image/png" sizes="48x48" href="${png('favicon-48.png')}">
<link rel="apple-touch-icon" href="${png('apple-touch-icon.png')}">`;
  }

  const html = `<!doctype html>
<html lang="pt-br">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(lp.titulo)}</title>
<meta name="description" content="${esc(lp.descricao)}">
${extras}<meta name="theme-color" content="#7b2fe3">
${favicons()}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Montserrat:wght@700;800;900&display=swap" rel="stylesheet">
<style>
${css()}
</style>
</head>
<body>
${logoSimbolo()}
${cabecalho(nome, s, t, wppLp)}
<main>
${corpoDaLp(lp, wppLp)}
</main>
${rodape(s, t)}
<a class="polvo-wpp-fab" href="${linkWpp(s, 'Olá! Vim pela loja e gostaria de ajuda.')}" target="_blank" rel="noopener" aria-label="Falar no WhatsApp">${ICONE.wpp}</a>
<script>
${SCRIPT}${lp.hero && lp.hero.contagem ? '\n' + SCRIPT_CONTAGEM : ''}
</script>
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
