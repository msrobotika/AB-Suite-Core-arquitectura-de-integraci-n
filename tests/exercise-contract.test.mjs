import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateExercise,
  validateComponent,
  parseExercise,
  EXERCISE_SCHEMA,
  MAX_BYTES
} from '../web/exercise-contract.js';
const at = '2026-10-24T12:00:00.000Z';
const kop = {
  schema: 1,
  name: 'Control propio',
  description: '',
  inputs: { BOTON: false },
  outputs: { PILOTO: false },
  rungs: [
    {
      id: 'R1',
      name: 'Piloto',
      operation: 'COIL',
      target: 'PILOTO',
      branches: [[{ kind: 'NO', variable: 'BOTON' }]]
    }
  ]
};
const documents = {
  kop,
  plc: {
    schema: 'ab.plc.document.v1',
    name: 'CPU propia',
    scenario: 'rack',
    program: { version: 1, name: 'CPU propia', rungs: [] }
  },
  scl: {
    schema: 'ab.scl.document.v1',
    name: 'Borrador',
    source: 'mi borrador todavía incompleto'
  },
  grafcet: {
    schema: 1,
    name: 'Secuencia',
    description: '',
    stages: [
      { id: 'E0', name: 'Inicio', initial: true, actions: [], x: 200, y: 120 }
    ],
    transitions: [],
    inputs: {}
  },
  scada: {
    schema: 'ab-suite.hmi.v1',
    name: 'Mi HMI',
    screens: [{ id: 'screen1', name: 'Principal', widgets: [] }]
  },
  vision: {
    schema: 'ab.vision.document.v1',
    name: 'Mi inspección',
    recipe: { mode: 'dark', threshold: 120, minArea: 5, maxDefects: 0 },
    sourceName: '',
    image: null,
    roi: null
  },
  serial: {
    schema: 'ab.serial.document.v1',
    name: 'Mi captura',
    live: true,
    state: { events: [], count: 0, errors: 0, rx_bytes: 0 }
  },
  modbus: {
    schema: 'ab.modbus.document.v1',
    name: 'Lectura',
    profile: {
      name: 'Mi conexión',
      host: '127.0.0.1',
      port: 0,
      unit: 1,
      function: 3,
      address: 0,
      count: 8,
      timeout_ms: 2000
    },
    frames: [],
    reading: {
      at: Date.now(),
      result: {
        function: 3,
        address: 0,
        values: [17],
        host: '127.0.0.1',
        port: 1502,
        unit: 1,
        transaction: 1,
        elapsed_ms: 1
      }
    }
  },
  bi: {
    format: 'AB-BI Project',
    version: 3,
    name: 'Mis datos',
    tables: { Sensores: [{ valor: 17 }] },
    relationships: [],
    measures: { Filas: 'COUNTROWS(Sensores)' },
    visuals: [],
    filters: {}
  }
};
const exercise = () => ({
  schema: EXERCISE_SCHEMA,
  name: 'Mi ejercicio',
  createdAt: at,
  components: Object.fromEntries(
    Object.entries(documents).map(([k, document]) => [
      k,
      { savedAt: at, document: structuredClone(document) }
    ])
  )
});
test('portable exercise validates nine complete documents with native validators and BI semantics', async () => {
  let calls = 0;
  const doc = await validateExercise(exercise(), {
    validateBI: async (model) => {
      calls++;
      assert.deepEqual(model.tables.Sensores, [{ valor: 17 }]);
    }
  });
  assert.equal(calls, 1);
  assert.equal(Object.keys(doc.components).length, 9);
  assert.equal(doc.components.serial.document.live, false);
  assert.equal(doc.components.modbus.document.reading.at, 0);
  assert.equal(exercise().components.serial.document.live, true);
  assert.notEqual(doc.components.kop.document, kop);
});
test('empty exercise is valid without opening tools or creating demos', async () => {
  assert.deepEqual(
    (
      await validateExercise({
        schema: EXERCISE_SCHEMA,
        name: 'Vacío',
        createdAt: at,
        components: {}
      })
    ).components,
    {}
  );
});
test('bad last component rejects the whole exercise before any caller can store it', async () => {
  const doc = exercise();
  doc.components.bi.document.tables = { Datos: [{ x: [] }] };
  await assert.rejects(
    validateExercise(doc, {
      validateBI: async () => {
        throw Error('Celda no escalar');
      }
    }),
    /BI: Celda no escalar/
  );
});
test('BI workspace pointers and unavailable semantics are rejected', async () => {
  await assert.rejects(
    validateComponent('bi', {
      schema: 'ab.bi.workspace.v1',
      name: 'Local',
      id: 'local'
    }),
    /proyecto completo/
  );
  await assert.rejects(validateComponent('bi', documents.bi), /motor BI/);
});
test('unknown tools, versions and runtime envelope fields cannot enter an exercise', async () => {
  const doc = exercise();
  doc.components.nueva = { savedAt: at, document: kop };
  await assert.rejects(validateExercise(doc), /Componentes/);
  await assert.rejects(
    validateExercise({ ...exercise(), schema: 'future' }),
    /incompatible/
  );
  await assert.rejects(
    validateComponent('plc', { ...documents.plc, token: 'private-session' }),
    /sesión/
  );
  await assert.rejects(
    validateComponent('vision', {
      ...documents.vision,
      password: 'private-camera'
    }),
    /sesión/
  );
  await assert.rejects(
    validateComponent('bi', { ...documents.bi, token: 'private-session' }),
    /sesión/
  );
});
test('native model errors are preserved with their tool name', async () => {
  const doc = exercise();
  doc.components.kop.document.rungs[0].target = 'NO_EXISTE';
  await assert.rejects(validateExercise(doc), /KOP:/);
});
test('dangerous object keys, deep nesting and nonfinite values are rejected', async () => {
  const doc = JSON.parse(
    JSON.stringify(documents.kop).replace(
      '"description":""',
      '"__proto__":{"polluted":true}'
    )
  );
  await assert.rejects(validateComponent('kop', doc), /Clave/);
  await assert.rejects(
    validateComponent('plc', { ...documents.plc, extra: Infinity }),
    /no finito/
  );
  let deep = {};
  for (let i = 0; i < 50; i++) deep = { next: deep };
  await assert.rejects(
    validateComponent('plc', { ...documents.plc, deep }),
    /anidado/
  );
  assert.equal({}.polluted, undefined);
});
test('JSON, size, timestamps and names have explicit bounds', async () => {
  await assert.rejects(parseExercise('{bad'), /JSON válido/);
  await assert.rejects(parseExercise(' '.repeat(MAX_BYTES + 1)), /50 MB/);
  await assert.rejects(
    validateExercise({ ...exercise(), createdAt: 'ayer' }),
    /fecha/
  );
  await assert.rejects(
    validateExercise({ ...exercise(), name: ' ' }),
    /Nombre/
  );
});
test('Vision validates PNG dimensions before decoding; invalid or oversized images are rejected', async () => {
  await assert.rejects(
    validateComponent('vision', {
      ...documents.vision,
      image: 'data:image/png;base64,AAAA'
    }),
    /PNG/
  );
  const bytes = Buffer.alloc(33);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes);
  bytes.write('IHDR', 12);
  bytes.writeUInt32BE(4096, 16);
  bytes.writeUInt32BE(4096, 20);
  await assert.rejects(
    validateComponent('vision', {
      ...documents.vision,
      image: 'data:image/png;base64,' + bytes.toString('base64')
    }),
    /millones/
  );
  await assert.rejects(
    validateComponent('vision', {
      ...documents.vision,
      roi: { x: 0, y: 0, width: 1, height: 1 }
    }),
    /necesita una imagen/
  );
});
test('Modbus value and capture bounds reject malformed rendering inputs', async () => {
  await assert.rejects(
    validateComponent('modbus', {
      ...documents.modbus,
      frames: [{ id: 1, time: {}, source: 'cliente' }]
    }),
    /Trama/
  );
  await assert.rejects(
    validateComponent('serial', {
      ...documents.serial,
      state: {
        events: [
          {
            id: 1,
            time: at,
            source: 'RX',
            hex: '01',
            length: 1,
            values: 'bad',
            valid: false,
            crc_ok: false,
            unit: null,
            function: null
          }
        ]
      }
    }),
    /Trama/
  );
  await assert.rejects(
    validateComponent('modbus', {
      ...documents.modbus,
      reading: { at: 100, result: { function: 3, address: 0, values: [{}] } }
    }),
    /Lectura/
  );
  await assert.rejects(
    validateComponent('serial', {
      ...documents.serial,
      state: { events: [{}] }
    }),
    /Trama/
  );
});
