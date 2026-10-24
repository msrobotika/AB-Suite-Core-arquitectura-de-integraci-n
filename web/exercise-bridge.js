/** Explicit capture and non-destructive component opening. No background synchronization. MIT. */
import { validateComponent } from './exercise-contract.js';
import {
  allExercises,
  getExercise,
  createExercise,
  addComponent,
  saveRecovery,
  getRecovery
} from './exercise-store.js';
import { validationOptions } from './exercise-api.js';
const sdk = window.ABSuite,
  tool = sdk.id,
  api = () => sdk.documents ?? sdk.adapter?.documents;
const element = (tag, text) => {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  return e;
};
export async function portableDocument() {
  let document;
  if (tool === 'bi') {
    const response = await fetch('/apps/bi/api/export', {
      headers: { 'X-ABBI-Workspace': sdk.bi.model().workspace_id },
      cache: 'no-store'
    });
    if (!response.ok)
      throw Error(
        'No se pudo exportar el espacio BI activo. Recarga antes de añadirlo.'
      );
    document = await response.json();
  } else document = await api().get();
  return validateComponent(tool, document, validationOptions);
}
async function apply(document) {
  if (tool === 'bi') {
    const capture = await fetch('/suite/bi-capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"enabled":false}'
    });
    if (!capture.ok)
      throw Error(
        'No se pudo detener la captura BI antes de abrir el componente'
      );
    const form = new FormData();
    form.append(
      'file',
      new Blob([JSON.stringify(document)], { type: 'application/json' }),
      'ejercicio.abbi'
    );
    const previous = sdk.bi.model().workspace_id;
    const response = await fetch('/apps/bi/api/project/import', {
      method: 'POST',
      headers: { 'X-ABBI-Workspace': sdk.bi.model().workspace_id },
      body: form
    });
    if (!response.ok) {
      const result = await response.json();
      throw Error(result.detail ?? 'BI no pudo abrir el componente');
    }
    try {
      await sdk.bi.refresh();
      sdk.bi.show('dashboard');
    } catch (error) {
      const restored = await fetch(
        '/apps/bi/api/workspaces/' + encodeURIComponent(previous) + '/activate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}'
        }
      );
      if (!restored.ok)
        throw Error(
          error.message +
            ' · El espacio anterior se conserva en BI y en Trabajos conservados, pero no se pudo reactivar automáticamente.'
        );
      try {
        await sdk.bi.refresh();
      } catch {}
      throw error;
    }
  } else await api().restore(document);
  window.dispatchEvent(new Event('ab-suite:document-changed'));
}
const channel =
  typeof BroadcastChannel === 'function'
    ? new BroadcastChannel('ab-suite.exercise-views.v1')
    : null;
