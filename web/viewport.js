/** A bounded application window. Controls stay beside the document; lists/canvases may pan. MIT. */
const $ = (s) => document.querySelector(s);
const node = (tag, text, cls) => {
  const n = document.createElement(tag);
  if (text) n.textContent = text;
  if (cls) n.className = cls;
  return n;
};
function accordion(parent, selected = 0) {
  if (!parent) return;
  const parts = [...parent.children].filter(
    (n) => n.tagName === 'DETAILS' && !n.classList.contains('viewport-pinned')
  );
  if (!parts.length) return;
  parts.forEach((part, i) => {
    part.open = i === selected;
    part.addEventListener('toggle', () => {
      if (part.open)
        for (const other of parts) if (other !== part) other.open = false;
    });
  });
  parent.classList.add('viewport-accordion');
}
function tasks(parent, entries, name) {
  const select = node('select');
  select.className = 'viewport-task';
  select.setAttribute('aria-label', name);
  const panels = entries.filter(([, p]) => p);
  for (const [label] of panels) {
    const o = node('option', label);
    o.value = String(select.options.length);
    select.append(o);
  }
  const activate = () =>
    panels.forEach(
      ([, panel], i) => (panel.hidden = i !== Number(select.value))
    );
  select.onchange = activate;
  parent.prepend(select);
  activate();
  return select;
}
const id = window.ABSuite.id;
document.body.classList.add('viewport-app');
const style = node('link');
style.rel = 'stylesheet';
style.href = '/suite/viewport.css';
const styled = new Promise((resolve, reject) => {
  style.onload = resolve;
  style.onerror = () => reject(Error('Workspace layout could not load'));
});
document.head.append(style);
for (const rail of document.querySelectorAll(
  '.ab-dock:not(.vision-workspace .ab-dock)'
))
  accordion(
    rail,
    id === 'scl' && rail.classList.contains('ab-properties') ? 1 : 0
  );
accordion($('#kop-tools'));
if ($('#library>details')) {
  $('#library>details').classList.add('viewport-pinned');
  $('#library>details').open = true;
}
accordion($('#library'));
if (id === 'scada') {
  const form = $('#properties'),
    geometry = node('section', null, 'viewport-widget-design'),
    signals = node('section', null, 'viewport-widget-data');
  const grid = form.querySelector(':scope>.property-grid');
  if (grid) geometry.append(grid);
  if ($('#direction-field')) geometry.append($('#direction-field'));
  if ($('#signal-fields')) signals.append($('#signal-fields'));
  if ($('#scale-fields')) signals.append($('#scale-fields'));
  form.insertBefore(geometry, form.querySelector('button[type=submit]'));
  form.insertBefore(signals, geometry);
  const select = tasks(
    form,
    [
      ['Señales y escala', signals],
      ['Geometría y estilo', geometry]
    ],
    'Propiedades del componente'
  );
  const update = () => {
    const available = !$('#signal-fields').hidden || !$('#scale-fields').hidden;
    select.options[0].disabled = !available;
    select.value = available ? '0' : '1';
    select.dispatchEvent(new Event('change'));
  };
  new MutationObserver(update).observe($('#signal-fields'), {
    attributes: true,
    attributeFilter: ['hidden']
  });
  new MutationObserver(update).observe($('#scale-fields'), {
    attributes: true,
    attributeFilter: ['hidden']
  });
  update();
}
if (id === 'kop') {
  const audit = $('#project .diagnostic');
  if (audit) {
    const d = node('details');
    d.append(node('summary', 'Auditoría de lógica'), audit);
    $('#project .project-grid').append(d);
  }
}
if (id === 'modbus') {
  const actions = $('#read-form .actions');
  if (actions) {
    $('#read').setAttribute('form', 'read-form');
    $('.ab-actions').prepend(actions);
  }
  const fields = $('#read-form .fields');
  if (fields) fields.classList.add('viewport-compact-fields');
  const memory = $('#simulador > details');
  if (memory)
    memory.addEventListener('toggle', () =>
      $('#simulador').classList.toggle('editing-memory', memory.open)
    );
}
if (id === 'scl' && $('#export-report'))
  $('.ab-actions').append($('#export-report'));
