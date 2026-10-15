# tray-tema — tema da loja Tray (Atacado Polvo)

Loja: `www.atacadopolvo.com.br` (desde 06/10/2026; antes `nathansilva.commercesuite.com.br`; código 1544153). Base: Tema Padrão 3.0
v3.0.8 da Tray, **Twig**. A loja vende **com preço**. Este arquivo não entra no ZIP.

## Fluxo (sempre este)
1. Editar aqui → `npm run tema-zip` (raiz) → gera `tray-tema.zip` (fora do git).
2. Subir na **cópia de trabalho, tema 3564393** ("Cópia tema 3560443…", não publicada; publicada é a 3560443 "Cópia tema 3521907…" desde 15/10/2026 12:22). Logo após publicar, a cópia de trabalho recebeu o mesmo ZIP (as duas iguais):
   painel → Aparência da loja (`/studio-app/?platform=tray`) → link "Editar HTML"
   da cópia (`a[href="/studio-app/themes/3564393/code"]`; abrir `/code` direto pela URL dá 404) → Ações → Enviar tema →
   Procurar arquivo → Enviar (o botão do diálogo; escolher o arquivo não envia). Resultado sai no console (Pusher): "Upload de Zip
   finalizado com sucesso." (~20 s).
3. Conferir em `https://www.atacadopolvo.com.br?loja=1544153&opencode_theme=e959dda5-b2fb-4127-a8b6-f4fe3b584fa8` (3564393; o `ab9ec62e-5e89-49cc-8f53-b2fff4524948` é o da 3560443, hoje publicada). A prévia funciona também num contexto novo do Playwright (`browser.newContext()`), sem login: bom para testar carrinho sem mexer no da janela do usuário. A prévia cai ao abrir o painel (studio-app): repetir o `?loja=...&opencode_theme=` antes de conferir, senão se vê o tema publicado.
4. Commit. **Publicar** a cópia só o usuário decide. O modo automático barra publicar por script ("Production Deploy"), mesmo com o ok. Com o ok explícito do usuário, o caminho que passou foi clicar com as ferramentas de clique: lista de temas → botão "Publicar" do card da cópia → "Publicar tema". O modal mostra o **nome** do tema, não o código.

