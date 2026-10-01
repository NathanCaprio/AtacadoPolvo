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

- **Calculadora de consumo:** continua estimando com os 42 itens de exemplo
  do `data.js` (ficam em `window.CATALOGO_REFERENCIA`). Os itens que ela
  manda para o orçamento são genéricos ("Detergente Neutro 500ml"), e o
  vendedor escolhe o produto real. Próximo passo possível: ligar cada item
  da calculadora a um produto do ERP.
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
- Nomes vêm do ERP sem acento ("Agua Sanitaria"); a busca do site ignora
  acento, mas a exibição depende do cadastro no ERP.

## Histórico da decisão

Em 30/09/2026 foram avaliados: exportação manual por planilha, Catálogo
Virtual do ERP (exige login do cliente e a configuração está bloqueada no
plano), integrações prontas (WooCommerce, Nuvemshop etc., que exigiriam
configurar o ERP) e leitura pela API interna. A loja escolheu a leitura pela
API interna com usuário dedicado. Risco aceito: a API não é documentada e
pode mudar sem aviso; se mudar, a sincronização falha, o painel mostra o
erro e o site segue com o último catálogo bom.
