/** Real document creation and language switching across all nine independent tools. MIT. */
const assert = require('node:assert/strict');
const { mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.env.AB_SUITE_PLAYWRIGHT || 'playwright');
const base = process.env.AB_SUITE_URL || 'http://127.0.0.1:4170';
const dir = process.env.AB_SUITE_EVIDENCE || '.suite-data/qa/i18n';
(async () => {
  await mkdir(dir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.AB_SUITE_BROWSER
      ? { executablePath: process.env.AB_SUITE_BROWSER }
      : {})
  });
  const context = await browser.newContext({
    locale: 'en-US',
    viewport: { width: 1366, height: 768 },
    acceptDownloads: true
  });
  const errors = [],
    passed = [];
  const run = async (name, fn) => {
    await fn();
    passed.push(name);
    console.log('PASS ' + name);
  };
  const watch = (page) => {
    page.on('pageerror', (e) => errors.push(e.message));
    return page;
  };
  try {
    const home = watch(await context.newPage());
    await home.goto(base + '/');
    await home.locator('#suite-language').selectOption('en');
    await run(
      'English launcher: all nine visible, translated search, stable category values',
      async () => {
        await home
          .getByRole('heading', { name: 'Nine tools. Your choice.' })
          .waitFor();
        assert.equal(await home.locator('.tool-card').count(), 9);
        for (const link of await home.locator('.tool-open').all()) {
          const box = await link.boundingBox();
          assert.ok(box && box.y + box.height <= 768);
        }
        await home.locator('#search').fill('communications');
        await home.waitForFunction(
          () => document.querySelectorAll('.tool-card').length === 2
        );
        await home.locator('#reset-catalog').click();
        await home.locator('#filters').selectOption('Visión');
        assert.equal(await home.locator('.tool-card').count(), 1);
        await home.locator('#reset-catalog').click();
        await home.screenshot({ path: path.join(dir, 'suite-english.png') });
      }
    );
    for (const id of [
      'plc',
      'kop',
      'scl',
      'grafcet',
      'scada',
      'modbus',
      'serial',
      'vision',
      'bi'
    ]) {
      await run(
        id +
          ': create own project in English; switch twice without modifying data',
        async () => {
          const page = watch(await context.newPage());
          await page.goto(base + '/apps/' + id + '/');
          await page.waitForFunction(
            () =>
              window.ABSuite?.documentsReady &&
              document.documentElement.lang === 'en'
          );
          await page
            .getByRole('button', { name: '＋ New', exact: true })
            .waitFor();
          await page.locator('#suite-new').click();
          await page
            .locator('#suite-document-name')
            .fill('Proyecto global – test ' + id);
          await page
            .getByRole('button', { name: 'Create new project', exact: true })
            .click();
          await page
            .locator('#suite-document-dialog')
            .waitFor({ state: 'hidden' });
          const model = () =>
            page.evaluate(
              async () =>
                await (ABSuite.documents ?? ABSuite.adapter.documents).get()
            );
          if (id === 'serial') {
            await page.locator('#start').click();
            await page.waitForFunction(
              () =>
                Number(document.querySelector('#kpi-frames').textContent) >= 2
            );
            await page.locator('#stop').click();
            await page.waitForFunction(
              () => document.querySelector('#stop').disabled
            );
          }
          const before = await model();
          assert.ok(
            JSON.stringify(before).includes('Proyecto global – test ' + id)
          );
          await page.locator('#suite-language').selectOption('es');
          await page
            .getByRole('button', { name: '＋ Nuevo', exact: true })
            .waitFor();
          assert.deepEqual(await model(), before);
          if (id === 'bi') {
            await page.locator('#uploadInput').setInputFiles({
              name: 'own_labels.csv',
              mimeType: 'text/csv',
              buffer: Buffer.from('Nombre,Valor\nDatos,42\n')
            });
            await page.locator('#import-destination-dialog[open]').waitFor();
            await page.locator('#import-destination').selectOption('current');
            await page
              .locator('#import-destination-dialog button[type=submit]')
              .click();
            await page
              .locator('#import-destination-dialog')
              .waitFor({ state: 'hidden' });
            await page.locator('[data-view=data]').click();
            await page.waitForFunction(() =>
              document.querySelector('#dataBody').textContent.includes('Datos')
            );
            assert.match(
              await page.locator('#dataHead').textContent(),
              /Nombre/
            );
            assert.match(
              await page.locator('#dataBody').textContent(),
              /Datos/
            );
            assert.doesNotMatch(
              await page.locator('#dataBody').textContent(),
              /\bData\b/
            );
          }
          if (id === 'serial') {
            assert.ok(before.state.events.length >= 2);
            await page.evaluate(async (doc) => {
              const api = ABSuite.documents ?? ABSuite.adapter.documents;
              await api.create('Temporary empty capture');
              await api.restore({ ...doc, live: true });
            }, before);
            await page.waitForTimeout(1100);
            assert.deepEqual((await model()).state.events, before.state.events);
          }
          await page.locator('#suite-language').selectOption('en');
          await page
            .getByRole('button', { name: '＋ New', exact: true })
            .waitFor();
          assert.deepEqual(await model(), before);
          if (id === 'vision') {
            await page
              .getByRole('tab', { name: 'Inspection', exact: true })
              .waitFor();
            assert.doesNotMatch(
              await page.locator('body').innerText(),
              /gomas|caucho|rubber/i
            );
            await page.screenshot({
              path: path.join(dir, 'vision-english.png')
            });
          }
          await page.close();
        }
      );
    }
    await run(
      'Preference persists and propagates between tabs; names and source code remain untouched',
      async () => {
        const other = watch(await context.newPage());
        await other.goto(base + '/apps/scl/');
        await other.waitForFunction(() => ABSuite.documentsReady);
        const source = other.locator('#source');
        const editable = (await source.count())
          ? source
          : other.locator('textarea').first();
        const own =
          '// Ayuda, Datos, Nombre: texto del usuario\nVAR_INPUT\n A: BOOL;\nEND_VAR\nVAR_OUTPUT\n Q: BOOL;\nEND_VAR\nQ := A;';
        await editable.fill(own);
        await home.locator('#suite-language').selectOption('es');
        await other.waitForFunction(
          () => document.documentElement.lang === 'es'
        );
        assert.equal(await editable.inputValue(), own);
        await home.locator('#suite-language').selectOption('en');
        await other.waitForFunction(
          () => document.documentElement.lang === 'en'
        );
        assert.equal(await editable.inputValue(), own);
        await other.reload();
        await other.waitForFunction(
          () => document.documentElement.lang === 'en'
        );
        await other.close();
        await home.reload();
        await home
          .getByRole('heading', { name: 'Nine tools. Your choice.' })
          .waitFor();
      }
    );
    await run(
      'English help, optional library and mobile fit without horizontal overflow',
      async () => {
        await home.locator('#open-help').click();
        await home
          .getByRole('heading', { name: 'Each tool is its own workspace' })
          .waitFor();
        await home.keyboard.press('Escape');
        await home.setViewportSize({ width: 390, height: 844 });
        assert.ok(
          await home.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth
          )
        );
        assert.equal(await home.locator('.tool-card').count(), 9);
        await home.screenshot({
          path: path.join(dir, 'suite-english-mobile.png')
        });
        const library = watch(await context.newPage());
        await library.goto(base + '/suite/exercises.html');
        await library.getByRole('heading', { name: 'Your library' }).waitFor();
        await library.locator('#suite-language').selectOption('es');
        await library.getByRole('heading', { name: 'Tu biblioteca' }).waitFor();
        await library.close();
      }
    );
    await run(
      'First use follows browser language with English fallback for other locales',
      async () => {
        for (const [locale, heading] of [
          ['es-ES', 'Nueve herramientas. Tú eliges.'],
          ['fr-FR', 'Nine tools. Your choice.']
        ]) {
          const fresh = await browser.newContext({ locale });
          const page = watch(await fresh.newPage());
          await page.goto(base + '/');
          await page
            .getByRole('heading', { name: heading, exact: true })
            .waitFor();
          await fresh.close();
        }
        const installed = await browser.newContext({ locale: 'en-US' });
        const initial = watch(await installed.newPage());
        await initial.goto(base + '/?defaultLang=es');
        await initial
          .getByRole('heading', {
            name: 'Nueve herramientas. Tú eliges.',
            exact: true
          })
          .waitFor();
        await initial.goto(base + '/apps/kop/');
        await initial.waitForFunction(
          () => document.documentElement.lang === 'es' && ABSuite.documentsReady
        );
        await initial.locator('#suite-language').selectOption('en');
        await initial.goto(base + '/?defaultLang=es');
        await initial
          .getByRole('heading', {
            name: 'Nine tools. Your choice.',
            exact: true
          })
          .waitFor();
        await installed.close();
      }
    );
    await run(
      'English KOP controls execute real logic and preserve typed project fields',
      async () => {
        const page = watch(await context.newPage());
        await page.goto(base + '/apps/kop/');
        await page.waitForFunction(() => ABSuite.documentsReady);
        await page.locator('#suite-language').selectOption('en');
        await page.locator('#suite-new').click();
        await page.locator('#suite-document-name').fill('Nombre – own ladder');
        await page.locator('#suite-document-create').click();
        await page
          .locator('#suite-document-dialog')
          .waitFor({ state: 'hidden' });
        await page.locator('#add-rung').click();
        await page.locator('#edit-name').fill('Datos – rung label');
        await page.locator('#c-kind-0-0').selectOption('NC');
        await page
          .locator('#inspector-form')
          .getByRole('button', { name: 'Save changes', exact: true })
          .click();
        await page.locator('#step').click();
        assert.match(await page.locator('#outputs').textContent(), /● Q0/);
        assert.equal(
          await page.locator('#edit-name').inputValue(),
          'Datos – rung label'
        );
        await page.locator('#suite-language').selectOption('es');
        assert.equal(
          await page.locator('#edit-name').inputValue(),
          'Datos – rung label'
        );
        await page.close();
      }
    );
    assert.deepEqual(errors, []);
    await writeFile(
      path.join(dir, 'i18n-results.json'),
      JSON.stringify({ passed, errors }, null, 2)
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
