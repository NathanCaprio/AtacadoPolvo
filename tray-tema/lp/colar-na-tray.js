// Snippet para a ferramenta de Playwright (browser_run_code_unsafe) que cola as
// LPs montadas (npm run lp) no criador de landing pages da Tray e salva — sem
// ativar. Antes: servir tray-tema/lp/dist em http://127.0.0.1:3078 (o sandbox
// do Playwright não lê arquivos) e estar logado no painel.
//
// Particularidades do criador (descobertas na marra):
// - /studio-app/landing-pages dá 404 se acessado direto: entrar pelo link
//   "Acessar criador de landing pages" da lista de temas.
// - Botões Editar da tabela só existem com o mouse em cima: abrir pelo id
//   com history.pushState + popstate (rota interna do app).
// - Criar: "Adicionar landing page" > "Página em branco" > campos com
//   placeholder "Ex: Black Friday" (nome) e "Ex: blackfriday" (URL) > Continuar.
//   A criação demora até ~40 s.
// - Monaco: colar via área de transferência (ClipboardEvent sintético não funciona).
// IDS: id da LP no criador (null = criar).
async (page) => {
  const BASE = 'https://nathansilva.commercesuite.com.br';
  const LPS = [
    ['condominios', 'Condomínios', 1], ['escolas', 'Escolas', 3], ['recorrencia', 'Recorrência', 5],
    ['restaurantes', 'Restaurantes', 7], ['hoteis', 'Hotéis e pousadas', 9], ['pets', 'Pets', 11]
  ];
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
  await page.goto(BASE + '/studio-app/?platform=tray');
  await page.getByText('Acessar criador de landing pages').first().click();
  await page.getByRole('row').nth(1).waitFor({ timeout: 30000 });
  const resultado = [];
  for (const [slug, nome, id] of LPS) {
    try {
      const aux = await page.context().newPage();
      await aux.goto('http://127.0.0.1:3078/' + slug + '.html');
      const html = await aux.evaluate(() => fetch(location.href).then(r => r.text()));
      await aux.close();
      await page.bringToFront();
      if (id) {
        await page.evaluate((id) => { history.pushState({}, '', '/studio-app/landing-pages/' + id); dispatchEvent(new PopStateEvent('popstate')); }, id);
      } else {
        await page.locator('button', { hasText: 'Adicionar landing page' }).click();
        await page.getByText('Página em branco', { exact: true }).click();
        await page.locator('input[placeholder="Ex: Black Friday"]').fill(nome);
        await page.locator('input[placeholder="Ex: blackfriday"]').fill(slug);
        await page.locator('button', { hasText: 'Continuar' }).click();
        await page.waitForURL(/landing-pages\/\d+/, { timeout: 60000 });
      }
      await page.locator('.monaco-editor').first().waitFor({ timeout: 30000 });
      await page.waitForTimeout(2500);
      await page.evaluate((t) => navigator.clipboard.writeText(t), html);
      await page.locator('.monaco-editor').first().click();
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Control+V');
      await page.waitForTimeout(1000);
      await page.keyboard.press('Control+End');
      await page.waitForTimeout(400);
      const fim = await page.evaluate(() => Math.max(...[...document.querySelectorAll('.monaco-editor .line-numbers')].map(n => +n.textContent || 0)));
      const linhas = html.split(String.fromCharCode(10)).length;
      let salvo = false;
      if (fim === linhas) {
        await page.locator('button', { hasText: 'Salvar' }).first().click();
        salvo = await page.getByText('salva com sucesso').first().waitFor({ timeout: 15000 }).then(() => true, () => false);
      }
      resultado.push({ slug, id: page.url().split('/').pop(), linhas, editor: fim, salvo });
      await page.waitForTimeout(1500);
    } catch (e) {
      resultado.push({ slug, erro: String(e.message).slice(0, 120) });
    }
  }
  return resultado;
}
