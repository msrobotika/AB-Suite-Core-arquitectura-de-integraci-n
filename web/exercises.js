import { catalog } from './catalog.js';
import {
  parseExercise,
  validateExercise,
  validateComponent,
  MAX_BYTES
} from './exercise-contract.js';
import {
  listExercises,
  getExercise,
  createExercise,
  listRecoveries,
  getRecovery,
  renameExercise,
  duplicateExercise,
  archiveExercise,
  removeComponent,
  addComponent
} from './exercise-store.js';
import { validationOptions, downloadExercise } from './exercise-api.js';
const $ = (id) => document.getElementById(id),
  node = (tag, text) => {
    const e = document.createElement(tag);
    if (text !== undefined) e.textContent = text;
    return e;
  };
let active = new URLSearchParams(location.search).get('id'),
  busy = false,
  revision = 0,
  visibleCopies = 20,
  nameMode = 'rename',
  nameTarget = null;
const message = (text) => {
  $('exercise-message').textContent = text;
};
const folded = (value) =>
  value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es');
const time = (value) => new Date(value).toLocaleString('es-ES');
const setActive = (id) => {
  active = id;
  history.replaceState(null, '', '?id=' + id);
};
for (const tool of catalog) {
  const option = node('option', tool.name);
  option.value = tool.id;
  $('recovery-tool').append(option);
}
async function render() {
  const current = ++revision,
    [records, copies] = await Promise.all([listExercises(), listRecoveries()]);
  if (current !== revision) return;
  records.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const query = folded($('exercise-search').value.trim()),
    archived = $('exercise-view').value === 'archived';
  const matches = records.filter(
    (record) =>
      Boolean(record.archivedAt) === archived &&
      folded(
        record.name +
          ' ' +
          Object.values(record.components)
            .map((x) => x.name)
            .join(' ')
      ).includes(query)
  );
  $('exercise-list').replaceChildren();
  $('exercise-count').textContent =
    matches.length + ' ejercicios' + (archived ? ' archivados' : ' en curso');
  for (const record of matches) {
    const button = node('button');
    button.className = 'suite-action exercise-list-item';
    button.type = 'button';
    button.setAttribute('aria-label', record.name);
    button.disabled = busy;
    button.setAttribute('aria-pressed', String(record.id === active));
    button.append(
      node('strong', record.name),
      node(
        'small',
        Object.keys(record.components).length +
          ' componentes · ' +
          time(record.updatedAt)
      )
    );
    button.onclick = () => {
      if (!busy) {
        setActive(record.id);
        render().catch((e) => message(e.message));
      }
    };
    $('exercise-list').append(button);
  }
  if (!matches.length)
    $('exercise-list').append(
      node(
        'p',
        query
          ? 'No hay coincidencias. Prueba otro nombre.'
          : archived
            ? 'Los ejercicios que archives aparecerán aquí.'
            : 'Todavía no hay ejercicios en curso.'
      )
    );
  const record = records.find((x) => x.id === active),
    retired = Boolean(record?.archivedAt);
  $('exercise-title').textContent = record?.name ?? 'Empieza un ejercicio';
  $('exercise-export').disabled = !record || busy;
  for (const id of [
    'exercise-rename',
    'exercise-duplicate',
    'exercise-archive'
  ])
    $(id).disabled = !record || busy;
  $('exercise-archive').textContent = retired
    ? 'Restaurar ejercicio'
    : 'Archivar ejercicio';
  $('exercise-intro').textContent = retired
    ? 'Ejercicio archivado: conserva todos sus componentes. Puedes descargarlo, duplicarlo o restaurarlo desde Organizar.'
    : record
      ? 'Este ejercicio es opcional. Añade copias desde Proyectos → Añadir a un ejercicio en las herramientas que utilices.'
      : 'Usa las herramientas que quieras. Crea aquí un ejercicio solo si necesitas reunir varios documentos o trasladarlos juntos.';
  $('exercise-components').replaceChildren();
  if (record)
    for (const tool of catalog) {
      const entry = record.components[tool.id],
        card = node('article');
      card.className = 'exercise-component';
      card.dataset.tool = tool.id;
      const head = node('div');
      head.className = 'exercise-component-heading';
      head.append(node('h3', tool.name));
      if (entry && !retired) {
        const menu = node('details');
        menu.className = 'component-options';
        const summary = node('summary', '···');
        summary.setAttribute('aria-label', 'Opciones de ' + tool.name);
        const remove = node('button', 'Retirar del ejercicio');
        remove.type = 'button';
        remove.disabled = busy;
        remove.onclick = () =>
          perform(async () => {
            await removeComponent(record.id, tool.id);
            message(
              'Componente retirado. Su copia completa está en Trabajos conservados; la herramienta no ha cambiado.'
            );
          });
        menu.append(summary, remove);
        head.append(menu);
      }
      card.append(
        head,
        node('p', entry ? entry.name : 'Sin componente · opcional')
      );
      const link = node(
        'a',
        entry ? 'Abrir copia guardada →' : 'Abrir herramienta ↗'
      );
      link.href =
        '/apps/' + tool.id + '/' + (entry ? '?exercise=' + record.id : '');
      if (entry) card.append(node('p', 'Añadido: ' + time(entry.savedAt)));
      card.append(link);
      $('exercise-components').append(card);
    }
  $('exercise-recoveries').replaceChildren();
  const tool = $('recovery-tool').value;
  const filtered = copies
    .filter((x) => tool === 'all' || x.tool === tool)
    .sort((a, b) => b.at.localeCompare(a.at));
  for (const copy of filtered.slice(0, visibleCopies)) {
    const row = node('div');
    row.className = 'recovery-row';
    const description = node('div');
    description.append(
      node('strong', copy.name),
      node(
        'small',
        copy.tool.toUpperCase() +
          ' · ' +
          time(copy.at) +
          (copy.reason ? ' · ' + copy.reason : '')
      )
    );
    const actions = node('div');
    actions.className = 'recovery-actions';
    const link = node('a', 'Abrir en herramienta');
    link.href = `/apps/${copy.tool}/?recovery=${copy.id}`;
    actions.append(link);
    if (record && !retired) {
      const restore = node('button', 'Añadir al ejercicio');
      restore.className = 'suite-action';
      restore.type = 'button';
      restore.disabled = busy;
      restore.onclick = () =>
        perform(async () => {
          const saved = await getRecovery(copy.id);
          if (!saved) throw Error('Esta copia ya no está disponible');
          const document = await validateComponent(
            saved.tool,
            saved.document,
            validationOptions
          );
          await addComponent(record.id, saved.tool, document);
          message(
            'Copia añadida al ejercicio. El componente sustituido también queda conservado.'
          );
        });
      actions.append(restore);
    }
    row.append(description, actions);
    $('exercise-recoveries').append(row);
  }
  if (!filtered.length)
    $('exercise-recoveries').append(
      node(
        'p',
        'No hay copias para esta selección. Se conservarán al abrir, actualizar o retirar componentes.'
      )
    );
  $('recovery-more').hidden = filtered.length <= visibleCopies;
  $('exercise-new').querySelector('button').disabled = busy;
  $('exercise-import-button').disabled = busy;
  $('exercise-name-save').disabled = busy;
  $('exercise-name-cancel').disabled = busy;
  $('recovery-more').disabled = busy;
}
async function perform(fn) {
  if (busy) return false;
  busy = true;
  const controls = [...document.querySelectorAll('button')].map((button) => [
    button,
    button.disabled
  ]);
  controls.forEach(([button]) => (button.disabled = true));
  try {
    await fn();
    return true;
  } catch (error) {
    message(error.message);
    return false;
  } finally {
    busy = false;
    controls.forEach(([button, disabled]) => {
      if (button.isConnected) button.disabled = disabled;
    });
    await render().catch((error) => message(error.message));
  }
}
$('exercise-new').onsubmit = (event) => {
  event.preventDefault();
  perform(async () => {
    const record = await createExercise($('exercise-name').value);
    setActive(record.id);
    $('exercise-search').value = '';
    $('exercise-view').value = 'active';
    message(
      'Ejercicio vacío creado. Añade solo las herramientas que necesites.'
    );
  });
};
$('exercise-import').onchange = () =>
  perform(async () => {
    const file = $('exercise-import').files[0];
    $('exercise-import').value = '';
    if (!file) return;
    if (file.size > MAX_BYTES) throw Error('El ejercicio supera 50 MiB');
    message(
      'Validando todos los componentes; las herramientas actuales se conservan…'
    );
    const document = await parseExercise(await file.text(), validationOptions);
    const record = await createExercise(document.name, document);
    setActive(record.id);
    $('exercise-search').value = '';
    $('exercise-view').value = 'active';
    message(
      'Ejercicio importado en una entrada nueva. Ninguna herramienta se ha reemplazado ni ejecutado.'
    );
  });
