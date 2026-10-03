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
- [ ] **Frete.** Com CEP de Porto Alegre (90010-000), o carrinho responde "Nenhuma forma de
      envio disponível para este endereço". Configurar a entrega própria (frete por faixa
      de CEP da Região Metropolitana) e, se quiser, retirada nas duas lojas.
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
- [ ] **Páginas institucionais** (Como comprar, Envio, Pagamento, Tempo de Garantia, Trocas e
      devoluções, Segurança). Ainda estão com o texto padrão da Tray; o de Envio, por exemplo,
      promete "em até 2 dias úteis". O título "Seguranca" está sem cedilha.
- [ ] **Política de privacidade** nova (a do site antigo descreve o servidor antigo, não serve).
- [ ] **CNPJ do rodapé.** Hoje aparece o provisório "CNPJ 00.000.000/0001-00". Preencha a
      "mensagem do rodapé" no painel ou me passe o CNPJ que eu ponho no tema.
- [ ] **FAQ e depoimentos.** Revisar as respostas do FAQ da home e confirmar os depoimentos.
- [ ] **Checkout (opcional).** O carrinho e o checkout da Tray usam roxo-escuro e o logo
      pequeno. Dá para acertar a cor e o logo nas configurações do checkout.

### No dia
- [x] Publicar a cópia 3521907 (publicada em 02/10/2026).
- [ ] Publicar a cópia 3560443: carrinho lateral com - / + e a lixeira consertada. **Urgente:**
      na 3521907 publicada a lixeira da gaveta não remove ao clicar no ícone.
- [ ] Ativar as 6 LPs (condominios, escolas, recorrencia, restaurantes, hoteis, pets). Até lá,
      "Condomínios" e "Escolas" do menu e os links "Para…" do rodapé caem em "não encontrado".
- [ ] Domínio próprio e os redirecionamentos 301 (lista em `tray-tema/CLAUDE.md`).
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

Na cópia 3560443 (falta publicar):
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
