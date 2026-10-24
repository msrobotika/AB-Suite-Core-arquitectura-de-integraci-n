import { FIGURES, drawFigure } from './figures.js';
import {
  blankProject,
  newWidget,
  validateProject,
  isAlarm,
  SIGNAL_TYPES
} from './hmi-model.js';
import { PREFIX, parseSnapshot, signalValue } from '/suite/signal-contract.js';
import { createResidentSource } from '/suite/resident-source.js';
const $ = (id) => document.getElementById(id),
  KEY = 'ab-suite:hmi-project:v1';
const el = (tag, text, cls) => {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
};
let zoom = 1,
  drag = null;
let project = validateProject(blankProject()),
  screenId,
  selected = null,
  preview = false,
  undo = [],
  redo = [];
const trends = new Map(),
  acks = new Set();
const resident = window.ABSuitePLC?.token
  ? createResidentSource({
      fetcher: window.fetch.bind(window),
      token: window.ABSuitePLC.token,
      onChange: () => updateValues()
    })
  : null;
resident?.start();
window.addEventListener('pagehide', (event) => {
  if (!event.persisted) resident?.stop();
});
let recoverError = '';
try {
  const raw = localStorage.getItem(KEY);
  if (raw) project = validateProject(JSON.parse(raw));
} catch {
  recoverError =
    'El proyecto guardado no es válido. Se mantiene en el almacenamiento hasta que guardes una edición nueva; puedes recuperarlo desde las herramientas del navegador.';
}
screenId = project.screens[0].id;
const screen = () =>
  project.screens.find((s) => s.id === screenId) ?? project.screens[0];
