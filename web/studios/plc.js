/** AB Suite · plc workbench extensions, using its native engine. MIT. */
import {
  $,
  byId,
  el,
  button,
  panel,
  table,
  download,
  error
} from './shared.js';
export async function mount(sdk) {
  const guide = $('.lab-onboarding');
  if (guide) {
    const details = el('details', undefined, 'ab-plc-guide');
    guide.before(details);
    details.append(el('summary', 'Guía de primera práctica'), guide);
  }
  const p = panel(
      'plc-watch-content',
      'Observación de variables',
      'Tu lista, conectada a la CPU residente. Las entradas se modifican solo en el bastidor virtual. Los valores ausentes o sin conexión se muestran como desconocidos.'
    ),
    view = el('section');
  view.id = 'view-watch';
  view.className = 'view';
  view.hidden = true;
  view.append(p);
  $('.main-content').append(view);
  const nav = button('◉ Observación', 'plc-watch-open', () =>
    window.dispatchEvent(
      new CustomEvent('ab-suite:plc-view', { detail: 'watch' })
    )
  );
  nav.dataset.view = 'watch';
  $('.sidebar .nav').append(nav);
  const tools = el('div', undefined, 'ab-table-tools'),
    tags = el('select');
  tags.id = 'watch-tag';
  tags.setAttribute('aria-label', 'Variable de la CPU');
  const format = el('select');
  format.id = 'watch-format';
  format.setAttribute('aria-label', 'Formato de lectura');
  for (const [v, t] of [
    ['decimal', 'Decimal'],
    ['hex', 'Hexadecimal'],
    ['binary', 'Binario']
  ]) {
    const o = el('option', t);
    o.value = v;
    format.append(o);
  }
  const add = button('Añadir variable', 'watch-add'),
    step = button('Ejecutar 1 ciclo', 'watch-step'),
    status = el('p'),
    out = el('div');
  status.id = 'watch-status';
  out.id = 'watch-results';
  tools.append(tags, format, add, step);
  p.append(tools, status, out);
  let watch = [],
    current = null,
    lastSignature = '';
  try {
    watch = JSON.parse(localStorage.getItem('ab-suite:watch:plc') || '[]');
    if (!Array.isArray(watch)) watch = [];
    watch = watch.filter((x) => typeof x === 'string').slice(0, 24);
  } catch {}
  const store = () => {
    try {
      localStorage.setItem('ab-suite:watch:plc', JSON.stringify(watch));
    } catch {
      status.textContent = 'La lista solo está en memoria.';
    }
  };
  async function request(body) {
    const response = await fetch(
      '/apps/plc/api/live/' + (body ? 'command' : 'state'),
      {
        method: body ? 'POST' : 'GET',
        headers: {
          Authorization: 'Bearer ' + window.ABSuitePLC?.token,
          'Content-Type': 'application/json'
        },
        ...(body ? { body: JSON.stringify(body) } : {})
      }
    );
    const data = await response.json();
    if (!response.ok) throw Error(data.error || 'CPU no disponible');
    return data;
  }
  function values(data) {
    const f = data.snapshot,
      result = Object.fromEntries([
        ...['inputs', 'outputs', 'memory', 'analog'].flatMap((group) =>
          Object.entries(f.cpu[group] || {}).map(([tag, v]) => [
            group + '.' + tag,
            v
          ])
        ),
        ['scan', f.scan],
        ['simulatedMs', f.simulatedMs]
      ]);
    for (const tag of Object.keys(data.preparedInputs || {}))
      if (!Object.hasOwn(result, 'inputs.' + tag))
        result['inputs.' + tag] = undefined;
    function visit(node) {
      if (!node || typeof node !== 'object') return;
      for (const [key, value] of Object.entries(node)) {
        if (
          ['tag', 'target'].includes(key) &&
          typeof value === 'string' &&
          /^[IQM]\d+\.\d+$/.test(value)
        ) {
          const group =
              value[0] === 'I'
                ? 'inputs'
                : value[0] === 'Q'
                  ? 'outputs'
                  : 'memory',
            name = group + '.' + value;
          if (!Object.hasOwn(result, name)) result[name] = undefined;
        } else if (value && typeof value === 'object') visit(value);
      }
    }
    visit(data.program);
    return result;
  }
  function draw() {
    out.replaceChildren();
    if (!watch.length) {
      out.append(
        el(
          'p',
          'Añade las variables que quieres observar. Esta lista no altera el programa.',
          'ab-empty'
        )
      );
      return;
    }
    const data = current ? values(current) : {};
    out.append(
      table(
        ['Variable', 'Último ciclo', 'Preparado', 'Estado', 'Acción'],
        watch.map((tag) => {
          const value = data[tag],
            display =
              value === undefined
                ? '—'
                : typeof value === 'boolean'
                  ? value
                    ? 'TRUE · 1'
                    : 'FALSE · 0'
                  : format.value === 'hex' && Number.isInteger(value)
                    ? '0x' + value.toString(16).toUpperCase()
                    : format.value === 'binary' && Number.isInteger(value)
                      ? value.toString(2)
                      : value,
            actions = el('div'),
            prepared = tag.startsWith('inputs.')
              ? current?.preparedInputs?.[tag.slice(7)]
              : undefined;
          if (typeof prepared === 'boolean') {
            actions.append(
              button(prepared ? 'Poner a 0' : 'Poner a 1', null, async () => {
                try {
                  await request({
                    command: 'input',
                    tag: tag.slice(7),
                    value: !prepared
                  });
                  await update();
                } catch (err) {
                  error(status, err);
                }
              })
            );
          }
          actions.append(
            button('Quitar', null, () => {
              watch = watch.filter((x) => x !== tag);
              store();
              draw();
            })
          );
          return [
            tag,
            display,
            typeof prepared === 'boolean'
              ? prepared
                ? 'TRUE · 1'
                : 'FALSE · 0'
              : '—',
            current && value !== undefined ? 'Actual' : 'Sin ciclo / sin señal',
            actions
          ];
        })
      )
    );
  }
  async function update() {
    try {
      current = await request();
      status.textContent =
        'CPU ' +
        current.snapshot.mode +
        ' · ciclo ' +
        current.snapshot.scan +
        ' · ' +
        new Date().toLocaleTimeString('es-ES');
      const data = values(current),
        signature = Object.keys(data).join('|');
      if (signature !== lastSignature) {
        lastSignature = signature;
        const old = tags.value;
        tags.replaceChildren();
        for (const name of Object.keys(data)) {
          const o = el('option', name);
          tags.append(o);
        }
        if (Object.hasOwn(data, old)) tags.value = old;
      }
      if (!out.contains(document.activeElement)) draw();
    } catch (err) {
      current = null;
      error(status, err);
      draw();
    }
  }
  add.onclick = () => {
    if (!tags.value) return;
    if (watch.length >= 24) return error(status, Error('Máximo 24 variables'));
    if (!watch.includes(tags.value)) {
      watch.push(tags.value);
      store();
      draw();
    }
  };
  format.onchange = draw;
  step.onclick = async () => {
    try {
      await request({ command: 'step' });
      await update();
    } catch (err) {
      error(status, err);
    }
  };
  await update();
  const timer = setInterval(() => {
    if (!document.hidden) update();
  }, 1000);
  window.addEventListener('pagehide', () => clearInterval(timer));
  const collapse = button('Paneles', 'plc-toggle-tools', () =>
    document.body.classList.toggle('plc-tools-closed')
  );
  $('.heading-actions').prepend(collapse);
  document.body.classList.add('plc-studio');
}