if (id === 'plc') {
  const dashboard = $('.lab-dashboard');
  if (dashboard) {
    const root = node('div', null, 'plc-window'),
      center = node('section', null, 'plc-stage'),
      side = node('aside', null, 'plc-controls');
    const scene = $('.lab-scene-panel'),
      io = $('#lab-io')?.closest('section'),
      faults = $('#lab-fault-controls')?.closest('section'),
      files = $('#lab-import-program')?.closest('section'),
      registers = $('#lab-register-table')?.closest('section');
    const hardware = node('section', null, 'panel plc-hardware');
    hardware.append(node('h2', 'CPU y módulos de E/S'));
    if ($('#lab-rack-panel')) hardware.append($('#lab-rack-panel'));
    const trend = node('section', null, 'panel plc-trend');
    trend.append(node('h2', 'Histórico de proceso'));
    if ($('#lab-sample-count')) trend.append($('#lab-sample-count'));
    if ($('#lab-trend')) trend.append($('#lab-trend'));
    const log = node('section', null, 'panel plc-event-log');
    log.append(node('h2', 'Registro de ejecución'));
    if ($('#lab-events')) log.append($('#lab-events'));
    const guide = node('section', null, 'panel plc-practice');
    if ($('.ab-plc-guide')) guide.append($('.ab-plc-guide'));
    for (const part of [scene, hardware, trend, log, registers])
      if (part) center.append(part);
    tasks(
      center,
      [
        ['Proceso', scene],
        ['Hardware', hardware],
        ['Tendencia', trend],
        ['Registro', log],
        ['Registros Modbus', registers]
      ],
      'Vista de la CPU'
    );
    if (io) {
      const headings = io.querySelectorAll('.lab-panel-head');
      if (headings[0]) headings[0].remove();
    }
    for (const part of [io, faults, files, guide]) if (part) side.append(part);
    tasks(
      side,
      [
        ['Entradas / salidas', io],
        ['Fallos y forzados', faults],
        ['Archivos y telemetría', files],
        ['Guía de práctica', guide]
      ],
      'Controles de la CPU'
    );
    root.append(center, side);
    const controller = $('.lab-controlpanel');
    if (controller) {
      controller.classList.add('plc-command');
      const bar = $('.lab-controlbar');
      if (bar) controller.prepend(bar);
      const scenario = $('#lab-scenario');
      if (scenario) controller.append(scenario);
    }
    const old = [...dashboard.children];
    dashboard.replaceChildren();
    const overview = old.find((n) => n.classList.contains('lab-overview'));
    if (overview) dashboard.append(overview);
    if (controller) dashboard.append(controller);
    dashboard.append(root);
    // Keep native diagnostic nodes mounted for the same CPU renderer, out of the editor window.
    const archive = node('div');
    archive.hidden = true;
    for (const n of old) if (!dashboard.contains(n)) archive.append(n);
    dashboard.append(archive);
  }
}
if (id === 'bi') {
  const model = $('#view-model');
  if (model) {
    const panels = [...model.children].filter((n) =>
      n.classList.contains('panel')
    );
    if (panels.length === 3) {
      const window = node('div', null, 'bi-model-window'),
        diagram = node('section', null, 'bi-model-document');
      diagram.append(panels[0], panels[1]);
      window.append(diagram, panels[2]);
      model.append(window);
    }
  }
  const reference = $('#view-measures details');
  if (reference) {
    const label = reference.querySelector('summary').textContent,
      dialog = node('dialog', null, 'suite-guide');
    dialog.setAttribute('aria-label', label);
    const close = node('button', 'Cerrar ×', 'suite-action');
    close.type = 'button';
    close.onclick = () => dialog.close();
    const open = node('button', label, 'btn outline');
    open.type = 'button';
    open.onclick = () => dialog.showModal();
    reference.replaceWith(open);
    $('#view-measures .editor-panel>.section-header').append(open);
    dialog.append(close, node('h2', label), reference);
    reference.open = true;
    reference.querySelector('summary').hidden = true;
    document.body.append(dialog);
  }
  const clean = $('.clean-layout');
  if (clean) {
    const parts = [...clean.children];
    if (parts.length > 1) {
      clean.classList.add('viewport-clean');
      tasks(
        clean,
        parts.map((p, i) => [
          ['Transformación', 'Receta', 'Vista previa'][i] || 'Resultado',
          p
        ]),
        'Paso de preparación'
      );
    }
  }
  const quick = $('#quickstart');
  if (quick) quick.open = false;
}
await styled;
window.ABSuite.viewportReady = true;
