# Produtos na Tray (cadastro)

O catálogo da loja Tray vai ser ligado ao estoque do Empresarius pela integração
nativa Tray↔Empresarius. Orientação recebida: cadastrar **alguns** produtos na
Tray primeiro; depois eles são vinculados aos produtos do ERP.

## Feito em 05/10/2026: 30 produtos cadastrados à mão (pelo navegador)

- Todos **ativos** e visíveis na loja virtual.
- **Referência e EAN = código de barras do ERP**, o mesmo padrão do produto
  que já existia (Água Sanitária 2L Atrius, ref. 7898556040334). Deve ser por
  esse código que a vinculação com o estoque vai casar.
- Nome = nome do site (`produtos_site.nome` ou o automático de `nomeSite` em
  `server/erp.js`), revisado à mão (acentos, "Caixa c/ 100", etc.).
- Preço de venda e estoque lidos na ficha de cada produto no ERP. Estoque
  negativo no ERP virou 0 (Café Melitta, Esponja Alklin, Gel Adesivo).
- Fotos: 11 do ERP (S3) e 19 de `assets/img/produtos/` (as do `npm run fotos`).
- Descrição: uma frase padrão ("<nome>. Compre no atacado com preço de
  distribuidor na Atacado Polvo.").
- **Peso e medidas são estimativas** (nenhum produto tem peso no ERP). A Tray
  usa esses dados no frete; revisar os grandes: caixa de Papel Higiênico
  (3,5 kg, 50×50×25 cm), Mop Pó 40cm e Escova de Chão com cabo.
- Conferir no ERP: Aromatizador Wuax 1L está a R$ 44,90 (parece alto).

### Categorias criadas na Tray (mesmos nomes de grupo do site)
Limpeza (já existia), Aromatizantes, Lavanderia, Piscina, Alimentício, EPIs,
Baldes, Bacias e Mops, Inseticidas, Papéis, Descartáveis, Lixeiras e Coletores,
Dispensers e Pulverizadores, Panos e Flanelas, Esponjas e Fibras, Sanitários,
Vassouras, Rodos e Pás. ("categoria teste" é antiga, do painel.)

A coluna Categoria da lista de produtos demora a atualizar; abrindo o produto
a categoria aparece gravada.

### Os 30 (código de barras → preço no dia)
| Código | Produto | Categoria | Preço |
|---|---|---|---|
| 78965409165 | Água Sanitária 2L Actualy | Limpeza | 5,79 |
| 7898288821867 | Álcool em Gel 70 INPM Bactericida Flops 500ml | Limpeza | 6,99 |
| 7896540900312 | Detergente 500ml Gota Limpa Cristal | Limpeza | 2,29 |
| 7896540900626 | Desinfetante 2L Gota Limpa Lavanda | Limpeza | 7,99 |
| 7896540906727 | Desengordurante 500ml Gota Limpa | Limpeza | 6,50 |
| 7896040701105 | Cera Autobrilho Incolor Casakm 750ml | Limpeza | 19,90 |
| 7897744505914 | Aerosol Coala Lavanda 400ml | Aromatizantes | 18,99 |
| 78965409180 | Aromatizador de Ambientes 1L Flowers Wuax | Aromatizantes | 44,90 |
| 7896540905294 | Amaciante 1L Coco e Algodão Gota Limpa | Lavanderia | 13,99 |
| 7898556040884 | Alvejante sem Cloro 1L Atrius | Lavanderia | 7,99 |
| 78965409197 | Prendedor de Roupa de Madeira - 12un | Lavanderia | 3,99 |
| 7898922140811 | Algicida Clean Vale 1L | Piscina | 18,90 |
| 7896032501010 | Açúcar Refinado da Barra 1kg | Alimentício | 5,99 |
| 7891021006125 | Café Melitta Tradicional 500g | Alimentício | 35,99 |
| 7899682799912 | Avental Descartável em TNT Manga Longa Branco - Pacote c/ 10 | EPIs | 57,90 |
| 7899682745964 | Luva de Vinil M Nobre - Caixa c/ 100 | EPIs | 22,90 |
| 7897698200811 | Bacia Canelada 11L MB Plásticos | Baldes, Bacias e Mops | 12,90 |
| 7898513070732 | Conjunto Mop Pó 40cm com Cabo Telescópico | Baldes, Bacias e Mops | 79,90 |
| 7896027012019 | Anti Formigas Cartucho 2,5g | Inseticidas | 22,90 |
| 78965409168 | Papel Higiênico Rolão Clara Folha Dupla 240m Premium - Caixa c/ 8 Rolos | Papéis | 129,90 |
| 7898994532668 | Guardanapo Ametista 18x20cm - 100un | Papéis | 2,00 |
| 7896123402851 | Copo Descartável 200ml Transparente Copobel - 100un | Descartáveis | 8,99 |
| 7898416300929 | Bobina Picotada 5kg Bompack - 500un | Descartáveis | 24,90 |
| 78965409319 | Lixeira 14L Branca com Basculante Plasvale | Lixeiras e Coletores | 34,90 |
| 7899682727359 | Dispenser de Papel Higiênico Cai-Cai City Branco Nobre | Dispensers e Pulverizadores | 34,90 |
| 78965409075 | Dispenser Nobre 800ml com Reservatório XPro New Classic | Dispensers e Pulverizadores | 39,90 |
| 78965409176 | Pano Flanela Branca 28x38cm | Panos e Flanelas | 2,99 |
| 7897750778951 | Esponja Abrasiva Antirrisco Alklin | Esponjas e Fibras | 1,99 |
| 7896540903214 | Gel Adesivo Sanitário Gota Limpa Lavanda - 7 Aplicações | Sanitários | 13,90 |
| 7898586261365 | Escova de Chão 40cm Dalcin com Cabo | Vassouras, Rodos e Pás | 24,90 |

## Feito em 07/10/2026: vínculo DE>PARA no Empresarius (31 de 31)

Empresarius → Lojas Virtuais → Tray → Produtos → lápis ("vincular") de cada
linha → "Produto no Empresarius" → pesquisar o **código de barras** → escolher →
Salvar. Os 31 da Tray (os 30 acima + Água Sanitária 2L Atrius, 7898556040334)
casaram 1 a 1 pelo código. A partir daqui a integração manda **preço e estoque
do ERP** para a Tray e importa os pedidos da Tray para o ERP.
Script usado (Playwright, só salva se a busca achar exatamente 1 produto com o
código): `.playwright-mcp/vincular.js` (fora do git).

## Cuidados (aprendidos no cadastro)

**Empresarius (só leitura):**
- Ver preço: lista de Produtos → pesquisar o código → Opções → **Editar** →
  ler os campos (Venda, Qtd. Atual) → voltar **sem salvar**.
- **Nunca abrir `/produtos/register/<uuid>` direto pela URL**: cai num
  formulário "Produto (Adicionar)" vazio (e dispara GET `Mercadorias/undefined`).
- A lista mostra só preço de **compra**; o de venda está na ficha.
- Ir devagar (pausas entre fichas): o Empresarius já bloqueou por excesso de
  chamadas (ver `CLAUDE.md` da raiz).

**Tray:**
- A Tray aceita só JPEG/PNG. Algumas fotos do ERP vêm em **WebP** com nome
  `.jpg`; converter antes (no Windows: `PresentationCore` / `JpegBitmapEncoder`
  no PowerShell lê WebP pelo WIC).
- Formulário "Adicionar produto": preço é campo com máscara (digitar só os
  dígitos, "579" → 5,79); categoria = "Adicionar categoria principal" →
  Selecionar (ou "+ Adicionar nova categoria").

## Feito em 07/10/2026: +469 por planilha (loja com 500, o limite do plano), todos vinculados

- **Seleção** (`ferramentas/planilha-produtos.js`): ativos no ERP, fora os 31
  que já existiam; prioridade com estoque **e** foto, depois proporcional ao
  tamanho de cada categoria e, dentro dela, maior valor em estoque.
- **Dados:** preço, estoque, marca e NCM vieram da resposta de
  `Produtos/ListMercadoriasToSelect` que a própria tela de vínculo do ERP já
  carrega (lida pelo navegador, sem chamada nova ao ERP). Nome = `nomeSite`
  ou `produtos_site.nome`; categoria = grupo do site (`GRUPOS`).
  Referência = código do ERP; EAN só quando o código é GTIN válido.
- **Fotos:** do ERP (S3) ou de `assets/img/produtos/` pelo endereço
  `raw.githubusercontent.com/NathanCaprio/AtacadoPolvo/main/...` (repo
  público). A Tray copia para o CDN dela. Foto do ERP em WebP fica de fora.
- **Peso/medidas estimados pelo nome** (5L → ~5,4 kg etc.; sem volume = 300 g).
- **Importação:** Importar produtos do Excel → modelo "Polvo - ERP" (colunas
  A–P na ordem da planilha, identificador = Referência, "Nenhuma ação" para os
  que não estão no arquivo). 459 entraram de primeira; 10 da categoria nova
  "Embalagens" falharam ("Unexpected api response") e entraram no reenvio.
- **Vínculo:** `ferramentas/vincular-erp.js` (Playwright, na tela Lojas
  Virtuais → Tray → Produtos). Códigos curtos (11, 964, 990, 9002) não acham
  pela busca: buscar pelo nome do ERP e conferir o código no resultado.
  Produto com "mensagem de alerta" no ERP abre um aviso (Ok) antes de salvar.
- **Fora (558):** lista em `produtos-fora-da-tray.csv` na raiz (fora do git,
  tem preços). 281 sem foto (quase todos os Sacos de Lixo), 156 couberam mas
  não entraram pelo limite, 77 sem estoque, 34 sem estoque e sem foto, 10 com
  foto WebP.

Para crescer (plano maior): gerar de novo a planilha com `LIMITE_NOVOS`
maior; quem já está na loja é atualizado (mesma Referência), não duplica.

## Feito em 16/10/2026: +558 (plano Avançado, produtos ilimitados) — loja com 1.058

- Os 558 de `produtos-fora-da-tray.csv` entraram todos (decisão do usuário), inclusive
  os sem foto (281 + 34) e os sem estoque (111, aparecem indisponíveis até o ERP ter).
  `LIMITE_NOVOS=9999 node tray-tema/ferramentas/planilha-produtos.js . .playwright-mcp/mercadorias.json <saida> produtos-fora-da-tray.csv`
  (4º argumento = só os códigos da 1ª coluna do CSV). Dados do `mercadorias.json` de
  07/10; preço e estoque se acertam pelo vínculo com o ERP.
- Importação pelo modelo "Polvo - ERP": 558 importados, 0 erros, de primeira.
- **Fotos WebP:** eram 14, não 10 — 4 fotos do ERP com nome `.jpg` eram WebP e não estavam
  em `webp.json` (a Tray ignora a imagem sem avisar). Conferir o formato pelos bytes
  (`RIFF` = WebP) antes de importar. As 14 foram convertidas para JPEG
  (`assets/img/produtos/<uuid>.jpg`) e enviadas **na ficha de cada produto** no painel
  (`input[type=file]` de "Imagens e vídeo" + Salvar), porque o link do GitHub só vale
  depois do push.
- Fica para depois: foto para os 315 sem foto (`npm run fotos` + revisão + reenvio pela
  planilha, mesma Referência atualiza).
