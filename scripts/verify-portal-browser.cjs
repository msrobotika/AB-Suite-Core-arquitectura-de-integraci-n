/** Independent launch, personal favorites and recoverable library management. MIT. */
const assert = require('node:assert/strict');
const { mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.env.AB_SUITE_PLAYWRIGHT || 'playwright');
const base = process.env.AB_SUITE_URL || 'http://127.0.0.1:4170';
const dir = process.env.AB_SUITE_EVIDENCE || '.suite-data/qa/portal';
(async () => {
  await mkdir(dir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.AB_SUITE_BROWSER
      ? { executablePath: process.env.AB_SUITE_BROWSER }
      : {})
  });
  const context = await browser.newContext({locale: 'es-ES',
    viewport: { width: 1280, height: 720 },
    acceptDownloads: true
  });
  let expectedHTTPFailure = false;
  const errors = [],
    passed = [];
  const watch = (p) => {
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('console', (m) => {
      if (
        m.type() === 'error' &&
        !(expectedHTTPFailure && m.text().includes('503'))
      )
        errors.push(m.text());
    });
    return p;
  };
  const run = async (name, fn) => {
    await fn();
    passed.push(name);
    console.log('PASS ' + name);
  };
  const page = watch(await context.newPage());
  let libraryContext, library, copyId;
  const code = {
    schema: 'ab.scl.document.v1',
    name: 'Secuencia propia',
    source: '// Mi código de aprendizaje'
  };
  const exercise = {
    schema: 'ab-suite.exercise.v1',
    name: 'Práctica conservada',
    createdAt: '2026-10-24T10:00:00.000Z',
    components: { scl: { savedAt: '2026-10-24T10:00:00.000Z', document: code } }
  };
  async function organize(id) {
    await library.locator('#exercise-organize summary').click();
    await library.locator('#' + id).click();
  }
  try {
    await run(
      'Las nueve herramientas son la entrada principal y caben en tres tamaños de escritorio',
      async () => {
        await page.goto(base + '/');
        await page.waitForFunction(() =>
          document
            .getElementById('runtime-note')
            .textContent.includes('disponibles')
        );
        for (const [width, height] of [
          [1280, 720],
          [1366, 768],
          [1920, 1080]
        ]) {
          await page.setViewportSize({ width, height });
          assert.equal(await page.locator('.tool-card').count(), 9);
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollHeight <= innerHeight + 2
            )
          );
          for (const link of await page.locator('.tool-open').all()) {
            const box = await link.boundingBox();
            assert.ok(box && box.y >= 0 && box.y + box.height <= height);
          }
          await page.screenshot({
            path: path.join(dir, 'suite-nueve-' + width + '.png')
          });
        }
      }
    );
    await run(
      'Favoritas personales: dos aplicaciones elegidas, con las nueve visibles al volver a entrar',
      async () => {
        await page.locator('.tool-favorite[data-tool=kop]').click();
        await page.locator('.tool-favorite[data-tool=vision]').click();
        await page.locator('#view-favorites').click();
        assert.equal(await page.locator('.tool-card').count(), 2);
        await page.reload();
        assert.equal(await page.locator('.tool-card').count(), 9);
        assert.equal(
          await page.locator('.tool-favorite[aria-pressed=true]').count(),
          2
        );
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.locator('.tool-favorite[data-tool=scl]').focus();
        await page.keyboard.press('Space');
        assert.equal(
          await page
            .locator('.tool-favorite[data-tool=scl]')
            .getAttribute('aria-pressed'),
          'true'
        );
        assert.equal(await page.locator('.tool-card').count(), 9);
        for (const link of await page.locator('.tool-open').all()) {
          const box = await link.boundingBox();
          assert.ok(box.y + box.height <= 720);
        }
        await page.evaluate(() => {
          const original = Storage.prototype.setItem;
          Storage.prototype.setItem = function (key, value) {
            if (key === 'ab-suite:favorite-tools:v1')
              throw Error('Preferencias sin espacio');
            return original.call(this, key, value);
          };
        });
        await page.locator('.tool-favorite[data-tool=plc]').click();
        await page
          .getByText(
            'La preferencia solo está disponible en esta pestaña: no se pudo guardar en el navegador.',
            { exact: true }
          )
          .waitFor();
        assert.equal(await page.locator('.tool-card').count(), 9);
        await page.reload();
        assert.equal(
          await page
            .locator('.tool-favorite[data-tool=plc]')
            .getAttribute('aria-pressed'),
          'false'
        );
      }
    );
    await run(
      'Buscar, filtrar y regresar a las nueve sin perder favoritas; diálogos accesibles con Escape',
      async () => {
        await page.locator('#search').fill('scada');
        assert.equal(await page.locator('.tool-card').count(), 1);
        await page.locator('#reset-catalog').click();
        await page.locator('#filters').selectOption('Comunicaciones');
        assert.equal(await page.locator('.tool-card').count(), 2);
        await page.locator('#reset-catalog').click();
        assert.equal(await page.locator('.tool-card').count(), 9);
        await page.locator('#open-help').click();
        await page.locator('#help-dialog').waitFor();
        await page.keyboard.press('Escape');
        await page.locator('#help-dialog').waitFor({ state: 'hidden' });
        await page.locator('#open-download').click();
        await page
          .getByRole('heading', { name: 'Instalación de AB Suite' })
          .waitFor();
        await page.keyboard.press('Escape');
      }
    );
    await run(
      'El panel opcional consulta la CPU residente, exporta muestras y caduca ante una caída sin usar señales prefijadas',
      async () => {
        await page.locator('#open-connections').click();
        await page.locator('[data-source=plc] .signal-good').waitFor();
        const download = page.waitForEvent('download');
        await page.locator('#export-signals').click();
        await (
          await download
        ).saveAs(path.join(dir, 'telemetria-residente.csv'));
        expectedHTTPFailure = true;
        await page.route('**/suite/signals/plc', (route) =>
          route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: '{"error":"Caída inyectada"}'
          })
        );
        await page.evaluate(() => {
          window.__poison = setInterval(
            () =>
              localStorage.setItem(
                'ab-suite:signals:plc',
                JSON.stringify({
                  schema: 'ab-suite.signals.v1',
                  source: 'plc',
                  instance: 'otra-pestana',
                  at: Date.now(),
                  tags: { scan: 999999 }
                })
              ),
            250
          );
        });
        await page
          .locator('[data-source=plc] .signal-stale')
          .waitFor({ timeout: 12000 });
        await page.evaluate(() => clearInterval(window.__poison));
        await page.unroute('**/suite/signals/plc');
        await page.locator('[data-source=plc] .signal-good').waitFor();
        expectedHTTPFailure = false;
        await page.keyboard.press('Escape');
        await page.locator('#connections-dialog').waitFor({ state: 'hidden' });
      }
    );
    await run(
      'Una herramienta se abre por sí sola sin cargar otras aplicaciones ni crear un ejercicio',
      async () => {
        const unrelated = [];
        page.on('request', (r) => {
          if (/\/apps\/(bi|serial|modbus)\/api\//.test(r.url()))
            unrelated.push(r.url());
        });
        await page.locator('.tool-card[data-tool=kop] .tool-open').click();
        await page.waitForFunction(() => ABSuite.documentsReady);
        assert.equal(new URL(page.url()).pathname, '/apps/kop/');
        assert.equal(await page.locator('.rung').count(), 0);
        assert.deepEqual(unrelated, []);
      }
    );
    libraryContext = await browser.newContext({locale: 'es-ES',
      viewport: { width: 1280, height: 720 },
      acceptDownloads: true
    });
    library = watch(await libraryContext.newPage());
    await run(
      'La biblioteca migra documentos y copias antiguas y lista resúmenes sin cargar imágenes ni tablas',
      async () => {
        await library.goto(base + '/');
        await library.evaluate(async (exercise) => {
          const request = indexedDB.open('ab-suite-exercises', 2);
          request.onupgradeneeded = () => {
            for (const [name, keyPath] of [
              ['exercises', 'id'],
              ['recoveries', 'id'],
              ['actives', 'tool']
            ])
              request.result.createObjectStore(name, { keyPath });
          };
          const db = await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
          const tx = db.transaction(['exercises', 'recoveries'], 'readwrite');
          tx.objectStore('exercises').add({
            id: 'legacy-own',
            updatedAt: new Date().toISOString(),
            document: exercise
          });
          tx.objectStore('recoveries').add({
            id: 'old-copy',
            tool: 'scl',
            at: new Date().toISOString(),
            document: exercise.components.scl.document,
            reason: 'Copia anterior'
          });
          await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onabort = () => reject(tx.error);
          });
          db.close();
        }, exercise);
        await library.addInitScript(() => {
          const original = IDBObjectStore.prototype.getAll;
          IDBObjectStore.prototype.getAll = function (...args) {
            if (['exercises', 'recoveries'].includes(this.name))
              throw Error(
                'No se deben cargar los documentos completos al listar'
              );
            return original.apply(this, args);
          };
        });
        await library.goto(base + '/suite/exercises.html?id=legacy-own');
        await library
          .getByRole('heading', { name: 'Práctica conservada', exact: true })
          .waitFor();
        const migrated = await library.evaluate(async () => {
          const store = await import('/suite/exercise-store.js');
          return {
            document: (await store.getExercise('legacy-own')).document,
            recovery: (await store.getRecovery('old-copy')).document,
            index: await store.listExercises()
          };
        });
        assert.deepEqual(migrated.document, exercise);
        assert.deepEqual(migrated.recovery, code);
        assert.equal(migrated.index[0].components.scl.name, code.name);
        assert.ok(!JSON.stringify(migrated.index).includes(code.source));
      }
    );
    await run(
      'Renombrar informa fallos de almacenamiento; duplicar crea una práctica independiente',
      async () => {
        await organize('exercise-rename');
        await library
          .locator('#exercise-edit-name')
          .fill('Mi práctica organizada');
        await library.evaluate(() => {
          window.__tx = IDBDatabase.prototype.transaction;
          IDBDatabase.prototype.transaction = function (stores, mode, ...rest) {
            if (mode === 'readwrite' && [].concat(stores).includes('exercises'))
              throw Error('Escritura bloqueada en la prueba');
            return window.__tx.call(this, stores, mode, ...rest);
          };
        });
        await library.locator('#exercise-name-save').click();
        await library
          .locator('#exercise-name-error')
          .getByText('Escritura bloqueada en la prueba', { exact: true })
          .waitFor();
        assert.equal(
          await library.locator('#exercise-title').textContent(),
          exercise.name
        );
        await library.waitForFunction(
          () => !document.getElementById('exercise-name-cancel').disabled
        );
        assert.ok(await library.locator('#exercise-name-cancel').isEnabled());
        await library.evaluate(
          () => (IDBDatabase.prototype.transaction = window.__tx)
        );
        await library.locator('#exercise-name-save').click();
        await library
          .locator('#exercise-name-dialog')
          .waitFor({ state: 'hidden' });
        assert.equal(
          await library.locator('#exercise-title').textContent(),
          'Mi práctica organizada'
        );
        await organize('exercise-duplicate');
        await library
          .locator('#exercise-edit-name')
          .fill('Mi práctica · copia');
        await library.locator('#exercise-name-save').click();
        await library
          .locator('#exercise-name-dialog')
          .waitFor({ state: 'hidden' });
        copyId = new URL(library.url()).searchParams.get('id');
        assert.notEqual(copyId, 'legacy-own');
        const docs = await library.evaluate(async (id) => {
          const s = await import('/suite/exercise-store.js');
          return [
            (await s.getExercise('legacy-own')).document,
            (await s.getExercise(id)).document
          ];
        }, copyId);
        assert.equal(docs[0].name, 'Mi práctica organizada');
        assert.equal(docs[1].name, 'Mi práctica · copia');
        assert.deepEqual(docs[1].components, docs[0].components);
      }
    );
    await run(
      'Archivar conserva todo, excluye el destino de captura y permite restaurarlo',
      async () => {
        await organize('exercise-archive');
        await library.waitForFunction(() =>
          document
            .getElementById('exercise-intro')
            .textContent.includes('archivado')
        );
        await library.locator('#exercise-view').selectOption('archived');
        await library
          .getByRole('button', { name: 'Mi práctica · copia', exact: true })
          .waitFor();
        const tool = watch(await libraryContext.newPage());
        await tool.goto(base + '/apps/kop/');
        await tool.waitForFunction(() => ABSuite.documentsReady);
        await tool.locator('#suite-projects').click();
        await tool.locator('#suite-exercise-manage').click();
        await tool
          .locator('#suite-exercise-select option')
          .first()
          .waitFor({ state: 'attached' });
        assert.equal(
          await tool
            .locator('#suite-exercise-select option[value="' + copyId + '"]')
            .count(),
          0
        );
        await tool.close();
        const result = await library.evaluate(
          async ({ id, code }) => {
            const s = await import('/suite/exercise-store.js');
            try {
              await s.addComponent(id, 'scl', code);
              return 'unsafe';
            } catch (error) {
              return error.message;
            }
          },
          { id: copyId, code }
        );
        assert.match(result, /archivado/);
        await organize('exercise-archive');
        await library.waitForFunction(() =>
          document
            .getElementById('exercise-intro')
            .textContent.includes('opcional')
        );
        await library.locator('#exercise-view').selectOption('active');
        assert.equal(
          await library
            .getByRole('button', { name: 'Mi práctica · copia', exact: true })
            .count(),
          1
        );
      }
    );
    await run(
      'Retirar y recuperar un componente conserva el original y vuelve a añadir sus datos completos',
      async () => {
        await library
          .locator('[data-tool=scl] .component-options summary')
          .click();
        await library
          .getByRole('button', { name: 'Retirar del ejercicio', exact: true })
          .click();
        await library.waitForFunction(() =>
          document
            .querySelector('[data-tool=scl]')
            .textContent.includes('Sin componente')
        );
        await library.locator('.exercise-recoveries summary').click();
        await library.locator('#recovery-tool').selectOption('scl');
        const row = library
          .locator('.recovery-row')
          .filter({ hasText: 'Retirado del ejercicio' })
          .first();
        await row
          .getByRole('button', { name: 'Añadir al ejercicio', exact: true })
          .click();
        await library.waitForFunction(() =>
          document
            .querySelector('[data-tool=scl]')
            .textContent.includes('Secuencia propia')
        );
        const documents = await library.evaluate(async (id) => {
          const s = await import('/suite/exercise-store.js');
          return [
            (await s.getExercise('legacy-own')).document,
            (await s.getExercise(id)).document
          ];
        }, copyId);
        assert.deepEqual(documents[0].components.scl.document, code);
        assert.deepEqual(documents[1].components.scl.document, code);
      }
    );
    await run(
      'Búsqueda, cambios desde otra pestaña y vista móvil mantienen selección y datos',
      async () => {
        await library.locator('#exercise-search').fill('organizada');
        await library.waitForFunction(
          () => document.querySelectorAll('#exercise-list button').length === 1
        );
        assert.equal(await library.locator('#exercise-list button').count(), 1);
        await library.locator('#exercise-search').fill('inexistente');
        await library.waitForFunction(
          () => document.querySelectorAll('#exercise-list button').length === 0
        );
        assert.equal(await library.locator('#exercise-list button').count(), 0);
        await library.locator('#exercise-search').fill('');
        await library.waitForFunction(
          () => document.querySelectorAll('#exercise-list button').length === 2
        );
        const other = watch(await libraryContext.newPage());
        await other.goto(base + '/suite/exercises.html');
        await other.evaluate(async (id) => {
          const s = await import('/suite/exercise-store.js');
          await Promise.all([
            s.renameExercise(id, 'Mi copia revisada'),
            s.addComponent(id, 'scl', {
              schema: 'ab.scl.document.v1',
              name: 'Código revisado',
              source: '// Versión 2'
            })
          ]);
        }, copyId);
        await library
          .getByRole('heading', { name: 'Mi copia revisada', exact: true })
          .waitFor();
        await library
          .locator('[data-tool=scl]')
          .getByText('Código revisado', { exact: true })
          .waitFor();
        await other.close();
        await library
          .locator('.exercise-workspace')
          .evaluate((e) => (e.scrollTop = 0));
        await library.screenshot({
          path: path.join(dir, 'biblioteca-organizada.png')
        });
        await library.setViewportSize({ width: 390, height: 844 });
        assert.ok(
          await library.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth
          )
        );
        await library
          .locator('.exercise-workspace')
          .evaluate((e) => (e.scrollTop = 0));
        await library.screenshot({
          path: path.join(dir, 'biblioteca-movil.png')
        });
        await page.goto(base + '/');
        await page.setViewportSize({ width: 390, height: 844 });
        assert.equal(await page.locator('.tool-card').count(), 9);
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth
          )
        );
        await page.screenshot({
          path: path.join(dir, 'suite-nueve-movil.png')
        });
      }
    );
    assert.deepEqual(errors, []);
    await writeFile(
      path.join(dir, 'portal-results.json'),
      JSON.stringify(
        { date: new Date().toISOString(), passed, errors },
        null,
        2
      )
    );
    console.log(passed.length + ' recorridos del portal completos.');
  } finally {
    await context.close();
    await libraryContext?.close();
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
