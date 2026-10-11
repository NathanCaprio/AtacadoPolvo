# O que falta para publicar a loja Tray

Conferido em 02/10/2026 na cópia de trabalho 3521907 (prévia `opencode_theme`), no
computador (1366/1791px) e no celular (390px). Este arquivo não entra no ZIP.

## Painel (com você)

### Impede de vender
- [ ] **Catálogo.** A loja só tem "produto teste" (em "categoria teste"). Falta trazer os
      produtos do Empresarius pela integração e apagar o produto e a categoria de teste.
      Os cards da home e a coluna Categorias do rodapé buscam por **Limpeza, Lavanderia,
      Papéis, Descartáveis, Sacos de Lixo, Vassouras, Rodos e Pás, Baldes, Bacias e Mops,
      Panos e Flanelas**. Hoje todas caem em "não encontrado". Se as categorias da Tray
      tiverem outros nomes, me avise que eu troco os links.
- [x] **Frete (11/10/2026).** "Frete grátis (entrega própria)" ligado, a pedido do usuário, **só em
      Porto Alegre, Canoas, Cachoeirinha e Viamão**. A primeira versão tinha os 34 municípios da Região
      Metropolitana; o usuário cortou ("Rolante, Taquara, Santo Antônio da Patrulha e São Jerônimo são
      muito longe"). Faixas de CEP (ceps.io, conferidas no ViaCEP):
      90000000–91999999 Porto Alegre (prazo 1) · 92000000–92449999 Canoas · 94400000–94599999 Viamão
      (a cidade; os distritos rurais Itapuã, Águas Claras, Capão da Porteira etc. vão até 9478x e
      ficaram de fora) · 94900000–94999999 Cachoeirinha (prazo 2 a 4 dias úteis nas três).
      **Cuidado:** 9464x–9469x são CEPs novos do litoral (Tramandaí, Osório, Capão da Canoa); não usar
      uma faixa larga tipo 94000000–94999999. Testado: Gravataí, Alvorada e 94644-000 (Tramandaí) sem
      opção. Retirada nas lojas continua desligada (só se o usuário quiser).
- [x] **Pedido mínimo R$ 300 (11/10/2026):** Configurações > Gerais > Exceções de Estado, RS bloqueado
      de 0,00 a 299,99 com mensagem. Testado: R$ 39,90 mostra a mensagem, R$ 319,20 mostra o frete grátis.
- [ ] **Dados da empresa.** O rodapé do checkout mostra "ATACADO POLVO, **CPF** …, Rua Ângelo
      Crivellaro…". Trocar pelo CNPJ e pelo endereço da loja (painel > Configurações > dados
      da loja).
- [ ] **Contato da loja.** Os dados da loja têm WhatsApp **(51) 99526-6894** e o seu e-mail
      pessoal. Eles aparecem no botão Orçamento, no botão flutuante, no rodapé e no checkout.
      O oficial é **(51) 98025-6547** (o hero, a chamada final e as LPs já usam ele).

### Antes de abrir ao público
- [ ] **Pagamento.** Conferir se "Transf. Bradesco" e "Transf. Banco do Brasil" existem
      mesmo; se não, desligar. Definir a parcela mínima: hoje um produto de R$ 5,00 mostra
      "5x de R$ 1,08 com juros" e o carrinho de R$ 10 oferece 11x de R$ 1,07.
      **11/10/2026:** ativas na Tray = 9 formas da Vindi (Boleto, Visa, Master, Elo, Amex, Diners,
      Pix, Transf. BB, Transf. Bradesco). Desligadas e disponíveis: Faturamento Direto, Depósito,
      Boleto do banco, Banricompras, outros intermediadores (Mercado Pago, PagBank, Pagar.me...,
      com +1,5% da Tray no plano Crescimento).
