# tray-tema — tema da loja Tray (Atacado Polvo)

Loja: `www.atacadopolvo.com.br` (desde 06/10/2026; antes `nathansilva.commercesuite.com.br`; código 1544153). Base: Tema Padrão 3.0
v3.0.8 da Tray, **Twig**. A loja vende **com preço**. Este arquivo não entra no ZIP.

## Fluxo (sempre este)
1. Editar aqui → `npm run tema-zip` (raiz) → gera `tray-tema.zip` (fora do git).
2. Subir na **cópia de trabalho, tema 3564393** ("Cópia tema 3560443…", não publicada; publicada é a 3560443 desde 07/10/2026 18:43, com o mesmo código):
   painel → Aparência da loja (`/studio-app/?platform=tray`) → link "Editar HTML"
   da cópia (`a[href="/studio-app/themes/3564393/code"]`) → Ações → Enviar tema →
   Procurar arquivo → Enviar (o botão do diálogo; escolher o arquivo não envia). Resultado sai no console (Pusher): "Upload de Zip
   finalizado com sucesso." (~20 s).
3. Conferir em `https://www.atacadopolvo.com.br?loja=1544153&opencode_theme=e959dda5-b2fb-4127-a8b6-f4fe3b584fa8`.
4. Commit. **Publicar** a cópia só o usuário decide.

- Tray **recusa ZIP parcial** ("estrutura inválida"): sempre o tema inteiro.
- Envio só substitui arquivos de mesmo nome; arquivo apagado aqui continua lá.
- Enviar ZIP sem abrir a janela de arquivo: `page.locator('input[type=file]').last().setInputFiles(...)` e depois o botão "Enviar" do diálogo.
- Na lista de temas, conferir **qual está publicado** antes de clicar em "Publicar" (o card do topo é o publicado).
- Publicado (07/10/2026, 18:43) = 3560443. **Não é possível editar um tema que já está publicado** (o menu dele não tem "Editar HTML" e o /code responde "Tema está publicado"). É necessário **duplicar o tema publicado** (Mais opções → Duplicar tema): a cópia exibe a opção **Editar HTML**, e depois sobe o ZIP de novo nela e publica. Por isso a correção vai na
  3564393 e só entra no ar quando o usuário publicar. O painel agora é em `www.atacadopolvo.com.br/studio-app/`
  (no domínio antigo dá "unauthorized"). Ao publicar, as duas cópias trocam de papel: atualizar o código
  e o `opencode_theme` acima (link "Pré-visualizar" do Editar HTML da cópia). "Genesis" (3512519) é o tema antigo. **"agrada dev" não é deste projeto — nunca mexer.**
- Login no painel tem reCAPTCHA: o usuário entra na janela do Playwright.
- Pelo editor web não dá para criar/apagar arquivos em `pages/`, `layouts/`, `configs/` (pelo ZIP dá para enviar).