- Tray **recusa ZIP parcial** ("estrutura inválida"): sempre o tema inteiro.
- Envio só substitui arquivos de mesmo nome; arquivo apagado aqui continua lá.
- Enviar ZIP sem abrir a janela de arquivo: `page.locator('input[type=file]').last().setInputFiles(...)` e depois o botão "Enviar" do diálogo. Em 11/10/2026 o modo automático barrou isso por script ("Production Deploy", mesmo na cópia não publicada); com o ok do usuário passou com cliques: Ações → Enviar tema → Procurar arquivo → `browser_file_upload` → Enviar.
- Na lista de temas, conferir **qual está publicado** antes de clicar em "Publicar" (o card do topo é o publicado).
- Publicado (15/10/2026, 12:22) = 3560443. **Não é possível editar um tema que já está publicado** (o menu dele não tem "Editar HTML" e o /code responde "Tema está publicado"). É necessário **duplicar o tema publicado** (Mais opções → Duplicar tema): a cópia exibe a opção **Editar HTML**, e depois sobe o ZIP de novo nela e publica. Por isso a correção vai na
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
| Cabeçalho (uma linha: marca, menu, Orçamento, lupa, conta, carrinho) | `elements/header.html` (menu dentro da `.line`) + `snippets/polvo-marca.html` (logo-head.svg fixo, ignora o logo do painel) + `snippets/polvo-header-acoes.html` (lupa abre a busca da Tray como painel, botão WhatsApp, marca a página atual; busca, categoria e produto marcam "Produtos"); CSS em `polvo.css` seção 2. Menu = "Menu personalizado" em `settings.json` → `header.settings.navigation`. Até 1180px o menu vai para o ☰. "Mais buscados" (chips embaixo do campo, somem ao digitar): `snippets/search.html`, termos no painel (Cabeçalho > Busca, `polvo_suggestions`, separados por vírgula; padrão em `header.json` e `settings.json`). Termo novo: conferir antes que a busca acha algo (sem resultado vira "não encontrado") |
| Rodapé | `elements/footer.html` renderiza `settings.footer.blocks` (`snippets/<tipo>.html`). Nossos blocos: `polvo_footer_about` (marca, redes, grupo de ofertas), `polvo_footer_links` (Navegação/Categorias; no painel, um link por linha "Texto | /url"), `polvo_footer_contact` (endereço/horário; telefone e e-mail = dados da loja); definidos em `configs/editor/sections/footer.json`. `support` e `social_networks` desligados. Instagram = `settings.configs.instagram`. No celular, Navegação/Categorias/Institucional abrem e fecham: script no fim do `.cols` em `footer.html` troca o `.title` por `<button class="title polvo-rodape-toggle">` (vale para qualquer `.box` com `.title` + `.list`/`.overflow`, menos o Contato); CSS no fim da seção 5 |
| Página "A empresa" (/empresa) | `snippets/polvo-empresa.html` (conteúdo do sobre.html antigo, fotos em `img/polvo/loja/`), no lugar do texto do painel: `layouts/default.html`, ramo `pages.current == 'company'` |
| Página de contato (/contato) | `snippets/polvo-contato.html` (partes `intro` e `lado`: canais, unidades, horários, mapas) em volta do formulário nativo: `layouts/default.html`, ramo `pages.current == 'contact'`. Não mudar a estrutura `.page-content > .container > .container3 + .board + .container3` (o `page-contact.js` da Tray depende dela); o que sobra da Tray some por CSS (`polvo-home.css`) |
| Faixa de categorias (carrossel com ícone) no topo da categoria e da busca | `snippets/polvo-cat-faixa.html` (incluída em `pages/catalog.html` e `pages/search.html`; ícone pela palavra-chave do nome em `chaves`; categoria nova sem palavra conhecida = ícone de caixa) + `polvo.css` seção 7. Classe `.polvo-catnav` (`.polvo-faixa` já é a faixa de recorrência da home, e `polvo-home.css` também carrega fora da home) |
| Paginação (categoria e busca) | `snippets/pagination.html` (`numbers` com `first`/`last`/`ellipsis`: `1 … 4 5 6 … 12`; a Tray aceita) + `polvo.css` seção 7 (`.polvo-paginacao`). Celular: só setas em Anterior/Próxima |
| Menu do celular (☰) | `snippets/menu-mobile.html` (Tray) + nosso `snippets/polvo-menu-extra.html` embaixo dos links: categorias da loja (1º nível, chips) e "Pedir pelo WhatsApp". O `.nav-mobile` tinha `height:100%` e empurrava o complemento para fora (`polvo.css` seção 2). O ☰ é uma div: ganhou `role=button`/`tabindex` e Enter/espaço (`snippets/header-menu.html`) |
| Barra fixa de compra (celular) | `snippets/polvo-barra-compra.html` (incluída no `product_form.html`): aparece quando o "Quantidade + Comprar" sai da tela por cima; botão clica o `#button-buy` nativo (com variação, rola até o formulário); preço de `#produto_preco`. No computador quem faz isso é a `.quick-buy` da Tray (o botão de WhatsApp sobe quando ela está ativa). A Tray manda HTML diferente por user-agent: conferir celular com contexto móvel (UA de iPhone), não só janela estreita |
| Pop-up do cupom de 1ª compra | `snippets/polvo-cupom.html` (em `layouts/default.html`; CSS em `polvo.css` "Pop-up do cupom"). Liga no editor do tema: Rodapé > "Pop-up de cupom de primeira compra" + código + texto do desconto (`polvo_cupom_*` em `footer.json`/`settings.json`); sem código não aparece. Pede nome e e-mail (vão para a newsletter da Tray via `/mvc/store/newsletter/`) e mostra o código para usar no carrinho. Aparece uma vez (20 s, metade da página ou mouse saindo pelo topo); fechou volta em 7 dias. O passo final mostra o pedido mínimo (`polvo_pedido_minimo`). **Ligado desde 11/10/2026** com o cupom **POLVO5**: Marketing > Cupons de desconto, id 1. Ele dá 5% nos produtos, 1 uso por cliente, mínimo de R$ 300, não tem validade e não aparece na página pública de cupons. Como o uso é por cliente, a Tray só aplica depois do login ("Cadastre-se ou faça o login para aplicar este cupom"). Por isso o pop-up manda usar o código na finalização, não no carrinho |
| Página "não encontrado" | `snippets/polvo-404.html`. A Tray manda endereço inexistente **e** busca sem resultado para `/sem-resultados-na-busca`; `layouts/default.html` troca o aviso padrão quando a URL tem esse trecho. Texto serve aos dois casos e tem campo de busca |
| Linha final do rodapé | `footer.html` (.copy): mensagem do rodapé do painel ou, se vazia, `settings.footer.settings.polvo_copy` (CNPJ provisório) |
| Botão flutuante de WhatsApp | `snippets/polvo-wpp-flutuante.html` (em `layouts/default.html`, só quando o nativo da Tray está desligado). Script no próprio snippet esconde o botão (`.polvo-wpp-fab--oculto`) enquanto ele cobre um botão de ação (lista no `querySelectorAll`: `.polvo-compra`, `.polvo-pdp-compra`, barra de compra, paginação, `.polvo-btn`, outros links wa.me) (rolagem, resize e ResizeObserver, porque o preço chega por JS e empurra o "Comprar") |
| Link de WhatsApp com mensagem | `snippets/polvo-wpp-url.html` (a Tray entrega acento como entidade: `Ol&aacute;`; ele converte) |
| Cartão de produto / preço / selos | `elements/snippets/product.html`, `product-price.html`, `product-tags.html` |
| Página de produto | `pages/product.html`, `elements/product-main.html`, `snippets/product_form.html` (nome com o compartilhar do celular ao lado em `.polvo-pdp-titulo`; no celular a "Descrição Geral" abre sozinha: script no fim de `snippets/product-tabs.html` simula o toque depois que o `page-product.js` fecha tudo; quantidade, WhatsApp "Comprando em quantidade?", vantagens) + `polvo.css` seção 8. **Quantidade:** a Tray não gera o campo nesta loja; o nosso `#quantidade #quant` (name `quant`) fica no `#form_comprar`: o "Comprar" nativo manda `quant` e o `page-product.js` liga `.increment-page .low/.add` (limita ao estoque). Sem ele, o `page-product.js` pegava o 1º `input[type=number]` da página (cartão dos relacionados). Se a Tray passar a gerar `#quant`, tirar o nosso |
| Setas das vitrines / "Produtos visualizados" | `js/polvo-setas.js`: setas só em lista com itens e somem quando tudo cabe (`.sem-setas`); no celular (até 767px) não aparecem (cobriam o nome do produto; passa com o dedo e tem bolinhas). Os visualizados a Tray recria fora do `.container` (`appendVisited`); o script devolve ao lugar, apaga setas órfãs e põe "Ver produto" nos cartões (o HTML não traz o id para comprar direto) |
| Carrinho lateral (gaveta) | `snippets/sidecart.html` + `js/sidecart.js` (minificado, da Tray; nosso: botões -/+ em `updateProductQuantity`, nome sem o "(Ref. ...)" que a API do carrinho cola no fim (`f=d[0].replace(...)`), lixeira por `closest()`, porque o `Ne()` do tema só pega clique no próprio elemento) + `polvo.css` seção 6. Kits e barra de frete grátis do tema Roupas Térmicas **não** vieram. **Pedido mínimo:** `.polvo-minimo` no `sidecart.html` ("Faltam R$ X para o pedido mínimo de R$ 300,00", barra que fica verde ao atingir), valor em Rodapé > `polvo_pedido_minimo`; lê o subtotal que o `sidecart.js` escreve em `.total .value` (MutationObserver, depois do DOMContentLoaded: o `.value` vem depois no HTML). Só avisa; quem trava é a exceção de estado (abaixo) |
| Link de carrinho (`/?carrinho=produto:qtd,produto-variacao:qtd`) | `js/polvo-carrinho-link.js`: botão discreto "Copiar link do carrinho" na gaveta (todos veem; no celular abre o compartilhar) e, ao abrir o link, adiciona pela `/web_api/cart/` só o que falta até a qtd do link (reabrir não dobra), limpa a URL e abre a gaveta. Espera o `data-session` (até 20 s): visitante novo em celular lento (link aberto pelo WhatsApp) recebe a sessão depois do `load`, e antes o script limpava a URL e desistia; a URL só é limpa depois de montar o carrinho. Preço = o da loja na hora; kits/compre junto não entram |

