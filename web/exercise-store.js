/** Transactional browser library. Quota/permission errors never fall back to silent memory-only saves. MIT. */
import { EXERCISE_SCHEMA, MAX_BYTES } from './exercise-contract.js';
let database;
export function openLibrary() {
  if (!database)
    database = new Promise((resolve, reject) => {
      const request = indexedDB.open('ab-suite-exercises', 3);
      request.onupgradeneeded = () => {
        for (const [name, keyPath] of [
          ['exercises', 'id'],
          ['recoveries', 'id'],
          ['actives', 'tool'],
          ['exercise-index', 'id'],
          ['recovery-index', 'id']
        ])
          if (!request.result.objectStoreNames.contains(name))
            request.result.createObjectStore(name, { keyPath });
        for (const [source, target, summary] of [
          ['exercises', 'exercise-index', exerciseSummary],
          ['recoveries', 'recovery-index', recoverySummary]
        ]) {
          const cursor = request.transaction.objectStore(source).openCursor();
          cursor.onsuccess = () => {
            if (cursor.result) {
              request.transaction
                .objectStore(target)
                .put(summary(cursor.result.value));
              cursor.result.continue();
            }
          };
        }
      };
      request.onerror = () =>
        reject(
          Error(
            'No se pudo abrir la biblioteca local. Permite almacenamiento del navegador o exporta antes de cerrar.'
          )
        );
      request.onblocked = () =>
        reject(
          Error('Otra pestaña bloquea la biblioteca. Ciérrala y reintenta.')
        );
      request.onsuccess = () => {
        request.result.onversionchange = () => {
          request.result.close();
          database = null;
        };
        resolve(request.result);
      };
    }).catch((error) => {
      database = null;
      throw error;
    });
  return database;
}
async function operation(store, mode, action) {
  const db = await openLibrary();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode),
      request = action(tx.objectStore(store));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = tx.onabort = () =>
      reject(
        Error(
          'No se pudo guardar en la biblioteca local. Puede faltar espacio; descarga tus ejercicios y reintenta.'
        )
      );
  });
}
export const allExercises = () =>
  operation('exercises', 'readonly', (s) => s.getAll());
export const getExercise = (id) =>
  operation('exercises', 'readonly', (s) => s.get(id));
export async function createExercise(name, document) {
  const now = new Date().toISOString();
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 90)
    throw Error('Escribe un nombre de 1 a 90 caracteres');
  const record = {
    id: crypto.randomUUID(),
    updatedAt: now,
    document: document ?? {
      schema: EXERCISE_SCHEMA,
      name: name.trim(),
      createdAt: now,
      components: {}
    }
  };
  await insertExercise(record);
  return record;
}
export async function addComponent(id, tool, document) {
  return editExercise(id, (record, tx) => {
    if (record.archivedAt)
      throw Error(
        'El ejercicio está archivado. Restáuralo desde Mis ejercicios antes de añadir componentes.'
      );
    const previous = record.document.components[tool]?.document;
    record.document.components[tool] = {
      savedAt: new Date().toISOString(),
      document
    };
    if (
      new TextEncoder().encode(JSON.stringify(record.document)).length >
      MAX_BYTES
    )
      throw Error(
        'El conjunto superaría 50 MiB. El componente anterior se conserva; usa otro ejercicio.'
      );
    if (previous)
      keepRecovery(tx, tool, previous, {
        exerciseId: id,
        reason: 'Antes de actualizar el ejercicio · ' + record.document.name
      });
  });
}
export async function renameExercise(id, name) {
  name = validName(name);
  return editExercise(id, (record) => {
    record.document.name = name;
  });
}
export async function duplicateExercise(id, name) {
  const original = await getExercise(id);
  if (!original) throw Error('El ejercicio ya no está disponible');
  const document = structuredClone(original.document);
  document.name = validName(name);
  document.createdAt = new Date().toISOString();
  return createExercise(document.name, document);
}
export const archiveExercise = (id, archived) =>
  editExercise(id, (record) => {
    if (archived) record.archivedAt = new Date().toISOString();
    else delete record.archivedAt;
  });
