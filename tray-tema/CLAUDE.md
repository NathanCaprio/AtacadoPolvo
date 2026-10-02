# tray-tema — tema da loja Tray (Atacado Polvo)

Loja: `nathansilva.commercesuite.com.br` (código 1544153). Base: Tema Padrão 3.0
v3.0.8 da Tray, **Twig**. A loja vende **com preço**. Este arquivo não entra no ZIP.

## Fluxo (sempre este)
1. Editar aqui → `npm run tema-zip` (raiz) → gera `tray-tema.zip` (fora do git).
2. Subir na **cópia de trabalho, tema 3521907** ("Cópia tema 3512519…", não publicada):
   painel → Aparência da loja (`/studio-app/?platform=tray`) → link "Editar HTML"
   da cópia (`a[href="/studio-app/themes/3521907/code"]`) → Ações → Enviar tema →
   Procurar arquivo → Enviar. Resultado sai no console (Pusher): "Upload de Zip
   finalizado com sucesso." (~20 s).
3. Conferir em `https://nathansilva.commercesuite.com.br?loja=1544153&opencode_theme=6e4a6bd6-51ff-4231-93a0-a0050fe737fe`.
4. Commit. **Publicar** a cópia só o usuário decide.

- Tray **recusa ZIP parcial** ("estrutura inválida"): sempre o tema inteiro.
- Envio só substitui arquivos de mesmo nome; arquivo apagado aqui continua lá.
- Publicado = "Genesis" (3512519): código não editável. **"agrada dev" não é deste projeto — nunca mexer.**
- Login no painel tem reCAPTCHA: o usuário entra na janela do Playwright.
- Pelo editor web não dá para criar/apagar arquivos em `pages/`, `layouts/`, `configs/` (pelo ZIP dá para enviar).

## Onde fica cada coisa
| Quero mudar... | Arquivo |
|---|---|
| Nossa identidade (fonte de títulos, cabeçalho, rodapé escuro, cartão, selos, botões) | `css/polvo.css` (carregado em `elements/styles.html`, antes do CSS personalizado do painel) |
| Cores base / fonte do corpo / raio | `configs/settings.json` → `current.configs` (vira `--color_*` em `elements/css-variables.html`) |
| Esqueleto da página | `layouts/default.html` |
| Home (seções arrastáveis) | `pages/home.html` + `configs/editor/sections/home.*.json` + `elements/snippets/*.html` |
| Cabeçalho / rodapé | `elements/header.html`, `elements/footer.html` (+ blocos em `snippets/`) |
| Cartão de produto / preço / selos | `elements/snippets/product.html`, `product-price.html`, `product-tags.html` |
| Página de produto | `pages/product.html`, `elements/product-main.html` |

## Seções próprias da home (editáveis no painel)
`home.polvo_hero` (destaque + números), `home.polvo_segments` (cards com ícone
escolhido numa lista), `home.polvo_steps` (como comprar). Cada uma = JSON em
`configs/editor/sections/home.<tipo>.json` + `elements/snippets/polvo-*.html`
(abre com `{% if section.type == '<tipo>' and section.settings.enabled %}`) +
CSS em `css/polvo-home.css` (só na home). Ordem/conteúdo inicial da home:
`configs/settings.json` → `current.content.home`. Banners de exemplo da Tray
(slideshow, banner_line, banner_grid) ficam **desligados** até haver banners reais.
Arquivos novos em `configs/` entram normalmente pelo ZIP.
- Twig: evitar `??` e `?:` (versão da Tray desconhecida); usar `|default(...)`.
- "Todos os produtos" = `links.search ~ '?loja=' ~ store.id ~ '&palavra_busca='`.
- Preço na página do produto chega por JS (~2 s): esperar `#variacaoPreco` antes de conferir.

## Landing pages de SEO (criador de LPs da Tray, fora do tema)
A criação de LP pelo editor do tema foi **descontinuada**; agora é o "Criador de
landing pages" (link na lista de temas), modo **Página em branco**. Essa LP é
servida **sozinha** (sem layout/CSS do tema, `<head>` vazio, em windows-1252).
Por isso: conteúdo em `lp/<slug>.json` → `npm run lp` (`server/tema-lp.js`) monta
`lp/dist/<slug>.html` completo (CSS embutido de `polvo.css` + `_base.css` +
`polvo-home.css`, cabeçalho/rodapé próprios, contatos de `assets/js/config.js`,
tudo ASCII com entidades). Tipos de seção: cards, passos, planos, faq (ver topo
de `server/tema-lp.js`). Teste: `server/tema-lp.test.js`.
- Colar na Tray: servir `lp/dist` em 127.0.0.1:3078 e rodar `lp/colar-na-tray.js`
  (Playwright `browser_run_code_unsafe`); ele cola e salva **sem ativar**.
- Criadas (todas **Inativas**): condominios=1, escolas=3, recorrencia=5,
  restaurantes=7, hoteis=9, pets=11. Prévia: `/<slug>?preview=1`.
- Ativar (chave "Ativo" no editor da LP) = decisão do usuário, junto com publicar o tema
  (os cards da home já apontam para `/condominios` e `/escolas`).
- Redirecionar quando o domínio virar (301 no painel da Tray): `/condominios.html`→`/condominios`,
  `/escolas.html`→`/escolas`, `/recorrencia.html`→`/recorrencia`, `/restaurantes.html`→`/restaurantes`,
  `/hoteis.html`→`/hoteis`, `/pets.html`→`/pets`, `/produtos.html`→busca vazia, `/index.html`→`/`.
  Sem LP ainda: sobre, contato, blog (4 artigos), calculadoras, black friday.

## Fica com o usuário no painel (não é tema)
- Telefone/WhatsApp/e-mail do rodapé = dados da loja (hoje (51) 99526-6894 e e-mail pessoal; o oficial é (51) 98025-6547, ver `assets/js/config.js`).
- Botão flutuante de WhatsApp = recurso nativo ("Ative o botão de WhatsApp na sua loja").
- Logo, banners e texto da faixa do topo ("Utilize esse espaço…").

## Regras
- Mexer o mínimo nos arquivos da Tray (facilita atualizar o tema); o nosso vai em `polvo.css` e em arquivos novos.
- Tokens do site antigo: `--polvo-*` no topo de `polvo.css` (iguais a `assets/css/style.css`).
- `main.css` é minificado (70 KB): achar seletor com `grep -o '\.seletor[^}]*}' css/main.css`.
- A CSP/regras do site antigo (sem inline) **não** valem aqui; o tema da Tray usa `<style>`/`<script>` inline.

## Feito / próximo
- [x] Paleta, Inter + Montserrat, cabeçalho, rodapé escuro, cartão de produto, selos.
- [x] Home: hero, barra de informações, mais vendidos, segmentos, como comprar, marcas (logos em `img/marcas/`).
- [x] Página de produto: preço em destaque (WhatsApp é nativo da Tray, ver acima).
- [x] Links dos cards de segmento → LPs.
- [x] LPs de SEO criadas no criador da Tray (inativas).
- [ ] Usuário: ativar LPs + publicar tema + redirecionamentos 301 (lista acima).
- [ ] Páginas sem equivalente ainda: sobre, contato, blog, calculadoras.
