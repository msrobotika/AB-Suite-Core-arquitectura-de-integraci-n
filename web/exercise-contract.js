/** Portable exercises contain documents, never local workspace pointers. MIT. */
import * as kopModule from '../apps/kop/src/engine.js';
import * as grafcetModule from '../apps/grafcet/src/engine.js';
import * as visionModule from '../apps/vision/src/vision-core.js';
import { validateProgram } from '../apps/plc/src/plc-engine.js';
import { validateProject } from '../apps/scada/src/hmi-model.js';
const kop = kopModule.default ?? globalThis.ABKopEngine;
const grafcet = grafcetModule.default ?? globalThis.ABGrafcet;
const vision = visionModule.default ?? globalThis.ABVisionCore;
export const EXERCISE_SCHEMA = 'ab-suite.exercise.v1';
export const MAX_BYTES = 50 * 1024 * 1024;
export const TOOL_IDS = [
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
const object = (x) => x && typeof x === 'object' && !Array.isArray(x);
const ensure = (ok, message) => {
  if (!ok) throw Error(message);
};
const text = (x, max) => typeof x === 'string' && x.length <= max;
const integer = (x, a, b) => Number.isInteger(x) && x >= a && x <= b;
const date = (x) => typeof x === 'string' && Number.isFinite(Date.parse(x));
function safeTree(value, depth = 0) {
  ensure(depth <= 48, 'Documento demasiado anidado');
  if (typeof value === 'number')
    ensure(Number.isFinite(value), 'Número no finito');
  if (!value || typeof value !== 'object') return;
  for (const [key, next] of Object.entries(value)) {
    ensure(
      !['__proto__', 'prototype', 'constructor'].includes(key),
      'Clave de objeto no permitida'
    );
    safeTree(next, depth + 1);
  }
}
function fields(doc, allowed) {
  ensure(
    Object.keys(doc).every((k) => allowed.includes(k)),
    'El documento contiene campos desconocidos o datos de sesión'
  );
}
function frames(items) {
  ensure(
    Array.isArray(items) && items.length <= 500 && items.every(object),
    'Máximo 500 tramas archivadas'
  );
}
function pngSize(data) {
  ensure(
    text(data, 24000000) &&
      /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(data),
    'Imagen PNG incompatible'
  );
  const bytes = Uint8Array.from(atob(data.split(',')[1].slice(0, 48)), (c) =>
    c.charCodeAt(0)
  );
  ensure(
    bytes.length >= 24 &&
      [137, 80, 78, 71, 13, 10, 26, 10].every((x, i) => bytes[i] === x) &&
      String.fromCharCode(...bytes.slice(12, 16)) === 'IHDR',
    'Cabecera PNG inválida'
  );
  const view = new DataView(bytes.buffer),
    width = view.getUint32(16),
    height = view.getUint32(20);
  ensure(
    integer(width, 1, 4096) &&
      integer(height, 1, 4096) &&
      width * height <= 2000000,
    'Imagen: máximo 2 millones de píxeles'
  );
  return { width, height };
}
export async function validateComponent(tool, original, { validateBI } = {}) {
  ensure(
    TOOL_IDS.includes(tool) && object(original),
    'Herramienta o documento incompatible'
  );
  safeTree(original);
  const doc = structuredClone(original);
  ensure(
    text(doc.name, 100) && doc.name.trim(),
    'El documento necesita un nombre'
  );
  if (tool === 'kop') {
    fields(doc, [
      'schema',
      'name',
      'description',
      'inputs',
      'outputs',
      'rungs'
    ]);
    kop.validate(doc);
  } else if (tool === 'grafcet') {
    fields(doc, [
      'schema',
      'name',
      'description',
      'stages',
      'transitions',
      'inputs'
    ]);
    grafcet.validateModel(doc);
  } else if (tool === 'plc') {
    fields(doc, ['schema', 'name', 'scenario', 'program']);
    ensure(
      doc.schema === 'ab.plc.document.v1' &&
        ['rack', 'conveyor', 'tank'].includes(doc.scenario),
      'Documento PLC incompatible'
    );
    validateProgram(doc.program);
  } else if (tool === 'scada') {
    fields(doc, ['schema', 'name', 'screens']);
    return validateProject(doc);
  } else if (tool === 'scl') {
    fields(doc, ['schema', 'name', 'source']);
    ensure(
      doc.schema === 'ab.scl.document.v1' && text(doc.source, 50000),
      'Documento SCL incompatible'
    );
  } else if (tool === 'vision') {
    fields(doc, [
      'schema',
      'name',
      'recipe',
      'sourceName',
      'image',
      'referenceImage',
      'roi',
      'metrology'
    ]);
    ensure(
      doc.schema === 'ab.vision.document.v1' &&
        (doc.image === null || typeof doc.image === 'string'),
      'Documento Vision incompatible'
    );
    doc.recipe = vision.validateRecipe(doc.recipe);
    if (doc.sourceName !== undefined)
      ensure(text(doc.sourceName, 500), 'Nombre de fuente demasiado largo');
    if (doc.image) {
      const size = pngSize(doc.image);
      if (typeof createImageBitmap === 'function') {
        const binary = atob(doc.image.split(',')[1]);
        const bitmap = await createImageBitmap(
          new Blob([Uint8Array.from(binary, (c) => c.charCodeAt(0))], {
            type: 'image/png'
          })
        );
        try {
          ensure(
            bitmap.width === size.width && bitmap.height === size.height,
            'Dimensiones PNG incompatibles'
          );
        } finally {
          bitmap.close();
        }
      }
      if (doc.roi)
        ensure(
          ['x', 'y', 'width', 'height'].every((k) =>
            integer(doc.roi[k], k === 'x' || k === 'y' ? 0 : 1, 4096)
          ) &&
            doc.roi.x + doc.roi.width <= size.width &&
            doc.roi.y + doc.roi.height <= size.height,
          'Región fuera de la imagen'
        );
      if (doc.referenceImage) {
        const referenceSize = pngSize(doc.referenceImage);
        ensure(
          referenceSize.width === size.width &&
            referenceSize.height === size.height,
          'Referencia de distinto tamaño'
        );
        if (typeof createImageBitmap === 'function') {
          const binary = atob(doc.referenceImage.split(',')[1]);
          const bitmap = await createImageBitmap(
            new Blob([Uint8Array.from(binary, (c) => c.charCodeAt(0))], {
              type: 'image/png'
            })
          );
          bitmap.close();
        }
      }
    } else
      ensure(
        !doc.roi && !doc.referenceImage,
        'La región o referencia necesita una imagen'
      );
    if (doc.metrology) {
      fields(doc.metrology, [
        'referenceMm',
        'distanceMm',
        'nominalWidthMm',
        'nominalHeightMm',
        'toleranceMm',
        'threshold'
      ]);
      ensure(
        Object.values(doc.metrology).every(
          (x) =>
            typeof x === 'number' &&
            Number.isFinite(x) &&
            x >= 0 &&
            x <= 1000000
        ),
        'Parámetros de medida inválidos'
      );
    }
  } else if (tool === 'modbus') {
    fields(doc, ['schema', 'name', 'profile', 'frames', 'reading']);
    ensure(
      doc.schema === 'ab.modbus.document.v1' && object(doc.profile),
      'Documento Modbus incompatible'
    );
    fields(doc.profile, [
      'name',
      'host',
      'port',
      'unit',
      'function',
      'address',
      'count',
      'timeout_ms'
    ]);
    ensure(
      text(doc.profile.host, 253) &&
        text(doc.profile.name, 100) &&
        integer(doc.profile.port, 0, 65535) &&
        integer(doc.profile.unit, 0, 255) &&
        [1, 2, 3, 4].includes(doc.profile.function) &&
        integer(doc.profile.address, 0, 65535) &&
        integer(doc.profile.count, 1, doc.profile.function < 3 ? 2000 : 125) &&
        doc.profile.address + doc.profile.count <= 65536 &&
        integer(doc.profile.timeout_ms, 1, 60000),
      'Configuración Modbus inválida'
    );
    frames(doc.frames);
    if (doc.reading) {
      const r = doc.reading.result;
      ensure(
        object(r) &&
          [1, 2, 3, 4].includes(r.function) &&
          integer(r.address, 0, 65535) &&
          Array.isArray(r.values) &&
          r.values.length <= (r.function < 3 ? 2000 : 125) &&
          r.values.every(
            (x) => typeof x === 'boolean' || integer(x, 0, 65535)
          ) &&
          Number.isFinite(doc.reading.at),
        'Lectura Modbus inválida'
      );
      // Archived data must never be presented as live telemetry after opening.
      doc.reading.at = 0;
    }
  } else if (tool === 'serial') {
    fields(doc, ['schema', 'name', 'live', 'state']);
    ensure(
      doc.schema === 'ab.serial.document.v1' && object(doc.state),
      'Documento Serial incompatible'
    );
    frames(doc.state.events);
    ensure(
      doc.state.events.every(
        (e) =>
          text(e.hex ?? '', 4096) &&
          text(e.detail ?? '', 4096) &&
          Number.isFinite(e.length) &&
          e.length >= 0
      ),
      'Trama Serial inválida'
    );
    doc.live = false;
    doc.state = {
      mode: 'detenido',
      device: 'Archivo',
      events: doc.state.events,
      count: doc.state.events.length,
      errors: doc.state.events.filter((e) => !e.valid).length,
      rx_bytes: doc.state.events.reduce((n, e) => n + e.length, 0)
    };
  } else if (tool === 'bi') {
    ensure(
      doc.format === 'AB-BI Project' &&
        doc.version === 3 &&
        object(doc.tables) &&
        !Object.hasOwn(doc, 'id') &&
        !Object.hasOwn(doc, 'workspace_id'),
      'BI necesita el proyecto completo, no un identificador local'
    );
    fields(doc, [
      'format',
      'version',
      'name',
      'tables',
      'relationships',
      'measures',
      'visuals',
      'filters',
      'column_schema',
      'cleaning_history',
      'suite_live'
    ]);
    ensure(
      typeof validateBI === 'function',
      'Inicia el motor BI para validar sus datos antes de continuar'
    );
    await validateBI(doc);
  }
  return doc;
}
export async function validateExercise(value, options) {
  ensure(
    object(value) && value.schema === EXERCISE_SCHEMA,
    'Formato .absuite incompatible'
  );
  fields(value, ['schema', 'name', 'createdAt', 'components']);
  ensure(
    text(value.name, 90) && value.name.trim() && date(value.createdAt),
    'Nombre o fecha del ejercicio inválidos'
  );
  ensure(
    object(value.components) && Object.keys(value.components).length <= 9,
    'Componentes de ejercicio inválidos'
  );
  const result = {
    schema: EXERCISE_SCHEMA,
    name: value.name.trim(),
    createdAt: value.createdAt,
    components: {}
  };
  for (const [tool, entry] of Object.entries(value.components)) {
    ensure(
      object(entry) && date(entry.savedAt),
      'Fecha del componente inválida'
    );
    fields(entry, ['savedAt', 'document']);
    try {
      result.components[tool] = {
        savedAt: entry.savedAt,
        document: await validateComponent(tool, entry.document, options)
      };
    } catch (error) {
      throw Error(tool.toUpperCase() + ': ' + error.message);
    }
  }
  ensure(
    new TextEncoder().encode(JSON.stringify(result)).length <= MAX_BYTES,
    'El ejercicio supera 50 MB'
  );
  return result;
}
export async function parseExercise(text, options) {
  ensure(
    typeof text === 'string' &&
      new TextEncoder().encode(text).length <= MAX_BYTES,
    'El ejercicio supera 50 MB'
  );
  let doc;
  try {
    doc = JSON.parse(text);
  } catch {
    throw Error('El archivo no contiene JSON válido');
  }
  return validateExercise(doc, options);
}