## Seções próprias da home (editáveis no painel)
`home.polvo_hero` (destaque; a faixa de números foi tirada a pedido em 15/10/2026, os blocos `polvo_stat` ficam no painel sem uso), `home.polvo_segments` (cards com ícone
escolhido numa lista), `home.polvo_steps` (como comprar), `home.polvo_categories`
(cards + chips com as categorias reais da loja; card sem link = busca pelo título),
`home.polvo_strip` (faixa de chamada: recorrência), `home.polvo_club` (grupo de
ofertas no WhatsApp + ilustração), `home.polvo_about` (a empresa + foto em
`img/polvo/`), `home.polvo_faq` (`<details>`, mesmo `.polvo-faq` das LPs; respostas
provisórias, o usuário ajusta) e `home.polvo_cta` (caixa em degradê + unidades/horário).
`home.polvo_brands` (faixa de logos rolando com título, JS no próprio snippet; logos em
`img/marcas/`). No celular (até 767px) segmentos e depoimentos viram carrossel de um card por vez: scroll-snap em `polvo-home.css` (fim do arquivo) + bolinhas em `snippets/polvo-deslize.html` (no fim de `pages/home.html`); esses cards ficam sem a animação de entrada no celular. Animações ao rolar + contadores do hero: `snippets/polvo-reveal.html`
(incluído no fim de `pages/home.html`; alvos marcados por seletor, sem `data-*` nos snippets).
Ordem igual à home antiga: hero, marcas, mais vendidos,
categorias, como comprar, segmentos, recorrência, clube, novidades, a empresa, depoimentos,
FAQ, notícias, chamada final. Avaliações do Google (`home.polvo_reviews`, `snippets/polvo-reviews.html`, desde 15/10/2026 no lugar dos depoimentos inventados): selo com nota e total do perfil (`google_rating`/`google_count`, **atualizar à mão** no painel) + links "Ver todas"/"Avaliar" (`#lrd=0x95199d104b92e6a1:0x2cf1555d271facf3,1` / `,3`) + carrossel com **todas as avaliações com texto** (53 em 15/10/2026; com foto de perfil primeiro), dados em `snippets/polvo-avaliacoes-google.html` (não é editável no painel; nome + inicial do sobrenome, sem emoji; fora a do dono, duas que não falam da loja e as que parecem de familiares: Sá Costa, Pauli Costa, de Castro, "Magda"), fotos de perfil em `img/avaliacoes/*.webp` (88px, baixadas do Google: `=s88-c-rw`; avatar de letra = PNG < 2 KB, não entra). Carrossel = scroll-snap + arrastar com o mouse (`.is-arrastando` desliga o snap até soltar) + setas `.polvo-seta` + contador "1 a 3 de 53" (script no próprio snippet; sem bolinhas, `polvo-deslize` ignora `.polvo-depos--trilho`). G do Google em `snippets/polvo-google-g.html`. Sem dados estruturados de review (o Google proíbe em avaliação do próprio negócio). Não usar API/widget: decisão do usuário (custo, PageSpeed). Cada uma = JSON em
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
- Cards de categoria da home (`polvo-categories.html`): sem link no painel, abrem a **categoria da loja de mesmo nome** (comparação normalizada por `polvo-busca-termo`); busca só se não houver categoria. A busca pelo nome **não** acha categorias ("Lavanderia", "Vassouras, Rodos e Pás" dão "não encontrado"). Rodapé "Categorias" também aponta para `/limpeza`, `/papeis`...
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
- Menu do celular das LPs = o do tema: categorias (as da coluna "Categorias" do rodapé, a LP não lê as da loja) + "Pedir pelo WhatsApp" (`.lp-nav__extra`); rodapé com colunas que abrem e fecham no celular (`.lp-rodape__toggle`, script no `SCRIPT`).
- Colar na Tray: servir `lp/dist` em 127.0.0.1:3078 e rodar `lp/colar-na-tray.js`
  (Playwright `browser_run_code_unsafe`); ele cola e salva **sem ativar**. Em 11/10/2026 o modo automático
  barrou esse script ("Production Deploy"), mesmo com o ok. Para troca pontual de texto (ex.: e-mail), o que
  passou foi com cliques, LP por LP: lista → `tr:has(td:text-is("<código>"))` (hover) → Editar → clicar no
  código (`.monaco-editor .view-lines`) → Ctrl+H → Find/Replace (`role=textbox[name="Find"]`/`"Replace"`) →
  Replace All → Salvar → voltar por `a[href="/studio-app/landing-pages"]`. **Não** clicar no primeiro botão
  do cabeçalho do editor: é "Mais opções" (tem "Excluir landing page").