## Onde fica cada coisa
| Quero mudar... | Arquivo |
|---|---|
| Nossa identidade (fonte de títulos, cabeçalho, rodapé escuro, cartão, selos, botões) | `css/polvo.css` (carregado em `elements/styles.html`, antes do CSS personalizado do painel) |
| Cores base / fonte do corpo / raio | `configs/settings.json` → `current.configs` (vira `--color_*` em `elements/css-variables.html`) |
| Esqueleto da página | `layouts/default.html` |
| Home (seções arrastáveis) | `pages/home.html` + `configs/editor/sections/home.*.json` + `elements/snippets/*.html` |
| Cabeçalho (uma linha: marca, menu, Orçamento, lupa, conta, carrinho) | `elements/header.html` (menu dentro da `.line`) + `snippets/polvo-marca.html` (logo-head.svg fixo, ignora o logo do painel) + `snippets/polvo-header-acoes.html` (lupa abre a busca da Tray como painel, botão WhatsApp, marca a página atual); CSS em `polvo.css` seção 2. Menu = "Menu personalizado" em `settings.json` → `header.settings.navigation`. Até 1180px o menu vai para o ☰ |
| Rodapé | `elements/footer.html` renderiza `settings.footer.blocks` (`snippets/<tipo>.html`). Nossos blocos: `polvo_footer_about` (marca, redes, grupo de ofertas), `polvo_footer_links` (Navegação/Categorias; no painel, um link por linha "Texto | /url"), `polvo_footer_contact` (endereço/horário; telefone e e-mail = dados da loja); definidos em `configs/editor/sections/footer.json`. `support` e `social_networks` desligados. Instagram = `settings.configs.instagram` |
| Página "A empresa" (/empresa) | `snippets/polvo-empresa.html` (conteúdo do sobre.html antigo, fotos em `img/polvo/loja/`), no lugar do texto do painel: `layouts/default.html`, ramo `pages.current == 'company'` |
| Página de contato (/contato) | `snippets/polvo-contato.html` (partes `intro` e `lado`: canais, unidades, horários, mapas) em volta do formulário nativo: `layouts/default.html`, ramo `pages.current == 'contact'`. Não mudar a estrutura `.page-content > .container > .container3 + .board + .container3` (o `page-contact.js` da Tray depende dela); o que sobra da Tray some por CSS (`polvo-home.css`) |
| Página "não encontrado" | `snippets/polvo-404.html`. A Tray manda endereço inexistente **e** busca sem resultado para `/sem-resultados-na-busca`; `layouts/default.html` troca o aviso padrão quando a URL tem esse trecho. Texto serve aos dois casos e tem campo de busca |
| Linha final do rodapé | `footer.html` (.copy): mensagem do rodapé do painel ou, se vazia, `settings.footer.settings.polvo_copy` (CNPJ provisório) |
| Botão flutuante de WhatsApp | `snippets/polvo-wpp-flutuante.html` (em `layouts/default.html`, só quando o nativo da Tray está desligado) |
| Link de WhatsApp com mensagem | `snippets/polvo-wpp-url.html` (a Tray entrega acento como entidade: `Ol&aacute;`; ele converte) |
| Cartão de produto / preço / selos | `elements/snippets/product.html`, `product-price.html`, `product-tags.html` |
| Página de produto | `pages/product.html`, `elements/product-main.html` |
| Carrinho lateral (gaveta) | `snippets/sidecart.html` + `js/sidecart.js` (minificado, da Tray; nosso: botões -/+ em `updateProductQuantity`, lixeira por `closest()`, porque o `Ne()` do tema só pega clique no próprio elemento) + `polvo.css` seção 6. Kits e barra de frete grátis do tema Roupas Térmicas **não** vieram |
| Link de carrinho (`/?carrinho=produto:qtd,produto-variacao:qtd`) | `js/polvo-carrinho-link.js`: botão discreto "Copiar link do carrinho" na gaveta (todos veem; no celular abre o compartilhar) e, ao abrir o link, adiciona pela `/web_api/cart/` só o que falta até a qtd do link (reabrir não dobra), limpa a URL e abre a gaveta. Preço = o da loja na hora; kits/compre junto não entram |

## Seções próprias da home (editáveis no painel)
`home.polvo_hero` (destaque + números), `home.polvo_segments` (cards com ícone
escolhido numa lista), `home.polvo_steps` (como comprar), `home.polvo_categories`
(cards + chips com as categorias reais da loja; card sem link = busca pelo título),
`home.polvo_strip` (faixa de chamada: recorrência), `home.polvo_club` (grupo de
ofertas no WhatsApp + ilustração), `home.polvo_about` (a empresa + foto em
`img/polvo/`), `home.polvo_faq` (`<details>`, mesmo `.polvo-faq` das LPs; respostas
provisórias, o usuário ajusta) e `home.polvo_cta` (caixa em degradê + unidades/horário).
`home.polvo_brands` (faixa de logos rolando com título, JS no próprio snippet; logos em
`img/marcas/`). Animações ao rolar + contadores do hero: `snippets/polvo-reveal.html`
(incluído no fim de `pages/home.html`; alvos marcados por seletor, sem `data-*` nos snippets).
Ordem igual à home antiga: hero, marcas, mais vendidos,
categorias, como comprar, segmentos, recorrência, clube, novidades, a empresa,
FAQ, notícias, chamada final. Depoimentos **fora** até o usuário confirmar que
são clientes reais. Cada uma = JSON em
`configs/editor/sections/home.<tipo>.json` + `elements/snippets/polvo-*.html`
(abre com `{% if section.type == '<tipo>' and section.settings.enabled %}`) +
CSS em `css/polvo-home.css` (só na home). Ordem/conteúdo inicial da home:
`configs/settings.json` → `current.content.home`. Seções nativas desligadas: `brands` (carrossel com bolinhas) e `info_ruler`
("Pague como preferir", não existia no site antigo). Banners de exemplo da Tray
(slideshow, banner_line, banner_grid) ficam **desligados** até haver banners reais.
Arquivos novos em `configs/` entram normalmente pelo ZIP.
- Twig: evitar `??` e `?:` (versão da Tray desconhecida); usar `|default(...)`.
  Também nada de `filter(x => ...)` nem `for ... if`: `if` dentro do laço.