const widget = () => screen().widgets.find((w) => w.id === selected);
function notice(text, error = false) {
  $('hmi-notice').textContent = text;
  $('hmi-notice').classList.toggle('is-error', error);
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(project));
    $('save-state').textContent = 'Guardado en este navegador';
    return true;
  } catch {
    $('save-state').textContent = 'No se pudo guardar. Exporta tu proyecto.';
    notice(
      'Almacenamiento no disponible o lleno. Tu proyecto sigue en memoria: expórtalo para conservarlo.',
      true
    );
    return false;
  }
}
function mutate(fn, message) {
  const before = structuredClone(project);
  const previousScreen = screenId;
  const previousSelection = selected;
  try {
    fn(project);
    project = validateProject(project);
    undo.push(before);
    if (undo.length > 50) undo.shift();
    redo = [];
    const saved = save();
    render();
    notice(
      message +
        (saved
          ? ''
          : ' No se pudo guardar: exporta el proyecto para conservarlo.'),
      !saved
    );
  } catch (error) {
    project = before;
    screenId = previousScreen;
    selected = previousSelection;
    notice(error.message, true);
  }
}
function snapshots() {
  const result = {};
  for (const name of [
    'plc',
    'kop',
    'scl',
    'grafcet',
    'vision',
    'modbus',
    'serial',
    'bi'
  ]) {
    if (name === 'plc' && resident) {
      const current = resident.get();
      if (current) result.plc = current;
      continue;
    }
    try {
      const s = parseSnapshot(localStorage.getItem(PREFIX + name));
      if (s) result[name] = s;
    } catch {}
  }
  return result;
}
function options() {
  const source = $('widget-source').value,
    s = snapshots()[source],
    old = $('available-tags').value;
  const picker = $('available-tags');
  picker.replaceChildren(el('option', 'Seleccionar una señal…'));
  picker.firstChild.value = '';
  $('tag-names').replaceChildren();
  for (const key of Object.keys(s?.tags ?? {}).sort()) {
    const option = el('option', `${key} = ${s.tags[key]}`);
    option.value = key;
    picker.append(option);
    const data = el('option');
    data.value = key;
    $('tag-names').append(data);
  }
  picker.value = old;
}
function inspect() {
  const w = widget();
  $('properties').hidden = !w;
  if (!w) {
    $('selection-hint').hidden = false;
    return;
  }
  $('widget-label').value = w.label;
  $('widget-source').value = w.source;
  $('widget-tag').value = w.tag;
  $('widget-unit').value = w.unit;
  $('widget-threshold').value = w.threshold;
  $('widget-comparison').value = w.comparison;
  $('alarm-fields').hidden = w.type !== 'alarm';
  $('navigation-field').hidden = w.type !== 'navigation';
  $('widget-target-screen').replaceChildren();
  const none = el('option', 'Elige una pantalla…');
  none.value = '';
  $('widget-target-screen').append(none);
  for (const s of project.screens) {
    const o = el('option', s.name);
    o.value = s.id;
    $('widget-target-screen').append(o);
  }
  $('widget-target-screen').value = w.targetScreen ?? '';
  $('signal-fields').hidden = !SIGNAL_TYPES.includes(w.type);
  $('scale-fields').hidden = w.type !== 'tank';
  $('selection-hint').hidden = true;
  document.querySelector('.hmi-screen-properties').open = false;
  $('direction-field').hidden = !['line', 'pipe'].includes(w.type);
  $('widget-direction').value = w.direction;
  for (const k of [
    'x',
    'y',
    'width',
    'height',
    'fill',
    'stroke',
    'strokeWidth',
    'min',
    'max'
  ])
    $('widget-' + k).value = w[k];
  const i = screen().widgets.indexOf(w);
  $('move-up').disabled = i === 0;
  $('move-down').disabled = i === screen().widgets.length - 1;
  options();
}
function render() {
  if (!project.screens.some((s) => s.id === screenId))
    screenId = project.screens[0].id;
  $('project-name').value = project.name;
  $('screen-title').textContent = screen().name;
  $('screen-name').value = screen().name;
  for (const k of ['width', 'height', 'background'])
    $('screen-' + k).value = screen()[k];
  $('canvas-size').textContent = screen().width + ' × ' + screen().height;
  Object.assign($('canvas').style, {
    width: screen().width + 'px',
    height: screen().height + 'px',
    backgroundColor: screen().background
  });
  $('undo').disabled = !undo.length;
  $('redo').disabled = !redo.length;
  $('remove-screen').disabled =
    project.screens.length < 2 || Boolean(screen().widgets.length);
  $('screens').replaceChildren();
  for (const s of project.screens) {
    const b = el(
      'button',
      s.name + (s.widgets.length ? ' · ' + s.widgets.length : '')
    );
    b.type = 'button';
    b.setAttribute('aria-current', String(s.id === screenId));
    b.onclick = () => {
      screenId = s.id;
      selected = null;
      render();
    };
    $('screens').append(b);
  }
  $('canvas').replaceChildren();
  $('layers').replaceChildren();
  $('component-count').textContent = screen().widgets.length + ' componentes';
  if (!screen().widgets.length) {
    const empty = el('div', undefined, 'hmi-empty');
    empty.append(
      el('span', '＋'),
      el('h3', 'Aquí empieza tu pantalla.'),
      el(
        'p',
        preview
          ? 'Vuelve a Diseñar para añadir componentes.'
          : 'Añade figuras desde la biblioteca. Arrástralas, ajusta su tamaño y vincula tus señales.'
      )
    );
    $('canvas').append(empty);
  }
  for (const w of screen().widgets) {
    const card = el(
      'article',
      undefined,
      'hmi-widget' + (w.id === selected ? ' selected' : '')
    );
    card.dataset.widget = w.id;
    card.classList.toggle('figure', FIGURES.includes(w.type));
    card.tabIndex = 0;
    card.setAttribute('aria-label', w.label);
    place(card, w);
    const layer = el('button', w.label);
    layer.type = 'button';
    layer.dataset.widget = w.id;
    layer.setAttribute('aria-current', String(w.id === selected));
    layer.onclick = () => choose(w.id);
    $('layers').append(layer);
    card.onpointerdown = (e) => startDrag(e, w, card);
    card.onkeydown = (e) => {
      if (e.key === 'Enter' && e.target === card) {
        e.preventDefault();
        choose(w.id);
      }
    };
    const head = el('div', undefined, 'widget-head');
    head.append(el('strong', w.label));
    if (!preview) {
      const edit = el('button', 'Editar');
      edit.type = 'button';
      edit.setAttribute('aria-label', 'Editar ' + w.label);
      edit.onclick = () => {
        choose(w.id);
        $('widget-label').focus();
      };
      head.append(edit);
    }
    const content = el('div', undefined, 'widget-content'),
      signal = el(
        'p',
        `${w.source} / ${w.tag || 'Sin vincular'}`,
        'widget-signal'
      );
    card.append(head, content);
    if (w.type !== 'navigation') card.append(signal);
    if (!preview) {
      const handle = el('button', undefined, 'resize-handle');
      handle.type = 'button';
      handle.setAttribute('aria-label', 'Cambiar tamaño de ' + w.label);
      handle.title =
        'Arrastra para redimensionar; también puedes usar Ancho y Alto en el inspector';
      handle.onclick = () => {
        choose(w.id);
        $('widget-width').focus();
      };
      card.append(handle);
    }
    $('canvas').append(card);
  }
  document.body.classList.toggle('hmi-preview', preview);
  $('design-mode').setAttribute('aria-pressed', String(!preview));
  $('preview-mode').setAttribute('aria-pressed', String(preview));
  inspect();
  updateValues();
}
function updateValues() {
  const sources = snapshots();
  for (const w of screen().widgets) {
    const card = [...$('canvas').children].find(
      (e) => e.dataset.widget === w.id
    );
    if (!card) continue;
    const root = card.querySelector('.widget-content');
    const value = signalValue(sources, w.source, w.tag);
    card.title = SIGNAL_TYPES.includes(w.type)
      ? w.label +
        ' · ' +
        w.source +
        '/' +
        (w.tag || 'Sin vincular') +
        ' · ' +
        value.quality +
        (sources[w.source]?.at
          ? ' · ' + new Date(sources[w.source].at).toLocaleTimeString('es-ES')
          : '')
      : w.label;
    if (w.type === 'navigation') {
      if (root.children.length) continue;
      card.dataset.quality = 'static';
      const target = project.screens.find((s) => s.id === w.targetScreen),
        button = el('button', w.label + ' ↗', 'screen-navigation');
      button.type = 'button';
      button.disabled = !target;
      button.title = target
        ? 'Abrir ' + target.name
        : 'Configura una pantalla de destino en el inspector';
      button.onclick = () => {
        if (preview) {
          screenId = target.id;
          selected = null;
          render();
          fit();
          notice('Pantalla: ' + target.name);
        } else notice('Pulsa Probar para utilizar la navegación.');
      };
      root.append(button);
      continue;
    }
    const signature = JSON.stringify([
      value.quality,
      value.value,
      acks.has(w.id),
      w.type === 'trend' ? sources[w.source]?.at : null
    ]);
    if (card.dataset.signature === signature) continue;
    card.dataset.signature = signature;
    root.replaceChildren();
    card.dataset.quality = SIGNAL_TYPES.includes(w.type)
      ? value.quality
      : 'static';
    if (FIGURES.includes(w.type)) {
      root.append(drawFigure(w, value));
      continue;
    }
    if (value.quality !== 'good') {
      root.append(
        el('strong', '—', 'widget-reading'),
        el(
          'span',
          !w.tag
            ? 'Vincula una señal'
            : value.quality === 'stale'
              ? 'Señal caducada · origen sin actualizar'
              : w.source === 'plc' && resident
                ? 'CPU sin señal · comprueba el servicio de la suite'
                : 'Sin señal · abre el origen',
          'widget-quality'
        )
      );
      continue;
    }
    const v = value.value;
    if (w.type === 'indicator') {
      root.append(
        el('span', v ? '●' : '○', 'widget-indicator' + (v ? ' active' : '')),
        el('strong', v ? 'ACTIVA' : 'INACTIVA', 'widget-state')
      );
    } else if (w.type === 'value') {
      root.append(
        el(
          'strong',
          typeof v === 'boolean'
            ? v
              ? '1'
              : '0'
            : v.toLocaleString('es-ES', { maximumFractionDigits: 3 }),
          'widget-reading'
        ),
        el('span', w.unit, 'widget-unit')
      );
    } else if (w.type === 'alarm') {
      const active = isAlarm(w, v);
      if (!active) acks.delete(w.id);
      root.append(
        el(
          'strong',
          active ? '△ Umbral alcanzado' : '✓ Dentro del umbral',
          active ? 'alarm-active' : 'alarm-clear'
        )
      );
      root.append(
        el(
          'p',
          `${Number(v).toLocaleString('es-ES')} ${w.unit} · ${w.comparison === 'gte' ? '≥' : w.comparison === 'lte' ? '≤' : '='} ${w.threshold}`
        )
      );
      if (active) {
        const ack = el('button', acks.has(w.id) ? 'Reconocida' : 'Reconocer');
        ack.type = 'button';
        ack.disabled = acks.has(w.id);
        ack.onclick = () => {
          acks.add(w.id);
          updateValues();
        };
        root.append(ack);
      }
    } else if (w.type === 'trend') {
      const stamp = sources[w.source].at,
        key =
          w.id +
          ':' +
          w.source +
          ':' +
          w.tag +
          ':' +
          sources[w.source].instance;
      let history = trends.get(key) ?? [];
      if (history.at(-1)?.at !== stamp)
        history.push({ at: stamp, value: Number(v) });
      history = history.slice(-120);
      trends.set(key, history);
      if (trends.size > 120) trends.delete(trends.keys().next().value);
      const min = Math.min(...history.map((p) => p.value)),
        max = Math.max(...history.map((p) => p.value)),
        range = Math.max(max - min, 1);
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 400 100');
      svg.setAttribute('role', 'img');
      svg.setAttribute(
        'aria-label',
        `${w.label}: mínimo ${min}, máximo ${max}, ${history.length} muestras`
      );
      const line = document.createElementNS(svg.namespaceURI, 'polyline');
      line.setAttribute(
        'points',
        history
          .map(
            (p, i) =>
              `${5 + (i / Math.max(history.length - 1, 1)) * 390},${90 - ((p.value - min) / range) * 80}`
          )
          .join(' ')
      );
      line.setAttribute('fill', 'none');
      line.setAttribute('stroke', 'currentColor');
      line.setAttribute('stroke-width', '2');
      svg.append(line);
      root.append(
        el(
          'strong',
          Number(v).toLocaleString('es-ES') + ' ' + w.unit,
          'trend-value'
        ),
        svg,
        el(
          'small',
          `Mín ${min.toLocaleString('es-ES')} · Máx ${max.toLocaleString('es-ES')} · ${history.length} muestras · ${history.length > 1 ? Math.round((stamp - history[0].at) / 1000) : 0} s`
        )
      );
    }
  }
}
$('project-name').onchange = (e) =>
  mutate((p) => {
    p.name = e.target.value.trim();
  }, 'Nombre de proyecto actualizado.');