$('exercise-export').onclick = () =>
  perform(async () => {
    const record = await getExercise(active);
    if (!record) throw Error('Selecciona un ejercicio');
    downloadExercise(
      await validateExercise(record.document, validationOptions)
    );
    message('Archivo descargado con las copias incorporadas.');
  });
function nameDialog(mode) {
  nameMode = mode;
  nameTarget = active;
  perform(async () => {
    const record = await getExercise(nameTarget);
    if (!record) throw Error('Selecciona un ejercicio');
    $('exercise-name-title').textContent =
      mode === 'rename' ? 'Renombrar ejercicio' : 'Duplicar ejercicio';
    $('exercise-edit-name').value =
      mode === 'rename'
        ? record.document.name
        : record.document.name.slice(0, 80) + ' · copia';
    $('exercise-name-save').textContent =
      mode === 'rename' ? 'Guardar nombre' : 'Crear copia independiente';
    $('exercise-name-error').textContent = '';
    $('exercise-organize').open = false;
    $('exercise-name-dialog').showModal();
    $('exercise-edit-name').select();
  });
}
$('exercise-rename').onclick = () => nameDialog('rename');
$('exercise-duplicate').onclick = () => nameDialog('duplicate');
$('exercise-name-cancel').onclick = () => $('exercise-name-dialog').close();
$('exercise-name-dialog').onclose = () =>
  $('exercise-organize').querySelector('summary').focus();
