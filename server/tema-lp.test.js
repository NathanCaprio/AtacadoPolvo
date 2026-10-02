'use strict';

/* Landing pages da Tray (server/tema-lp.js): a Tray serve em windows-1252,
   então o documento tem de sair só com ASCII — e o CSS embutido não pode
   ter entidade HTML (&#...;), que não vale dentro de <style>. */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { montar, ascii } = require('./tema-lp');

const DIST = path.join(__dirname, '..', 'tray-tema', 'lp', 'dist');

test('ascii troca acento e travessão por entidade numérica', () => {
  assert.strictEqual(ascii('Condomínio — já'), 'Condom&#237;nio &#8212; j&#225;');
});

test('toda LP monta só com ASCII, com título, descrição e seções', () => {
  const lps = montar();
  assert.ok(lps.length >= 6, 'esperava as 6 LPs');
  for (const { nome } of lps) {
    const html = fs.readFileSync(path.join(DIST, nome + '.html'), 'utf8');
    assert.doesNotMatch(html, /[^\x00-\x7f]/, `${nome}: caractere fora do ASCII`);
    assert.match(html, /<title>[^<]{20,}<\/title>/, `${nome}: sem <title>`);
    assert.match(html, /<meta name="description" content="[^"]{50,}">/, `${nome}: sem descrição`);
    assert.match(html, /<h1 class="polvo-hero__titulo">/, `${nome}: sem hero`);
    assert.match(html, /wa\.me\/\d{12,13}\?text=/, `${nome}: sem link de WhatsApp`);
    const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
    assert.doesNotMatch(css, /&#\d+;/, `${nome}: entidade HTML dentro do <style>`);
  }
});

test('cabeçalho e rodapé da LP seguem o tema (menu e links do settings.json)', () => {
  const tema = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tray-tema', 'configs', 'settings.json'), 'utf8')).current;
  const html = fs.readFileSync(path.join(DIST, 'condominios.html'), 'utf8');
  const nav = html.match(/<nav class="lp-nav"[\s\S]*?<\/nav>/)[0];
  for (const item of tema.header.settings.navigation.items) {
    assert.ok(nav.includes(`href="${item.url.replace(/&/g, '&amp;')}"`), `menu sem ${item.url}`);
  }
  assert.match(nav, /href="\/condominios" aria-current="page"/, 'página atual não marcada no menu');
  assert.match(html, /<a class="polvo-header-wpp" href="https:\/\/wa\.me\/\d+\?text=[^"]+"[^>]*>[\s\S]*?<span>Or&#231;amento<\/span>/, 'sem botão Orçamento');
  assert.match(html, /<form class="lp-busca"[^>]*action="\/loja\/busca\.php"[\s\S]*?name="palavra_busca"/, 'sem busca');
  const grupo = tema.footer.blocks.find(b => b.type === 'polvo_footer_about').settings.group_link;
  assert.ok(html.includes(`class="polvo-rodape-grupo" href="${grupo}"`), 'sem grupo de ofertas no rodapé');
  assert.match(html, /<a class="polvo-wpp-fab" href="https:\/\/wa\.me\//, 'sem botão flutuante');
  assert.strictEqual((html.match(/id="polvo-logo"/g) || []).length, 1, 'logo deve entrar uma vez só (symbol)');
});