document.querySelectorAll('[data-type]').forEach((button) => {
  button.onclick = () =>
    mutate(() => {
      const w = newWidget(button.dataset.type);
      if (w.type === 'navigation')
        w.targetScreen =
          project.screens.find((s) => s.id !== screenId)?.id ?? '';
      const i = screen().widgets.length,
        columns = Math.max(1, Math.floor((screen().width - 80) / 240));
      w.x = Math.min(40 + (i % columns) * 240, screen().width - w.width);
      w.y = Math.min(
        40 + Math.floor(i / columns) * 180,
        screen().height - w.height
      );
      screen().widgets.push(w);
      selected = w.id;
      document
        .querySelector('.hmi-layout')
        .classList.remove('properties-hidden');
      $('toggle-properties').setAttribute('aria-expanded', 'true');
      if (innerWidth <= 1100) {
        document.querySelector('.hmi-layout').classList.add('library-hidden');
        $('toggle-library').setAttribute('aria-expanded', 'false');
      }
    }, 'Componente añadido. Selecciona su origen y señal en el inspector.');
});
$('add-screen').onclick = () =>
  mutate((p) => {
    const s = {
      id: crypto.randomUUID(),
      name: 'Pantalla ' + (p.screens.length + 1),
      width: 1600,
      height: 1000,
      background: '#101c2a',
      widgets: []
    };
    p.screens.push(s);
    screenId = s.id;
    selected = null;
  }, 'Pantalla creada.');
