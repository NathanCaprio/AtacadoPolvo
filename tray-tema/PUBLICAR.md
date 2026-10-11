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
- [x] **Frete (11/10/2026).** "Frete grátis (entrega própria)" ligado, a pedido do usuário: só Porto
      Alegre e Região Metropolitana ("não iremos atender outras regiões"). Faixas de CEP (ceps.io,
      conferidas no ViaCEP; os buracos entre faixas não têm cidade, e onde há cidade de fora a faixa
      para antes):
      90000000–91999999 Porto Alegre (prazo 1) · 92000000–92849999 Canoas, Nova Santa Rita,
      Montenegro (CEP novo 925xx), Guaíba (927xx) · 92990000–93939999 Eldorado do Sul, São Leopoldo,
      Portão, Sapucaia, Esteio, Novo Hamburgo, Estância Velha, Campo Bom, Sapiranga, Araricá, Nova
      Hartz, Ivoti · 93950000–93989999 Dois Irmãos · 94000000–94999999 Gravataí, Glorinha, Viamão,
      Alvorada, Cachoeirinha · 95500000–95514999 Santo Antônio da Patrulha · 95600000–95624999
      Taquara · 95630000–95659999 Parobé, Igrejinha · 95690000–95694999 Rolante ·
      95745000–95747999 Capela de Santana · 95760000–95764999 São Sebastião do Caí ·
      95780000–95782999 Montenegro (CEP antigo) · 95840000–95859999 Triunfo · 96700000–96734999
      São Jerônimo · 96740000–96749999 Arroio dos Ratos, Charqueadas (todas com prazo 2 a 4 dias úteis).
      Fora disso (ex.: Lindolfo Collor 93940-000, São Paulo) não aparece opção. Retirada nas lojas
      continua desligada (só se o usuário quiser).
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
- [ ] **Vínculo das formas de pagamento no ERP** (Empresarius > Lojas Virtuais > Tray > Formas de
      Pagamentos). Em 11/10/2026 as 9 formas ativas estavam **sem condição vinculada** e a
      "Condição de Pagamento padrão (forma do pedido sem vínculo)" em Lojas Virtuais > Configurações >
      Tray estava **vazia**. Condições ativas no ERP: PIX QR CODE, CRÉDITO, DÉBITO, BOLETO SICREDI,
      DINHEIRO, CHEQUE, CARTEIRA, CRÉDITO TELE, DEPÓSITO / PIX VIA CHAVE, BANRI PRAZO, NENHUM.
      Sugestão: Pix → PIX QR CODE; cartões → CRÉDITO; boleto/transferências → condição própria da
      Vindi (o dinheiro cai na Vindi, não no Sicredi). Decisão do usuário/contador; não gravamos no ERP.
- [ ] **Estoque do ERP para a Tray:** em Lojas Virtuais > Configurações > Tray, "Atualizar o estoque
      dos produtos vinculados na loja" estava **desligado** em 11/10/2026 (preço ligado).
- [ ] **Páginas institucionais** (Como comprar, Envio, Pagamento, Tempo de Garantia, Trocas e
      devoluções, Segurança). Ainda estão com o texto padrão da Tray; o de Envio, por exemplo,
      promete "em até 2 dias úteis". O título "Seguranca" está sem cedilha.
- [ ] **Política de privacidade** nova (a do site antigo descreve o servidor antigo, não serve).
- [x] **CNPJ do rodapé** (06/10/2026): 37.418.777/0001-80 com a razão social, no tema e nas LPs.
- [ ] **FAQ e depoimentos.** Revisar as respostas do FAQ da home e trocar os depoimentos da home (textos do site antigo, já no ar) pelos de clientes reais (painel → Editar tema → Polvo: depoimentos).
- [ ] **Checkout (opcional).** O carrinho e o checkout da Tray usam roxo-escuro e o logo
      pequeno. Dá para acertar a cor e o logo nas configurações do checkout: painel >
      Configurações > **Aparência do carrinho** (37 cores + fonte; botão principal hoje #4b1d4c).
      Paleta proposta em 11/10: botões #7b2fe3 (hover #6a20cc) com texto branco, textos #1b0733 /
      #463160, links #551aa6, bordas #e8def7, caixa selecionada #f2eafe, fonte Roboto.
      O usuário disse "pode" (11/10), mas o modo automático barrou ("Unrequested Commit in a
      Connected App"); nada mudou. Precisa de um ok explícito de novo, ou o usuário aplica.
- [ ] **Cupom POLVO5** (5% nos produtos, 1 uso por cliente, mínimo R$ 300, sem validade, fora da
      página pública de cupons), igual ao site antigo. Cadastro barrado pelo modo automático em
      11/10 (o formulário não foi salvo). Depois de cadastrar, ligar `polvo_cupom_ativo` no tema.
- [ ] **Publicar a 3560443** (barra do pedido mínimo no carrinho, textos de frete grátis). A
      publicação também foi barrada ("Production Deploy"): só com o ok do usuário.

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
- [ ] Sitemap: o da Tray ainda lista `nathansilva.commercesuite.com.br`; conferir se regenera e
      depois enviar `https://www.atacadopolvo.com.br/sitemap.xml` no Google Search Console.
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
