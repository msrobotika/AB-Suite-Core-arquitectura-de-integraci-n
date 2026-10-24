import { catalog } from './catalog.js';
import {
  parseExercise,
  validateExercise,
  MAX_BYTES
} from './exercise-contract.js';
import {
  allExercises,
  getExercise,
  createExercise,
  allRecoveries
} from './exercise-store.js';
import { validationOptions, downloadExercise } from './exercise-api.js';
const $ = (id) => document.getElementById(id),
  node = (tag, text) => {
    const e = document.createElement(tag);
    if (text !== undefined) e.textContent = text;
    return e;
  };
let active = new URLSearchParams(location.search).get('id'),
  busy = false;
const message = (text) => {
  $('exercise-message').textContent = text;
};
async function render() {
  const records = await allExercises();
  records.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  $('exercise-list').replaceChildren();
  for (const record of records) {
    const button = node('button', record.document.name);
    button.className = 'suite-action';
    button.type = 'button';
    button.setAttribute('aria-pressed', String(record.id === active));
    button.onclick = () => {
      active = record.id;
      history.replaceState(null, '', '?id=' + active);
      render().catch((e) => message(e.message));
    };
    $('exercise-list').append(button);
  }
  const record = records.find((x) => x.id === active);
  $('exercise-title').textContent =
    record?.document.name ?? 'Empieza un ejercicio';
  $('exercise-export').disabled = !record;
  $('exercise-intro').textContent = record
    ? 'Abre una herramienta y usa Proyectos → Añadir a ejercicio. Aquí puedes abrir las copias que hayas incorporado.'
    : 'Crea un ejercicio vacío o importa un archivo. Después añade tu trabajo desde Proyectos dentro de cada herramienta.';
  $('exercise-components').replaceChildren();
  if (record)
    for (const tool of catalog) {
      const entry = record.document.components[tool.id],
        card = node('article');
      card.className = 'exercise-component';
      card.dataset.tool = tool.id;
      card.append(
        node('h3', tool.name),
        node(
          'p',
          entry ? entry.document.name : 'Sin componente · todavía no añadido'
        )
      );
      const link = node(
        'a',
        entry ? 'Abrir copia guardada →' : 'Crear en esta herramienta ↗'
      );
      link.href =
        '/apps/' + tool.id + '/' + (entry ? '?exercise=' + record.id : '');
      if (entry)
        card.append(
          node(
            'p',
            'Añadido: ' + new Date(entry.savedAt).toLocaleString('es-ES')
          )
        );
      card.append(link);
      $('exercise-components').append(card);
    }
  $('exercise-recoveries').replaceChildren();
  const recoveries = await allRecoveries();
  recoveries.sort((a, b) => b.at.localeCompare(a.at));
  for (const copy of recoveries) {
    const link = node(
      'a',
      `${copy.document.name} · ${copy.tool.toUpperCase()} · ${new Date(copy.at).toLocaleString('es-ES')}${copy.reason?' · '+copy.reason:''}`
    );
    link.href = `/apps/${copy.tool}/?recovery=${copy.id}`;
    $('exercise-recoveries').append(link);
  }
  if (!recoveries.length)
    $('exercise-recoveries').append(
      node(
        'p',
        'Al abrir un componente se conserva primero el trabajo de esa herramienta.'
      )
    );
}
async function perform(fn) {
  if (busy) return;
  busy = true;
  try {
    await fn();
    await render();
  } catch (error) {
    message(error.message);
  } finally {
    busy = false;
  }
}
$('exercise-new').onsubmit = (event) => {
  event.preventDefault();
  perform(async () => {
    const record = await createExercise($('exercise-name').value);
    active = record.id;
    history.replaceState(null, '', '?id=' + active);
    message(
      'Ejercicio vacío creado. Añade tus documentos desde las herramientas.'
    );
  });
};
$('exercise-import').onchange = () =>
  perform(async () => {
    const file = $('exercise-import').files[0];
    $('exercise-import').value = '';
    if (!file) return;
    if (file.size > MAX_BYTES) throw Error('El ejercicio supera 50 MB');
    message(
      'Validando todos los componentes; las herramientas actuales se conservan…'
    );
    const document = await parseExercise(await file.text(), validationOptions);
    const record = await createExercise(document.name, document);
    active = record.id;
    history.replaceState(null, '', '?id=' + active);
    message(
      'Ejercicio importado en una entrada nueva. Ninguna herramienta se ha reemplazado ni ejecutado.'
    );
  });
$('exercise-export').onclick = () =>
  perform(async () => {
    const record = await getExercise(active);
    if (!record) throw Error('Selecciona un ejercicio');
    const doc = await validateExercise(record.document, validationOptions);
    downloadExercise(doc);
    message(
      'Archivo descargado con los componentes añadidos. Los archivos nativos y los datos actuales de las herramientas se conservan.'
    );
  });
$('exercise-import-button').onclick = () => $('exercise-import').click();
window.addEventListener('focus', () => {
  if (!busy) render().catch((error) => message(error.message));
});
await render().catch((error) => message(error.message));
