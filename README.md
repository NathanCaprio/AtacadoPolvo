# Atacado Polvo — site institucional

Site institucional em HTML, CSS e JavaScript puro, **sem build e sem dependências**,
com um backend em Node 22 (também sem dependências) para contas de cliente e
painel administrativo.

As páginas públicas abrem com duplo clique em qualquer `.html`. Para login e
painel, suba o servidor.

```bash
npm start          # sobe em http://127.0.0.1:3000
npm test           # 103 testes (backend + modelo de consumo)
npm run criar-admin -- "Seu Nome" voce@exemplo.com
```

## Estrutura

```
.
├── index.html            Home
├── produtos.html         Catálogo filtrável + lista de orçamento
├── calculadora.html      Calculadora de consumo mensal (condomínio e escola)
├── condominios.html      Landing de SEO — síndicos e administradoras
├── escolas.html          Landing de SEO — diretores e mantenedores
├── sobre.html            Institucional (história, valores, linha do tempo)
├── contato.html          Formulário, canais, endereços e FAQ
├── entrar.html           Login e cadastro
├── recuperar.html        Redefinição de senha por link
├── conta.html            Área do cliente
├── admin.html            Painel administrativo
├── privacidade.html      Política de privacidade (LGPD)
├── 404.html              Página de erro (servida com status 404)
├── robots.txt            Indexação: libera o público, barra conta/API
├── sitemap.xml           Só as páginas públicas
├── package.json          Só scripts — o projeto não tem dependências
├── server/               Backend (Node puro, ver abaixo)
├── testes/               Testes do que roda no navegador (o modelo de consumo)
└── assets/
    ├── css/style.css     Design system completo (tokens, componentes, responsivo)
    ├── img/              Logo (2 recortes), favicon e capa de compartilhamento
    │   └── loja/         Fotos reais das duas unidades (webp)
    └── js/
        ├── config.js     >>> DADOS DA LOJA. Edite só aqui.
        ├── data.js       Catálogo mock + gerador de arte SVG dos produtos
        ├── main.js       Tema, menu, scroll reveal, contadores, FAQ
        ├── catalogo.js   Filtros, busca, ordenação, orçamento
        ├── consumo.js    >>> COEFICIENTES DE CONSUMO. Ajuste os números aqui.
        ├── calculadora.js Tela da calculadora (monta campos, recalcula, exporta)
        ├── contato.js    Validação e máscaras do formulário
        ├── lead.js       Formulário de cotação das landings
        ├── auth.js       Cliente da API + botão de conta no header
        ├── entrar.js     Tela de login/cadastro
        ├── recuperar.js  Redefinição de senha
        ├── conta.js      Área do cliente
        └── admin.js      Painel administrativo
```

## Identidade visual