- Criadas (todas **ativas** desde 02/10/2026, menos a blackfriday): condominios=1, escolas=3, recorrencia=5,
  restaurantes=7, hoteis=9, pets=11, blog=13, blackfriday=15, blog-quanto-material-limpeza-por-m2=17,
  blog-material-limpeza-condominio-checklist-mensal=19, blog-como-escolher-fornecedor-material-limpeza-atacado=21,
  blog-diferenca-produto-limpeza-profissional-domestico=23. Prévia: `/<slug>?preview=1&v=<qualquer>` (a LP sai com cache de 4 h; sem o `&v=` o navegador mostra a versão velha). LP que sai **vazia** (200, 0 bytes) para o público: salvar de novo no editor (sem mudar nada) resolve; o vazio fica no cache 4 h por URL (aconteceu com /blog em 07/10/2026). Logo após publicar um tema o /blog pode vir vazio por alguns segundos e voltar sozinho: conferir de novo antes de mexer. Depois de colar, a versão pública pode demorar a trocar mesmo com `?v=` novo: quem segura é a origem da Tray, não o CDN (`x-cache-hits: 0`); a prévia (`?preview=1`) já mostra a nova. Em 07/10/2026: 9 LPs na hora, /escolas em ~2 min, /condominios passou de 10 min mesmo salva de novo. Conferir com `fetch` procurando um trecho novo do CSS. Em 11/10/2026 (troca do e-mail) foram duas camadas: com `?nc=` aleatório a origem alternava nova/velha em todas as 11 LPs (metade dos servidores ainda velha 1 h depois de salvar), e o endereço puro vinha **fixo** da borda Azion (POA, `x-cache-hits: 1`, `max-age=14400`, `Vary: User-Agent`) com a versão velha. Lojista não tem como limpar esse cache: é esperar até ~4 h (o visitante vê o endereço puro).
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
- Telefone/WhatsApp/e-mail do rodapé = dados da loja: **(51) 98025-6547** e **polvoclean@gmail.com** (11/10/2026; LPs leem de `assets/js/config.js`). Como a Tray liga isso (descoberto em 11/10/2026):
  - Configurações > **Informações** (`/admin/settings/store-info`): Telefone principal → `ag_telefone_1`, E-mail principal → `ag_email_1`. Os telefones adicionais entram **compactados** (o 1º preenchido vira `ag_telefone_2`).
  - **`ag_telefone_3`** (WhatsApp de todos os botões do tema) é texto de Configurações > **Textos e mensagens** (`/admin/settings/langs`). **Cada salvamento em Informações o apaga** ("(não informado)") e os botões de WhatsApp do tema somem: depois de salvar Informações, preencher de novo o `ag_telefone_3`.
  - "Informações adicionais para o rodapé da loja" = `ag_mensagem_rodape`, **obrigatório** para salvar a tela (sem ele o Salvar não manda nada). Preenchido, ele substitui o `polvo_copy` na linha final do rodapé. A tela grava em ISO-8859-1: travessão "—" vira "?", usar hífen. Hoje: "Atacado da Limpeza Polvo - CNPJ 37.418.777/0001-80".