- Texto em URL: `?text=` (WhatsApp, UTF-8) por `snippets/polvo-urlencode.html`; `palavra_busca=` por `snippets/polvo-busca-termo.html` (**windows-1252**: `%E9`, não `%C3%A9`, senão a busca mostra "Papã©is"). Link fixo em `settings.json`/LP idem; nas LPs, `termoBusca` (`server/tema-lp.js`). Rede de segurança: `snippets/polvo-busca-utf8.html` (no `<head>`) troca na hora qualquer `palavra_busca=` em UTF-8 pela versão windows-1252, venha de onde vier (LP antiga, Google). Não salva busca **sem resultado**: essa a Tray redireciona no servidor para `/sem-resultados-na-busca` antes do script
  (a Tray entrega acento como entidade, até nos literais do template).
- CSS: nada de caractere fora do ASCII em `content:` (a Tray serve o CSS sem
  UTF-8); usar escape (`"\2013"`).
- "Todos os produtos" = `links.search ~ '&palavra_busca='` (`links.search` já traz `?loja=`).
- Preço na página do produto chega por JS (~2 s): esperar `#variacaoPreco` antes de conferir.

## Landing pages de SEO (criador de LPs da Tray, fora do tema)
A criação de LP pelo editor do tema foi **descontinuada**; agora é o "Criador de
landing pages" (link na lista de temas), modo **Página em branco**. Essa LP é
servida **sozinha** (sem layout/CSS do tema, `<head>` vazio, em windows-1252).
Por isso: conteúdo em `lp/<slug>.json` → `npm run lp` (`server/tema-lp.js`) monta
`lp/dist/<slug>.html` completo (CSS embutido de `polvo.css` + `_base.css` +
`polvo-home.css`, cabeçalho/rodapé iguais aos do tema (menu, faixa e links do rodapé lidos de `configs/settings.json`; CSS espelhado em `lp/_base.css`: mudou o cabeçalho/rodapé no `polvo.css`, muda lá também), contatos de `assets/js/config.js`,
tudo ASCII com entidades). Tipos de seção: cards, passos, planos, faq, posts (ver topo
de `server/tema-lp.js`). Artigo do blog = JSON com bloco `artigo` no lugar de hero/secoes
(corpo em HTML, JSON-LD Article); `blog.json` lista os artigos (`posts`, título/resumo vêm do
JSON do artigo). Artigo novo: `lp/blog-<slug>.json` + item em `blog.json` + linha em `colar-na-tray.js`.
`noindex: true` e `hero.contagem` (Black Friday). Teste: `server/tema-lp.test.js`.
- Colar na Tray: servir `lp/dist` em 127.0.0.1:3078 e rodar `lp/colar-na-tray.js`
  (Playwright `browser_run_code_unsafe`); ele cola e salva **sem ativar**.
- Criadas (todas **ativas** desde 02/10/2026, menos a blackfriday): condominios=1, escolas=3, recorrencia=5,
  restaurantes=7, hoteis=9, pets=11, blog=13, blackfriday=15, blog-quanto-material-limpeza-por-m2=17,
  blog-material-limpeza-condominio-checklist-mensal=19, blog-como-escolher-fornecedor-material-limpeza-atacado=21,
  blog-diferenca-produto-limpeza-profissional-domestico=23. Prévia: `/<slug>?preview=1&v=<qualquer>` (a LP sai com cache de 4 h; sem o `&v=` o navegador mostra a versão velha). LP que sai **vazia** (200, 0 bytes) para o público: salvar de novo no editor (sem mudar nada) resolve; o vazio fica no cache 4 h por URL (aconteceu com /blog em 07/10/2026). Logo após publicar um tema o /blog pode vir vazio por alguns segundos e voltar sozinho: conferir de novo antes de mexer.
- Ativar = checkbox "Ativo" do editor da LP (`.sidebar-edit-blank__section-status`, clicar no `label`) + Salvar. Decisão do usuário
  (os cards da home já apontam para `/condominios` e `/escolas`).