$('rename-screen').onclick = () =>
  mutate(() => {
    screen().name = $('screen-name').value.trim();
    for (const k of ['width', 'height'])
      screen()[k] = Number($('screen-' + k).value);
    screen().background = $('screen-background').value;
  }, 'Pantalla renombrada.');
$('remove-screen').onclick = () =>
  mutate((p) => {
    if (p.screens.length < 2 || screen().widgets.length)
      throw Error(
        'Solo se pueden eliminar pantallas vacías cuando hay otra pantalla'
      );
    p.screens = p.screens.filter((s) => s.id !== screenId);
    screenId = p.screens[0].id;
  }, 'Pantalla vacía eliminada. Puedes deshacer.');
$('properties').onsubmit = (e) => {
  e.preventDefault();
  mutate(() => {
    Object.assign(widget(), {
      label: $('widget-label').value.trim(),
      source: $('widget-source').value,
      tag: $('widget-tag').value.trim(),
      unit: $('widget-unit').value,
      threshold: Number($('widget-threshold').value),
      comparison: $('widget-comparison').value
    });
    for (const k of ['x', 'y', 'width', 'height', 'strokeWidth', 'min', 'max'])
      widget()[k] = Number($('widget-' + k).value);
    if (widget().type === 'navigation')
      widget().targetScreen = $('widget-target-screen').value;
    widget().direction = $('widget-direction').value;
    for (const k of ['fill', 'stroke']) widget()[k] = $('widget-' + k).value;
  }, 'Propiedades aplicadas.');
};
$('widget-source').onchange = options;
$('available-tags').onfocus = options;
$('available-tags').onchange = (e) => {
  $('widget-tag').value = e.target.value;
};
$('delete-widget').onclick = () =>
  mutate(() => {
    screen().widgets = screen().widgets.filter((w) => w.id !== selected);
    selected = null;
  }, 'Componente eliminado. Puedes deshacer.');
