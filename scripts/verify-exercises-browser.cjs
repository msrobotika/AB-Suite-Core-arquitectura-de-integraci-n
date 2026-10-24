/** Portable nine-tool exercises, independent browser storage and recoverable opening. MIT. */
const assert = require('node:assert/strict');
const { mkdir, writeFile, readFile } = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.env.AB_SUITE_PLAYWRIGHT || 'playwright');
const base = process.env.AB_SUITE_URL || 'http://127.0.0.1:4170';
const dir = process.env.AB_SUITE_EVIDENCE || '.suite-data/qa/exercises';
(async () => {
  await mkdir(dir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.AB_SUITE_BROWSER
      ? { executablePath: process.env.AB_SUITE_BROWSER }
      : {})
  });
  const first = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true
  });
  const errors = [],
    passed = [];
  let expectedHTTPFailure = false,
    second;
  const watch = (p) => {
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('console', (m) => {
      if (
        m.type() === 'error' &&
        !(expectedHTTPFailure && m.text().includes('422'))
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
  const manager = watch(await first.newPage());
  let exerciseId, fileDocument, importedId;
  const name = (tool) => 'Ejercicio propio ' + tool;
  const document = (p) =>
    p.evaluate(async () => {
      const a = ABSuite.documents ?? ABSuite.adapter.documents;
      return await a.get();
    });
  const create = async (p, title) => {
    await p.locator('#suite-new').click();
    await p.locator('#suite-document-name').fill(title);
    await p.locator('#suite-document-create').click();
    await p.locator('#suite-document-dialog').waitFor({ state: 'hidden' });
  };
  const tools = [
    'kop',
    'plc',
    'scl',
    'grafcet',
    'scada',
    'modbus',
    'serial',
    'vision',
    'bi'
  ];
  try {
    await run(
      'Actualizar la biblioteca conserva ejercicios guardados con la versión anterior',
      async () => {
        await manager.goto(base + '/');
        await manager.evaluate(async () => {
          const request = indexedDB.open('ab-suite-exercises', 1);
          request.onupgradeneeded = () => {
            request.result.createObjectStore('exercises', { keyPath: 'id' });
            request.result.createObjectStore('recoveries', { keyPath: 'id' });
          };
          const db = await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
          const tx = db.transaction('exercises', 'readwrite');
          tx.objectStore('exercises').add({
            id: 'legacy-test',
            updatedAt: new Date().toISOString(),
            document: {
              schema: 'ab-suite.exercise.v1',
              name: 'Trabajo conservado v1',
              createdAt: new Date().toISOString(),
              components: {}
            }
          });
          await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onabort = () => reject(tx.error);
          });
          db.close();
        });
        await manager.goto(base + '/suite/exercises.html');
        await manager
          .getByRole('button', { name: 'Trabajo conservado v1', exact: true })
          .waitFor();
      }
    );
    await run(
      'Ejercicio nuevo vacío, sin ejemplos ni herramientas abiertas',
      async () => {
        await manager.goto(base + '/suite/exercises.html');
        await manager
          .locator('#exercise-name')
          .fill('Práctica propia de nueve herramientas');
        await manager.locator('#exercise-new button').click();
        await manager.waitForURL('**/exercises.html?id=*');
        exerciseId = new URL(manager.url()).searchParams.get('id');
        assert.equal(await manager.locator('.exercise-component').count(), 9);
        assert.equal(
          await manager
            .locator('.exercise-component')
            .filter({ hasText: 'Sin componente' })
            .count(),
          9
        );
      }
    );
    await run(
      'Añadir documentos completos de las nueve herramientas, con datos e imagen propios',
      async () => {
        for (const tool of tools) {
          const p = watch(await first.newPage());
          await p.goto(base + '/apps/' + tool + '/');
          await p.waitForFunction(() => ABSuite.documentsReady);
          await create(p, name(tool));
          if (tool === 'kop')
            await p.evaluate(() =>
              ABSuite.adapter.documents.restore({
                schema: 1,
                name: 'Ejercicio propio kop',
                description: '',
                inputs: { BOTON: false },
                outputs: { PILOTO: false },
                rungs: [
                  {
                    id: 'R1',
                    name: 'Mi red',
                    operation: 'COIL',
                    target: 'PILOTO',
                    branches: [[{ kind: 'NO', variable: 'BOTON' }]]
                  }
                ]
              })
            );
          if (tool === 'plc')
            await p.evaluate(() =>
              ABSuite.adapter.documents.restore({
                schema: 'ab.plc.document.v1',
                name: 'Ejercicio propio plc',
                scenario: 'rack',
                program: {
                  version: 1,
                  name: 'Ejercicio propio plc',
                  rungs: [
                    {
                      id: 'R1',
                      name: 'Mi red',
                      when: { op: 'contact', tag: 'I0.0' },
                      action: { type: 'coil', target: 'Q0.0' }
                    }
                  ]
                }
              })
            );
          if (tool === 'scl')
            await p.locator('#source').fill('// Mi borrador portable\n');
          if (tool === 'scada') {
            await p.locator('[data-type=rectangle]').click();
            await p.locator('#widget-label').fill('Mi figura');
            await p.locator('#properties button[type=submit]').click();
          }
          if (tool === 'modbus') {
            await p
              .getByRole('button', {
                name: 'Leer CPU de la suite',
                exact: true
              })
              .click();
            await p.waitForFunction(() => ABSuite.adapter.reading());
          }
          if (tool === 'serial') {
            await p.locator('#start').click();
            await p.waitForFunction(
              () => ABSuite.adapter.snapshot()?.frames > 0
            );
            await p.locator('#stop').click();
          }
          if (tool === 'vision')
            await p.evaluate(async () => {
              const canvas = document.createElement('canvas');
              canvas.width = 80;
              canvas.height = 60;
              const ctx = canvas.getContext('2d');
              ctx.fillStyle = 'white';
              ctx.fillRect(0, 0, 80, 60);
              ctx.fillStyle = 'black';
              ctx.fillRect(20, 20, 10, 10);
              const image = canvas.toDataURL('image/png');
              await ABSuite.adapter.documents.restore({
                schema: 'ab.vision.document.v1',
                name: 'Ejercicio propio vision',
                recipe: {
                  mode: 'reference',
                  threshold: 100,
                  minArea: 5,
                  maxDefects: 0
                },
                image,
                referenceImage: image,
                sourceName: 'Imagen de mi prueba',
                roi: { x: 10, y: 10, width: 40, height: 30 },
                metrology: {
                  referenceMm: 20,
                  distanceMm: 100,
                  nominalWidthMm: 10,
                  nominalHeightMm: 10,
                  toleranceMm: 1,
                  threshold: 120
                }
              });
            });
          if (tool === 'bi')
            await p.evaluate(async () => {
              const form = new FormData();
              form.append(
                'files',
                new Blob(['sensor,valor\nA,17\nB,23'], { type: 'text/csv' }),
                'sensores.csv'
              );
              form.append('destination', 'new');
              form.append('name', 'Ejercicio propio bi');
              const r = await fetch('/apps/bi/api/data/import', {
                method: 'POST',
                body: form
              });
              if (!r.ok) throw Error(await r.text());
              await ABSuite.bi.refresh();
            });
          await p.locator('#suite-projects').click();
          await p.locator('#suite-exercise-manage').click();
          if (tool === 'kop') {
            await p.setViewportSize({ width: 1280, height: 720 });
            assert.ok(
              (await p.locator('#suite-exercise-name').boundingBox()).height >=
                40
            );
            await p.screenshot({
              path: path.join(dir, 'anadir-ejercicio-dialogo.png')
            });
            assert.equal(
              await p
                .locator('#suite-exercise-capture')
                .evaluate((e) => e.scrollHeight <= e.clientHeight + 2),
              true
            );
            await p.setViewportSize({ width: 1440, height: 1000 });
          }
          await p
            .locator('#suite-exercise-select option')
            .first()
            .waitFor({ state: 'attached' });
          await p.locator('#suite-exercise-select').selectOption(exerciseId);
          await p.locator('#suite-exercise-add').click();
          await p.waitForFunction(
            () =>
              document
                .getElementById('suite-exercise-message')
                .textContent.includes('Copia completa añadida'),
            null,
            { timeout: 20000 }
          );
          await p.close();
        }
      }
    );
    const filename = path.resolve(dir, 'practica-nueve.absuite');
    await run(
      'Descargar un solo archivo sin identificadores BI, tokens ni ejecución reanudable',
      async () => {
        await manager.reload();
        await manager
          .locator('[data-tool=bi]')
          .getByRole('link', { name: 'Abrir copia guardada →' })
          .waitFor();
        const downloaded = manager.waitForEvent('download');
        await manager.locator('#exercise-export').click();
        try {
          await (await downloaded).saveAs(filename);
        } catch (error) {
          throw Error(
            error.message +
              ' · Estado: ' +
              (await manager.locator('#exercise-message').textContent()) +
              ' · JS: ' +
              JSON.stringify(errors)
          );
        }
        fileDocument = JSON.parse(await readFile(filename, 'utf8'));
        assert.equal(Object.keys(fileDocument.components).length, 9);
        assert.deepEqual(fileDocument.components.bi.document.tables.sensores, [
          { sensor: 'A', valor: '17' },
          { sensor: 'B', valor: '23' }
        ]);
        assert.equal(
          fileDocument.components.bi.document.workspace_id,
          undefined
        );
        assert.equal(fileDocument.components.plc.document.mode, undefined);
        assert.equal(fileDocument.components.serial.document.live, false);
        assert.equal(fileDocument.components.modbus.document.reading.at, 0);
        assert.ok(
          fileDocument.components.vision.document.referenceImage.startsWith(
            'data:image/png;base64,'
          )
        );
        const tokens = await manager.evaluate(async () => {
          const s = document.createElement('script');
          s.src = '/apps/plc/suite-session.js';
          document.head.append(s);
          await new Promise((r) => (s.onload = r));
          return [ABSuitePLC.token];
        });
        for (const token of tokens)
          assert.ok(!JSON.stringify(fileDocument).includes(token));
      }
    );
    await run(
      'Dos incorporaciones concurrentes conservan ambos componentes del ejercicio',
      async () => {
        const result = await manager.evaluate(async (components) => {
          const store = await import('/suite/exercise-store.js');
          const record = await store.createExercise('Prueba de concurrencia');
          await Promise.all([
            store.addComponent(record.id, 'kop', components.kop.document),
            store.addComponent(record.id, 'scl', components.scl.document)
          ]);
          const names = Object.keys(
            (await store.getExercise(record.id)).document.components
          ).sort();
          await store.addComponent(record.id, 'kop', {
            ...components.kop.document,
            name: 'Siguiente versión'
          });
          const saved = await store.allRecoveries();
          if (
            !saved.some(
              (copy) =>
                copy.tool === 'kop' &&
                copy.reason?.includes('Antes de actualizar') &&
                copy.document.name === components.kop.document.name
            )
          )
            throw Error('La actualización no conservó su componente anterior');
          return names;
        }, fileDocument.components);
        assert.deepEqual(result, ['kop', 'scl']);
      }
    );
    second = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      acceptDownloads: true
    });
    const library = watch(await second.newPage());
    await run(
      'Importar en otro navegador crea un ejercicio independiente sin reemplazar las herramientas',
      async () => {
        await library.goto(base + '/suite/exercises.html');
        await library.locator('#exercise-import').setInputFiles(filename);
        await library.waitForURL('**/exercises.html?id=*');
        importedId = new URL(library.url()).searchParams.get('id');
        assert.notEqual(importedId, exerciseId);
        assert.equal(
          await library
            .locator('.exercise-component a')
            .filter({ hasText: 'Abrir copia guardada' })
            .count(),
          9
        );
        await library.screenshot({
          path: path.join(dir, 'ejercicio-importado-escritorio.png')
        });
      }
    );
    await run(
      'Último componente inválido rechaza el archivo completo y conserva la biblioteca',
      async () => {
        const before = await library.locator('#exercise-list button').count(),
          bad = structuredClone(fileDocument);
        bad.components.bi.document.tables.sensores[0].valor = { invalid: true };
        expectedHTTPFailure = true;
        await library.locator('#exercise-import').setInputFiles({
          name: 'invalido.absuite',
          mimeType: 'application/json',
          buffer: Buffer.from(JSON.stringify(bad))
        });
        await library.waitForFunction(() =>
          document
            .getElementById('exercise-message')
            .textContent.includes('BI:')
        );
        expectedHTTPFailure = false;
        assert.equal(
          await library.locator('#exercise-list button').count(),
          before
        );
        assert.equal(new URL(library.url()).searchParams.get('id'), importedId);
      }
    );
    for (const tool of tools)
      await run(
        'Abrir ' +
          tool.toUpperCase() +
          ': conserva el trabajo anterior y recupera el componente portable',
        async () => {
          const p = watch(await second.newPage());
          await p.goto(base + '/apps/' + tool + '/');
          await p.waitForFunction(() => ABSuite.documentsReady);
          await create(p, 'Trabajo anterior ' + tool);
          await p.close();
          const view = watch(await second.newPage());
          await view.goto(base + '/apps/' + tool + '/?exercise=' + importedId);
          await view.locator('#suite-exercise-open-confirm').waitFor();
          if (tool === 'kop') {
            const duplicate = watch(await second.newPage());
            await duplicate.goto(base + '/apps/kop/');
            await duplicate.waitForFunction(() => ABSuite.documentsReady);
            await view.locator('#suite-exercise-open-confirm').click();
            await view
              .getByText(/Cierra las otras pestañas de esta herramienta antes/)
              .last()
              .waitFor();
            assert.equal(
              (await document(view)).name,
              'Trabajo anterior ' + tool
            );
            await duplicate.close();
            await view.evaluate(() => {
              window.__nativeTx = IDBDatabase.prototype.transaction;
              IDBDatabase.prototype.transaction = function (...args) {
                if (args[0] === 'recoveries')
                  throw Error('Fallo de almacenamiento inyectado');
                return window.__nativeTx.apply(this, args);
              };
            });
            await view.locator('#suite-exercise-open-confirm').click();
            await view
              .getByText('Fallo de almacenamiento inyectado', { exact: true })
              .waitFor();
            assert.equal(
              (await document(view)).name,
              'Trabajo anterior ' + tool
            );
            await view.evaluate(
              () => (IDBDatabase.prototype.transaction = window.__nativeTx)
            );
            await view.evaluate(() => {
              const original = ABSuite.adapter.documents.restore;
              let first = true;
              ABSuite.adapter.documents.restore = async (doc) => {
                await original(doc);
                if (first) {
                  first = false;
                  throw Error('Fallo de aplicación inyectado');
                }
              };
            });
            await view.locator('#suite-exercise-open-confirm').click();
            await view
              .getByText('Fallo de aplicación inyectado', { exact: true })
              .waitFor();
            assert.equal(
              (await document(view)).name,
              'Trabajo anterior ' + tool
            );
          }
          if (tool === 'bi') {
            const previous = await view.evaluate(
              () => ABSuite.bi.model().workspace_id
            );
            await view.evaluate(() => {
              const refresh = ABSuite.bi.refresh;
              let first = true;
              ABSuite.bi.refresh = async () => {
                if (first) {
                  first = false;
                  throw Error('Fallo de refresco BI inyectado');
                }
                await refresh();
              };
            });
            await view.locator('#suite-exercise-open-confirm').click();
            await view
              .getByText('Fallo de refresco BI inyectado', { exact: true })
              .waitFor();
            assert.equal(
              await view.evaluate(() => ABSuite.bi.model().workspace_id),
              previous
            );
            assert.equal((await document(view)).name, 'Trabajo anterior bi');
          }
          await view.locator('#suite-exercise-open-confirm').click();
          await view
            .locator('#suite-exercise-open')
            .waitFor({ state: 'hidden' });
          const restored = await document(view);
          assert.equal(restored.name, name(tool));
          if (tool === 'kop') assert.equal(restored.rungs[0].target, 'PILOTO');
          if (tool === 'plc')
            assert.equal(
              await view.evaluate(async () => {
                const r = await fetch('/apps/plc/api/live/state', {
                  headers: { Authorization: 'Bearer ' + ABSuitePLC.token }
                });
                return (await r.json()).snapshot.mode;
              }),
              'STOP'
            );
          if (tool === 'vision') {
            assert.equal(
              restored.image,
              fileDocument.components.vision.document.image
            );
            assert.deepEqual(restored.roi, {
              x: 10,
              y: 10,
              width: 40,
              height: 30
            });
            assert.ok(restored.referenceImage);
            await view.locator('#analyze').click();
            await view.waitForFunction(() => ABSuite.adapter.inspection());
            await view.evaluate(() => {
              const original = Storage.prototype.setItem;
              Storage.prototype.setItem = function (key, value) {
                if (key === 'ab-suite:active-document:vision')
                  throw Error('Límite localStorage simulado');
                return original.call(this, key, value);
              };
              window.dispatchEvent(new Event('ab-suite:document-changed'));
            });
            await view.waitForFunction(async () =>
              Boolean(
                (
                  await (
                    await import('/suite/exercise-store.js')
                  ).getActive('vision')
                )?.referenceImage
              )
            );
            await view.reload();
            await view.waitForFunction(() => ABSuite.documentsReady);
            const reopened = await document(view);
            assert.equal(reopened.image, restored.image);
            assert.deepEqual(reopened.roi, restored.roi);
            assert.equal(reopened.referenceImage, restored.referenceImage);
            assert.equal(
              await view.evaluate(() => Boolean(ABSuite.documentStorageError)),
              false
            );
          }
          if (tool === 'bi') {
            const result = await view.evaluate(() =>
              ABSuite.bi.post('/api/sql', {
                query: 'SELECT SUM(valor) AS total FROM sensores'
              })
            );
            assert.deepEqual(result.columns, ['total']);
            assert.equal(result.rows[0][0], 40);
          }
          if (tool === 'modbus') assert.equal(restored.reading.at, 0);
          if (tool === 'serial') {
            assert.equal(restored.live, false);
            assert.ok(restored.state.events.length > 0);
          }
          await view.close();
        }
      );
    await run(
      'La copia anterior se puede volver a abrir y la biblioteca cabe en móvil',
      async () => {
        await library.reload();
        await library.locator('.exercise-recoveries summary').click();
        const recovery = library
          .locator('#exercise-recoveries a')
          .filter({ hasText: 'Trabajo anterior kop' })
          .first();
        await recovery.waitFor();
        await recovery.click();
        await library.locator('#suite-exercise-open-confirm').click();
        await library
          .locator('#suite-exercise-open')
          .waitFor({ state: 'hidden' });
        assert.equal((await document(library)).name, 'Trabajo anterior kop');
        await library.goto(base + '/suite/exercises.html?id=' + importedId);
        await library.setViewportSize({ width: 390, height: 844 });
        await library.screenshot({
          path: path.join(dir, 'ejercicio-importado-movil.png')
        });
        assert.equal(
          await library.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth
          ),
          true
        );
      }
    );
    assert.deepEqual(errors, []);
    await writeFile(
      path.join(dir, 'exercise-results.json'),
      JSON.stringify(
        { date: new Date().toISOString(), passed, errors },
        null,
        2
      )
    );
    console.log(passed.length + ' recorridos de ejercicios completos.');
  } finally {
    await first.close();
    await second?.close();
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