$('exercise-name-form').onsubmit = async (event) => {
  event.preventDefault();
  const ok = await perform(async () => {
    try {
      const name = $('exercise-edit-name').value;
      if (nameMode === 'rename') await renameExercise(nameTarget, name);
      else {
        const record = await duplicateExercise(nameTarget, name);
        setActive(record.id);
        $('exercise-view').value = 'active';
      }
      $('exercise-search').value = '';
      message(
        nameMode === 'rename'
          ? 'Nombre actualizado.'
          : 'Copia independiente creada; el ejercicio original se conserva.'
      );
    } catch (error) {
      $('exercise-name-error').textContent = error.message;
      throw error;
    }
  });
  if (ok) $('exercise-name-dialog').close();
};
$('exercise-archive').onclick = () =>
  perform(async () => {
    const id = active,
      record = await getExercise(id);
    if (!record) throw Error('Selecciona un ejercicio');
    await archiveExercise(id, !record.archivedAt);
    $('exercise-organize').open = false;
    message(
      record.archivedAt
        ? 'Ejercicio restaurado. Vuelve a estar disponible para añadir componentes.'
        : 'Ejercicio archivado. Conserva todos sus documentos y lo encontrarás en Archivados.'
    );
  });
$('exercise-search').oninput = () => render().catch((e) => message(e.message));
$('exercise-view').onchange = () => render().catch((e) => message(e.message));
$('recovery-tool').onchange = () => {
  visibleCopies = 20;
  render().catch((e) => message(e.message));
};
$('recovery-more').onclick = () => {
  visibleCopies += 20;
  render().catch((e) => message(e.message));
};
$('exercise-import-button').onclick = () => $('exercise-import').click();
for (const event of ['focus', 'ab-suite:library-changed'])
  window.addEventListener(event, () => {
    if (!busy) render().catch((e) => message(e.message));
  });
await render().catch((e) => message(e.message));
