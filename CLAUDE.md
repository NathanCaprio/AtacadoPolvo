# Atacado Polvo — guia rápido para o Claude

Site institucional (HTML/CSS/JS puro, sem build) + backend Node 22 puro
(`node:http`, `node:sqlite`, `node:crypto`). **Zero dependências** — não
instale pacotes nem proponha frameworks.

## Economia de tokens (regras)
- **Não leia o README.md inteiro** (30 KB). Use `grep -n "^#" README.md` e leia só a seção necessária.
- **Não leia `assets/css/style.css` inteiro** (1545 linhas). Faça grep pelo seletor/token.
- `server/api.js` (850 linhas): as rotas estão na tabela `ROTAS` no fim do arquivo; ache o handler por grep.
- Prefira Grep/`sed -n` com intervalo de linhas a abrir arquivos inteiros.
- Não abra imagens em `assets/img/`, nem `dados/` e `backups/` (fora do git).
- Respostas curtas; não repita código que já está no arquivo, mostre só o trecho alterado.
- Só rode `npm test` quando mexer em `server/` ou `consumo.js`.

## Comandos
```bash
npm start      # http://127.0.0.1:3000 (PORTA=8080 para trocar)
npm test       # node --test server/*.test.js testes/*.test.js
npm run criar-admin -- "Nome" email@x.com
npm run backup | backups | exportar | restaurar
```

## Onde fica cada coisa
| Quero mudar... | Arquivo |
|---|---|
| Telefone, WhatsApp, endereço, redes | `assets/js/config.js` (único lugar; injetado via `data-site`, `data-wpp`, `data-tel`...) |
| Catálogo de produtos | `assets/js/data.js` |
| Coeficientes da calculadora | `assets/js/consumo.js` (novo segmento: bloco em `SEGMENTOS` + lista `SEGMENTOS` em `server/api.js`) |
| Tema, menu, reveal, FAQ | `assets/js/main.js` |
| Descontos dos planos recorrentes | `assets/js/config.js` (`descontoMensal/Semestral/Anual`) + números escritos em `recorrencia.html` |
| Filtros/orçamento do catálogo | `assets/js/catalogo.js` |
| Formulário de landing (lead) | `assets/js/lead.js` |
| Rotas/validação/rate limit da API | `server/api.js` |
| Senha (scrypt), sessão, cookie | `server/auth.js` |
| Schema SQLite / migrações | `server/db.js` (banco em `dados/polvo.db`) |
| Servidor estático, headers, ETag | `server/server.js` |

Páginas: `index`, `produtos`, `calculadora`, `condominios`/`escolas` (SEO),
`recorrencia` (planos com desconto, origem `recorrencia`), `restaurantes`/`hoteis`/`pets` (SEO discreto: só link na lista Navegação do rodapé, fora do menu),
`sobre`, `contato`, `entrar`, `recuperar`, `conta`, `admin`, `privacidade`, `404`.
Cada página tem seu JS homônimo em `assets/js/`.

## Armadilhas conhecidas
- **Header:** o `backdrop-filter` fica no `.header::before`, nunca no `.header` — senão o menu mobile (`.nav` fixed < 900px) quebra.
- **Calculadora não mostra preço**, de propósito.
- Testes de `server/` sobem servidor real com banco temporário; não usar mocks.
- Rotas de admin exigem 401/403 corretos e travas anti-lockout (último admin) — testes cobrem isso.
- Nova LP: `data-segmento` do form precisa estar em `SEGMENTOS` (`server/api.js`) + rótulo em `admin.js` + `.selo--*`/`.funil-barra--*` no CSS + `sitemap.xml`.
- `npm test` pode pegar um Node antigo de uma pasta acima; use `node --test "server/*.test.js" "testes/*.test.js"`.
- Textos, nomes de funções e comentários são em **português**; mantenha o padrão.
