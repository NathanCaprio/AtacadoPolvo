# Atacado Polvo — site institucional

Site institucional em HTML, CSS e JavaScript puro, **sem build e sem dependências**,
com um backend em Node 22 (também sem dependências) para contas de cliente e
painel administrativo.

As páginas públicas abrem com duplo clique em qualquer `.html`. Para login e
painel, suba o servidor (`node server/server.js`).

## Estrutura

```
.
├── index.html            Home
├── produtos.html         Catálogo filtrável + lista de orçamento
├── condominios.html      Landing de SEO — síndicos e administradoras
├── escolas.html          Landing de SEO — diretores e mantenedores
├── sobre.html            Institucional (história, valores, linha do tempo)
├── contato.html          Formulário, canais, endereços e FAQ
├── entrar.html           Login e cadastro
├── conta.html            Área do cliente
├── admin.html            Painel administrativo
├── server/               Backend (Node puro, ver abaixo)
└── assets/
    ├── css/style.css     Design system completo (tokens, componentes, responsivo)
    ├── img/              Logo (2 recortes), favicon e capa de compartilhamento
    └── js/
        ├── config.js     >>> DADOS DA LOJA. Edite só aqui.
        ├── data.js       Catálogo mock + gerador de arte SVG dos produtos
        ├── main.js       Tema, menu, scroll reveal, contadores, FAQ
        ├── catalogo.js   Filtros, busca, ordenação, orçamento
        ├── contato.js    Validação e máscaras do formulário
        ├── auth.js       Cliente da API + botão de conta no header
        ├── entrar.js     Tela de login/cadastro
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
3. **Fotos** — hoje os produtos usam ilustrações SVG geradas por código e há dois blocos
   `.media-box` com aviso de "espaço reservado" (na home e em `sobre.html`). Substitua
   por fotos reais quando tiver.
4. **Mapa** — em `contato.html`, o bloco `.map-box` espera o `iframe` do Google Maps.
5. **SEO** — as URLs `canonical` e o JSON-LD usam `https://www.atacadopolvo.com.br/`
   como exemplo; troque pelo domínio real antes de publicar.
6. **Depoimentos** — os nomes em `index.html`, `condominios.html` e `escolas.html`
   são de exemplo. Troque por depoimentos reais (ou remova a seção).

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

## O que já funciona

- Tema claro/escuro com detecção do sistema e alternância manual (salva em `localStorage`)
- Menu mobile, header sticky, animação de entrada ao rolar, contadores animados
- Catálogo com filtro por categoria, busca, ordenação e deep link (`produtos.html?cat=cozinha`)
- Lista de orçamento persistida no navegador, que gera uma mensagem pronta de WhatsApp
- Formulário com validação e máscaras de telefone e CNPJ
- Acessibilidade: skip link, foco visível, `aria-*` nos componentes interativos,
  respeito a `prefers-reduced-motion`
- Responsivo de 320px até desktop, e folha de estilo para impressão
- Contas de cliente: cadastro, login, edição de dados e troca de senha
- Painel admin: métricas, lista de clientes, promover/desativar/remover

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
└── cli.js      criar-admin / promover / listar
dados/polvo.db  banco (criado no primeiro boot; fora do git)
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

Telas: `entrar.html`, `conta.html` e `admin.html` (as três com `noindex`).

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
- A tabela do painel é montada com `textContent`, nunca `innerHTML`: nome e
  empresa vêm do cadastro do cliente e são conteúdo não confiável.

### O que falta para ir ao ar

Isto é um protótipo. Antes de receber cliente de verdade:

1. **HTTPS** — o cookie só ganha a flag `Secure` com `NODE_ENV=production`,
   e sem HTTPS a sessão trafega em texto claro.
2. **Recuperar senha** — não existe "esqueci minha senha"; depende de um
   serviço de e-mail (SMTP).
3. **Backup do `dados/polvo.db`** — hoje é um arquivo só, sem cópia.
4. **LGPD** — falta aviso de privacidade, consentimento e caminho para o
   cliente pedir exclusão dos dados.
5. **`node:sqlite` é experimental** no Node 22 (daí o aviso no boot). A
   superfície usada é só `prepare().get/all/run`, igual à do `better-sqlite3`,
   então a troca é direta se precisar.
6. **Rate limit e sessões em memória/arquivo** não sobrevivem a mais de uma
   instância.

## Ganchos para o backend

Estes pontos do catálogo ainda não passam pelo servidor e seguem marcados com
`TODO (backend)`. Os produtos virão de uma API externa mais adiante:

| Onde | Hoje | Depois |
|---|---|---|
| `data.js` | `window.CATALOGO` embutido | `GET /api/produtos` |
| `catalogo.js` → `enviarOrcamento()` | abre WhatsApp | `POST /api/orcamentos` |
| `contato.js` → `enviar()` | abre WhatsApp | `POST /api/contato` |

O catálogo está embutido em JS (e não em um `.json` lido por `fetch`) de propósito:
o navegador bloqueia requisições `file://` por CORS, e assim o site abre com duplo
clique sem precisar de servidor. Ao ligar a API, troque pelo `fetch`.

## Rodar com servidor local

Opcional, mas recomendado para testar (evita restrições de `file://`):

```bash
npx serve .
# ou
python -m http.server 8000
```
#   A t a c a d o P o l v o  
 