/** AB Suite · vision workbench extensions, using its native engine. MIT. */
import {
  $,
  byId,
  el,
  button,
  panel,
  table,
  download,
  error
} from './shared.js';
export async function mount(sdk) {
  const empty = el('div', undefined, 'ab-vision-empty');
  empty.append(
    el('span', 'Vi', 'suite-app-mark'),
    el('h3', 'Tu primera imagen, tu primera inspección.'),
    el('p', 'Abre una imagen y ajusta la receta. El ejemplo es opcional.'),
    button('Abrir imagen', 'vision-empty-open', () =>
      byId('image-file').click()
    ),
    button('Abrir ejemplo', 'vision-empty-demo', () => byId('demo').click())
  );
  $('.viewer').append(empty);
  const showEmpty = () =>
    (empty.hidden = byId('feed-status').classList.contains('ready'));
  new MutationObserver(showEmpty).observe(byId('feed-status'), {
    childList: true,
    attributes: true
  });
  showEmpty();
  const api = sdk.adapter,
    p = panel(
      'vision-comparison',
      'Comparar inspecciones',
      'Guarda una inspección A, cambia la receta y ejecuta otra inspección B. Las diferencias se calculan sobre los resultados reales del motor, sin volver a etiquetar una medición sin calibrar.'
    );
  const result = el('div');
  result.id = 'vision-compare-result';
  result.append(
    el('p', 'Todavía no se ha guardado una inspección A.', 'ab-empty')
  );
  p.append(result);
  let baseline = null;
  const keep = button('Guardar inspección A', 'compare-baseline', () => {
    const current = api.inspection();
    if (!current)
      return error(byId('message'), Error('Realiza primero una inspección.'));
    baseline = {
      record: current,
      recipe: api.recipe(),
      image: api.captureImage(),
      source: api.documents.get().image
    };
    byId('message').textContent =
      'Inspección A guardada. Cambia los parámetros e inspecciona B.';
    result.replaceChildren(
      el('p', 'Inspección A guardada. Ejecuta B para comparar.')
    );
    updateActions();
  });
  const compare = button('Comparar A / B', 'compare-result', () => {
    const b = api.inspection();
    if (!baseline || !b)
      return error(
        byId('message'),
        Error('Guarda A y ejecuta otra inspección para comparar.')
      );
    if (b.time === baseline.record.time)
      return error(
        byId('message'),
        Error('La inspección B debe ser posterior a A.')
      );
    const a = baseline.record,
      recipe = api.recipe();
    result.replaceChildren();
    const images = el('div', undefined, 'ab-compare-images');
    for (const [label, url] of [
      ['A · guardada', baseline.image],
      ['B · actual', api.captureImage()]
    ]) {
      const figure = el('figure'),
        image = el('img');
      image.src = url;
      image.alt = 'Resultado de inspección ' + label;
      figure.append(image, el('figcaption', label));
      images.append(figure);
    }
    result.append(
      images,
      table(
        ['Criterio', 'Inspección A', 'Inspección B', 'Diferencia'],
        [
          ['Defectos', a.defects, b.defects, b.defects - a.defects],
          [
            'Cobertura (%)',
            a.coverage,
            b.coverage,
            (b.coverage - a.coverage).toFixed(3)
          ],
          ['Umbral', a.threshold, b.threshold, b.threshold - a.threshold],
          ['Área mínima', a.minArea, b.minArea, b.minArea - a.minArea],
          ['Resultado visual', a.visualVerdict, b.visualVerdict, '—'],
          [
            'Metrología',
            a.auditStatus,
            b.auditStatus,
            'No se presume calibración'
          ]
        ]
      )
    );
    if (
      baseline.source !== api.documents.get().image ||
      JSON.stringify(baseline.recipe.roi) !== JSON.stringify(recipe.roi)
    )
      result.append(
        el(
          'p',
          'Las imágenes o regiones son distintas: esta comparación describe dos inspecciones y no demuestra equivalencia.'
        )
      );
    sdk.workspace?.activate('Comparación');
  });
  $('.tool-bar').append(keep, compare);
  function updateActions() {
    const current = api.inspection();
    keep.disabled = !current;
    compare.disabled =
      !baseline || !current || current.time === baseline.record.time;
  }
  new MutationObserver(updateActions).observe(byId('count'), {
    childList: true
  });
  updateActions();
  const region = el('details', undefined, 'ab-roi-form');
  region.append(el('summary', 'Región por coordenadas (px)'));
  const fields = el('div', undefined, 'property-grid');
  for (const [key, value] of [
    ['x', 0],
    ['y', 0],
    ['width', 100],
    ['height', 100]
  ]) {
    const label = el('label', key),
      input = el('input');
    input.id = 'roi-' + key;
    input.type = 'number';
    input.min = ['width', 'height'].includes(key) ? 1 : 0;
    input.step = 1;
    input.value = value;
    label.append(input);
    fields.append(label);
  }
  const apply = button('Aplicar región', 'roi-apply', () => {
    try {
      api.setRegion(
        Object.fromEntries(
          ['x', 'y', 'width', 'height'].map((k) => [
            k,
            Number(byId('roi-' + k).value)
          ])
        )
      );
      byId('message').textContent =
        'Región actualizada. Ejecuta otra inspección.';
    } catch (err) {
      error(byId('message'), err);
    }
  });
  region.append(fields, apply);
  $('#config .config-body').prepend(region);
  window.addEventListener('ab-suite:new-document', () => {
    baseline = null;
    result.replaceChildren(
      el('p', 'Proyecto nuevo: no hay inspecciones para comparar.')
    );
  });
}
