async (page) => {
  // Vincula cada produto da Tray ao do Empresarius com o mesmo código de barras.
  // Só salva quando a busca devolve exatamente 1 resultado com aquele código.
  const refs = REFS;
  const log = [];
  const espera = (ms) => page.waitForTimeout(ms);
  const busca = page.getByPlaceholder('Pesquisar').first();
  for (const ref of refs) {
    try {
      await busca.fill(ref);
      await espera(1500);
      const linhas = page.getByRole('row').filter({ has: page.getByRole('gridcell', { name: ref, exact: true }) });
      const n = await linhas.count();
      if (n !== 1) { log.push(`${ref}: ${n} linhas na lista, pulei`); continue; }
      const linha = linhas.first();
      const celulas = await linha.getByRole('gridcell').allInnerTexts();
      if (celulas[7] && celulas[7].trim()) { log.push(`${ref}: já vinculado (${celulas[7].trim()})`); continue; }
      await linha.getByLabel('vincular').click();
      const dlg = page.getByRole('dialog');
      await dlg.getByRole('textbox', { name: 'Produto no Empresarius' }).click();
      const pesq = page.getByRole('tooltip').getByRole('textbox', { name: 'Pesquisar' });
      await espera(1500);
      await pesq.pressSequentially(ref, { delay: 60 });
      if ((await pesq.inputValue()).trim() !== ref) { await pesq.fill(''); await espera(500); await pesq.pressSequentially(ref, { delay: 80 }); }
      for (let t = 0; t < 16; t++) { await espera(500); if (await page.getByRole('tooltip').getByRole('button').filter({ hasText: ref }).count()) break; }
      await espera(400);
      const opcoes = page.getByRole('tooltip').getByRole('button').filter({ hasText: ref });
      const todas = await page.getByRole('tooltip').locator('button:has(p)').allInnerTexts();
      const exatas = [];
      for (let i = 0; i < await opcoes.count(); i++) {
        const t = await opcoes.nth(i).innerText();
        if (t.split('\n').some((l) => l.trim() === ref)) exatas.push(i);
      }
      if (exatas.length !== 1) {
        log.push(`${ref}: ${exatas.length} resultados exatos (${todas.map((t) => t.replace(/\n/g, ' ')).join(' ; ')}), pulei`);
        await page.keyboard.press('Escape');
        await espera(500);
        if (await dlg.isVisible()) await dlg.getByRole('button', { name: 'close' }).click();
        await espera(800);
        continue;
      }
      const nomeErp = (await opcoes.nth(exatas[0]).innerText()).split('\n')[0];
      await opcoes.nth(exatas[0]).click();
      await espera(500);
      await dlg.getByRole('button', { name: 'Salvar' }).click();
      await dlg.waitFor({ state: 'hidden', timeout: 15000 });
      log.push(`${ref}: OK -> ${nomeErp}`);
      await espera(1500);
    } catch (e) {
      log.push(`${ref}: ERRO ${String(e.message).split('\n')[0]}`);
      await page.keyboard.press('Escape').catch(() => {});
      const dlg = page.getByRole('dialog');
      if (await dlg.isVisible().catch(() => false)) await dlg.getByRole('button', { name: 'close' }).click().catch(() => {});
      await espera(1000);
    }
  }
  await busca.fill('');
  return log.join('\n');
}
