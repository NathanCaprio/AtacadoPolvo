/* =========================================================================
   Nada de estilo nem script inline nas páginas
   -------------------------------------------------------------------------
   O CSP do servidor (server/server.js) não tem 'unsafe-inline' em
   script-src nem em style-src. Um style="" ou <style> que alguém cole no
   HTML não dá erro em lugar nenhum: o navegador só ignora, e o defeito
   aparece como "margem sumiu" ou "contador parado" (foi assim que o da Black
   Friday ficou quebrado). Abrindo o HTML direto do disco nem isso, porque
   aí não há CSP. Por isso o teste olha o código-fonte.

   Ajuste pontual: classe u-* (seção 35 do style.css) ou regra no
   componente. Cor/medida calculada pelo JS: el.style.setProperty, que o
   CSP não barra.
   ========================================================================= */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const paginas = fs.readdirSync(RAIZ).filter(f => f.endsWith('.html'));
const scripts = fs.readdirSync(path.join(RAIZ, 'assets', 'js')).map(f => path.join('assets', 'js', f));
const ler = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const linhas = (texto, re) => texto.split(/\r?\n/).map((l, i) => re.test(l) ? `${i + 1}: ${l.trim().slice(0, 90)}` : null).filter(Boolean);

test('existem páginas para checar', () => {
  assert.ok(paginas.length > 10);
});

test('nenhuma página tem style="" nem <style>', () => {
  for (const f of paginas) {
    assert.deepEqual(linhas(ler(f), /\sstyle\s*=|<style[\s>]/i), [], f);
  }
});

test('nenhuma página tem <script> inline nem on*="" ', () => {
  for (const f of paginas) {
    const html = ler(f);
    // JSON-LD não executa e o CSP não o barra.
    const inline = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
      .filter(([, attrs, corpo]) => !/\bsrc=/.test(attrs) && !/application\/ld\+json/.test(attrs) && corpo.trim());
    assert.deepEqual(inline.map(m => m[0].slice(0, 80)), [], f);
    assert.deepEqual(linhas(html, /<[^>]+\son[a-z]+\s*=\s*["']/i), [], f);
  }
});

test('o JS não monta HTML com style=""', () => {
  for (const f of scripts) {
    assert.deepEqual(linhas(ler(f), /\sstyle\s*=\s*["'\\]/), [], f);
  }
});
