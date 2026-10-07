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

## Jeito mais fácil para muitos produtos: importar planilha

O painel tem **Produtos → Lista → Mais opções → "Importar produtos do Excel"**
(também "Exportar produtos").

Plano:
1. Baixar o modelo de planilha na tela de importação da Tray (colunas exatas).
2. Preencher a partir de `dados/polvo.db` (1.058 produtos): nome do site,
   código de barras como Referência/EAN, categoria (grupo do site), descrição
   de `produtos_site` se houver.
3. **Preço e estoque:** a base local não tem preço. Usar o botão **"exportar"**
   da lista de Produtos do Empresarius (um clique, só leitura, traz tudo) em
   vez de abrir ficha por ficha.
4. **Fotos:** a planilha costuma pedir o *endereço* da imagem. As do ERP têm
   endereço público (S3); as de `assets/img/produtos/` só depois que tiverem
   endereço público.
5. Revisar a planilha e subir na Tray.

**Antes de importar em massa, confirmar com o suporte da Tray/Empresarius:**
- se a integração nativa casa os produtos por Referência/EAN;
- se a própria integração envia os produtos do ERP para a Tray. Se enviar,
  importar os 1.058 antes pode gerar **produtos duplicados**.
