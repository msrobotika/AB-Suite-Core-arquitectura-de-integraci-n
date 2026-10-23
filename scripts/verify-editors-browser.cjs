/** Acceptance of the actual KOP/HMI editors, geometry and persisted projects. MIT. */
const assert = require('node:assert/strict');
const { mkdir, writeFile, readFile } = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.env.AB_SUITE_PLAYWRIGHT || 'playwright');
const base = process.env.AB_SUITE_URL || 'http://127.0.0.1:4170';
const evidence = process.env.AB_SUITE_EVIDENCE || '.suite-data/qa';
(async () => {
  await mkdir(evidence, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.AB_SUITE_BROWSER
      ? { executablePath: process.env.AB_SUITE_BROWSER }
      : {})
  });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    acceptDownloads: true
  });
  const errors = [],
    passed = [];
  const kop = await context.newPage(),
    hmi = await context.newPage();
  for (const p of [kop, hmi]) {
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
  }
  const run = async (name, fn) => {
    await fn();
    passed.push(name);
    console.log('PASS ' + name);
  };
  const model = () =>
    hmi.evaluate(() =>
      JSON.parse(localStorage.getItem('ab-suite:hmi-project:v1'))
    );
  const input = async (id, value) =>
    hmi.locator('#widget-' + id).fill(String(value));
  const apply = () => hmi.locator('#properties button[type=submit]').click();
  const choose = async (id) => {
    await hmi.locator('#layers button[data-widget="' + id + '"]').click();
  };
  const upload = async (p, selector, project) => {
    await p.locator(selector).setInputFiles({
      name: 'qa.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(project))
    });
    // File.text() is asynchronous. Both editors reset the picker after applying
    // or rejecting the complete file; inspect the result only once that finishes.
    await p.waitForFunction(
      (selector) => document.querySelector(selector).files.length === 0,
      selector
    );
  };
  try {
    await kop.goto(base + '/apps/kop/');
    await hmi.goto(base + '/apps/scada/');
    await run(
      'KOP: área de trabajo principal y paneles plegables',
      async () => {
        await kop.locator('#rungs .rung').first().waitFor();
        const initial = await kop.locator('#kop-paper').boundingBox();
        assert.ok(initial.height > 600);
        assert.ok(initial.width > 1000);
        await kop.locator('#toggle-tools').click();
        await kop.locator('#toggle-inspector').click();
        const full = await kop.locator('#kop-paper').boundingBox();
        assert.ok(full.width > initial.width + 450);
        await kop.locator('#toggle-tools').click();
        await kop.locator('#toggle-inspector').click();
        assert.ok((await kop.locator('.contact svg').count()) > 3);
      }
    );
    await run(
      'KOP: programa propio, contacto NC, ejecución real, deshacer y rehacer',
      async () => {
        await kop.locator('#new-project').click();
        assert.equal(await kop.locator('.rung').count(), 1);
        await kop.locator('#edit-name').fill('Borrador en curso');
        await kop.locator('#step').click();
        assert.equal(
          await kop.locator('#edit-name').inputValue(),
          'Borrador en curso'
        );
        await kop.locator('#c-kind-0-0').selectOption('NC');
        await kop
          .locator('#inspector-form button')
          .filter({ hasText: 'Guardar cambios' })
          .click();
        await kop.locator('#step').click();
        assert.match(await kop.locator('#outputs').textContent(), /● Q0/);
        await kop.locator('#kop-undo').click();
        await kop.locator('#step').click();
        assert.match(await kop.locator('#outputs').textContent(), /○ Q0/);
        await kop.locator('#kop-redo').click();
        await kop.locator('#step').click();
        assert.match(await kop.locator('#outputs').textContent(), /● Q0/);
      }
    );
    await run(
      'KOP: ramas, copia con destino propio, orden y errores recuperables',
      async () => {
        await kop.locator('#add-branch').click();
        await kop.locator('#rung-copy').click();
        assert.equal(await kop.locator('.rung').count(), 2);
        await kop.locator('#rung-up').click();
        assert.match(
          await kop.locator('.rung-title').first().textContent(),
          /copia/
        );
        await kop.locator('#edit-target').fill('NO_DECLARADA');
        await kop
          .locator('#inspector-form button')
          .filter({ hasText: 'Guardar cambios' })
          .click();
        assert.match(await kop.locator('#notice').textContent(), /rechazada/);
        await kop.locator('#kop-undo').click();
        assert.match(
          await kop.locator('.rung-title').first().textContent(),
          /R1/
        );
        await kop.locator('#project summary').click();
        await kop.locator('#restore').click();
        await kop
          .locator('#inputs button')
          .filter({ hasText: 'START' })
          .click();
        await kop.locator('#step').click();
        await kop.waitForFunction(
          () =>
            JSON.parse(localStorage.getItem('ab-suite:signals:kop') || 'null')
              ?.tags['outputs.MOTOR'] === true
        );
        await kop.screenshot({
          path: path.join(evidence, 'kop-studio-desktop.png')
        });
      }
    );
    await run(
      'KOP: archivos JSON y SVG recuperables desde el editor',
      async () => {
        const json = kop.waitForEvent('download');
        await kop.locator('#export-json').click();
        const file = path.join(evidence, 'programa.kop.json');
        await (await json).saveAs(file);
        const program = JSON.parse(await readFile(file, 'utf8'));
        assert.equal(program.rungs.length, 4);
        const svg = kop.waitForEvent('download');
        await kop.locator('#export-svg').click();
        const image = path.join(evidence, 'programa.kop.svg');
        await (await svg).saveAs(image);
        const drawing = await readFile(image, 'utf8');
        assert.match(drawing, /<svg/);
        assert.match(drawing, /MOTOR/);
        assert.match(drawing, /<path/);
        await kop.locator('#new-project').click();
        await upload(kop, '#import-json', program);
        assert.equal(await kop.locator('.rung').count(), 4);
        await kop.locator('#step').click();
      }
    );
    await run(
      'HMI: todas las figuras y componentes se crean desde la biblioteca',
      async () => {
        const palette = hmi.locator('[data-type]');
        assert.equal(await palette.count(), 14);
        for (const button of await palette.all()) await button.click();
        assert.equal(await hmi.locator('.hmi-widget').count(), 14);
        assert.equal((await model()).screens[0].widgets.length, 14);
      }
    );
    await run(
      'HMI: el límite de objetos conserva proyecto y selección',
      async () => {
        const original = await model(),
          full = structuredClone(original);
        while (full.screens[0].widgets.length < 30) {
          const copy = structuredClone(full.screens[0].widgets[0]);
          copy.id = 'limit-' + full.screens[0].widgets.length;
          full.screens[0].widgets.push(copy);
        }
        await upload(hmi, '#import-project', full);
        await choose(full.screens[0].widgets[0].id);
        await hmi.locator('[data-type=ellipse]').click();
        assert.match(await hmi.locator('#hmi-notice').textContent(), /30/);
        assert.deepEqual(await model(), full);
        await input('label', 'Objeto conservado');
        await apply();
        assert.equal(
          (await model()).screens[0].widgets[0].label,
          'Objeto conservado'
        );
        await hmi.locator('#undo').click();
        await hmi.locator('#undo').click();
        assert.deepEqual(await model(), original);
      }
    );
    await run(
      'HMI: mover con arrastre, ajuste a rejilla, redimensionar y recuperar',
      async () => {
        const before = (await model()).screens[0].widgets[0];
        await choose(before.id);
        let box = await hmi
          .locator('[data-widget="' + before.id + '"].hmi-widget')
          .boundingBox();
        await hmi.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await hmi.mouse.down();
        await hmi.mouse.move(
          box.x + box.width / 2 + 83,
          box.y + box.height / 2 + 47,
          { steps: 8 }
        );
        await hmi.mouse.up();
        const moved = (await model()).screens[0].widgets[0];
        assert.ok(moved.x > before.x && moved.y > before.y);
        assert.equal(moved.x % 10, 0);
        assert.equal(moved.y % 10, 0);
        box = await hmi.locator('.selected .resize-handle').boundingBox();
        await hmi.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await hmi.mouse.down();
        await hmi.mouse.move(
          box.x + box.width / 2 + 60,
          box.y + box.height / 2 + 40,
          { steps: 6 }
        );
        await hmi.mouse.up();
        const resized = (await model()).screens[0].widgets[0];
        assert.ok(
          resized.width > before.width && resized.height > before.height
        );
        await hmi.locator('#undo').click();
        assert.equal((await model()).screens[0].widgets[0].width, before.width);
        await hmi.locator('#redo').click();
        assert.equal(
          (await model()).screens[0].widgets[0].width,
          resized.width
        );
      }
    );
    await run(
      'HMI: propiedades, teclado, capas y límites sin pérdida de trabajo',
      async () => {
        const w = (await model()).screens[0].widgets[0];
        await choose(w.id);
        await input('x', 300);
        await input('y', 250);
        await input('width', 250);
        await input('height', 180);
        await apply();
        assert.equal((await model()).screens[0].widgets[0].x, 300);
        const card = hmi.locator('.hmi-widget[data-widget="' + w.id + '"]');
        await card.focus();
        await hmi.keyboard.press('Shift+ArrowRight');
        assert.equal((await model()).screens[0].widgets[0].x, 310);
        await hmi.locator('#move-down').click();
        assert.equal((await model()).screens[0].widgets[1].id, w.id);
        await input('width', 3000);
        await apply();
        assert.match(await hmi.locator('#hmi-notice').textContent(), /caber/);
        assert.equal((await model()).screens[0].widgets[1].width, 250);
      }
    );
    let scene;
    await run(
      'HMI: almacenamiento lleno conserva la edición y permite exportarla',
      async () => {
        const before = await model(),
          w = before.screens[0].widgets[0];
        await choose(w.id);
        await hmi.evaluate(() => {
          const original = Storage.prototype.setItem;
          window.qaStorageFail = true;
          Storage.prototype.setItem = function (key, value) {
            if (window.qaStorageFail && key === 'ab-suite:hmi-project:v1')
              throw new DOMException('Full', 'QuotaExceededError');
            return original.call(this, key, value);
          };
        });
        await input('label', 'Guardado en memoria');
        await apply();
        assert.match(
          await hmi.locator('#hmi-notice').textContent(),
          /No se pudo guardar/
        );
        assert.deepEqual(await model(), before);
        assert.match(
          await hmi
            .locator('.hmi-widget[data-widget="' + w.id + '"] .widget-head')
            .textContent(),
          /Guardado en memoria/
        );
        const exported = hmi.waitForEvent('download');
        await hmi.locator('#export-project').click();
        const file = path.join(evidence, 'recuperacion.hmi.json');
        await (await exported).saveAs(file);
        assert.equal(
          JSON.parse(await readFile(file, 'utf8')).screens[0].widgets[0].label,
          'Guardado en memoria'
        );
        await hmi.evaluate(() => {
          window.qaStorageFail = false;
        });
        await apply();
        assert.equal(
          (await model()).screens[0].widgets[0].label,
          'Guardado en memoria'
        );
      }
    );
    await run(
      'HMI: importar una composición propia, editar señales y conservar el proyecto anterior',
      async () => {
        const { blankProject, newWidget, validateProject } = await import(
          '../apps/scada/src/hmi-model.js'
        );
        scene = validateProject(blankProject());
        scene.name = 'Mi banco de señales';
        const screen = scene.screens[0];
        screen.name = 'Práctica de supervisión';
        screen.width = 1280;
        screen.height = 800;
        const add = (type, props) => {
          const w = Object.assign(newWidget(type), props);
          screen.widgets.push(w);
          return w;
        };
        add('text', {
          label: 'BANCO DE SEÑALES / 01',
          x: 50,
          y: 30,
          width: 750,
          height: 70,
          stroke: '#e4edf6'
        });
        add('text', {
          label: 'Diseña · programa · comprueba',
          x: 50,
          y: 100,
          width: 700,
          height: 50,
          stroke: '#a5afc1'
        });
        add('rectangle', {
          label: 'Área de instrumentos',
          x: 40,
          y: 190,
          width: 1200,
          height: 540,
          fill: '#182638',
          stroke: '#344c65',
          strokeWidth: 1
        });
        add('text', {
          label: 'SEÑALES DEL EJERCICIO',
          x: 75,
          y: 210,
          width: 600,
          height: 40,
          stroke: '#77dfc7'
        });
        add('tank', {
          label: 'Contador de ciclos',
          x: 100,
          y: 310,
          width: 240,
          height: 290,
          source: 'kop',
          tag: 'scan',
          unit: 'ciclos',
          min: 0,
          max: 5
        });
        add('pipe', {
          label: 'Conexión gráfica',
          x: 330,
          y: 480,
          width: 200,
          height: 40,
          fill: '#243747',
          stroke: '#6b849d'
        });
        add('pump', {
          label: 'Bomba virtual',
          x: 510,
          y: 420,
          width: 170,
          height: 170,
          source: 'kop',
          tag: 'outputs.MOTOR'
        });
        add('pipe', {
          label: 'Conexión vertical',
          x: 580,
          y: 310,
          width: 40,
          height: 120,
          direction: 'vertical',
          fill: '#243747',
          stroke: '#6b849d'
        });
        add('valve', {
          label: 'Válvula virtual',
          x: 710,
          y: 310,
          width: 170,
          height: 170,
          source: 'kop',
          tag: 'outputs.MOTOR'
        });
        add('motor', {
          label: 'Motor virtual',
          x: 930,
          y: 310,
          width: 170,
          height: 170,
          source: 'kop',
          tag: 'outputs.MOTOR'
        });
        add('indicator', {
          label: 'Estado de marcha',
          x: 920,
          y: 520,
          width: 230,
          height: 160,
          source: 'kop',
          tag: 'outputs.MOTOR'
        });
        add('text', {
          label: 'Símbolos vinculados a KOP · sin proceso físico impuesto',
          x: 85,
          y: 645,
          width: 770,
          height: 50,
          stroke: '#a5afc1'
        });
        await upload(hmi, '#import-project', scene);
        await hmi.waitForFunction(
          () => document.querySelectorAll('.hmi-widget').length === 12
        );
        assert.equal((await model()).name, scene.name);
        await hmi.locator('#undo').click();
        assert.equal((await model()).screens[0].widgets.length, 14);
        await hmi.locator('#redo').click();
        await hmi.locator('.widget-indicator.active').waitFor();
        await hmi.locator('#fit-canvas').click();
        await hmi.screenshot({
          path: path.join(evidence, 'scada-studio-design.png')
        });
      }
    );
    await run(
      'HMI: vista previa conserva la geometría, datos reales y estado al recargar',
      async () => {
        const old = await model();
        await hmi.locator('#preview-mode').click();
        assert.equal(await hmi.locator('#inspector').isVisible(), false);
        assert.equal(await hmi.locator('#library').isVisible(), false);
        await hmi.locator('.widget-indicator.active').waitFor();
        assert.match(await hmi.locator('.figure-reading').textContent(), /1/);
        assert.deepEqual(await model(), old);
        const frame = await hmi.locator('#canvas-viewport').boundingBox(),
          canvas = await hmi.locator('#canvas').boundingBox();
        assert.ok(canvas.y + canvas.height <= frame.y + frame.height + 1);
        assert.ok(canvas.x + canvas.width <= frame.x + frame.width + 1);
        await hmi.screenshot({
          path: path.join(evidence, 'scada-studio-preview.png')
        });
        await hmi.reload();
        assert.deepEqual(await model(), old);
        assert.equal(await hmi.locator('.hmi-widget').count(), 12);
        const download = hmi.waitForEvent('download');
        await hmi.locator('#export-project').click();
        await (await download).saveAs(path.join(evidence, 'mi-banco.hmi.json'));
        await upload(hmi, '#import-project', { ...scene, schema: 'invalid' });
        assert.match(
          await hmi.locator('#hmi-notice').textContent(),
          /No se pudo importar/
        );
        assert.deepEqual(await model(), old);
      }
    );
    await run(
      'HMI: pantallas independientes y rechazo de reducción que recorta objetos',
      async () => {
        await hmi.locator('#add-screen').click();
        assert.equal(await hmi.locator('.hmi-widget').count(), 0);
        await hmi.locator('[data-type=text]').click();
        await input('label', 'Mi segunda pantalla');
        await apply();
        const p = await model();
        assert.equal(p.screens[0].widgets.length, 12);
        assert.equal(p.screens[1].widgets.length, 1);
        await hmi.locator('#screens button').first().click();
        assert.equal(await hmi.locator('.hmi-widget').count(), 12);
        await hmi.locator('.hmi-screen-properties summary').click();
        await hmi.locator('#screen-width').fill('640');
        await hmi.locator('#rename-screen').click();
        assert.match(await hmi.locator('#hmi-notice').textContent(), /caber/);
        assert.equal((await model()).screens[0].width, 1280);
      }
    );
    await run(
      'HMI: navegación operativa entre pantallas en modo Probar',
      async () => {
        await hmi.locator('[data-type=navigation]').click();
        await input('label', 'Ir a pantalla 2');
        await apply();
        await hmi.locator('#preview-mode').click();
        const navigation = hmi.getByRole('button', {
          name: 'Ir a pantalla 2 ↗'
        });
        await navigation.focus();
        await hmi.waitForTimeout(850);
        assert.equal(
          await navigation.evaluate((e) => e === document.activeElement),
          true
        );
        await hmi.keyboard.press('Enter');
        assert.match(
          await hmi.locator('#screen-title').textContent(),
          /Pantalla 2/
        );
        assert.equal(await hmi.locator('.hmi-widget').count(), 1);
        await hmi.locator('#design-mode').click();
        await hmi.locator('#screens button').first().click();
      }
    );
    await run(
      'KOP y HMI: móvil con lienzo desplazable y herramientas en paneles',
      async () => {
        for (const [p, id] of [
          [kop, 'kop'],
          [hmi, 'scada']
        ]) {
          await p.setViewportSize({ width: 390, height: 844 });
          await p.reload();
          await p.locator('.suite-bar').waitFor();
          assert.ok(
            await p.evaluate(() => document.documentElement.scrollWidth <= 392)
          );
          await p.screenshot({
            path: path.join(evidence, id + '-studio-mobile.png')
          });
        }
        await hmi.locator('#toggle-library').click();
        await hmi.locator('[data-type=ellipse]').click();
        assert.equal(await hmi.locator('#inspector').isVisible(), true);
        assert.equal(await hmi.locator('#library').isVisible(), false);
        await hmi.locator('#toggle-properties').click();
        await hmi.locator('#preview-mode').click();
        assert.equal(await hmi.locator('#inspector').isVisible(), false);
        await hmi.screenshot({
          path: path.join(evidence, 'scada-studio-mobile-preview.png')
        });
      }
    );
    assert.deepEqual(errors, []);
    await writeFile(
      path.join(evidence, 'editor-results.json'),
      JSON.stringify(
        { date: new Date().toISOString(), passed, errors },
        null,
        2
      )
    );
    console.log(passed.length + ' recorridos de edición completos.');
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
