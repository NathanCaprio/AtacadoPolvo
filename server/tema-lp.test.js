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