- Redirecionar quando o domínio virar (301 no painel da Tray): `/condominios.html`→`/condominios`,
  `/escolas.html`→`/escolas`, `/recorrencia.html`→`/recorrencia`, `/restaurantes.html`→`/restaurantes`,
  `/hoteis.html`→`/hoteis`, `/pets.html`→`/pets`, `/blog.html`→`/blog`, `/blackfriday.html`→`/blackfriday`,
  `/blog-<slug>.html`→`/blog-<slug>` (os 4 artigos), `/produtos.html`→busca vazia, `/index.html`→`/`.
  "A empresa" foi para o tema (/empresa, não é LP). Sem equivalente: calculadoras (desligadas no
  site antigo; o texto dos artigos que citava a calculadora virou convite para o WhatsApp). Política de privacidade: **não** copiar a antiga (descreve o
  servidor/ERP do site antigo, não a Tray); precisa de texto novo, decisão do usuário.

## Fica com o usuário no painel (não é tema)
- Telefone/WhatsApp/e-mail do rodapé = dados da loja (hoje (51) 99526-6894 e e-mail pessoal; o oficial é (51) 98025-6547, ver `assets/js/config.js`).
- Botão flutuante de WhatsApp = recurso nativo ("Ative o botão de WhatsApp na sua loja").
- Banners (o "Destaque suas CATEGORIAS" no topo da busca/categorias é banner de exemplo do painel). Texto da faixa do topo: `settings.json` → `header.settings.message_line_content` (editável no painel).
- Número do botão "Orçamento" do cabeçalho = WhatsApp dos dados da loja (`ag_telefone_3`), o mesmo do rodapé.

## Regras
- Mexer o mínimo nos arquivos da Tray (facilita atualizar o tema); o nosso vai em `polvo.css` e em arquivos novos.
- `.container` vai até 1200px entre 1025 e 1919px (Tray: 75%), como o `--wrap` do site antigo.
- Tokens do site antigo: `--polvo-*` no topo de `polvo.css` (iguais a `assets/css/style.css`).
- `main.css` é minificado (70 KB): achar seletor com `grep -o '\.seletor[^}]*}' css/main.css`.
- A CSP/regras do site antigo (sem inline) **não** valem aqui; o tema da Tray usa `<style>`/`<script>` inline.

## Feito / próximo
Lista do que falta para publicar (tema x painel): `tray-tema/PUBLICAR.md`.
Cadastro de produtos na Tray (30 feitos à mão, categorias, cuidados com o ERP, plano de importar por planilha): `tray-tema/PRODUTOS.md`.
- Favicon: `img/polvo/favicon.svg` (= `assets/img/favicon.svg`) + PNGs 48/192/180 gerados dele; tags em `layouts/default.html` e `error.html`; nas LPs vai em data URI (`favicons()` em `server/tema-lp.js`).
- Cartão de produto: "Adicionar ao carrinho" (`snippets/product.html`, `js/polvo-adicionar.js`) põe 1 un. via `/web_api/cart/` e abre o carrinho lateral; produto com variação mostra "Escolher opção" e vai para a página.
- Carrinho: "Finalizar pedido" vai para o checkout da Tray; abaixo dele, "Enviar pelo WhatsApp" (`.polvo-cart-wpp` em `sidecart.html`, número `ag_telefone_3`) manda os itens pelo WhatsApp da loja: mensagem em `js/whatsapp-checkout.js`, CSS em `polvo.css` seção 6. Newsletter do rodapé oculta (`show_newsletter: false`).

- [x] Paleta, Inter + Montserrat, cabeçalho, rodapé escuro, cartão de produto, selos.
- [x] Home: hero, barra de informações, mais vendidos, segmentos, como comprar, marcas (logos em `img/marcas/`).
- [x] Cabeçalho em uma linha como o do site antigo.
- [x] Home completa: categorias, recorrência, clube de ofertas, a empresa, FAQ, chamada final.
- [ ] Usuário: revisar as respostas do FAQ e confirmar os depoimentos (Renata Alves, Jorge Camargo).
- [x] Página de produto: preço em destaque (WhatsApp é nativo da Tray, ver acima).
- [x] Links dos cards de segmento → LPs.
- [x] LPs de SEO criadas no criador da Tray (inativas).
- [x] LPs ativas e tema publicado (02/10/2026). Black Friday inativa até perto da campanha.
- [ ] Usuário: redirecionamentos 301 quando o domínio virar (lista acima).
- [x] Blog (índice + 4 artigos) e Black Friday como LPs (inativas); "Blog" no rodapé (Navegação).
- [ ] Calculadoras: sem equivalente (desligadas também no site antigo).
