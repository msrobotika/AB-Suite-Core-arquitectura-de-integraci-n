/** Original educational HMI contract. No fixed factory, no eval. MIT. */
export const HMI_SCHEMA = 'ab-suite.hmi.v1';
export const SIGNAL_TYPES = [
  'indicator',
  'value',
  'trend',
  'alarm',
  'tank',
  'pump',
  'valve',
  'motor'
];
export const TYPES = [
  ...SIGNAL_TYPES,
  'rectangle',
  'ellipse',
  'line',
  'text',
  'pipe',
  'navigation'
];
export const LABELS = {
  indicator: 'Indicador digital',
  value: 'Valor de señal',
  trend: 'Tendencia',
  alarm: 'Alarma de umbral',
  tank: 'Depósito',
  pump: 'Bomba',
  valve: 'Válvula',
  motor: 'Motor',
  rectangle: 'Rectángulo',
  ellipse: 'Elipse',
  line: 'Línea',
  text: 'Texto',
  pipe: 'Tubería',
  navigation: 'Cambiar pantalla'
};
export function geometry(type, index = 0) {
  return {
    x: 40 + (index % 5) * 240,
    y: 40 + Math.floor(index / 5) * 155,
    width:
      type === 'line' || type === 'pipe' ? 220 : type === 'text' ? 220 : 200,
    height:
      type === 'line' || type === 'pipe'
        ? 40
        : type === 'text' || type === 'navigation'
          ? 60
          : 160,
    fill: '#243747',
    stroke: '#77dfc7',
    strokeWidth: 2,
    min: 0,
    max: 100,
    direction: type === 'line' ? 'diagonal' : 'horizontal'
  };
}
const sources = [
  'plc',
  'kop',
  'scl',
  'grafcet',
  'vision',
  'modbus',
  'serial',
  'bi'
];
const assert = (ok, message) => {
  if (!ok) throw Error(message);
};
export function blankProject() {
  return {
    schema: HMI_SCHEMA,
    name: 'Mi primer panel',
    screens: [{ id: crypto.randomUUID(), name: 'Pantalla 1', widgets: [] }]
  };
}
export function newWidget(type) {
  assert(TYPES.includes(type), 'Tipo de componente desconocido');
  return {
    id: crypto.randomUUID(),
    type,
    label: LABELS[type],
    source: 'plc',
    tag: '',
    unit: '',
    threshold: 1,
    comparison: 'gte',
    targetScreen: '',
    ...geometry(type)
  };
}
export function validateProject(p) {
  p = structuredClone(p);
  assert(p && p.schema === HMI_SCHEMA, 'Formato HMI incompatible');
  assert(
    typeof p.name === 'string' &&
      p.name.trim().length > 0 &&
      p.name.length <= 90,
    'Nombre de proyecto: 1–90 caracteres'
  );
  assert(
    Array.isArray(p.screens) && p.screens.length >= 1 && p.screens.length <= 12,
    'Se requieren entre 1 y 12 pantallas'
  );
  const ids = new Set();
  let count = 0;
  const id = (x) => {
    assert(
      typeof x === 'string' && /^[\w-]{1,80}$/.test(x) && !ids.has(x),
      'Identificador duplicado o inválido'
    );
    ids.add(x);
  };
  for (const screen of p.screens) {
    id(screen.id);
    assert(
      typeof screen.name === 'string' &&
        screen.name.trim() &&
        screen.name.length <= 60,
      'Nombre de pantalla: 1–60 caracteres'
    );
    assert(
      Array.isArray(screen.widgets) && screen.widgets.length <= 30,
      'Máximo 30 componentes por pantalla'
    );
    screen.width ??= 1600;
    screen.height ??= 1000;
    screen.background ??= '#101c2a';
    assert(
      Number.isInteger(screen.width) &&
        screen.width >= 640 &&
        screen.width <= 3840 &&
        Number.isInteger(screen.height) &&
        screen.height >= 400 &&
        screen.height <= 2160,
      'Pantalla: ancho 640–3840 y alto 400–2160'
    );
    assert(
      /^#[0-9a-f]{6}$/i.test(screen.background),
      'Color de fondo inválido'
    );
    screen.widgets.forEach((w, i) => {
      const defaults = geometry(w.type, i);
      for (const [key, value] of Object.entries(defaults)) w[key] ??= value;
      for (const key of [
        'x',
        'y',
        'width',
        'height',
        'strokeWidth',
        'min',
        'max'
      ])
        assert(
          typeof w[key] === 'number' && Number.isFinite(w[key]),
          'Geometría o escala no finita'
        );
      assert(
        w.x >= 0 &&
          w.y >= 0 &&
          w.width >= 40 &&
          w.height >= 30 &&
          w.x + w.width <= screen.width &&
          w.y + w.height <= screen.height,
        'El componente debe caber en el lienzo (mínimo 40 × 30)'
      );
      assert(
        ['horizontal', 'vertical', 'diagonal'].includes(w.direction),
        'Dirección de línea no admitida'
      );
      assert(
        w.strokeWidth >= 1 && w.strokeWidth <= 12 && w.min < w.max,
        'Trazo 1–12 y escala mínima menor que máxima'
      );
      assert(
        /^#[0-9a-f]{6}$/i.test(w.fill) && /^#[0-9a-f]{6}$/i.test(w.stroke),
        'Color de componente inválido'
      );
    });
    for (const w of screen.widgets) {
      if (w.type === 'navigation') {
        w.targetScreen ??= '';
        assert(
          w.targetScreen === '' ||
            p.screens.some((s) => s.id === w.targetScreen),
          'La pantalla de destino no existe'
        );
      }
      count++;
      id(w.id);
      assert(TYPES.includes(w.type), 'Componente no admitido');
      assert(
        typeof w.label === 'string' && w.label.trim() && w.label.length <= 90,
        'Título de componente inválido'
      );
      assert(sources.includes(w.source), 'Origen de señal desconocido');
      assert(
        typeof w.tag === 'string' &&
          (w.tag === '' || /^[A-Za-z0-9_.:-]{1,100}$/.test(w.tag)),
        'Nombre de señal inválido'
      );
      assert(
        typeof w.unit === 'string' && w.unit.length <= 20,
        'Unidad demasiado larga'
      );
      assert(
        typeof w.threshold === 'number' && Number.isFinite(w.threshold),
        'Umbral no finito'
      );
      assert(
        ['gte', 'lte', 'eq'].includes(w.comparison),
        'Comparación desconocida'
      );
    }
  }
  assert(count <= 120, 'Máximo 120 componentes en el proyecto');
  return structuredClone(p);
}
export function isAlarm(w, value) {
  const number = typeof value === 'boolean' ? Number(value) : value;
  return w.comparison === 'gte'
    ? number >= w.threshold
    : w.comparison === 'lte'
      ? number <= w.threshold
      : number === w.threshold;
}