- **Logos fora do tema** (o cabeçalho do tema usa `polvo-marca.html`): Aparência da loja > **Imagens padrões** (`/adm/cores/cores.php?aba=imagens`) tem 4 linhas: "Logotipo da Loja" (= logo do checkout no computador), "Logotipo Mobile" (checkout no celular), "Logotipo para E-mails" e "Logotipo para Impressão". Até 11/10/2026 as 4 eram o polvo antigo roxo-escuro (JPG 686×686); trocadas nesse dia por `tray-tema/logo-checkout.png` (848×184, igual à marca do cabeçalho) e, no Mobile, `tray-tema/logo-checkout-mobile.png` (640×152, polvo + "POLVO", como o cabeçalho no celular). Os dois foram gerados do próprio cabeçalho do site e ficam fora do ZIP. Subir: Editar (não o Excluir ao lado) → área de imagem → arquivo → Salvar. O checkout (EasyCheckout > Personalizar Layout, em Configurações > "Aparência do carrinho") lê essas imagens; o "Selecionar logotipo" de lá só manda para a mesma página. O logo do computador troca sozinho alguns minutos depois de salvar; o do **celular só troca depois de "Publicar"** em Personalizar Layout (2 h esperando não bastou; publicado em 11/10/2026 22h09, cores mantidas). O modo automático barra o envio sem ok explícito do usuário.
- Botão flutuante de WhatsApp = recurso nativo ("Ative o botão de WhatsApp na sua loja").
- Banners (o "Destaque suas CATEGORIAS" no topo da busca/categorias é banner de exemplo do painel). Texto da faixa do topo: `settings.json` → `header.settings.message_line_content` (editável no painel).
- Número do botão "Orçamento" do cabeçalho = WhatsApp dos dados da loja (`ag_telefone_3`), o mesmo do rodapé.
- **Retirada nas lojas (12/10/2026):** mais duas formas ativas, `id_tabela=10` (Medianeira) e `21` (Bento Gonçalves), cópias da tabela abaixo (mesmos CEPs e pesos, prazo 1 dia útil, aba Configuração com "retirada pessoalmente na loja = Sim"). Detalhes em `PUBLICAR.md`. Tabela nova só pode ser "Habilitada" depois de ter faixa de CEP com peso. Nas faixas recém-inseridas o formulário de peso já vem aberto; o "+" (Incluir Valores) alterna abrir/fechar.
- **Frete (11/10/2026):** forma de entrega = "Frete grátis (entrega própria)", a tabela por CEP "Frete Grátis" (`frete_editar_v2.php?id_tabela=11&identificacao=extra_cep`) em Configurações > Frete e envio. 4 faixas (lista em `PUBLICAR.md`): todas com prazo de **3 a 4 dias úteis** (14/10/2026; até então Porto Alegre tinha 1 e as outras 2 a 4). Prazo de cada faixa: aba "Valores de frete" → lápis da faixa → Salvar (o check da linha). As outras cidades da Região Metropolitana saíram a pedido do usuário (longe demais). Os textos do tema e das LPs citam as 4 cidades; cada faixa tem peso de 0 a 10.000.000 g marcado "Frete Grátis". CEP fora das faixas não tem opção nenhuma. A descrição usa `[prazo_entrega_extenso]`, que a Tray troca pela data ("14/10/2026" ou "15/10/2026 até 19/10/2026"). Imagem 100x100: `ferramentas/arte-frete.png` (gerador `ferramentas/arte-frete.js`). A Tray guarda a simulação de frete em cache por alguns minutos.
- **Pedido mínimo R$ 300 (11/10/2026):** a Tray não tem campo de pedido mínimo geral. Feito em Configurações > Gerais > **Exceções de Estado**: RS com bloqueio parcial de **0,00 a 299,99** e a mensagem "O pedido mínimo é de R$ 300,00...". A faixa é a que fica **bloqueada**: testado na simulação de frete, onde 300–999.999 barrou o pedido grande e liberou o pequeno. A mensagem aparece no simulador de frete do produto e no checkout. Mudou o valor: mudar lá e em `polvo_pedido_minimo` (tema).

