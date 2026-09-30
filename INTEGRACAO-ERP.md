# Integração com o ERP Empresarius (pendente)

Objetivo: exibir no site os produtos cadastrados no Empresarius (WME Sistemas),
sem recadastrar tudo em `assets/js/data.js`.

**Regra: não alterar nada no ERP.** Só leitura/exportação.

## O que já se sabe (30/09/2026)

- **Catálogo Virtual é B2B e exige login do cliente.**
  `app.empresarius.com.br/catalogo/26de729a-.../produtos` redireciona para `/login`.
  Sem login não há JSON de produtos acessível.
  Configuração em: **Lojas Virtuais > Configurações > Catálogo Virtual**.
- **Não há API pública documentada.** A IA do ERP não sabe nada sobre API REST,
  webhooks, feeds (JSON/XML/CSV), tokens ou iframe. Mandou falar com o suporte humano.
- **Integração WooCommerce existe** (Lojas Virtuais > Configurações > WooCommerce),
  sem detalhes técnicos. Usá-la exigiria configurar o ERP, por isso ficou de fora.
- **Importação em Excel existe**; a exportação de produtos provavelmente também,
  mas a IA não soube dizer onde.
- O site já está preparado: `assets/js/data.js` diz para trocar `window.CATALOGO`
  por `fetch('/api/produtos')`. Essa rota **ainda não existe** em `server/api.js`.

## Próximos passos

### 1. Procurar a exportação no ERP (fazer primeiro)
Na listagem de produtos (algo como **Cadastros > Produtos**), procurar:
- botão/ícone **Exportar**, **Excel**, **Imprimir** ou **⋮** em cima da tabela;
- menu **Relatórios > Produtos** (saída em Excel/PDF).

Se achar: mandar ~5 linhas da planilha para mapear as colunas.

### 2. Perguntar ao suporte humano da WME (WhatsApp/chamado)

```
Olá! Preciso de duas informações:
1) Como exporto o cadastro de produtos para Excel/CSV (com código, nome,
   descrição, grupo, unidade, preço, estoque e link da foto)?
2) Vocês têm API ou feed (JSON/XML) para meu site próprio consultar os
   produtos automaticamente? Se sim, como libero e qual o custo?
   Também queria saber se o Catálogo Virtual pode ser público, sem login.
```

Central de ajuda: https://cloud.wmesistemas.com/index.php/category/integracoes/

## Opções de integração (da mais segura para a menos)

1. **Planilha → importador (recomendada).** Exporta do ERP e roda um comando
   (`npm run importar-produtos arquivo.csv`, a criar) que grava no SQLite e expõe
   `GET /api/produtos`. Zero dependências. Reimportar sempre que mudar algo no ERP.
2. **Botão "Fazer pedido no catálogo"** levando o cliente já cadastrado ao
   Catálogo Virtual. Não integra dados, mas é imediato.
3. **API da WME**, se o suporte liberar token: sincronização automática. Só troca
   a fonte de dados do importador; o resto do site fica igual.
4. ~~Ler o catálogo logado automaticamente~~: não fazer. Exigiria guardar senha no
   servidor e quebraria com qualquer mudança no sistema deles.
