/** Transactional browser library. Quota/permission errors never fall back to silent memory-only saves. MIT. */
import { EXERCISE_SCHEMA, MAX_BYTES } from './exercise-contract.js';
let database;
export function openLibrary() {
  if (!database)
    database = new Promise((resolve, reject) => {
      const request = indexedDB.open('ab-suite-exercises', 2);
      request.onupgradeneeded = () => {
        for (const [name, keyPath] of [
          ['exercises', 'id'],
          ['recoveries', 'id'],
          ['actives', 'tool']
        ])
          if (!request.result.objectStoreNames.contains(name))
            request.result.createObjectStore(name, { keyPath });
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
  await operation('exercises', 'readwrite', (s) => s.add(record));
  return record;
}
export async function addComponent(id, tool, document) {
  const db = await openLibrary();
  return new Promise((resolve, reject) => {
    let failure =
      'No se pudo actualizar el ejercicio; el componente anterior se conserva. Comprueba espacio y selección.';
    const tx = db.transaction(['exercises', 'recoveries'], 'readwrite'),
      store = tx.objectStore('exercises'),
      request = store.get(id);
    request.onsuccess = () => {
      if (!request.result) {
        tx.abort();
        return;
      }
      const record = request.result,
        now = new Date().toISOString();
      const previous = record.document.components[tool]?.document;
      record.document.components[tool] = { savedAt: now, document };
      record.updatedAt = now;
      if (
        new TextEncoder().encode(JSON.stringify(record.document)).length >
        MAX_BYTES
      ) {
        failure =
          'El conjunto superaría 50 MiB. El componente anterior se conserva; usa otro ejercicio para estos datos.';
        tx.abort();
        return;
      }
      if (previous)
        tx.objectStore('recoveries').add({
          id: crypto.randomUUID(),
          tool,
          document: previous,
          at: now,
          reason: 'Antes de actualizar el ejercicio · ' + record.document.name
        });
      store.put(record);
    };
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () => reject(Error(failure));
  });
}
export const allRecoveries = () =>
  operation('recoveries', 'readonly', (s) => s.getAll());
export const getRecovery = (id) =>
  operation('recoveries', 'readonly', (s) => s.get(id));
export async function getActive(tool) {
  return (await operation('actives', 'readonly', (s) => s.get(tool)))?.document;
}
export const putActive = (tool, document) =>
  operation('actives', 'readwrite', (s) => s.put({ tool, document }));
export async function saveRecovery(tool, document) {
  const record = {
    id: crypto.randomUUID(),
    tool,
    at: new Date().toISOString(),
    document
  };
  await operation('recoveries', 'readwrite', (s) => s.add(record));
  return record;
}