## Regras
- Mexer o mínimo nos arquivos da Tray (facilita atualizar o tema); o nosso vai em `polvo.css` e em arquivos novos.
- `.container`: o da Tray (1080px; 75% entre 1025 e 1919px, com mínimo de 1200px em `polvo.css`; 1440px a partir de 1920; 15px dos lados; cabeçalho 16px no celular). As LPs copiam as mesmas regras (`lp/_base.css`), senão o cabeçalho pula ao entrar numa LP: mudou um lado, mudar o outro e recolar as LPs. Fixar 1200px estreitou demais a categoria em tela grande (o usuário pediu de volta, 07/10/2026).
- Tokens do site antigo: `--polvo-*` no topo de `polvo.css` (iguais a `assets/css/style.css`).
- PageSpeed (10/10/2026, publicado): `css/polvo*.css` vão **minificados no ZIP** (`minificarCss` em `server/tema-zip.js`; o fonte fica legível). **Fontes no próprio tema** (11/10/2026): `css/fonts/inter-latin.woff2` e `montserrat-latin.woff2` (subconjunto latin do Google Fonts, arquivo variável), `@font-face` + preload em `elements/styles.html`; se a fonte do corpo for trocada no painel, ela volta a vir do Google. `sidecart.css` carrega sem bloquear (`media=print` + `onload`), e o `swiper.min.css` também, **só na home** (produto e categoria usam swiper no topo); a regra que mantém a gaveta fora da tela até lá está em `polvo.css` seção 6. Logos de `img/marcas/` reduzidos a até 112px de altura; `polvo-brands.html` tem a largura de cada um (`larguras`): logo novo = linha nova lá. Antes do swiper iniciar, `.item` das vitrines já tem a largura final (`polvo.css` seção 4). Selo "Loja Protegida" ganha `width/height` por `replace` em `snippets/payment_security.html`. Sem conserto pelo tema (15/10/2026): `ai-catalog.json` (a Tray redireciona endereço inexistente para `/sem-resultados-na-busca`, HTML), 403 do `pageviews.tray.com.br` (contador da Tray), JS da plataforma (`application-2.0.min.js`, `updateGTM.js`). PageSpeed da prévia (`opencode_theme`) não serve para comparar desempenho: a prévia carrega jQuery/application da Tray em dobro.
- `main.css` é minificado (70 KB): achar seletor com `grep -o '\.seletor[^}]*}' css/main.css`.
- A CSP/regras do site antigo (sem inline) **não** valem aqui; o tema da Tray usa `<style>`/`<script>` inline.

