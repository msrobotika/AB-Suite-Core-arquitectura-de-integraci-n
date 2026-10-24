/** The same create/recover contract for all disciplines; each native engine owns its document. MIT. */
const sdk = window.ABSuite,
  app = sdk.id;
const getAPI = () => sdk.documents ?? sdk.adapter?.documents;
const el = (tag, text, cls) => {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (cls) n.className = cls;
  return n;
};
const activeKey = 'ab-suite:active-document:' + app,
  retainsActive = ['vision', 'modbus', 'serial'].includes(app);
let restoring = false,
  activeTimer = null;
const key = 'ab-suite:documents:' + app;
let copies = [],
  memoryOnly = false;
try {
  const raw = JSON.parse(localStorage.getItem(key) || '[]');
  if (Array.isArray(raw))
    copies = raw
      .filter(
        (x) =>
          x && typeof x.id === 'string' && typeof x.name === 'string' && x.data
      )
      .slice(0, 8);
} catch {}
const bar = document.querySelector('.suite-bar'),
  newButton = el('button', '＋ Nuevo', 'suite-action suite-primary'),
  libraryButton = el('button', 'Proyectos', 'suite-action');
newButton.id = 'suite-new';
libraryButton.id = 'suite-projects';
newButton.type = libraryButton.type = 'button';
bar.insertBefore(newButton, bar.querySelector('.suite-status'));
bar.insertBefore(libraryButton, bar.querySelector('.suite-status'));
const dialog = el('dialog', undefined, 'suite-guide suite-documents');
dialog.id = 'suite-document-dialog';
dialog.setAttribute('aria-labelledby', 'suite-document-title');
const close = el('button', 'Cerrar ×', 'suite-action');
close.type = 'button';
close.onclick = () => dialog.close();
const title = el('h2', 'Tu proyecto');
title.id = 'suite-document-title';
const intro = el(
  'p',
  app === 'grafcet'
    ? 'Crea una secuencia con una etapa inicial, sin acciones ni transiciones, o recupera un trabajo guardado. El ejemplo es opcional.'
    : 'Crea un trabajo vacío o recupera un punto guardado. Los ejemplos se abren de forma explícita dentro de cada herramienta.'
);
const form = el('form'),
  label = el('label', 'Nombre del trabajo'),
  name = el('input');
name.id = 'suite-document-name';
name.required = true;
name.maxLength = 80;
name.value = 'Mi proyecto';
label.htmlFor = name.id;
label.append(name);
const create = el(
  'button',
  'Crear trabajo nuevo',
  'suite-action suite-primary'
);
create.id = 'suite-document-create';
create.type = 'submit';
const save = el('button', 'Guardar punto de vuelta', 'suite-action');
save.id = 'suite-document-save';
save.type = 'button';
const actions = el('div', undefined, 'suite-document-actions');
actions.append(create, save);
form.append(label, actions);
const message = el('p');
message.id = 'suite-document-message';
message.setAttribute('role', 'status');
const heading = el('h3', 'Trabajos recuperables'),
  list = el('div');
