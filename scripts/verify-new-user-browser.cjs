/** New-user acceptance: create, work, replace and recover through the same UI in every app. MIT. */
const assert = require('node:assert/strict'),
  { mkdir, writeFile } = require('node:fs/promises'),
  path = require('node:path');
const { chromium } = require(process.env.AB_SUITE_PLAYWRIGHT || 'playwright');
const base = process.env.AB_SUITE_URL || 'http://127.0.0.1:4170',
  dir = process.env.AB_SUITE_EVIDENCE || '.suite-data/qa/new-user';
(async () => {
  await mkdir(dir, { recursive: true });
  const browser = await chromium.launch({
      headless: true,
      ...(process.env.AB_SUITE_BROWSER
        ? { executablePath: process.env.AB_SUITE_BROWSER }
        : {})
    }),
    context = await browser.newContext({locale: 'es-ES',
      viewport: { width: 1600, height: 1000 },
      acceptDownloads: true
    });
  const errors = [],
    passed = [];
  const run = async (name, fn) => {
    await fn();
    passed.push(name);
    console.log('PASS ' + name);
  };
  async function open(id) {
    const p = await context.newPage();
    p.on('pageerror', (e) => errors.push({ id, error: e.message }));
    p.on('console', (m) => {
      if (m.type() === 'error') errors.push({ id, error: m.text() });
    });
    await p.goto(base + '/apps/' + id + '/');
    await p.locator('#suite-new').waitFor();
    await p.waitForFunction(() => ABSuite.documentsReady);
    return p;
  }
  async function create(p, name) {
    await p.locator('#suite-new').click();
    await p.locator('#suite-document-name').fill(name);
    await p.locator('#suite-document-create').click();
    await p.locator('#suite-document-dialog').waitFor({ state: 'hidden' });
  }
  async function recover(p, name) {
    await p.locator('#suite-projects').click();
    const row = p
      .locator('.suite-document-copy')
      .filter({ hasText: name })
      .first();
    await row.getByRole('button', { name: 'Recuperar', exact: true }).click();
    await p.locator('#suite-document-dialog').waitFor({ state: 'hidden' });
  }
  async function document(p) {
    return p.evaluate(async () => {
      const api = ABSuite.documents ?? ABSuite.adapter?.documents;
      return await api.get();
    });
  }
  const name = (id) => 'QA ' + id + ' propio';
  try {
    await run(
      'Primera visita: KOP, SCL, GRAFCET y Vision no imponen una demo',
      async () => {
        for (const id of ['kop', 'scl', 'grafcet', 'vision']) {
          const p = await open(id);
          if (id === 'kop') {
            assert.equal(await p.locator('.rung').count(), 0);
            assert.equal(
              await p
                .locator('#inputs')
                .textContent()
                .then((t) => t.includes('START')),
              false
            );
          }
          if (id === 'scl')
            assert.equal(await p.locator('#source').inputValue(), '');
          if (id === 'grafcet')
            assert.equal((await document(p)).stages.length, 1);
          if (id === 'vision')
            assert.equal(
              await p.locator('#verdict').textContent(),
              'SIN IMAGEN'
            );
          await p.close();
        }
      }
    );
    for (const id of [
      'kop',
      'scl',
      'grafcet',
      'scada',
      'modbus',
      'serial',
      'vision',
      'plc',
      'bi'
    ]) {
      const p = await open(id);
      await create(p, name(id));
      await run(
        id.toUpperCase() +
          ': un trabajo propio produce un resultado comprobable',
        async () => {
          if (id === 'kop') {
            await p.locator('#add-rung').click();
            await p.locator('#inputs button').filter({ hasText: 'I0' }).click();
            await p.locator('#step').click();
            assert.equal(await p.locator('.rung[data-power=on]').count(), 1);
            assert.match(
              await p.locator('.network-power').textContent(),
              /CONDUCE/
            );
            const active = await p
              .locator('.rung')
              .evaluate((e) => getComputedStyle(e).backgroundColor);
            await p.locator('#inputs button').filter({ hasText: 'I0' }).click();
            assert.match(
              await p.locator('.network-power').textContent(),
              /PENDIENTE/
            );
            assert.equal(await p.locator('.rung[data-power=on]').count(), 0);
            await p.locator('#step').click();
            assert.match(
              await p.locator('.network-power').textContent(),
              /SIN PASO/
            );
            const inactive = await p
              .locator('.rung')
              .evaluate((e) => getComputedStyle(e).backgroundColor);
            assert.notEqual(active, inactive);
            await p.locator('#inputs button').filter({ hasText: 'I0' }).click();
            await p.locator('#step').click();
          }
          if (id === 'scl') {
            await p
              .locator('#source')
              .fill(
                'VAR_INPUT\n A : BOOL;\n B : BOOL;\nEND_VAR\nVAR_OUTPUT\n Q : BOOL;\nEND_VAR\nQ := A AND NOT B;'
              );
            await p.locator('#convert').click();
            await p
              .getByRole('tab', { name: 'Tabla de verdad', exact: true })
              .click();
            assert.equal(await p.locator('#truth-results tbody tr').count(), 4);
            const values = await p
              .locator('#truth-results tbody tr')
              .allTextContents();
            assert.ok(values.some((t) => t.includes('ST = KOP')));
            await p
              .locator('#truth-results tbody tr')
              .nth(1)
              .getByRole('button', { name: 'Aplicar' })
              .click();
            assert.match(await p.locator('#outputs').textContent(), /Q: ON/);
          }
          if (id === 'grafcet') {
            await p.locator('#add-stage').click();
            await p.locator('#edit-actions').fill('RUN');
            await p
              .getByRole('button', { name: 'Guardar cambios', exact: true })
              .click();
            await p.locator('#add-transition').click();
            await p.locator('#edit-from').fill('E0');
            await p.locator('#edit-to').fill('E1');
            await p.locator('#edit-condition').fill('start AND permit');
            await p
              .getByRole('button', { name: 'Guardar cambios', exact: true })
              .click();
            await p
              .locator('#inputs button')
              .filter({ hasText: 'start' })
              .click();
            await p
              .locator('#inputs button')
              .filter({ hasText: 'permit' })
              .click();
            await p.locator('#step').click();
            assert.equal(
              await p.evaluate(() => ABSuite.adapter.snapshot()['actions.RUN']),
              true
            );
            assert.equal(
              await p.evaluate(() => ABSuite.adapter.snapshot()['stages.E1']),
              true
            );
            assert.equal((await document(p)).transitions.length, 1);
            await p.locator('#grafcet-layout').click();
            assert.equal((await document(p)).stages[0].x, 200);
          }
          if (id === 'scada') {
            await p.locator('[data-type=rectangle]').click();
            await p.locator('#widget-label').fill('Panel propio');
            await p.locator('#properties button[type=submit]').click();
            await p.locator('#hmi-center-x').click();
            const d = await document(p);
            assert.equal(
              d.screens[0].widgets[0].x,
              (d.screens[0].width - d.screens[0].widgets[0].width) / 2
            );
          }
          if (id === 'modbus') {
            await p.locator('#quick-demo').click();
            await p.waitForFunction(
              () => document.querySelector('#values').children.length === 8
            );
            const download = p.waitForEvent('download');
            await p.locator('#read-values-csv').click();
            await (await download).saveAs(path.join(dir, 'modbus-propio.csv'));
            await p.getByRole('tab', { name: 'Interpretar bytes' }).click();
            await p
              .locator('#packet-hex')
              .fill('00 01 00 00 00 07 01 03 04 3F 80 00 00');
            await p.locator('#packet-direction').selectOption('response');
            await p.locator('#packet-parse').click();
            assert.match(
              await p.locator('#packet-result').textContent(),
              /float32 \(ABCD\): 1/
            );
          }
          if (id === 'serial') {
            await p.getByRole('tab', { name: 'Trama propia' }).click();
            await p.locator('#manual-hex').fill('01 03 00 00 00 02');
            await p.locator('#manual-append-crc').check();
            await p.locator('#manual-decode').click();
            await p.waitForFunction(() =>
              document
                .querySelector('#manual-result')
                .textContent.includes('C4 0B')
            );
            assert.match(
              await p.locator('#manual-result').textContent(),
              /VÁLIDA/
            );
            await p.getByRole('tab', { name: 'Captura', exact: true }).click();
            await p.locator('#start').click();
            await p.waitForFunction(
              () =>
                Number(document.querySelector('#kpi-frames').textContent) > 1
            );
            await p.locator('#stop').click();
          }
          if (id === 'vision') {
            const png = await p.evaluate(() => {
              const c = document.createElement('canvas');
              c.width = 160;
              c.height = 100;
              const ctx = c.getContext('2d');
              ctx.fillStyle = 'white';
              ctx.fillRect(0, 0, 160, 100);
              ctx.fillStyle = 'black';
              ctx.fillRect(30, 30, 20, 20);
              return c.toDataURL('image/png').split(',')[1];
            });
            await p.locator('#image-file').setInputFiles({
              name: 'mi-pieza.png',
              mimeType: 'image/png',
              buffer: Buffer.from(png, 'base64')
            });
            await p.waitForFunction(() =>
              document.querySelector('#feed-status').classList.contains('ready')
            );
            await p.locator('#analyze').click();
            assert.equal(await p.locator('#defects').textContent(), '1');
            await p.locator('#compare-baseline').click();
            await p.locator('#threshold').fill('0');
            await p.locator('#analyze').click();
            assert.equal(await p.locator('#defects').textContent(), '0');
            await p.locator('#compare-result').click();
            assert.match(
              await p.locator('#vision-compare-result').textContent(),
              /-1/
            );
          }
          if (id === 'plc') {
            assert.equal((await document(p)).program.rungs.length, 0);
            await p.locator('#kop-add').click();
            await p.locator('[data-edit=contact-tag]').fill('I0.0');
            await p.locator('[data-edit=contact-tag]').dispatchEvent('change');
            await p.locator('[data-edit=action-target]').fill('Q0.0');
            await p
              .locator('[data-edit=action-target]')
              .dispatchEvent('change');
            await p.locator('#kop-apply').click();
            await p.locator('#plc-watch-open').click();
            await p.locator('#watch-tag').selectOption('inputs.I0.0');
            await p.locator('#watch-add').click();
            await p.locator('#watch-tag').selectOption('outputs.Q0.0');
            await p.locator('#watch-add').click();
            await p
              .locator('#watch-results tbody tr')
              .filter({ hasText: 'inputs.I0.0' })
              .getByRole('button', { name: 'Poner a 1' })
              .click();
            await p.locator('#watch-step').click();
            await p.waitForFunction(() =>
              [...document.querySelectorAll('#watch-results tbody tr')].some(
                (e) =>
                  e.textContent.includes('outputs.Q0.0') &&
                  e.textContent.includes('TRUE')
              )
            );
          }
          if (id === 'bi') {
            await p.locator('#uploadInput').setInputFiles({
              name: 'mis_datos.csv',
              mimeType: 'text/csv',
              buffer: Buffer.from('grupo,valor\nA,10\nB,20\nA,5\n')
            });
            await p.locator('#import-destination-dialog').waitFor();
            await p.locator('#import-destination').selectOption('current');
            await p
              .locator('#import-destination-dialog button[type=submit]')
              .click();
            await p
              .locator('#import-destination-dialog')
              .waitFor({ state: 'hidden' });
            await p.locator('[data-view=sql]').click();
            await p.locator('#bi-sql-browser summary').first().click();
            await p
              .locator('#bi-sql-browser')
              .getByRole('button', { name: 'Contar filas' })
              .click();
            await p.locator('#executeSql').click();
            await p.waitForFunction(
              () =>
                document.querySelector('#sqlResults td')?.textContent === '3'
            );
            const download = p.waitForEvent('download');
            await p.locator('#sql-export-result').click();
            await (
              await download
            ).saveAs(path.join(dir, 'bi-consulta-propia.csv'));
            assert.equal(await p.locator('#sql-history option').count(), 2);
          }
        }
      );
      if (id === 'vision')
        await run(
          'VISION: imagen permanente y configuración sin scroll en tres tamaños de escritorio',
          async () => {
            await p
              .getByRole('tab', { name: 'Inspección', exact: true })
              .click();
            for (const [width, height] of [
              [1280, 720],
              [1366, 768],
              [1920, 1080]
            ]) {
              await p.setViewportSize({ width, height });
              for (const task of [
                'recipe',
                'source',
                'region',
                'measure',
                'files'
              ]) {
                await p.locator('#vision-task').selectOption(task);
                if (task === 'source')
                  await p.locator('#vision-source-type').selectOption('ip');
                const size = await p.evaluate(() => {
                  const panel = document.querySelector(
                      '.vision-task-panel:not([hidden])'
                    ),
                    image = document
                      .querySelector('.viewer')
                      .getBoundingClientRect();
                  return {
                    width: document.documentElement.scrollWidth,
                    height: document.documentElement.scrollHeight,
                    panelHeight: panel.clientHeight,
                    panelScroll: panel.scrollHeight,
                    imageHeight: image.height,
                    imageWidth: image.width,
                    imageBottom: image.bottom
                  };
                });
                assert.ok(
                  size.width <= width && size.height <= height,
                  JSON.stringify(size)
                );
                assert.ok(
                  size.panelScroll <= size.panelHeight + 1,
                  task + ' ' + JSON.stringify(size)
                );
                assert.ok(
                  size.imageHeight >= height * 0.57 &&
                    size.imageWidth >= width * 0.65 &&
                    size.imageBottom <= height,
                  JSON.stringify(size)
                );
              }
              await p.locator('#vision-task').selectOption('measure');
              for (const mode of ['scale', 'limits']) {
                await p.locator('#vision-measure-mode').selectOption(mode);
                assert.ok(
                  await p
                    .locator('#vision-panel-measure')
                    .evaluate((e) => e.scrollHeight <= e.clientHeight + 1),
                  'Medición ' + mode + ' desborda'
                );
              }
              await p.locator('#vision-measure-mode').selectOption('scale');
              await p.locator('#vision-task').selectOption('recipe');
              await p.screenshot({
                path: path.join(dir, 'vision-taller-' + width + '.png')
              });
            }
            await p.setViewportSize({ width: 1366, height: 768 });
            await p.locator('#vision-task').selectOption('source');
            await p.locator('#vision-source-type').selectOption('ip');
            await p.locator('#vision-ip-credentials').click();
            await p.locator('#ip-user').fill('practice');
            await p.locator('#ip-password').fill('session-only');
            await p
              .getByRole('dialog', { name: 'Credenciales de cámara IP' })
              .getByRole('button', { name: 'Guardar y volver' })
              .click();
            assert.equal(await p.locator('#ip-user').inputValue(), 'practice');
            assert.equal(
              JSON.stringify(await document(p)).includes('session-only'),
              false
            );
            await p.locator('#vision-task').selectOption('region');
            for (const [key, value] of Object.entries({
              x: 20,
              y: 20,
              width: 50,
              height: 50
            }))
              await p.locator('#roi-' + key).fill(String(value));
            await p.locator('#roi-apply').click();
            assert.deepEqual(
              (await p.evaluate(() => ABSuite.adapter.recipe())).roi,
              { x: 20, y: 20, width: 50, height: 50 }
            );
            await p.locator('#vision-task').selectOption('measure');
            await p.locator('#vision-calibration-help').click();
            await p
              .getByRole('dialog', { name: 'Guía de calibración' })
              .getByRole('button', { name: 'Cerrar ×' })
              .click();
            await p.locator('#vision-focus').click();
            assert.ok(
              (await p.locator('.viewer').boundingBox()).height > 768 * 0.7
            );
            await p.keyboard.press('Escape');
            assert.equal(
              await p.locator('#vision-focus').getAttribute('aria-pressed'),
              'false'
            );
            await p.locator('#vision-task').selectOption('recipe');
            await p.setViewportSize({ width: 1600, height: 1000 });
          }
        );
      const before = await document(p);
      await p.screenshot({ path: path.join(dir, id + '-propio.png') });
      await run(
        id.toUpperCase() +
          ': Nuevo quita el trabajo anterior y permite recuperarlo',
        async () => {
          await create(p, 'QA ' + id + ' vacío');
          const blank = await document(p);
          assert.ok(blank.name.includes('vacío'));
          if (id === 'kop') assert.equal(blank.rungs.length, 0);
          if (id === 'plc') assert.equal(blank.program.rungs.length, 0);
          if (id === 'scl') assert.equal(blank.source, '');
          if (id === 'grafcet') {
            assert.equal(blank.stages.length, 1);
            assert.equal(blank.transitions.length, 0);
            assert.deepEqual(blank.inputs, {});
          }
          if (id === 'scada') assert.equal(blank.screens[0].widgets.length, 0);
          if (id === 'vision') {
            assert.equal(blank.image, null);
            assert.equal(
              await p.locator('#verdict').textContent(),
              'SIN IMAGEN'
            );
          }
          if (id === 'modbus') {
            assert.equal(blank.reading, null);
            assert.equal(await p.locator('#values tr').count(), 0);
          }
          if (id === 'serial') {
            assert.equal(blank.state.events.length, 0);
            assert.equal(await p.locator('#kpi-frames').textContent(), '0');
          }
          if (id === 'bi') {
            assert.notEqual(blank.id, before.id);
            assert.equal(
              (await p.evaluate(() => ABSuite.bi.model())).tables.length,
              0
            );
          }
          await recover(p, name(id));
          const restored = await document(p);
          if (id === 'vision') {
            assert.equal(restored.image, before.image);
            assert.equal(restored.recipe.threshold, before.recipe.threshold);
          } else if (id === 'serial')
            assert.deepEqual(restored.state.events, before.state.events);
          else if (id === 'bi') {
            assert.equal(restored.id, before.id);
            assert.equal(
              (await p.evaluate(() => ABSuite.bi.model())).tables.length,
              1
            );
          } else assert.deepEqual(restored, before);
        }
      );
      await p.setViewportSize({ width: 390, height: 844 });
      await p.reload();
      await p.locator('#suite-new').waitFor();
      await p.waitForFunction(() => ABSuite.documentsReady);
      await p.waitForTimeout(200);
      await run(
        id.toUpperCase() + ': móvil sin desbordamiento y Nuevo accesible',
        async () => {
          assert.ok(
            await p.evaluate(() => document.documentElement.scrollWidth <= 392),
            id + ' desborda'
          );
          if (id === 'vision')
            assert.equal((await document(p)).image, before.image);
          if (id === 'serial')
            assert.deepEqual(
              (await document(p)).state.events,
              before.state.events
            );
          if (id === 'modbus')
            assert.deepEqual((await document(p)).profile, before.profile);
          await p.locator('#suite-new').click();
          assert.equal(
            await p.locator('#suite-document-create').isVisible(),
            true
          );
          await p
            .locator('#suite-document-dialog')
            .getByRole('button', { name: 'Cerrar ×' })
            .click();
          await p.screenshot({ path: path.join(dir, id + '-mobile.png') });
        }
      );
      await p.close();
    }
    assert.deepEqual(errors, []);
    await writeFile(
      path.join(dir, 'new-user-results.json'),
      JSON.stringify(
        { date: new Date().toISOString(), passed, errors },
        null,
        2
      )
    );
    console.log(passed.length + ' recorridos nuevos completos.');
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