export const removeComponent = (id, tool) =>
  editExercise(id, (record, tx) => {
    if (record.archivedAt)
      throw Error('Restaura primero el ejercicio archivado');
    const previous = record.document.components[tool]?.document;
    if (!previous) throw Error('Este componente ya no está en el ejercicio');
    keepRecovery(tx, tool, previous, {
      exerciseId: id,
      reason: 'Retirado del ejercicio · ' + record.document.name
    });
    delete record.document.components[tool];
  });
export const allRecoveries = () =>
  operation('recoveries', 'readonly', (s) => s.getAll());
export const getRecovery = (id) =>
  operation('recoveries', 'readonly', (s) => s.get(id));
export async function getActive(tool) {
  return (await operation('actives', 'readonly', (s) => s.get(tool)))?.document;
}
export const putActive = (tool, document) =>
  operation('actives', 'readwrite', (s) => s.put({ tool, document }));
export async function saveRecovery(tool, document, options = {}) {
  const db = await openLibrary();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['recoveries', 'recovery-index'], 'readwrite');
    const record = keepRecovery(tx, tool, document, options);
    tx.oncomplete = () => {
      notify();
      resolve(record);
    };
    tx.onabort = tx.onerror = () =>
      reject(
        Error(
          'No se pudo conservar una copia persistente. La apertura se ha bloqueado.'
        )
      );
  });
}
function validName(name) {
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 90)
    throw Error('Escribe un nombre de 1 a 90 caracteres');
  return name.trim();
}
function exerciseSummary(record) {
  return {
    id: record.id,
    name: record.document.name,
    updatedAt: record.updatedAt,
    archivedAt: record.archivedAt ?? null,
    components: Object.fromEntries(
      Object.entries(record.document.components).map(([tool, entry]) => [
        tool,
        { name: entry.document.name, savedAt: entry.savedAt }
      ])
    )
  };
}
function recoverySummary(record) {
  const { document, ...metadata } = record;
  return { ...metadata, name: document.name };
}
export const listExercises = () =>
  operation('exercise-index', 'readonly', (s) => s.getAll());
export const listRecoveries = () =>
  operation('recovery-index', 'readonly', (s) => s.getAll());
const channel =
  typeof window !== 'undefined' && typeof BroadcastChannel === 'function'
    ? new BroadcastChannel('ab-suite.library.v1')
    : null;
channel?.addEventListener('message', () =>
  window.dispatchEvent(new Event('ab-suite:library-changed'))
);
function notify() {
  if (typeof window !== 'undefined')
    window.dispatchEvent(new Event('ab-suite:library-changed'));
  channel?.postMessage({ changed: true });
}
async function insertExercise(record) {
  const db = await openLibrary();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['exercises', 'exercise-index'], 'readwrite');
    tx.objectStore('exercises').add(record);
    tx.objectStore('exercise-index').add(exerciseSummary(record));
    tx.oncomplete = () => {
      notify();
      resolve();
    };
    tx.onerror = tx.onabort = () =>
      reject(
        Error(
          'No se pudo guardar el ejercicio. Comprueba el espacio disponible; el trabajo anterior se conserva.'
        )
      );
  });
}
function keepRecovery(tx, tool, document, options = {}) {
  const record = {
    id: crypto.randomUUID(),
    tool,
    document,
    at: new Date().toISOString(),
    ...options
  };
  tx.objectStore('recoveries').add(record);
  tx.objectStore('recovery-index').add(recoverySummary(record));
  return record;
}
async function editExercise(id, change) {
  const db = await openLibrary();
  return new Promise((resolve, reject) => {
    let failure =
      'No se pudo actualizar el ejercicio. Se conserva la versión anterior; comprueba el almacenamiento.';
    const tx = db.transaction(
        ['exercises', 'exercise-index', 'recoveries', 'recovery-index'],
        'readwrite'
      ),
      store = tx.objectStore('exercises'),
      request = store.get(id);
    request.onsuccess = () => {
      try {
        const record = request.result;
        if (!record) throw Error('El ejercicio ya no está disponible');
        change(record, tx);
        record.updatedAt = new Date().toISOString();
        store.put(record);
        tx.objectStore('exercise-index').put(exerciseSummary(record));
      } catch (error) {
        failure = error.message;
        tx.abort();
      }
    };
    tx.oncomplete = () => {
      notify();
      resolve();
    };
    tx.onabort = tx.onerror = () => reject(Error(failure));
  });
}