list.id = 'suite-document-list';
dialog.append(
  close,
  title,
  intro,
  form,
  message,
  heading,
  list,
  el(
    'p',
    'Se conservan hasta 8 puntos por herramienta en este navegador. Los archivos portables se exportan desde la propia herramienta.',
    'suite-document-help'
  )
);
document.body.append(dialog);
function persist() {
  try {
    localStorage.setItem(key, JSON.stringify(copies));
    memoryOnly = false;
    return true;
  } catch {
    memoryOnly = true;
    return false;
  }
}
async function backup(label) {
  const api = getAPI();
  if (!api?.get)
    throw Error(
      'La herramienta todavía está iniciándose. Reintenta en unos segundos.'
    );
  const data = await api.get();
  if (!data) return;
  copies.unshift({
    id: crypto.randomUUID(),
    name: label || data.name || 'Mi trabajo',
    at: new Date().toISOString(),
    data
  });
  copies = copies.slice(0, 8);
  persist();
}
function render() {
  list.replaceChildren();
  if (!copies.length)
    list.append(
      el(
        'p',
        'Todavía no hay puntos guardados. Al crear otro trabajo se conservará aquí el actual.'
      )
    );
  for (const copy of copies) {
    const row = el('div', undefined, 'suite-document-copy'),
      text = el('div');
    text.append(
      el('strong', copy.name),
      el('small', new Date(copy.at).toLocaleString('es-ES'))
    );
    const open = el('button', 'Recuperar', 'suite-action');
    open.type = 'button';
    open.onclick = async () => {
      open.disabled = true;
      try {
        const api = getAPI();
        if (!api?.restore) throw Error('Herramienta no disponible');
        await backup();
        await api.restore(structuredClone(copy.data));
        await saveActive();
        dialog.close();
      } catch (error) {
        message.textContent = error.message;
      } finally {
        open.disabled = false;
        render();
      }
    };
    row.append(text, open);
    list.append(row);
  }
}
form.onsubmit = async (event) => {
  event.preventDefault();
  const value = name.value.trim();
  if (!value) {
    message.textContent = 'Escribe un nombre.';
    return;
  }
  create.disabled = save.disabled = true;
  try {
    const api = getAPI();
    if (!api?.create) throw Error('La herramienta aún se está preparando');
    await api.prepare?.();
    await backup();
    await api.create(value);
    await saveActive();
    dialog.close();
    window.dispatchEvent(new Event('ab-suite:new-document'));
    if (memoryOnly) {
      dialog.showModal();
      message.textContent =
        'Trabajo nuevo creado. La copia anterior solo está en memoria porque el almacenamiento no está disponible. Recupérala y expórtala antes de cerrar la pestaña.';
      render();
    }
  } catch (error) {
    message.textContent = error.message;
  } finally {
    create.disabled = save.disabled = false;
  }
};
save.onclick = async () => {
  save.disabled = true;
  try {
    await backup();
    await saveActive();
    message.textContent = memoryOnly
      ? 'Copia disponible en esta pestaña. El almacenamiento falló: exporta el archivo para conservarlo.'
      : 'Punto de vuelta guardado en este navegador.';
    render();
  } catch (error) {
    message.textContent = error.message;
  } finally {
    save.disabled = false;
  }
};
function open(focus) {
  render();
  message.textContent = '';
  dialog.showModal();
  if (focus) name.focus();
}
newButton.onclick = () => open(true);
libraryButton.onclick = () => open(false);
const measure = () =>
  document.documentElement.style.setProperty(
    '--suite-bar-height',
    bar.offsetHeight + 'px'
  );
new ResizeObserver(measure).observe(bar);
measure();

async function saveActive() {
  if (!retainsActive || restoring) return;
  const api = getAPI();
  if (!api?.get) return;
  try {
    const data = await api.get();
    if (data) localStorage.setItem(activeKey, JSON.stringify(data));
    sdk.documentStorageError = false;
  } catch {
    sdk.documentStorageError = true;
    libraryButton.title =
      'No se pudo guardar el trabajo actual: guarda un punto de vuelta o exporta antes de cerrar.';
  }
}
function scheduleActive() {
  if (!retainsActive || restoring || activeTimer) return;
  activeTimer = setTimeout(() => {
    activeTimer = null;
    saveActive();
  }, 800);
}
for (const event of ['input', 'change', 'click'])
  document.addEventListener(event, scheduleActive);
window.addEventListener('ab-suite:document-changed', scheduleActive);
if (retainsActive) {
  try {
    const raw = localStorage.getItem(activeKey);
    if (raw) {
      restoring = true;
      await getAPI()?.restore(JSON.parse(raw), { automatic: true });
    }
  } catch {
    sdk.documentStorageError = true;
    libraryButton.title =
      'No se pudo reabrir el trabajo guardado. El original sigue en el almacenamiento.';
  } finally {
    restoring = false;
  }
}

sdk.documentsReady = true;
window.dispatchEvent(new Event('ab-suite:documents-ready'));
