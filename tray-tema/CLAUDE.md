# tray-tema — tema da loja Tray (Atacado Polvo)

Loja: `nathansilva.commercesuite.com.br` (código 1544153). Base: Tema Padrão 3.0
v3.0.8 da Tray, **Twig**. A loja vende **com preço**. Este arquivo não entra no ZIP.

## Fluxo (sempre este)
1. Editar aqui → `npm run tema-zip` (raiz) → gera `tray-tema.zip` (fora do git).
2. Subir na **cópia de trabalho, tema 3521907** ("Cópia tema 3512519…", não publicada):
   painel → Aparência da loja (`/studio-app/?platform=tray`) → link "Editar HTML"
   da cópia (`a[href="/studio-app/themes/3521907/code"]`) → Ações → Enviar tema →
   Procurar arquivo → Enviar. Resultado sai no console (Pusher): "Upload de Zip
   finalizado com sucesso." (~20 s).
3. Conferir em `https://nathansilva.commercesuite.com.br?loja=1544153&opencode_theme=6e4a6bd6-51ff-4231-93a0-a0050fe737fe`.
4. Commit. **Publicar** a cópia só o usuário decide.

- Tray **recusa ZIP parcial** ("estrutura inválida"): sempre o tema inteiro.
- Envio só substitui arquivos de mesmo nome; arquivo apagado aqui continua lá.
- Publicado = "Genesis" (3512519): código não editável. **"agrada dev" não é deste projeto — nunca mexer.**
- Login no painel tem reCAPTCHA: o usuário entra na janela do Playwright.
- Pelo editor web não dá para criar/apagar arquivos em `pages/`, `layouts/`, `configs/` (pelo ZIP dá para enviar).

## Onde fica cada coisa
| Quero mudar... | Arquivo |
|---|---|
| Nossa identidade (fonte de títulos, cabeçalho, rodapé escuro, cartão, selos, botões) | `css/polvo.css` (carregado em `elements/styles.html`, antes do CSS personalizado do painel) |
| Cores base / fonte do corpo / raio | `configs/settings.json` → `current.configs` (vira `--color_*` em `elements/css-variables.html`) |
| Esqueleto da página | `layouts/default.html` |
| Home (seções arrastáveis) | `pages/home.html` + `configs/editor/sections/home.*.json` + `elements/snippets/*.html` |
| Cabeçalho / rodapé | `elements/header.html`, `elements/footer.html` (+ blocos em `snippets/`) |
| Cartão de produto / preço / selos | `elements/snippets/product.html`, `product-price.html`, `product-tags.html` |
| Página de produto | `pages/product.html`, `elements/product-main.html` |

## Regras
- Mexer o mínimo nos arquivos da Tray (facilita atualizar o tema); o nosso vai em `polvo.css` e em arquivos novos.
- Tokens do site antigo: `--polvo-*` no topo de `polvo.css` (iguais a `assets/css/style.css`).
- `main.css` é minificado (70 KB): achar seletor com `grep -o '\.seletor[^}]*}' css/main.css`.
- A CSP/regras do site antigo (sem inline) **não** valem aqui; o tema da Tray usa `<style>`/`<script>` inline.

## Feito / próximo
- [x] Paleta, Inter + Montserrat, cabeçalho, rodapé escuro, cartão de produto, selos.
- [ ] Seções da home (hero, segmentos, diferenciais, marcas).
- [ ] Página de produto com preço; WhatsApp (dados em `assets/js/config.js` do site antigo).
- [ ] LPs de SEO (condomínios, escolas, recorrência, restaurantes, hotéis, pets) + redirecionar URLs antigas (`/produtos.html` etc.).
