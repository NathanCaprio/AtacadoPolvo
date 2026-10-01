# Integração com o ERP Empresarius

Os produtos do site vêm do Empresarius (WME Sistemas). **Regra: não alterar
nada no ERP.** O site só faz login e leitura.

## Como funciona

- O Empresarius não tem API pública. `server/erp.js` usa a mesma API que o
  sistema web dele usa (`empresarius.azurewebsites.net/api`), logando com um
  **usuário criado só para o site**.
- No boot e a cada 12 h: uma chamada traz a lista inteira de produtos e, para
  os ativos, a ficha de cada um (é só nela que vêm as fotos), 3 de cada vez.
  A rodada leva cerca de 35 s para cerca de 1.050 ativos.
- O resultado vai para a tabela `produtos_erp` (SQLite) e é servido em
  `/catalogo-erp.js`, que as páginas carregam logo depois do `data.js` e que
  troca o `window.CATALOGO`. Grupo do ERP vira categoria do site (tabela
  `GRUPOS` em `server/erp.js`); grupo novo aparece sozinho no fim.
- **Preço, custo e estoque não são gravados nem enviados ao site.** O site
  mostra "preço sob consulta" e trata tudo como disponível.
- Fotos: ficam no S3 do ERP (públicas). Foto cadastrada no ERP aparece no
  site na próxima sincronização. Sem foto, o site usa a ilustração.
- Se o ERP falhar (fora do ar, lista vazia, metade das fichas sem resposta,
  login recusado), o catálogo anterior continua no ar e o erro aparece no
  painel, aba **Catálogo (ERP)**, que também tem o botão "Sincronizar agora".
- `/sitemap-produtos.xml` lista uma URL por produto (está no `robots.txt`).

## Configuração (variáveis do servidor)

| Variável | Padrão | O que faz |
|---|---|---|
| `ERP_EMAIL` / `ERP_SENHA` | — | usuário do ERP só para o site |
| `ERP_INTERVALO_HORAS` | `12` | horas entre as sincronizações |
| `ERP_AUTO` | ligado | `0` = só sincroniza pelo botão do painel |
| `ERP_URL` | API do Empresarius | os testes apontam para um ERP falso |

As credenciais ficam no arquivo `.env` da raiz (fora do git), que o
`npm start` carrega (`node --env-file-if-exists=.env`). Em outro servidor,
crie o `.env` lá ou defina as variáveis no painel da hospedagem:

```
ERP_EMAIL=usuario-do-site@...
ERP_SENHA=...
```

Sem `ERP_EMAIL`/`ERP_SENHA` o servidor não sincroniza. O site mostra o
último catálogo gravado em `produtos_erp` ou, se a tabela estiver vazia, o
catálogo de exemplo do `data.js`.

### Usuário do site no ERP

Criado em 30/09/2026 em **Cadastros > Usuários**, com **Opções (⋮) >
Permissões > Menu** marcando só **Estoque > Produtos** e com o **2FA por
WhatsApp desligado** (com ele ligado, o login automático trava pedindo
código). Testado: entra sem código e lê a lista e as fichas.

O ERP não tem permissão "somente leitura": libera ou esconde telas. Quem
tiver essa senha consegue editar produtos dentro do ERP — por isso ninguém
usa este usuário para entrar no sistema, e o site só faz login e GET
(travado em `server/erp.test.js`). Motivos para ter um usuário próprio:

- a senha fica guardada no servidor; se vazar, o estrago fica limitado a ler
  produtos;
- trocar a senha de uma pessoa não derruba o site, nem o contrário;
- o histórico do ERP mostra o que foi acesso do site.

A conta tem 7 usuários ativos num plano de 3 licenças, o que indica que a
licença conta acessos simultâneos. Se alguém da equipe receber aviso de
limite de licenças na hora em que o servidor sincroniza, é isso.

## O que ainda é genérico

- **Calculadora de consumo:** estima com os itens genéricos do `data.js`
  (`window.CATALOGO_REFERENCIA`; os 30 que ela usa estão em `CONSUMO.ITENS`).
  Na aba **Calculadora** do painel, cada item pode ser ligado a um produto do
  ERP com "quanto rende uma unidade de venda" (fardo de 12 rolos = 12; galão
  de 5 L para um item de 2 L = 2,5). Ligado, a calculadora mostra o produto
  real, pede `ceil(consumo / rende)` unidades dele e é ele que vai para o
  orçamento. Sem ligação, ou com o produto fora do ERP, o item continua
  genérico e o vendedor escolhe o produto real. As ligações ficam na tabela
  `calculadora_ligacoes` do nosso banco e saem em `CATALOGO.calculadora`.
- **Links de categoria:** rodapé, landings e blog já apontam para os grupos
  do ERP. Os cards das landings abrem vários grupos de uma vez
  (`?cat=vassouras,panos`) e o "Linha profissional" abre os galões
  (`?cat=limpeza&busca=5l`). Link antigo que ainda esteja no Google
  (`?cat=cozinha`) cai no grupo mais próximo (`CATEGORIA_ANTIGA` em
  `catalogo.js`). Se um grupo mudar de id em `GRUPOS`, procure o id antigo
  nos `.html`.
- **Home:** os 8 primeiros grupos de `GRUPOS` viram card; os outros aparecem
  como links logo abaixo.
- **"Mais vendidos" da home:** são os mais pedidos nos orçamentos do site
  (180 dias). Enquanto houver poucos pedidos, completa com produtos com foto
  de categorias diferentes.
- **Nomes e descrições:** o ERP grava em maiúsculas e sem acento. O site
  ajusta as maiúsculas e põe acento nas palavras comuns (lista `ACENTOS` em
  `server/erp.js`: "AGUA SANITARIA" vira "Água Sanitária"). Para o resto, a
  aba **Produtos no site** do painel grava nome e descrição por produto na
  tabela `produtos_site` do nosso banco, nunca no ERP. O ajuste vale por
  cima do nome do ERP e sobrevive às sincronizações. A descrição aparece na
  página do produto e na descrição para o Google; o card do catálogo
  continua com a categoria do ERP.

## Histórico da decisão

Em 30/09/2026 foram avaliados: exportação manual por planilha, Catálogo
Virtual do ERP (exige login do cliente e a configuração está bloqueada no
plano), integrações prontas (WooCommerce, Nuvemshop etc., que exigiriam
configurar o ERP) e leitura pela API interna. A loja escolheu a leitura pela
API interna com usuário dedicado. Risco aceito: a API não é documentada e
pode mudar sem aviso; se mudar, a sincronização falha, o painel mostra o
erro e o site segue com o último catálogo bom.
