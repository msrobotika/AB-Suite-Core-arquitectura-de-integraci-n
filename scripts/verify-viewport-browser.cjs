/** Acceptance of the real editor window and its active controls, in both supported languages. MIT. */
const assert = require('node:assert/strict'),
  path = require('node:path');
const { mkdir, writeFile } = require('node:fs/promises');
const { chromium } = require(process.env.AB_SUITE_PLAYWRIGHT || 'playwright');
const base = process.env.AB_SUITE_URL || 'http://127.0.0.1:4170',
  dir = process.env.AB_SUITE_EVIDENCE || '.suite-data/qa/viewport';
(async () => {
  await mkdir(dir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.AB_SUITE_BROWSER
      ? { executablePath: process.env.AB_SUITE_BROWSER }
      : {})
  });
  const passed = [],
    errors = [];
  try {
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
      const context = await browser.newContext({
        locale: 'es-ES',
        viewport: { width: 1280, height: 720 }
      });
      const page = await context.newPage();
      page.on('pageerror', (e) => errors.push(id + ': ' + e.message));
      await page.goto(base + '/apps/' + id + '/');
      await page.waitForFunction(() => window.ABSuite?.viewportReady);
      const audit = async (label) => {
        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve))
            )
        );
        const report = await page.evaluate(() => {
          const off = [];
          const documentAreas =
            '.kop-paper,#kop-canvas,.diagram-viewport,.hmi-canvas,#lab-io,#layers,#screens,#watch-results,#measuresList,#profileCards,#relationsList,#cleanRecipe,#cleanColumns,.work-main,.table-scroll';
          for (const el of document.querySelectorAll(
            'button,input,select,textarea,summary,label.file-label,label.file-button,.hmi-file'
          )) {
            if (
              !el.checkVisibility() ||
              getComputedStyle(el).opacity === '0' ||
              el.closest('dialog:not([open]),svg,' + documentAreas)
            )
              continue;
            const box = el.getBoundingClientRect();
            if (!box.width || !box.height) continue;
            let clippedBy = '';
            for (
              let parent = el.parentElement;
              parent;
              parent = parent.parentElement
            ) {
              const css = getComputedStyle(parent),
                clip = parent.getBoundingClientRect();
              const clipsY = /^(hidden|clip|auto|scroll)$/.test(css.overflowY);
              const clipsX = /^(hidden|clip|auto|scroll)$/.test(css.overflowX);
              if (
                (clipsY &&
                  (box.top < clip.top - 2 || box.bottom > clip.bottom + 2)) ||
                (clipsX &&
                  (box.left < clip.left - 2 || box.right > clip.right + 2))
              ) {
                clippedBy = parent.id || parent.className || parent.tagName;
                break;
              }
            }
            if (
              clippedBy ||
              box.top < -0.5 ||
              box.bottom > innerHeight + 2 ||
              box.left < -0.5 ||
              box.right > innerWidth + 2
            )
              off.push({
                id: el.id,
                clippedBy,
                text: (
                  el.textContent ||
                  el.getAttribute('aria-label') ||
                  el.type
                )
                  .trim()
                  .slice(0, 65),
                left: Math.round(box.left),
                right: Math.round(box.right),
                top: Math.round(box.top),
                bottom: Math.round(box.bottom)
              });
          }
          return {
            pageHeight: document.documentElement.scrollHeight,
            height: innerHeight,
            off
          };
        });
        assert.ok(
          report.pageHeight <= report.height + 1,
          id + ' ' + label + ': page scroll'
        );
        if (report.off.length)
          errors.push(
            id +
              ' ' +
              label +
              ': controls outside the window ' +
              JSON.stringify(report.off)
          );
      };
      for (const [width, height] of [
        [1280, 720],
        [1366, 768]
      ])
        for (const lang of ['es', 'en']) {
          await page.setViewportSize({ width, height });
          await page.locator('#suite-language').selectOption(lang);
          await audit(width + ' ' + lang);
        }
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.locator('#suite-language').selectOption('es');
      if (id === 'kop') {
        await page.locator('#add-rung').click();
        await audit('rung inspector');
        await page.locator('#kop-signals').click();
        await audit('signal dialog');
        await page.keyboard.press('Escape');
      }
      if (id === 'grafcet') {
        await page.locator('#add-stage').click();
        await audit('step inspector');
        await page.locator('#add-transition').click();
        await audit('transition inspector');
      }
      if (id === 'scada') {
        for (const button of await page.locator('[data-type]').all()) {
          await button.click();
          await page.locator('#properties button[type=submit]').waitFor();
          await audit('component ' + (await button.getAttribute('data-type')));
          const select = page.locator('#properties .viewport-task');
          for (const option of await select.locator('option').all())
            if (!(await option.isDisabled())) {
              await select.selectOption(await option.getAttribute('value'));
              await audit('component properties');
            }
        }
      }
      const summaries = page.locator(
        '.ab-dock>details>summary,.kop-tools>details>summary,.hmi-library>details>summary'
      );
      for (const summary of await summaries.all())
        if (await summary.isVisible()) {
          await summary.click();
          await audit('dock');
        }
      for (const select of await page.locator('.viewport-task').all())
        if (await select.isVisible()) {
          for (const option of await select.locator('option').all())
            if (!(await option.isDisabled())) {
              await select.selectOption(await option.getAttribute('value'));
              await audit('task');
            }
        }
      if (id === 'plc')
        for (const view of ['program', 'kop', 'watch', 'help']) {
          await page.locator('.sidebar [data-view=' + view + ']').click();
          await audit('view ' + view);
        }
      if (id === 'vision') {
        for (const task of ['source', 'recipe', 'region', 'measure', 'files']) {
          await page.locator('#vision-task-' + task).click();
          await audit('vision ' + task);
          if (task === 'source')
            for (const type of ['file', 'usb', 'ip']) {
              await page.locator('#vision-source-type').selectOption(type);
              await audit('vision source ' + type);
            }
          if (task === 'recipe')
            for (const mode of ['dark', 'light', 'range', 'reference']) {
              await page.locator('#mode').selectOption(mode);
              await audit('vision detection ' + mode);
            }
          if (task === 'measure')
            for (const mode of ['scale', 'limits']) {
              await page.locator('#vision-measure-mode').selectOption(mode);
              await audit('vision measurement ' + mode);
            }
        }
      }
      if (id === 'bi')
        for (const view of [
          'model',
          'measures',
          'data',
          'profile',
          'clean',
          'sql',
          'project'
        ]) {
          await page.locator('[data-view=' + view + ']').click();
          await audit('view ' + view);
          if (view === 'clean')
            for (const option of await page
              .locator('.viewport-task option')
              .all()) {
              await page
                .locator('.viewport-task')
                .selectOption(await option.getAttribute('value'));
              await audit('clean task');
            }
        }
      // Capture the actual default working view, not a design mock-up.
      await page.reload();
      await page.waitForFunction(() => ABSuite.viewportReady);
      await page.screenshot({
        path: path.join(dir, 'viewport-' + id + '.png')
      });
      if (
        !errors.some(
          (error) => error.startsWith(id + ' ') || error.startsWith(id + ':')
        )
      )
        passed.push(
          id +
            ': bounded editor and active task controls at 1280×720 / 1366×768, ES/EN'
        );
      console.log(
        (passed.at(-1)?.startsWith(id + ':') ? 'PASS ' : 'FAIL ') +
          id +
          ': viewport audit complete'
      );
      await context.close();
    }
    assert.deepEqual(errors, []);
    await writeFile(
      path.join(dir, 'viewport-results.json'),
      JSON.stringify({ passed, errors }, null, 2)
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
