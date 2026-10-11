// Arte da forma de envio "Frete grátis (entrega própria)" (painel > Configurações > Frete e envio >
// Frete Grátis > Imagem do Frete; a Tray pede PNG/JPG de 100x100 e até 100 KB). Não entra no ZIP.
// Uso: node tray-tema/ferramentas/arte-frete.js tray-tema/img/polvo/mascote.svg <pasta>  → <pasta>/entrega.html;
// a PNG (arte-frete.png) é o print do <svg class="arte"> com o Playwright, fundo transparente.
const fs = require('node:fs'), path = require('node:path');
const svg = fs.readFileSync(process.argv[2], 'utf8');
const d = svg.match(/<path[^>]*\sd="([^"]+)"/)[1];
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;padding:0;background:transparent}
.arte{width:100px;height:100px;display:block}
.grande{width:300px;height:300px;display:block;margin-top:20px}
</style></head><body>
${[ 'arte', 'grande' ].map(c => `<svg class="${c}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="fundo-${c}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9152F5"/><stop offset="1" stop-color="#551AA6"/></linearGradient></defs>
<rect width="100" height="100" rx="22" fill="url(#fundo-${c})"/>
<g stroke="#fff" stroke-linecap="round" stroke-width="3" opacity=".5"><line x1="5" y1="40" x2="13" y2="40"/><line x1="3" y1="50" x2="13" y2="50"/><line x1="6" y1="60" x2="13" y2="60"/></g>
<rect x="16" y="27" width="50" height="40" rx="5" fill="#fff"/>
<path d="M68 40h11a4 4 0 0 1 3.3 1.8l6.4 9.4a4 4 0 0 1 .7 2.3V67H68z" fill="#fff"/>
<path d="M71.5 44h7l5 7.5h-12z" fill="#551AA6"/>
<rect x="14" y="65" width="77" height="5" rx="2.5" fill="#fff"/>
<circle cx="31" cy="73" r="8.5" fill="#2B0D5C" stroke="#fff" stroke-width="2.6"/><circle cx="31" cy="73" r="2.8" fill="#fff"/>
<circle cx="77" cy="73" r="8.5" fill="#2B0D5C" stroke="#fff" stroke-width="2.6"/><circle cx="77" cy="73" r="2.8" fill="#fff"/>
<svg x="19.5" y="32.5" width="43" height="28" viewBox="-4 -4 520 332.58"><path fill="#7B2FE3" fill-rule="evenodd" d="${d}"/></svg>
</svg>`).join('\n')}
</body></html>`;
fs.writeFileSync(path.join(process.argv[3], 'entrega.html'), html);
console.log('ok', html.length);
