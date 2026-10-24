/** The SCADA view must observe the resident CPU with no PLC tab. MIT. */
const assert = require('node:assert/strict');
const { mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.env.AB_SUITE_PLAYWRIGHT || 'playwright');
const base = process.env.AB_SUITE_URL || 'http://127.0.0.1:4170';
const dir = process.env.AB_SUITE_EVIDENCE || '.suite-data/qa/resident';
(async () => {
  await mkdir(dir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.AB_SUITE_BROWSER
      ? { executablePath: process.env.AB_SUITE_BROWSER }
      : {})
  });
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 }
    }),
    plc = await context.newPage(),
    hmi = await context.newPage();
  const passed = [],
    errors = [];
  let expectedFailure = false,
    saved = null;
  for (const p of [plc, hmi]) {
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('console', (m) => {
      if (
        m.type() === 'error' &&
        !(expectedFailure && m.text().includes('503'))
      )
        errors.push(m.text());
    });
  }
  const run = async (name, fn) => {
    await fn();
    passed.push(name);
    console.log('PASS ' + name);
  };
  const command = (body) =>
    hmi.evaluate(async (body) => {
      const response = await fetch('/apps/plc/api/live/command', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + ABSuitePLC.token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      if (!response.ok) throw Error(await response.text());
      return response.json();
    }, body);
  try {
    await plc.goto(base + '/apps/plc/');
    await plc.waitForFunction(() => ABSuite.documentsReady);
    await hmi.goto(base + '/apps/scada/');
    await hmi.waitForFunction(() => ABSuite.documentsReady);
    saved = await hmi.evaluate(async () => {
      const r = await fetch('/apps/plc/api/live/state', {
        headers: { Authorization: 'Bearer ' + ABSuitePLC.token }
      });
      return r.json();
    });
    await command({
      command: 'scenario',
      scenario: 'rack',
      program: {
        version: 1,
        name: 'QA CPU residente',
        rungs: [
          {
            id: 'R1',
            name: 'Red propia',
            when: { op: 'contact', tag: 'I0.0' },
            action: { type: 'coil', target: 'Q0.0' }
          }
        ]
      }
    });
    await command({ command: 'input', tag: 'I0.0', value: true });
    await command({ command: 'mode', mode: 'RUN' });
    for (const [type, tag] of [
      ['indicator', 'outputs.Q0.0'],
      ['value', 'scan']
    ]) {
      await hmi.locator('[data-type=' + type + ']').click();
      await hmi
        .locator('#widget-label')
        .fill(type === 'indicator' ? 'Salida Q0.0' : 'CPU residente · ciclos');
      for (const [field, value] of Object.entries({
        x: type === 'indicator' ? 160 : 800,
        y: 300,
        width: 480,
        height: 260
      }))
        await hmi.locator('#widget-' + field).fill(String(value));
      await hmi.locator('#widget-source').selectOption('plc');
      await hmi.locator('#widget-tag').fill(tag);
      await hmi.locator('#properties button[type=submit]').click();
    }
    await hmi.locator('#preview-mode').click();
    await run(
      'CPU residente: SCADA muestra la salida real y el ciclo',
      async () => {
        await hmi.locator('.widget-indicator.active').waitFor();
        assert.ok(
          Number(
            (await hmi.locator('.widget-reading').textContent()).replaceAll(
              '.',
              ''
            )
          ) > 0
        );
      }
    );
    await run(
      'Cerrar PLC no detiene la CPU ni deja ciego al SCADA',
      async () => {
        const before = Number(
          (await hmi.locator('.widget-reading').textContent()).replaceAll(
            '.',
            ''
          )
        );
        await plc.close();
        await hmi.waitForFunction(
          (before) =>
            Number(
              document
                .querySelector('.widget-reading')
                ?.textContent.replaceAll('.', '')
            ) >
            before + 3,
          before
        );
        await command({ command: 'input', tag: 'I0.0', value: false });
        await hmi.locator('.widget-indicator:not(.active)').waitFor();
        assert.equal(
          await hmi.locator('.hmi-widget[data-quality=good]').count(),
          2
        );
        await hmi.screenshot({
          path: path.join(dir, 'scada-sin-pestana-plc.png')
        });
      }
    );
    await run(
      'Sin servidor se muestra caducidad y no se recupera una lectura de otra pestaña',
      async () => {
        expectedFailure = true;
        await hmi.route('**/suite/signals/plc', (route) =>
          route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: '{"error":"Fallo inyectado"}'
          })
        );
        await hmi.evaluate(() => {
          const poison = () =>
            localStorage.setItem(
              'ab-suite:signals:plc',
              JSON.stringify({
                schema: 'ab-suite.signals.v1',
                source: 'plc',
                instance: 'otra-pestana',
                at: Date.now(),
                tags: { scan: 9999, 'outputs.Q0.0': true }
              })
            );
          poison();
          window.__residentTestPoison = setInterval(poison, 250);
        });
        await hmi.waitForFunction(
          () =>
            document.querySelectorAll('.hmi-widget[data-quality=stale]')
              .length === 2,
          null,
          { timeout: 10000 }
        );
        assert.equal(await hmi.locator('.widget-indicator').count(), 0);
        assert.deepEqual(
          await hmi.locator('.widget-reading').allTextContents(),
          ['—', '—']
        );
        await hmi.evaluate(() => clearInterval(window.__residentTestPoison));
        await hmi.unroute('**/suite/signals/plc');
        await hmi.locator('.widget-indicator:not(.active)').waitFor();
        expectedFailure = false;
      }
    );
    await run('SCADA recarga y vuelve a observar sin abrir PLC', async () => {
      await hmi.reload();
      await hmi.waitForFunction(() => ABSuite.documentsReady);
      await hmi.locator('.widget-indicator:not(.active)').waitFor();
      assert.equal(
        await hmi.locator('.hmi-widget[data-quality=good]').count(),
        2
      );
    });
    assert.deepEqual(errors, []);
    await writeFile(
      path.join(dir, 'resident-results.json'),
      JSON.stringify(
        { date: new Date().toISOString(), passed, errors },
        null,
        2
      )
    );
    console.log(passed.length + ' recorridos de CPU residente completos.');
  } finally {
    if (saved && !hmi.isClosed())
      try {
        await command({
          command: 'scenario',
          scenario: saved.snapshot.scenario,
          program: saved.program
        });
        await command({ command: 'mode', mode: 'STOP' });
      } catch {}
    try {
      await context.close();
    } finally {
      await browser.close();
    }
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