$('duplicate-widget').onclick = () =>
  mutate(() => {
    const copy = structuredClone(widget());
    copy.id = crypto.randomUUID();
    copy.label = copy.label.slice(0, 80) + ' · copia';
    copy.x = Math.min(copy.x + 20, screen().width - copy.width);
    copy.y = Math.min(copy.y + 20, screen().height - copy.height);
    screen().widgets.push(copy);
    selected = copy.id;
  }, 'Componente duplicado.');
for (const [button, delta] of [
  ['move-up', -1],
  ['move-down', 1]
])
  $(button).onclick = () =>
    mutate(() => {
      const items = screen().widgets,
        i = items.findIndex((w) => w.id === selected),
        j = i + delta;
      if (j < 0 || j >= items.length)
        throw Error('El componente ya está en ese extremo');
      [items[i], items[j]] = [items[j], items[i]];
    }, 'Orden actualizado.');
function history(direction) {
  const from = direction === 'undo' ? undo : redo,
    to = direction === 'undo' ? redo : undo;
  if (!from.length) return;
  to.push(structuredClone(project));
  project = from.pop();
  selected = null;
  const saved = save();
  render();
  notice(
    (direction === 'undo' ? 'Cambio deshecho.' : 'Cambio rehecho.') +
      (saved ? '' : ' No se pudo guardar: exporta el proyecto.'),
    !saved
  );
}
$('undo').onclick = () => history('undo');
$('redo').onclick = () => history('redo');
$('preview-mode').onclick = () => {
  preview = true;
  render();
  fit();
  notice(
    'Vista previa: comprueba tu pantalla con la CPU residente y las fuentes conectadas.'
  );
};
$('design-mode').onclick = () => {
  preview = false;
  render();
  fit();
  notice('Diseño: selecciona un componente para modificarlo.');
};
$('export-project').onclick = () => {
  const blob = new Blob([JSON.stringify(project, null, 2)], {
      type: 'application/json'
    }),
    url = URL.createObjectURL(blob),
    a = el('a');
  a.href = url;
  a.download =
    project.name.replace(/[^\p{L}\p{N}_ -]/gu, '').slice(0, 70) + '.hmi.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notice('Proyecto HMI exportado.');
};
$('import-project').onchange = async (e) => {
  try {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500000) throw Error('El proyecto supera 500 KB');
    const next = validateProject(JSON.parse(await file.text()));
    mutate(() => {
      project = next;
      screenId = project.screens[0].id;
      selected = null;
    }, 'Proyecto importado. Puedes deshacer para recuperar el anterior.');
  } catch (error) {
    notice('No se pudo importar: ' + error.message, true);
  } finally {
    e.target.value = '';
  }
};