## Feito / próximo
Lista do que falta para publicar (tema x painel): `tray-tema/PUBLICAR.md`.
Cadastro de produtos na Tray (30 feitos à mão, categorias, cuidados com o ERP, plano de importar por planilha): `tray-tema/PRODUTOS.md`.
- Favicon: `img/polvo/favicon.svg` (= `assets/img/favicon.svg`) + PNGs 48/192/180 gerados dele; tags em `layouts/default.html` e `error.html`; nas LPs vai em data URI (`favicons()` em `server/tema-lp.js`).
- Cartão de produto: quantidade -/+ (campo digitável, 1 a 999, Enter adiciona) + "Adicionar" (`snippets/product.html`, `js/polvo-adicionar.js`) põe a quantidade escolhida via `/web_api/cart/`, mostra "Adicionado" e abre o carrinho lateral; produto com variação mostra "Escolher opção" e vai para a página. Teto do campo = estoque (`qtdMax` no snippet; o estoque vem do ERP desde 11/10/2026); a Tray recusa acima disso (400 "estoque insuficiente") e o cartão mostra `.polvo-compra__aviso` em vez de ir para a página (antes ia, sem explicar). O `data-session` do `<html>` a Tray preenche por JS ~0,5 s depois de abrir; o script espera por ele. Texto com acento no JS = escape `\u00xx` (o editor de arquivos converte o escape em acento: conferir depois). Sempre na mesma linha; cartão com < 228px (container query: celular, busca com filtros) usa -/+ menores e "Adicionar" só com o ícone (texto escondido só para a vista). Estrelas só com avaliação (`product.ranking.count`). Foto com `mix-blend-mode: multiply` sobre o lilás claro. O campo precisa de seletor forte: a Tray põe borda em `input:not([type=radio]):not([type=checkbox])`.
- Vitrines da home: "Ver todos os produtos" embaixo (`snippets/showcase.html`).
- Carrinho: "Finalizar pedido" vai para o checkout da Tray; abaixo dele, "Enviar pelo WhatsApp" (`.polvo-cart-wpp` em `sidecart.html`, número `ag_telefone_3`) manda os itens pelo WhatsApp da loja: mensagem em `js/whatsapp-checkout.js`, CSS em `polvo.css` seção 6. Os cartões de "Recomendamos para você" também são `.box-cart` (dentro de `.related-product`): ficam fora da mensagem. Abre trocando o `href` do link no clique, não com `window.open` (o navegador embutido do WhatsApp/Instagram bloqueia). Newsletter do rodapé oculta (`show_newsletter: false`).

- [x] Paleta, Inter + Montserrat, cabeçalho, rodapé escuro, cartão de produto, selos.
- [x] Home: hero, barra de informações, mais vendidos, segmentos, como comprar, marcas (logos em `img/marcas/`).
- [x] Cabeçalho em uma linha como o do site antigo.
- [x] Home completa: categorias, recorrência, clube de ofertas, a empresa, FAQ, chamada final.
- [ ] Usuário: revisar as respostas do FAQ. (Depoimentos trocados por avaliações reais do Google em 15/10/2026.)
- [x] Página de produto: preço em destaque (WhatsApp é nativo da Tray, ver acima).
- [x] Links dos cards de segmento → LPs.
- [x] LPs de SEO criadas no criador da Tray (inativas).
- [x] LPs ativas e tema publicado (02/10/2026). Black Friday inativa até perto da campanha.
- [ ] Usuário: redirecionamentos 301 quando o domínio virar (lista acima).
- [x] Blog (índice + 4 artigos) e Black Friday como LPs (inativas); "Blog" no rodapé (Navegação).
- [ ] Calculadoras: sem equivalente (desligadas também no site antigo).