- [x] **Vínculo das formas de pagamento no ERP (11/10/2026, a pedido do usuário):** Pix - Vindi →
      PIX QR CODE; Cartão Visa/MasterCard/Elo/Amex/Diners - Vindi → CRÉDITO (conferido na lista).
      Boleto e Transferência Online BB/Bradesco ficam sem vínculo: o usuário quer **desligá-los na
      Tray** (Pagamentos > Configurações > Vindi > Status), mas o salvar da Tray deu "Falha ao salvar"
      (POST 401 em payment-integrator.tray.net.br, painel com aviso de manutenção); refazer.
      Condição padrão (Lojas Virtuais > Configurações > Tray) = **CRÉDITO** (salva pelo usuário;
      o modo automático barrou o "Salvar" dessa tela). Enquanto boleto/transferência estiverem
      ligados na Tray, pedido por eles entra no ERP como CRÉDITO.
      Histórico: em 11/10/2026 as 9 formas ativas estavam **sem condição vinculada** e a
      "Condição de Pagamento padrão (forma do pedido sem vínculo)" em Lojas Virtuais > Configurações >
      Tray estava **vazia**. Condições ativas no ERP: PIX QR CODE, CRÉDITO, DÉBITO, BOLETO SICREDI,
      DINHEIRO, CHEQUE, CARTEIRA, CRÉDITO TELE, DEPÓSITO / PIX VIA CHAVE, BANRI PRAZO, NENHUM.
      Sugestão: Pix → PIX QR CODE; cartões → CRÉDITO; boleto/transferências → condição própria da
      Vindi (o dinheiro cai na Vindi, não no Sicredi). Decisão do usuário/contador; não gravamos no ERP.
- [x] **Estoque do ERP para a Tray (11/10/2026):** em Lojas Virtuais > Configurações > Tray, "Atualizar o
      estoque dos produtos vinculados na loja" **ligado** (antes desligado; preço já estava ligado).
      Produto zerado no ERP fica indisponível na loja.
- [ ] **Páginas institucionais** (Como comprar, Envio, Pagamento, Tempo de Garantia, Trocas e
      devoluções, Segurança). Ainda estão com o texto padrão da Tray; o de Envio, por exemplo,
      promete "em até 2 dias úteis". O título "Seguranca" está sem cedilha.
- [ ] **Política de privacidade** nova (a do site antigo descreve o servidor antigo, não serve).
- [x] **CNPJ do rodapé** (06/10/2026): 37.418.777/0001-80 com a razão social, no tema e nas LPs.
- [ ] **FAQ e depoimentos.** Revisar as respostas do FAQ da home e trocar os depoimentos da home (textos do site antigo, já no ar) pelos de clientes reais (painel → Editar tema → Polvo: depoimentos).
- [x] **Cores do checkout (11/10/2026):** painel > Configurações > **Aparência do carrinho**, paleta
      do site aplicada e publicada: botões #7b2fe3 (hover #6a20cc) com texto branco, textos #1b0733 /
      #463160, links #551aa6, bordas #e8def7, caixa selecionada #f2eafe, fonte Roboto. Para desfazer,
      os antigos eram: texto #333333, Lato, link #606060; cabeçalho e rodapé fundo/borda #ffffff,
      segurança #3c2739/#634362, atendimento #f5eef7; botão principal #4b1d4c/#370d38/#e6d9e6 (hover
      #632f69/#4d2760/#ffffff); secundário #ffffff/#d0d0d0/#696969 (hover #f4f4f4/#d0d0d0/#3d3d3d);
      etapa #4b1d4c/#e6d9e6; caixa selecionada #d5d5d5/#4b1d4c/#333333/#4d4d4d (hover igual); selo
      #4b1d4c/#e6d9e6. Falta só o **logo**, que
      continua pequeno no topo do checkout (não achei campo de envio de arquivo nessa tela).
- [x] **Cupom POLVO5 (11/10/2026):** 5% nos produtos, 1 uso por cliente, mínimo R$ 300, sem validade,
      fora da página pública de cupons, como no site antigo. Pop-up ligado no tema. A Tray só
      aplica o cupom depois do login/cadastro, e o texto do pop-up já diz isso.
- [x] **Tema publicado (11/10/2026, 02:44):** 3564393 com a barra do pedido mínimo, os textos das 4
      cidades e o pop-up; a 3560443 recebeu o mesmo ZIP.
- [x] **Tema publicado (11/10/2026, 15:27):** 3560443 com o aviso de estoque no cartão ("Adicionar"
      ia para a página do produto quando a quantidade passava do estoque); a 3564393 recebeu o mesmo
      ZIP. Conferido na loja pública em sessão anônima.
- [x] **12 LPs recoladas (11/10/2026):** faixa do topo e chamada do blog com as 4 cidades; conferido
      nas páginas públicas.