function place(card, w) {
  Object.assign(card.style, {
    left: w.x + 'px',
    top: w.y + 'px',
    width: w.width + 'px',
    height: w.height + 'px',
    backgroundColor: w.fill,
    borderColor: w.stroke,
    borderWidth: w.strokeWidth + 'px'
  });
}
function choose(id) {
  selected = id;
  document.querySelector('.hmi-layout').classList.remove('properties-hidden');
  $('toggle-properties').setAttribute('aria-expanded', 'true');
  render();
}
function scale(value) {
  zoom = Math.min(2, Math.max(0.1, value));
  $('canvas').style.zoom = zoom;
  $('zoom-level').textContent = Math.round(zoom * 100) + ' %';
}
function fit() {
  const view = $('canvas-viewport'),
    padding = innerWidth <= 800 ? 32 : 60;
  scale(
    Math.min(
      (view.clientWidth - padding) / screen().width,
      (view.clientHeight - padding) / screen().height
    )
  );
}
function startDrag(e, w, card) {
  if (
    preview ||
    e.button !== 0 ||
    e.target.closest('button:not(.resize-handle)')
  )
    return;
  e.preventDefault();
  selected = w.id;
  for (const child of $('canvas').children)
    child.classList.toggle('selected', child.dataset.widget === w.id);
  for (const b of $('layers').children)
    b.setAttribute('aria-current', String(b.dataset.widget === w.id));
  inspect();
  drag = {
    id: w.id,
    startX: e.clientX,
    startY: e.clientY,
    before: { ...w },
    next: { ...w },
    resize: Boolean(e.target.closest('.resize-handle')),
    pointer: e.pointerId
  };
  card.setPointerCapture(e.pointerId);
  card.onpointermove = (event) => {
    if (!drag) return;
    const d = drag,
      step = $('snap-grid').checked ? 10 : 1,
      snap = (v) => Math.round(v / step) * step,
      dx = (event.clientX - d.startX) / zoom,
      dy = (event.clientY - d.startY) / zoom;
    if (d.resize) {
      d.next.width = Math.max(
        40,
        Math.min(screen().width - w.x, snap(d.before.width + dx))
      );
      d.next.height = Math.max(
        30,
        Math.min(screen().height - w.y, snap(d.before.height + dy))
      );
    } else {
      d.next.x = Math.max(
        0,
        Math.min(screen().width - w.width, snap(d.before.x + dx))
      );
      d.next.y = Math.max(
        0,
        Math.min(screen().height - w.height, snap(d.before.y + dy))
      );
    }
    place(card, d.next);
    for (const k of ['x', 'y', 'width', 'height'])
      $('widget-' + k).value = d.next[k];
  };
  card.onpointerup = (event) => {
    if (!drag || event.pointerId !== drag.pointer) return;
    const d = drag;
    drag = null;
    card.releasePointerCapture(event.pointerId);
    if (['x', 'y', 'width', 'height'].some((k) => d.next[k] !== d.before[k]))
      mutate(
        () => Object.assign(widget(), d.next),
        d.resize ? 'Tamaño actualizado.' : 'Posición actualizada.'
      );
    else render();
  };
  card.onpointercancel = () => {
    drag = null;
    render();
  };
}
for (const [id, cls] of [
  ['toggle-library', 'library-hidden'],
  ['toggle-properties', 'properties-hidden']
])
  $(id).onclick = () => {
    const hidden = document.querySelector('.hmi-layout').classList.toggle(cls);
    $(id).setAttribute('aria-expanded', String(!hidden));
  };