channel?.addEventListener('message', (event) => {
  if (event.data?.type === 'probe' && event.data.tool === tool)
    channel.postMessage({
      type: 'present',
      request: event.data.request,
      instance: sdk.instance,
      tool
    });
});
async function requireSingleView() {
  if (!channel) return;
  const request = crypto.randomUUID();
  let other = false;
  const receive = (event) => {
    if (
      event.data?.type === 'present' &&
      event.data.request === request &&
      event.data.instance !== sdk.instance
    )
      other = true;
  };
  channel.addEventListener('message', receive);
  channel.postMessage({ type: 'probe', request, tool });
  await new Promise((resolve) => setTimeout(resolve, 400));
  channel.removeEventListener('message', receive);
  if (other)
    throw Error(
      'Cierra las otras pestañas de esta herramienta antes de abrir el componente. Así no podrán sobrescribir tu trabajo después.'
    );
}
export function mountExerciseActions(dialog) {
  const capture = element('dialog'),
    launch = element('button', 'Añadir a un ejercicio'),
    back = element('button', 'Volver a Proyectos');
  capture.className = 'suite-guide suite-exercise-capture';
  capture.id = 'suite-exercise-capture';
  capture.setAttribute('aria-labelledby', 'suite-exercise-capture-title');
  launch.className = back.className = 'suite-action';
  launch.type = back.type = 'button';
  launch.id = 'suite-exercise-manage';
  dialog.querySelector('.suite-document-actions').append(launch);
  launch.onclick = () => {
    dialog.close();
    message.textContent = '';
    capture.showModal();
    refresh().catch((error) => (message.textContent = error.message));
  };
  back.onclick = () => {
    if (busy) return;
    capture.close();
    dialog.showModal();
  };
  const section = element('section'),
    heading = element('h3', 'Ejercicios de la suite'),
    label = element('label', 'Ejercicio de destino'),
    picker = element('select'),
    name = element('input'),
    row = element('div'),
    create = element('button', 'Crear ejercicio'),
    add = element('button', 'Añadir copia actual'),
    link = element('a', 'Gestionar ejercicios y archivos .absuite ↗'),
    message = element('p');
  section.className = 'suite-exercise-actions';
  heading.id = 'suite-exercise-capture-title';
  picker.id = 'suite-exercise-select';
  picker.setAttribute('aria-label', 'Ejercicio de destino');
  name.id = 'suite-exercise-name';
  name.placeholder = 'Nombre del ejercicio nuevo';
  name.maxLength = 90;
  name.setAttribute('aria-label', 'Nombre del ejercicio nuevo');
  create.id = 'suite-exercise-create';
  add.id = 'suite-exercise-add';
  create.type = add.type = 'button';
  create.className = add.className = 'suite-action';
  add.classList.add('suite-primary');
  link.href = '/suite/exercises.html';
  link.target = '_blank';
  link.rel = 'noopener';
  message.id = 'suite-exercise-message';
  message.setAttribute('role', 'status');
  row.className = 'suite-document-actions';
  row.append(create, add);
  label.append(picker);
  section.append(
    heading,
    element(
      'p',
      'Añade una copia del documento completo. Si ya existe este componente, se actualiza solo la copia del ejercicio; tu trabajo en la herramienta sigue igual.'
    ),
    label,
    name,
    row,
    link,
    message
  );
  capture.append(back, section);
  document.body.append(capture);
  let busy = false;
  async function refresh(selected = picker.value) {
    const records = await allExercises();
    picker.replaceChildren();
    for (const record of records.sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    )) {
      const option = element('option', record.document.name);
      option.value = record.id;
      picker.append(option);
    }
    if (records.some((x) => x.id === selected)) picker.value = selected;
    add.disabled = !records.length;
  }
  async function run(fn) {
    if (busy) return;
    busy = true;
    create.disabled = add.disabled = true;
    try {
      await fn();
    } catch (error) {
      message.textContent = error.message;
    } finally {
      busy = false;
      create.disabled = false;
      add.disabled = !picker.options.length;
    }
  }
  create.onclick = () =>
    run(async () => {
      const record = await createExercise(name.value);
      await refresh(record.id);
      message.textContent =
        'Ejercicio vacío creado. Pulsa Añadir copia actual para incorporar este documento.';
    });
  add.onclick = () =>
    run(async () => {
      const document = await portableDocument();
      await addComponent(picker.value, tool, document);
      message.textContent =
        'Copia completa añadida. Descarga el .absuite desde Gestionar ejercicios para conservarla fuera del navegador.';
    });
}
export async function offerExerciseComponent() {
  const request = sdk.exerciseRequest;
  if (!request?.exercise && !request?.recovery) return;
  const dialog = element('dialog');
  dialog.className = 'suite-guide';
  dialog.id = 'suite-exercise-open';
  dialog.setAttribute('aria-labelledby', 'suite-exercise-open-title');
  const title = element('h2', 'Abrir componente guardado');
  title.id = 'suite-exercise-open-title';
  const message = element('p'),
    cancel = element('button', 'Conservar mi trabajo'),
    open = element('button', 'Conservar copia y abrir');
  cancel.className = 'suite-action';
  open.className = 'suite-action suite-primary';
  open.id = 'suite-exercise-open-confirm';
  cancel.type = open.type = 'button';
  cancel.onclick = () => dialog.close();
  dialog.append(
    title,
    element(
      'p',
      'Se conservará primero una copia recuperable de tu trabajo actual. Abrir no inicia la CPU, las cámaras ni las comunicaciones. BI crea un espacio nuevo. Cierra otras pestañas de esta herramienta antes de continuar.'
    ),
    message,
    cancel,
    open
  );
  document.body.append(dialog);
  dialog.showModal();
  let next;
  try {
    if (request.recovery) {
      const saved = await getRecovery(request.recovery);
      if (saved?.tool === tool) next = saved.document;
    } else
      next = (await getExercise(request.exercise))?.document.components[tool]
        ?.document;
    if (!next)
      throw Error(
        'No existe este componente en la biblioteca de este navegador y dirección. Importa primero el archivo .absuite.'
      );
    next = await validateComponent(tool, next, validationOptions);
    message.textContent = 'Documento: ' + next.name;
  } catch (error) {
    message.textContent = error.message;
    open.disabled = true;
  }
  open.onclick = async () => {
    open.disabled = true;
    try {
      await requireSingleView();
      const before = await portableDocument();
      await saveRecovery(tool, before);
      try {
        await apply(next);
      } catch (error) {
        // Native BI import creates a new space; its previous workspace remains intact.
        if (tool !== 'bi')
          try {
            await apply(before);
          } catch {
            throw Error(
              error.message +
                ' · No se pudo restaurar automáticamente. Tu copia anterior sigue en Mis ejercicios → Trabajos conservados.'
            );
          }
        throw error;
      }
      dialog.close();
      history.replaceState(null, '', location.pathname);
    } catch (error) {
      message.textContent = error.message;
    } finally {
      open.disabled = false;
    }
  };
}