### No dia
- [x] Publicar a cópia 3521907 (publicada em 02/10/2026).
- [x] Publicar a cópia 3560443 (02/10/2026, 23:49): carrinho com - / + e lixeira consertada
      (conferido na loja publicada, em sessão anônima).
- [x] LPs ativas (02/10/2026): condominios, escolas, recorrencia, restaurantes, hoteis, pets, blog e
      os 4 artigos; todas respondem 200 em sessão anônima.
- [ ] Ativar a **blackfriday** (noindex, contagem até 27/11) perto da campanha.
- [x] Domínio próprio (06/10/2026): www.atacadopolvo.com.br com SSL (até 04/01/2027); sem www e http
      dão 301 para https://www; canonical já aponta para o domínio novo.
- [ ] Redirecionamentos 301 (lista em `tray-tema/CLAUDE.md`): hoje `/condominios.html` etc. dão 302
      para `/sem-resultados-na-busca`.
- [ ] Sitemap: **regenerado (conferido em 11/10/2026)**, 642 endereços já em `www.atacadopolvo.com.br`
      (produtos, categorias, marcas, as LPs, /empresa e /contato; a blackfriday inativa fica de fora).
      Home com `robots: INDEX,FOLLOW` e canonical certo; robots.txt só bloqueia carrinho/checkout.
      **Search Console (11/10/2026):** propriedade "Prefixo do URL" `https://www.atacadopolvo.com.br`;
      tag `google-site-verification` no `<head>` de `layouts/default.html` (não remover), publicada na
      3564393 às 15:39 e conferida na loja. **Verificada** pelo usuário no mesmo dia. Falta: enviar
      `https://www.atacadopolvo.com.br/sitemap.xml` e pedir indexação da home e das LPs. Em 11/10/2026
      uma busca `site:atacadopolvo.com.br` (ferramenta de busca, não o Google) não achou nada.
- [ ] Conferir numa **janela anônima**. A Tray manda o navegador guardar as páginas por 4 h,
      então quem já abriu uma página pode continuar vendo a versão velha por um tempo.

## Tema (comigo)

Corrigido nesta rodada (já na cópia 3521907):
- [x] Cabeçalho torto em telas largas: o menu não ia para a direita e sobrava espaço depois do
      carrinho.
- [x] "Finalizar pedido" do carrinho abria o WhatsApp (com "OlÃ¡" quebrado) em vez do checkout.
      O `js/whatsapp-checkout.js` veio do tema publicado; está desligado em
      `elements/scripts.html` e dá para religar se você quiser pedido pelo WhatsApp.
- [x] Newsletter do rodapé oculta (`show_newsletter` no `settings.json`; volta pelo painel).
- [x] LPs com o cabeçalho, o rodapé e o botão flutuante novos (recoladas, inativas).

Publicado na 3560443:
- [x] Link "Blog" na coluna Navegação do rodapé (`npm run tema-zip` e enviar; as LPs já têm).
- [x] Carrinho lateral: quantidade com - e + (como no tema Roupas Térmicas), aviso quando falta
      estoque, lixeira removendo com um clique só; visual da gaveta de orçamento do site antigo.

Pendente, depende de você:
- [ ] CNPJ no rodapé, se for pelo tema (ver acima).
- [ ] Links das categorias, se os nomes das categorias da Tray forem outros.

## O que foi testado e passou
- **Links.** Todos os do menu, do rodapé (inclusive Institucional) e da home respondem 200.
  As únicas exceções são as LPs inativas e as buscas por categoria, que caem em "não
  encontrado" (itens do painel acima). Conta → login, carrinho → checkout. Instagram, grupo
  de ofertas e WhatsApp abrem.
- **Busca.** Com resultado, sem resultado (cai na página "não encontrado" do tema, com ou sem
  acento) e vazia ("Todos os produtos"). As sugestões aparecem enquanto se digita. Nas LPs a
  busca é simples, sem sugestões.
- **Compra.** Produto → Comprar → gaveta do carrinho → Finalizar pedido → carrinho da Tray →
  Continuar → identificação (e-mail/CPF). Parei aí: não criei conta nem paguei. O frete
  travou, ver acima.
- **Celular.** Home, produto, busca, empresa, contato e "não encontrado" sem rolagem lateral.