A paleta e a marca seguem o Instagram [@atacadopolvo](https://www.instagram.com/atacadopolvo/).

| Token | Valor | Uso |
|---|---|---|
| `--brand` | `#7B2FE3` | violeta da marca — botões, links, ícones |
| `--brand-700` | `#551AA6` | violeta escuro — hover e gradientes |
| `--purple` | `#C026D3` | magenta secundário — realces e gradientes |
| `--accent` | `#FFC91E` | dourado — selos, destaques, bolhas |
| `--ink` | `#1B0733` | ameixa profunda — texto e fundos escuros |

A marca é a **vetorização da própria foto de perfil do Instagram** (o traço foi
extraído do bitmap, não redesenhado). Ela existe em dois recortes, porque o desenho
completo tem detalhe demais para tamanhos pequenos:

| Arquivo | viewBox | Onde usar |
|---|---|---|
| `logo-mark.svg` | `-4 -4 520 332` (~1,56:1) | hero e peças grandes, acima de ~150px |
| `logo-head.svg` | `126 -6 262 262` (quadrado) | header, rodapé e qualquer uso a 40px |
| `favicon.svg` | quadrado | aba do navegador — cabeça branca sobre violeta |

- Os três compartilham **o mesmo `path`**; o que muda é só o `viewBox`. Se
  reexportar o traço, troque o `d` nos três.
- `logo-mark.svg` é **largo**: mantenha altura fixa com `width:auto` (ou o inverso),
  nunca force um quadrado. `logo-head.svg` é quadrado e serve para caixas 1:1.
- Não use `logo-mark.svg` abaixo de ~120px — as oito ferramentas viram um borrão.
- O traço original do Instagram é chapado em `#541c54`; aqui sai em `#7B2FE3` para
  acompanhar a paleta e continuar legível no tema escuro.
- **Imagem de compartilhamento** (`assets/img/og-cover.png`, 1200x630): usada no
  `og:image` de todas as páginas. O caminho é absoluto e aponta para
  `www.atacadopolvo.com.br`; troque pelo domínio real junto com as `canonical`.
- **Lockup**: "ATACADO DA LIMPEZA" em caixa alta acima de "POLVO", como no perfil.
  Abaixo de 620px só o "POLVO" aparece.
- **Tipografia**: Montserrat (700/800/900) nos títulos, Inter no corpo.
- O tema escuro usa a mesma paleta em ameixa profunda — os tokens estão
  duplicados em `@media (prefers-color-scheme: dark)` e em `:root[data-theme="dark"]`.

## Primeiros ajustes (antes de publicar)

1. **`assets/js/config.js`** — os dados de contato vieram do Instagram (WhatsApp,
   as duas unidades, horários, área de entrega). Os campos marcados com
   `CONFERIR` continuam com valor de exemplo e precisam ser confirmados:
   `email`, `cep`, `bairro2`, `razaoSocial`, `cnpj`, `fundacao` e `pedidoMinimo`.
   Esses valores sobrescrevem o texto das páginas em tempo de execução, então é
   o único lugar a editar.
2. **`assets/js/data.js`** — ajuste o catálogo real (nome, embalagem, caixa, categoria).
3. **Fotos dos produtos** — o catálogo ainda usa ilustrações SVG geradas por código
   (`data.js` → `artProduto`). As fotos das **lojas** já são reais (veja abaixo); o que
   falta é foto de produto.
4. **SEO** — as URLs `canonical` e o JSON-LD usam `https://www.atacadopolvo.com.br/`
   como exemplo; troque pelo domínio real antes de publicar.
5. **Depoimentos** — os nomes em `index.html`, `condominios.html` e `escolas.html`
   são de exemplo. Troque por depoimentos reais (ou remova a seção).
6. **História em `sobre.html`** — o galpão de 120 m², o Fiorino, a lista de trinta
   mercearias e o ano de fundação são texto de protótipo. Agora eles aparecem **ao lado
   de fotos reais das lojas**, o que dá ar de verdade a um texto que ninguém conferiu.
   Corrija ou remova antes de publicar.

## Fotos e mapas das lojas

As fotos das duas unidades estão em `assets/img/loja/`, em **webp** (as treze somam
~700 KB). O nome diz a unidade e o assunto: `medianeira-papel.webp`,
`bento-vassouras.webp`, `*-fachada.webp`.

| Onde | O que aparece |
|---|---|
| `index.html` | corredor de papel, no lugar do antigo "espaço reservado" |
| `sobre.html` | fachada da Medianeira + seção "Por dentro" com as duas galerias |
| `contato.html` | fachada de cada unidade acima do respectivo mapa |

Foto de prateleira cheia é o argumento que texto nenhum substitui para quem compra
volume: síndico e diretor querem ver estoque de verdade antes de confiar a reposição
do prédio a um fornecedor novo. Por isso as galerias mostram corredor e pilha, não
close de produto.

- **A grade tem colunas fixas (3), não `auto-fit`**, e a contagem de fotos fecha as
  duas galerias em duas linhas exatas. Ao acrescentar ou tirar foto, mantenha a conta
  fechando (uma foto deitada com `.galeria-item--larga` vale por duas células).
- **Foto com etiqueta de preço fica de fora.** Preço legível numa foto do site vira
  compromisso que desatualiza — e é justamente a conversa que a cotação deveria ter.
- Toda foto leva `loading="lazy"`, `width`/`height` e `alt` descritivo.

Os mapas são os `iframe` do Google Maps, um por unidade, com o endereço e um link
"Como chegar" que abre a rota já traçada. **Eles exigiram um `frame-src` no CSP**
(`server/server.js`) — sem ele o mapa fica em branco, e só quando servido pelo
servidor, o que torna o defeito invisível para quem testa abrindo o HTML do disco.
Há teste travando que esse `frame-src` continue valendo só para o Maps.

## Páginas de SEO por segmento

`condominios.html` e `escolas.html` são landings independentes, cada uma com:

- `<title>`, `meta description` e `canonical` próprios, com a cidade no texto
- `H1` focado na persona (síndico / diretor) e no termo de busca
- JSON-LD de `Service` (com `areaServed` e `audience`) e de `FAQPage`
- seções de dor → solução → kit por ambiente → como funciona → prova → FAQ → CTA
- CTAs de WhatsApp com mensagem já preenchida para aquele segmento
- link interno cruzado entre as duas e para o catálogo filtrado por categoria

Na home, a seção **"Para o seu segmento"** aponta para as duas, e ambas estão
no menu e no rodapé de todas as páginas.

Para criar uma terceira landing (empresas, restaurantes, hotéis), copie uma das
duas e troque: `title`/`description`/`canonical`, o `H1`, o JSON-LD, os cards de
kit e as perguntas do FAQ.

## Calculadora de consumo

`calculadora.html` responde a pergunta que trava a compra antes do preço:
**"quanto eu preciso por mês?"**. Quem não sabe a quantidade não pede
orçamento — pede "uma tabela de preços", que é o pedido que não vira venda.
A pessoa informa o porte (unidades, torres e banheiros comuns; ou alunos,
salas, banheiros e turnos) e recebe na tela a lista mensal item a item, com a
quantidade e a embalagem de venda.

A lista tem três saídas, porque são três pessoas diferentes:

| Saída | Para quem |
|---|---|
| Lista de orçamento | quem quer ajustar as quantidades antes de pedir — cai em `produtos.html#orcamento` com a gaveta aberta |
| WhatsApp | quem resolve na conversa; a mensagem já vai montada |
| Imprimir / PDF | o síndico que leva para a assembleia e a escola que anexa ao processo de compra |

Abaixo do resultado há o formulário de cotação de sempre (`lead.js`), com a
estimativa num campo escondido: o lead chega no painel com a lista inteira no
corpo da mensagem, e o vendedor responde sem ter que perguntar o porte.

### Onde mexer nos números

Tudo mora em `assets/js/consumo.js`, que é só aritmética. Cada item tem um
**driver** e um coeficiente por mês:

- **condomínio** — o driver é a área comum, não o morador (o apartamento compra
  o próprio material). Papel, sabonete e desinfetante saem do número de
  banheiros comuns; "unidades" quase só aparece no saco de lixo da coleta.
- **escola** — o driver é o aluno (papel, sabonete, copo). Turno a mais **não**
  multiplica isso, porque o aluno já foi contado uma vez; multiplica a
  frequência de limpeza de piso e banheiro.
- acima de 60 unidades ou 400 alunos, parte dos produtos prontos vira
  concentrado em galão e bombona — é onde o custo por litro cai.
- vassoura, rodo e balde saem numa lista separada, de troca trimestral, para
  não inflar o pedido do mês.

O arquivo roda no navegador e no Node, e `testes/consumo.test.js` trava os dois
jeitos de ele quebrar em silêncio: um id que sai do catálogo (a linha sumiria
da estimativa sem erro nenhum) e um coeficiente que deixa de acompanhar o porte.

**Não há preço na calculadora, de propósito.** Preço de atacado depende do
volume fechado, da forma de pagamento e da recorrência; um preço de tabela ali
sairia maior que o real e queimaria a cotação.

### Para acrescentar um segmento (empresas, hotéis)

Escreva um bloco em `SEGMENTOS` com os campos e a função de cálculo, e
acrescente o valor à lista `SEGMENTOS` de `server/api.js`. A tela se monta
sozinha a partir da declaração — não há HTML nem CSS por segmento.

## O que já funciona

- Tema claro/escuro com detecção do sistema e alternância manual (salva em `localStorage`)
- Menu mobile, header sticky, animação de entrada ao rolar, contadores animados
- Catálogo com filtro por categoria, busca, ordenação e deep link (`produtos.html?cat=cozinha`)
- Lista de orçamento persistida no navegador, que gera uma mensagem pronta de WhatsApp
- Calculadora de consumo mensal por porte, que vira lista de orçamento, mensagem
  de WhatsApp, folha impressa ou lead com a estimativa anexada
- Formulário com validação e máscaras de telefone e CNPJ
- Acessibilidade: skip link, foco visível, `aria-*` nos componentes interativos,
  respeito a `prefers-reduced-motion`
- Responsivo de 320px até desktop, e folha de estilo para impressão
- Contas de cliente: cadastro, login, edição de dados e troca de senha
- Painel admin: métricas, orçamentos, mensagens e clientes, em abas
- Orçamentos e mensagens de contato gravados no banco (inclusive de visitante
  sem conta, o que revela carrinho abandonado)
- Cliente vê os próprios orçamentos e a situação de cada um na área da conta
- Fotos reais das duas lojas e mapa de cada unidade na página de contato
- `robots.txt`, `sitemap.xml` e página 404 própria
- Política de privacidade e aceite obrigatório nos formulários (LGPD)
- Cópia de segurança do banco automática, verificada a cada geração
- 103 testes automatizados cobrindo backend, recuperação de senha, LGPD, backup
  e o modelo de consumo da calculadora

## Uma armadilha no header

O blur do header fica num `::before`, e **não** no `.header`. Isso é de propósito:
`backdrop-filter` transforma o elemento em bloco de contenção para descendentes
`position:fixed`, e o `.nav` vira `fixed` abaixo de 900px. Com o filtro no
`.header`, o menu mobile era medido pelo header e abria com ~106px de altura em vez
da tela toda. Se for mexer nesse trecho, não devolva o `backdrop-filter` para o
`.header`.

## Backend

Node 22 puro, **sem nenhuma dependência**: `node:http` para o servidor,
`node:sqlite` para o banco e `node:crypto` para senha e sessão. O mesmo
processo serve o site estático e a API, na mesma origem.

```bash
node server/server.js              # http://127.0.0.1:3000
PORTA=8080 node server/server.js   # outra porta
```

O site continua abrindo com duplo clique sem o servidor — nesse caso o botão
de conta some e o resto funciona igual.

> **Live Server do VS Code não serve.** Ele entrega os arquivos, mas não tem a
> API: qualquer POST volta **405** e o login não funciona. As telas de conta só
> funcionam pela porta do `server.js` (3000 por padrão), não pela 5500. As
> páginas detectam isso e avisam na tela em vez de dar um erro sem sentido.

### Primeiro acesso

Não existe admin embutido. Crie o seu (a senha é pedida escondida, não vai
como argumento para não ficar no histórico do shell):

```bash
node server/cli.js criar-admin "Seu Nome" voce@exemplo.com
node server/cli.js promover voce@exemplo.com   # promove conta já existente
node server/cli.js listar
```

### Arquivos

```
server/
├── server.js   HTTP, arquivos estáticos, cabeçalhos de segurança, ETag
├── api.js      rotas, validação, rate limit
├── auth.js     scrypt, sessões, cookie
├── db.js       schema SQLite
├── cli.js      criar-admin / promover / listar
└── backup.js   cópia, export, restauração
dados/polvo.db  banco (criado no primeiro boot; fora do git)
backups/        cópias e exports (fora do git)
```

### Rotas

| Método | Rota | O que faz |
|---|---|---|
| POST | `/api/auth/cadastrar` | cria conta e já abre sessão |
| POST | `/api/auth/entrar` | login |
| POST | `/api/auth/sair` | logout |
| GET | `/api/auth/eu` | quem está logado |
| PATCH | `/api/auth/eu` | edita nome, telefone e empresa |
| PATCH | `/api/auth/senha` | troca a senha e derruba as outras sessões |
| GET | `/api/admin/resumo` | contagens do painel |
| GET | `/api/admin/clientes` | lista de clientes |
| PATCH | `/api/admin/clientes/:id` | muda papel, ativa ou desativa |
| DELETE | `/api/admin/clientes/:id` | remove a conta |
| POST | `/api/auth/recuperar` | pede link de redefinição (responde igual para e-mail que existe ou não) |
| GET | `/api/auth/recuperar?token=` | confere se o link ainda vale, sem gastá-lo |
| POST | `/api/auth/redefinir` | redefine a senha com o token e já abre sessão |
| GET | `/api/auth/eu/dados` | exporta os próprios dados em JSON (LGPD) |
| DELETE | `/api/auth/eu` | exclui a própria conta (exige a senha) |
| POST | `/api/admin/clientes/:id/recuperacao` | gera link de redefinição para repassar ao cliente |
| GET | `/api/admin/exportar?tipo=` | baixa CSV de `mensagens`, `orcamentos` ou `clientes` |

Telas: `entrar.html`, `recuperar.html`, `conta.html` e `admin.html` (as quatro
com `noindex`).

#### Como o cliente chega na conta

A conta é **caminho secundário de propósito**: quem compra atacado quer cotação,
não criar senha. O funil principal continua sendo catálogo/calculadora →
orçamento → WhatsApp. Mas ela precisa ser achável, e havia um buraco — até
então a única porta de entrada era um ícone sem rótulo no header, e nenhuma
página mencionava que a área existia.

São três entradas, em ordem de descoberta:

1. **Rodapé de todas as páginas** — "Área do cliente", no fim da lista de
   navegação. É onde as pessoas procuram.
2. **Header** — o botão que `auth.js` injeta agora sai com o rótulo "Entrar".
   O texto some abaixo de 1140px (`.conta-btn--entrar`), onde o cabeçalho já
   está no limite com sete itens de menu; ali volta a ser só o ícone.
3. **Depois de enviar um orçamento** — a gaveta troca para um estado de
   confirmação com o convite "quer acompanhar este e os próximos pedidos?".

O convite é o ponto importante: é o único momento em que a conta tem motivo.
Ele só aparece para quem **não** está logado e só quando há backend — sem API
(HTML aberto do disco) levaria a uma tela que não funciona.

O estado de confirmação da gaveta (`#drawer-enviado`) é ganho separado: antes
o envio não dava retorno nenhum, a gaveta ficava idêntica e parecia que nada
tinha acontecido. **A lista não é apagada no envio** — o pedido ainda não foi
aceito pela loja, e quem fecha o WhatsApp sem mandar precisa reencontrar o que
montou. Reabrir a gaveta sempre volta para a lista.

> Testando no Live Server (porta 5500) o botão de conta **não aparece**, porque
> não há API para responder quem está logado. É proposital. O fluxo de conta só
> existe pela porta do `server.js`.

### Como a segurança está feita

- **Senha**: scrypt (N=16384) com salt por usuário; comparação com
  `timingSafeEqual`. O login roda um scrypt descartável quando o e-mail não
  existe, para o tempo de resposta não revelar quais e-mails estão cadastrados.
- **Sessão**: token aleatório de 32 bytes em cookie `HttpOnly; SameSite=Lax`.
  No banco fica só o **sha256** do token, então vazar o banco não entrega as
  sessões. Validade de 30 dias, com limpeza de vencidas de hora em hora.
- **CSRF**: `SameSite=Lax` com API na mesma origem. Se um dia a API for para
  outro domínio, isso deixa de bastar e precisa de token anti-CSRF.
- **Rate limit**: 10 logins / 15 min e 5 cadastros / hora por IP, em memória.
  Vale por instância — rodando em mais de um processo, precisa ir para o banco.
- **Trava anti-lockout**: não dá para rebaixar, desativar ou remover o último
  admin ativo, nem remover a própria conta.
- **Estáticos**: `server/` e `dados/` nunca são servidos; há barreira contra
  path traversal e CSP, `nosniff`, `X-Frame-Options` e `Referrer-Policy`.
- **`frame-src`**: o CSP libera `https://www.google.com` e mais nada, por causa dos
  mapas das lojas em `contato.html`. `frame-ancestors 'none'` continua valendo, então
  o site embute o Maps mas ninguém embute o site. Um teste falha se esse `frame-src`
  virar curinga — é o tipo de folga que não quebra nada visivelmente.
- A tabela do painel é montada com `textContent`, nunca `innerHTML`: nome e
  empresa vêm do cadastro do cliente e são conteúdo não confiável.

### Recuperação de senha

Mesmo desenho das sessões: o token de 32 bytes só existe em claro dentro do
link; no banco (tabela `recuperacoes`) fica o sha256 dele. Vale 1 hora, morre
ao ser usado e um pedido novo invalida o anterior — link velho parado numa
caixa de entrada deixa de valer. A rota responde 200 tanto para e-mail
cadastrado quanto para inexistente, senão a tela vira um verificador de quem é
cliente da empresa. Redefinir derruba todas as sessões abertas e abre uma nova
só para quem acabou de provar o acesso.

> **Não há envio de e-mail** — o projeto não tem dependências e o SMTP ainda
> não foi contratado. Hoje o link chega ao cliente por dois caminhos, os dois
> manuais: impresso no console do servidor, e gerado sob demanda pelo admin no
> painel (botão "Link de senha" na aba Clientes, que abre um prompt para copiar
> e mandar no WhatsApp). Quando houver SMTP, o único ponto a mexer é
> `entregarLink()` em `server/api.js`.

`RECUPERACAO_NO_CORPO=1` devolve o link na própria resposta, para
desenvolvimento e testes — é ignorada com `NODE_ENV=production`, e há teste
provando que a trava de produção vence a variável.

### Direitos do titular, consentimento e origem do lead

- **Direitos do titular (LGPD).** `GET /api/auth/eu/dados` devolve cadastro,
  orçamentos, mensagens e sessões como arquivo para download.
  `DELETE /api/auth/eu` exclui a conta: pede a senha de novo, apaga o cadastro
  e limpa nome, e-mail, telefone, empresa e CNPJ das mensagens ligadas a ela.
  As linhas de mensagem e orçamento permanecem sem dono
  (`ON DELETE SET NULL`), porque o histórico comercial e o relatório por
  segmento não são dado pessoal. A trava do último admin também vale aqui.
  Os dois botões estão na área da conta.
- **Consentimento.** `mensagens.aceite_em` guarda quando a pessoa marcou o
  aceite da política. O carimbo é do servidor, não do navegador. É o que
  administradora de condomínio e escola pedem ao auditar fornecedor. No painel,
  cada mensagem mostra "aceite registrado" ou "sem aceite" — o segundo aparece
  em lead antigo, de antes do checkbox existir.
- **Origem do lead.** `mensagens.origem` e `mensagens.segmento` gravam de onde
  o pedido veio (listas fechadas, validadas no servidor). São dois recortes
  porque são duas decisões: **segmento** diz quem pediu (condomínio, escola) e
  responde onde insistir no conteúdo; **origem** diz o que fez pedir (a landing,
  a calculadora, o rodapé) e responde qual peça do site está puxando lead. O
  painel mostra os dois como barras, em "De onde vêm os pedidos" e "O que fez a
  pessoa pedir", e `GET /api/admin/resumo` devolve em `porSegmento` e
  `porOrigem`.
- **Migrações.** O schema é `CREATE TABLE IF NOT EXISTS`, que cria banco novo
  mas não mexe em tabela existente. `migrar()` em `server/db.js` acrescenta as
  colunas novas (`origem`, `segmento`, `aceite_em`) em banco antigo. É
  idempotente.

### Backup

O servidor faz uma cópia do banco **no boot e a cada 24 h**, sozinho. Não
depende de ninguém lembrar de rodar nada.

```bash
npm run backup      # cópia agora
npm run backups     # o que já existe
npm run exportar    # JSON legível, sem senhas (para planilha/outro sistema)
npm run restaurar polvo-2026-09-24T14-03-51.db
```

As cópias caem em `backups/`, fora do `dados/` (apagar a pasta do banco não
pode levar o backup junto) e fora do git — o arquivo contém os hashes de senha
dos clientes. Ficam as 14 mais novas; o resto é podado.

Não é um `copy` do `polvo.db`: com WAL ligado, parte das escritas recentes vive
no arquivo `-wal`, e copiar só o `.db` renderia um banco válido mas velho. O
comando usa `VACUUM INTO`, que escreve um banco completo e consistente **com o
servidor rodando**, e depois abre a cópia para conferir `integrity_check` e a
contagem de linhas — backup que ninguém abriu é só um arquivo.

`restaurar` salva o banco de agora como `antes-de-restaurar-*.db` antes da
troca, recusa cópia corrompida e só age depois de você digitar `restaurar`.

| Variável | Padrão | O que faz |
|---|---|---|
| `BACKUP_AUTO` | ligado | `0` desliga o backup automático |
| `INTERVALO_BACKUP` | `24` | horas entre as cópias |
| `MANTER_BACKUPS` | `14` | quantas guardar (`0` = não poda) |
| `DESTINO_BACKUP` | `backups/` | onde as cópias caem |

> Uma cópia no mesmo disco não protege contra o disco morrer. Aponte o
> `DESTINO_BACKUP` para uma pasta sincronizada (Drive, OneDrive) ou copie o
> `backups/` para fora da máquina de vez em quando.

### Testes

```bash
npm test          # node --test "server/*.test.js"
```

103 testes. Os de `server/` sobem o servidor de verdade num **banco temporário**
e numa porta livre, e conversam por HTTP — nada é dublado. O script usa um
glob, então arquivo de teste novo em `server/` entra sozinho. O foco é travar o
comportamento de segurança, que é o que quebra em silêncio numa refatoração:

- gate de papel (401 sem login, 403 como cliente comum) em todas as rotas de admin
- travas anti-lockout (último admin, remover a própria conta)
- senha: tamanho mínimo, senha atual obrigatória para trocar, senha antiga
  para de funcionar, sessões em outros aparelhos caem
- login não revela se o e-mail existe (mesmo status e mesmo corpo)
- um cliente não enxerga o orçamento de outro
- `server/` e `dados/` não são servidos; path traversal barrado
- 405 vs 404 nas rotas, cabeçalhos de segurança, cookie `HttpOnly`/`SameSite`

O backup tem suíte própria (`server/backup.test.js`): a cópia abre e tem os
mesmos dados, escrita posterior não aparece nela, a poda respeita o limite, o
export não carrega hash de senha, e `restaurar` não encosta no banco quando a
confirmação não vem ou a cópia está corrompida.

A suíte de recuperação e LGPD (`server/recuperacao.test.js`) cobre:

- pedir redefinição não revela se o e-mail existe (mesmo status e mesmo corpo);
  conta desativada não recebe link
- um pedido novo invalida o link anterior; conferir o token não o gasta
- o token não serve duas vezes, não sobrevive ao prazo, e senha curta não o queima
- redefinir derruba a senha antiga e as sessões em outros aparelhos
- link gerado pelo admin: 401 sem login, 403 como cliente comum, 409 para conta
  desativada, e fica registrado com origem `admin`
- exportação LGPD: 401 sem login, vem com `Content-Disposition`, e não contém
  dado de outro cliente
- exclusão: 401 sem a senha correta, some do banco, limpa o dado pessoal das
  mensagens e preserva o histórico; o último admin ativo não consegue se excluir
- aceite carimbado quando marcado e nulo quando não; `origem`/`segmento` fora da
  lista caem no padrão
- CSV: gate de papel, BOM de UTF-8, tipo inválido é 400, e valor começando com
  `=` sai escapado para não virar fórmula no Excel
- com `NODE_ENV=production` o link não vai no corpo, mesmo com a variável de
  desenvolvimento ligada

Os limites de rate limit são configuráveis por variável de ambiente
(`LIMITE_LOGIN`, `LIMITE_CADASTRO`, `LIMITE_ORCAMENTO`, `LIMITE_MENSAGEM`,
`LIMITE_RECUPERACAO`) — o
padrão é o valor restritivo, e os testes os elevam para conseguir criar várias
contas seguidas do mesmo IP. `BANCO` aponta para outro arquivo de banco.

### O que falta para ir ao ar

Isto é um protótipo. Antes de receber cliente de verdade:

1. **HTTPS** — o cookie só ganha a flag `Secure` com `NODE_ENV=production`,
   e sem HTTPS a sessão trafega em texto claro.
2. **Recuperar senha — parcialmente resolvido.** O fluxo existe e é seguro
   (veja acima), mas **não há envio de e-mail**: o link sai no console do
   servidor ou o admin gera um no painel para mandar no WhatsApp. Ou seja,
   ainda depende de alguém no balcão — às 23h de domingo o cliente não
   recupera a senha sozinho. Falta contratar SMTP e preencher
   `entregarLink()`.
3. **Backup fora da máquina** — a cópia automática existe (veja acima), mas
   fica no mesmo disco. Falta mandar `backups/` para outro lugar.
4. **LGPD — falta a revisão jurídica e os dados do controlador.** Já existe: a
   política (`privacidade.html`), o aceite obrigatório nos formulários, a prova
   do aceite no banco (`mensagens.aceite_em`, carimbo do servidor), as rotas dos
   direitos do titular e os botões que as chamam na área da conta. Falta:
   **preencher os campos `CONFERIR` do `config.js`** — hoje a política nomeia
   como controlador um CNPJ que reprova no dígito verificador e um e-mail de
   contato que pode não existir, e um pedido de titular enviado para uma caixa
   inexistente desaparece sem ninguém notar; e passar o texto por quem cuida do
   jurídico — os prazos de guarda ali são o padrão do setor, não orientação
   jurídica.
5. **`node:sqlite` é experimental** no Node 22 (daí o aviso no boot). A
   superfície usada é só `prepare().get/all/run`, igual à do `better-sqlite3`,
   então a troca é direta se precisar.
6. **Rate limit e sessões em memória/arquivo** não sobrevivem a mais de uma
   instância.

## Ganchos para o backend

| Onde | Hoje | Depois |
|---|---|---|
| `data.js` | `window.CATALOGO` embutido | `GET /api/produtos` (API externa) |
| `catalogo.js` → `enviarOrcamento()` | grava em `/api/orcamentos` **e** abre o WhatsApp | — |
| `contato.js` → `enviar()` | grava em `/api/mensagens` **e** abre o WhatsApp | — |
| `consumo.js` | coeficientes médios embutidos | consumo real medido por cliente |

O registro roda em paralelo e o WhatsApp abre de qualquer jeito, mesmo com o
servidor fora do ar: gravar o orçamento nunca pode atrapalhar a venda. Quem
está logado tem o orçamento amarrado à conta; quem não está vira sinal de
carrinho abandonado no painel.

O catálogo está embutido em JS (e não em um `.json` lido por `fetch`) de propósito:
o navegador bloqueia requisições `file://` por CORS, e assim o site abre com duplo
clique sem precisar de servidor. Quando a API de produtos entrar, troque pelo `fetch`.