if (innerWidth <= 1100) {
  document.querySelector('.hmi-layout').classList.add('library-hidden');
  $('toggle-library').setAttribute('aria-expanded', 'false');
}
if (innerWidth <= 800) {
  document.querySelector('.hmi-layout').classList.add('properties-hidden');
  $('toggle-properties').setAttribute('aria-expanded', 'false');
}
$('zoom-in').onclick = () => scale(zoom + 0.1);
$('zoom-out').onclick = () => scale(zoom - 0.1);
$('fit-canvas').onclick = fit;
$('snap-grid').onchange = (e) =>
  $('canvas').classList.toggle('no-grid', !e.target.checked);
$('canvas').onpointerdown = (e) => {
  if (e.target === $('canvas') && !preview) {
    selected = null;
    render();
  }
};
document.addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (!preview) history(e.shiftKey ? 'redo' : 'undo');
    return;
  }
  if (preview || !widget()) return;
  if (e.key === 'Delete') {
    e.preventDefault();
    $('delete-widget').click();
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
    e.preventDefault();
    $('duplicate-widget').click();
  }
  const delta = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1]
  }[e.key];
  if (delta) {
    e.preventDefault();
    const n = e.shiftKey ? 10 : 1;
    mutate(() => {
      const w = widget();
      w.x = Math.max(0, Math.min(screen().width - w.width, w.x + delta[0] * n));
      w.y = Math.max(
        0,
        Math.min(screen().height - w.height, w.y + delta[1] * n)
      );
    }, 'Posición ajustada con teclado.');
  }
});
render();
fit();
new ResizeObserver(() => {
  if (!drag) fit();
}).observe($('canvas-viewport'));
if (recoverError) notice(recoverError, true);
else if (screen().widgets.length)
  notice(
    'Proyecto recuperado: ' +
      project.name +
      '. Selecciona un objeto o pulsa Probar.'
  );
setInterval(updateValues, 750);

window.ABSuite?.register({
  documents: {
    get: () => structuredClone(project),
    create: (name) =>
      mutate(() => {
        project = validateProject(blankProject());
        project.name = name;
        screenId = project.screens[0].id;
        selected = null;
        preview = false;
      }, 'Proyecto HMI nuevo y vacío.'),
    restore: (doc) => {
      const next = validateProject(doc);
      mutate(() => {
        project = next;
        screenId = next.screens[0].id;
        selected = null;
        preview = false;
      }, 'Proyecto HMI recuperado.');
    }
  },
  arrange: (kind) => {
    if (!widget()) throw Error('Selecciona un objeto');
    mutate(() => {
      const w = widget();
      if (kind === 'center-x') w.x = Math.round((screen().width - w.width) / 2);
      if (kind === 'center-y')
        w.y = Math.round((screen().height - w.height) / 2);
    }, 'Objeto centrado.');
  }
});
