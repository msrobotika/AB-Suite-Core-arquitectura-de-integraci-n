/* SPDX-License-Identifier: MIT · MS ROBOTIKA · Browser-only Ladder editor. */
(() => {
  'use strict';
  const E = window.ABKopEngine,
    $ = (id) => document.getElementById(id),
    STORE = 'ab-kop-studio-model-v1';
  const blankKop = (name = 'Mi programa Ladder') => ({
    schema: 1,
    name,
    description: '',
    inputs: { I0: false },
    outputs: { Q0: false },
    rungs: []
  });
  let model = blankKop(),
    state = E.initial(model),
    selected = null,
    running = null,
    storageFailed = false,
    inputsDirty = false,
    events = [],
    undo = [],
    redo = [],
    timeline = [];
  const allSymbols = () => [
    ...Object.keys(model.inputs),
    ...Object.keys(model.outputs),
    ...model.rungs
      .filter((r) => r.operation === 'TON')
      .map((r) => r.target + '_DONE')
  ];
  const el = (tag, text, cls) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = String(text);
    if (cls) node.className = cls;
    return node;
  };
  const cl = () => JSON.parse(JSON.stringify(model));
  const take = () => ({ model: cl(), selected });
  const msg = (text, err = false) => {
    const n = $('notice');
    n.textContent =
      text +
      (storageFailed
        ? ' · No se pudo guardar localmente: exporta el proyecto JSON.'
        : '');
    n.classList.toggle('error', err || storageFailed);
  };
  function log(message) {
    events.unshift({
      time: new Date().toISOString(),
      scan: state.scan,
      message
    });
    if (events.length > 250) events.length = 250;
    renderEvents();
  }
  function store() {
    try {
      localStorage.setItem(STORE, JSON.stringify(model));
      storageFailed = false;
    } catch (_) {
      storageFailed = true;
    }
  }
  function stop() {
    if (running !== null) {
      clearInterval(running);
      running = null;
      $('auto').textContent = '▷ Auto · 1s';
    }
  }
  function resetSilent() {
    inputsDirty = false;
    state = E.initial(model);
    timeline = [];
  }
  function edit(mutator, description) {
    const before = take(),
      next = cl();
    try {
      mutator(next);
      E.validate(next);
      undo.push(before);
      if (undo.length > 40) undo.shift();
      redo = [];
      model = next;
      resetSilent();
      stop();
      store();
      render();
      log('Edición: ' + description);
      msg(description + '. Simulación reiniciada.');
      return true;
    } catch (e) {
      selected = before.selected;
      msg('Edición rechazada: ' + e.message, true);
      return false;
    }
  }
  function makeButton(title, click, cls = 'btn') {
    const b = el('button', title, cls);
    b.type = 'button';
    b.addEventListener('click', click);
    return b;
  }
  function select(id) {
    selected = id;
    renderRungs();
    renderInspector();
  }
  function activeSignals() {
    const x = Object.assign(Object.create(null), model.inputs, state.outputs);
    for (const [k, v] of Object.entries(state.timers)) x[k + '_DONE'] = v.done;
    return x;
  }
  function symbolSVG(kind) {
    const ns = 'http://www.w3.org/2000/svg',
      svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 70 36');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(ns, 'path');
    path.setAttribute(
      'd',
      kind === 'NO' || kind === 'NC'
        ? 'M0 18H23 M23 5V31 M47 5V31 M47 18H70' +
            (kind === 'NC' ? ' M19 31L51 5' : '')
        : kind === 'TON'
          ? 'M2 2H68V34H2Z'
          : 'M0 18H20 M27 4Q10 18 27 32 M43 4Q60 18 43 32 M50 18H70'
    );
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('fill', 'none');
    svg.append(path);
    if (['SET', 'RESET', 'TON'].includes(kind)) {
      const text = document.createElementNS(ns, 'text');
      text.setAttribute('x', '35');
      text.setAttribute('y', '23');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', 'currentColor');
      text.setAttribute('font-size', kind === 'TON' ? '13' : '16');
      text.textContent = kind === 'SET' ? 'S' : kind === 'RESET' ? 'R' : 'TON';
      svg.append(text);
    }
    return svg;
  }
  function renderRungs() {
    const root = $('rungs');
    root.replaceChildren();
    if (!model.rungs.length) {
      const empty = el('section', undefined, 'kop-empty');
      empty.append(
        el('h2', 'Tu programa empieza aquí'),
        el(
          'p',
          'No hay redes ni lógica de ejemplo. Crea la primera red, define sus contactos y comprueba el resultado con Paso.'
        ),
        makeButton('Crear primera red', addRung)
      );
      root.append(empty);
    }
    const signals = activeSignals();
    for (const rung of model.rungs) {
      const tr = state.traces.find((t) => t.id === rung.id),
        trace = tr ? tr.branches : E.traceRung(rung, signals),
        live = tr ? tr.after : false;
      const card = el(
        'article',
        undefined,
        'rung' + (selected === rung.id ? ' selected' : '')
      );
      card.dataset.id = rung.id;
      card.dataset.power =
        tr && !inputsDirty ? (tr.energized ? 'on' : 'off') : 'pending';
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute(
        'aria-label',
        'Editar red ' + rung.id + ' ' + rung.name
      );
      card.addEventListener('click', () => select(rung.id));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          select(rung.id);
        }
      });
      const head = el('div', undefined, 'rung-title');
      head.append(
        el('strong', rung.id + ' · ' + rung.name),
        el(
          'span',
          rung.branches.length > 1
            ? 'OR / ' + rung.branches.length + ' ramas'
            : 'Serie / AND'
        )
      );
      const power = el(
        'span',
        inputsDirty
          ? '◷ TRAZA PENDIENTE'
          : tr
            ? tr.energized
              ? '● CONDUCE'
              : '○ SIN PASO'
            : '○ SIN EJECUTAR',
        'network-power'
      );
      head.append(power);
      card.append(head);
      const circuit = el('div', undefined, 'ladder'),
        paths = el('div', undefined, 'paths');
      circuit.append(el('div', undefined, 'rail'));
      for (let i = 0; i < rung.branches.length; i++) {
        const branch = el('div', undefined, 'branch');
        let powered = true;
        branch.append(
          el('span', undefined, tr && !inputsDirty ? 'wire live' : 'wire')
        );
        for (let j = 0; j < rung.branches[i].length; j++) {
          const c = rung.branches[i][j],
            ok = trace[i].contacts[j].pass,
            component = el(
              'div',
              undefined,
              'contact' + (ok && powered && tr && !inputsDirty ? ' live' : '')
            );
          component.setAttribute(
            'title',
            `${c.kind} ${c.variable}: ${ok ? 'CERRADO' : 'ABIERTO'}`
          );
          component.append(symbolSVG(c.kind), el('span', c.variable, 'addr'));
          component.addEventListener('dblclick', () => {
            select(rung.id);
            document
              .querySelector('.kop-layout')
              .classList.remove('inspector-hidden');
            $('toggle-inspector').setAttribute('aria-expanded', 'true');
            $('c-var-' + i + '-' + j)?.focus();
          });
          powered = powered && ok;
          branch.append(
            component,
            el(
              'span',
              undefined,
              'wire' + (powered && tr && !inputsDirty ? ' live' : '')
            )
          );
        }
        paths.append(branch);
      }
      circuit.append(paths);
      const coilwrap = el('div', undefined, 'coil-wrap'),
        coil = el(
          'div',
          rung.operation === 'COIL'
            ? '( )'
            : rung.operation === 'TON'
              ? 'TON'
              : rung.operation === 'SET'
                ? '(S)'
                : '(R)',
          'coil' + (live ? ' live' : '')
        );
      coil.replaceChildren(symbolSVG(rung.operation));
      coilwrap.append(coil, el('div', rung.target, 'coil-name'));
      if (rung.operation === 'TON')
        coilwrap.append(
          el(
            'span',
            `${state.timers[rung.target]?.count || 0}/${rung.preset}`,
            'coil-name'
          )
        );
      circuit.append(coilwrap, el('div', undefined, 'rail'));
      card.append(circuit);
      root.append(card);
    }
    $('rung-count').textContent = model.rungs.length + ' redes';
    $('count-rungs').textContent = String(model.rungs.length).padStart(2, '0');
    $('count-timers').textContent = String(
      model.rungs.filter((r) => r.operation === 'TON').length
    ).padStart(2, '0');
  }
  function line(label, field, parent) {
    const l = el('label', label);
    if (field.id) l.htmlFor = field.id;
    parent.append(l, field);
    return field;
  }
  function input(id, value, attrs = {}) {
    const x = el('input');
    x.id = id;
    x.value = String(value);
    for (const [k, v] of Object.entries(attrs)) x.setAttribute(k, v);
    return x;
  }
  function selectField(id, values, value) {
    const x = el('select');
    x.id = id;
    for (const v of values) {
      const o = el('option', v);
      o.value = v;
      o.selected = value === v;
      x.append(o);
    }
    return x;
  }
  function renderInspector() {
    const root = $('inspector-content');
    root.replaceChildren();
    const rung = model.rungs.find((r) => r.id === selected);
    if (!rung) {
      root.append(el('p', 'Selecciona una red.'));
      return;
    }
    const form = el('form');
    form.id = 'inspector-form';
    const name = line(
      'Nombre de la red',
      input('edit-name', rung.name, { maxlength: 100 }),
      form
    );
    const op = line(
      'Tipo de bobina / operación',
      selectField('edit-op', ['COIL', 'SET', 'RESET', 'TON'], rung.operation),
      form
    );
    const target = line(
      'Destino',
      input('edit-target', rung.target, { maxlength: 32 }),
      form
    );
    const timer = line(
      'Preselección TON (ciclos)',
      input('edit-preset', rung.preset || 3, {
        type: 'number',
        min: 1,
        max: 3600
      }),
      form
    );
    timer.closest('form');
    timer.parentElement; // Preselección se valida al guardar.
    form.append(el('h3', 'Ramas y contactos'));
    const editBranches = [];
    rung.branches.forEach((branch, i) => {
      const box = el('div', undefined, 'branch-edit'),
        hd = el('div', undefined, 'branch-edit-head');
      hd.append(el('span', 'Rama ' + (i + 1) + ' (serie: AND)'));
      if (rung.branches.length > 1)
        hd.append(
          makeButton(
            'Quitar rama',
            () =>
              edit((m) => {
                m.rungs.find((r) => r.id === selected).branches.splice(i, 1);
              }, 'Rama eliminada'),
            'small-btn'
          )
        );
      box.append(hd);
      branch.forEach((contact, j) => {
        const row = el('div', undefined, 'contact-row'),
          kind = selectField(`c-kind-${i}-${j}`, ['NO', 'NC'], contact.kind),
          variable = selectField(
            `c-var-${i}-${j}`,
            allSymbols(),
            contact.variable
          );
        row.append(
          kind,
          variable,
          makeButton(
            '×',
            () =>
              edit((m) => {
                const b = m.rungs.find((r) => r.id === selected).branches[i];
                if (b.length > 1) b.splice(j, 1);
                else throw Error('Debe quedar al menos un contacto por rama.');
              }, 'Contacto eliminado'),
            'small-btn'
          )
        );
        box.append(row);
        editBranches.push({ i, j, kind, variable });
      });
      box.append(
        makeButton(
          '＋ Contacto en serie',
          () =>
            edit((m) => {
              m.rungs
                .find((r) => r.id === selected)
                .branches[
                  i
                ].push({ kind: 'NO', variable: Object.keys(model.inputs)[0] || Object.keys(model.outputs)[0] });
            }, 'Contacto añadido'),
          'small-btn'
        )
      );
      form.append(box);
    });
    const actions = el('div', undefined, 'side-actions');
    actions.append(
      makeButton('Guardar cambios', () => form.requestSubmit(), 'btn primary'),
      makeButton('＋ Paralelo', () => addBranch(), 'btn light'),
      makeButton('Eliminar red', () => removeRung(), 'btn subtle')
    );
    form.append(actions);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      edit(
        (m) => {
          const r = m.rungs.find((r) => r.id === selected);
          r.name = name.value.trim();
          r.operation = op.value;
          r.target = target.value.trim().toUpperCase();
          r.preset = Number(timer.value);
          for (const v of editBranches) {
            const c = r.branches[v.i][v.j];
            c.kind = v.kind.value;
            c.variable = v.variable.value;
          }
        },
        'Red ' + selected + ' actualizada'
      );
    });
    root.append(form);
    const definitions = el('div', undefined, 'signal-editor');
    definitions.append(el('h3', 'Añadir una señal'));
    const type = selectField('new-type', ['Entrada', 'Salida'], 'Entrada'),
      symbol = input('new-signal', '', {
        placeholder: 'SENSOR_NUEVO',
        maxlength: 32
      }),
      row = el('div', undefined, 'side-row');
    const a = el('div'),
      b = el('div');
    line('Tipo', type, a);
    line('Nombre', symbol, b);
    row.append(a, b);
    definitions.append(
      row,
      makeButton(
        '＋ Añadir señal',
        () => {
          const v = symbol.value.trim().toUpperCase();
          edit(
            (m) => {
              if (!/^[A-Z][A-Z0-9_]{0,31}$/.test(v))
                throw Error('Identificador inválido. Usa A-Z, 0-9 y _.');
              if (Object.hasOwn(m.inputs, v) || Object.hasOwn(m.outputs, v))
                throw Error('La señal ya existe.');
              m[type.value === 'Entrada' ? 'inputs' : 'outputs'][v] = false;
            },
            'Señal ' + v + ' añadida'
          );
        },
        'btn light'
      )
    );
    root.append(definitions);
  }
  function renderInputs() {
    const target = $('inputs');
    target.replaceChildren();
    for (const [k, v] of Object.entries(model.inputs)) {
      const btn = el('button', undefined, 'input-item' + (v ? ' active' : ''));
      btn.type = 'button';
      btn.setAttribute('aria-pressed', String(v));
      btn.append(el('strong', k), el('span', v ? 'ON · 1' : 'OFF · 0'));
      btn.addEventListener('click', () => {
        model.inputs[k] = !v;
        inputsDirty = true;
        store();
        render(true);
        log('Entrada ' + k + ' = ' + (model.inputs[k] ? '1' : '0'));
        msg('Entrada ' + k + ' modificada; pulsa «Ejecutar 1 ciclo».');
      });
      target.append(btn);
    }
  }
  function renderOutputs() {
    const target = $('outputs');
    target.replaceChildren();
    for (const [k, v] of Object.entries(state.outputs))
      target.append(
        el('span', (v ? '● ' : '○ ') + k, 'output' + (v ? ' on' : ''))
      );
    for (const [k, v] of Object.entries(state.timers))
      target.append(
        el(
          'span',
          `◷ ${k} ${v.count} ciclos · DONE=${v.done ? '1' : '0'}`,
          'output' + (v.done ? ' on' : '')
        )
      );
  }
  function renderTrace() {
    const root = $('trace-list');
    root.replaceChildren();
    if (!state.traces.length) {
      root.append(
        el('div', 'Ejecuta un ciclo para ver las señales por red.', 'hint')
      );
      return;
    }
    for (const t of state.traces) {
      const row = el(
          'div',
          undefined,
          'trace-row' + (t.energized ? ' live' : '')
        ),
        left = el('b', t.id + ' · ' + t.target),
        right = el(
          'span',
          (t.energized ? 'CONDUCE' : 'SIN PASO') +
            ' → ' +
            (t.after ? 'ON' : 'OFF') +
            (t.count !== null ? ' · TON ' + t.count : '')
        );
      row.append(left, right);
      root.append(row);
    }
  }
  function renderEvents() {
    const root = $('events');
    root.replaceChildren();
    for (const e of events.slice(0, 25)) {
      const row = el('div', undefined, 'event-row');
      row.append(el('strong', 'C' + e.scan), el('span', e.message));
      root.append(row);
    }
  }
  function renderDiagnostics() {
    const root = $('diagnostic-list');
    root.replaceChildren();
    try {
      E.validate(model);
      root.append(el('div', '✓ Estructura y referencias válidas', 'check'));
      root.append(el('div', '✓ Operaciones y contactos compatibles', 'check'));
      root.append(el('div', '✓ Sin escritura en PLC físico', 'check'));
      const problems = E.diagnostics(model);
      for (const issue of problems)
        root.append(el('div', '⚠ ' + issue, 'issue'));
      if (!problems.length)
        root.append(el('div', '✓ Sin advertencias de orden de redes', 'check'));
    } catch (e) {
      root.append(el('div', '✕ ' + e.message, 'issue'));
    }
  }
  function renderMetrics() {
    const active = Object.values(state.outputs).filter(Boolean).length;
    $('count-outputs').textContent = String(active).padStart(2, '0');
    $('outputs-label').textContent = active
      ? Object.entries(state.outputs)
          .filter(([, v]) => v)
          .map(([k]) => k)
          .slice(0, 2)
          .join(', ')
      : 'Sin señales activas';
    $('status').textContent =
      running !== null
        ? 'RUN · 1 s'
        : state.status === 'ready'
          ? 'LISTO'
          : 'CICLO COMPLETO';
    $('scan-label').textContent = 'Ciclo ' + state.scan;
    $('back').disabled = !timeline.length;
    $('step').disabled = $('auto').disabled = !model.rungs.length;
    if (!model.rungs.length) $('status').textContent = 'SIN PROGRAMA';
    for (const id of [
      'add-contact',
      'add-branch',
      'rung-copy',
      'rung-up',
      'rung-down'
    ])
      if ($(id)) $(id).disabled = !model.rungs.some((r) => r.id === selected);
  }
  function render(keepInspector = false) {
    $('kop-undo').disabled = !undo.length;
    $('kop-redo').disabled = !redo.length;
    renderRungs();
    if (!keepInspector) renderInspector();
    renderInputs();
    renderOutputs();
    renderTrace();
    renderEvents();
    renderMetrics();
    renderDiagnostics();
    $('project-name').value = model.name;
    $('description').value = model.description || '';
  }
  function step() {
    try {
      timeline.push({
        state: JSON.parse(JSON.stringify(state)),
        inputs: { ...model.inputs }
      });
      if (timeline.length > 200) timeline.shift();
      state = E.scan(model, state);
      inputsDirty = false;
      render(true);
      log(
        'Exploración ' +
          state.scan +
          ': ' +
          Object.entries(state.outputs)
            .filter(([, v]) => v)
            .map(([k]) => k)
            .join(', ')
      );
      $('sim-message').textContent =
        `Ciclo ${state.scan} ejecutado. ${state.traces.filter((t) => t.energized).length} redes conducen; ${Object.values(state.outputs).filter(Boolean).length} bobinas activas.`;
      msg('Ciclo ' + state.scan + ' completado sin conexión a hardware.');
    } catch (e) {
      stop();
      msg(e.message, true);
    }
  }
  function back() {
    stop();
    if (!timeline.length) return;
    const old = timeline.pop();
    state = old.state;
    inputsDirty = false;
    model.inputs = old.inputs;
    render(true);
    log('Restaurado ciclo ' + state.scan);
    $('sim-message').textContent =
      'Ciclo anterior restaurado, incluidas las entradas.';
  }
  function reset() {
    stop();
    resetSilent();
    render(true);
    log('Simulación reiniciada');
    $('sim-message').textContent =
      'Estado inicial restaurado; entradas conservadas.';
  }
  function addRung() {
    edit((m) => {
      let i = 1;
      while (m.rungs.some((r) => r.id === 'R' + i)) i++;
      const id = 'R' + i;
      const target =
        Object.keys(m.outputs).find(
          (key) => !m.rungs.some((r) => r.target === key)
        ) || 'Q_' + id;
      m.outputs[target] = false;
      const variable = Object.keys(m.inputs)[0] || target;
      m.rungs.push({
        id,
        name: 'Nueva red',
        operation: 'COIL',
        target,
        branches: [[{ kind: 'NO', variable }]]
      });
      selected = id;
    }, 'Nueva red añadida');
  }
  function addContact() {
    const r = model.rungs.find((r) => r.id === selected);
    if (!r) return;
    edit(
      (m) =>
        m.rungs
          .find((r) => r.id === selected)
          .branches[0].push({
            kind: 'NO',
            variable:
              Object.keys(model.inputs)[0] || Object.keys(model.outputs)[0]
          }),
      'Contacto añadido'
    );
  }
  function addBranch() {
    const r = model.rungs.find((r) => r.id === selected);
    if (!r) return;
    edit(
      (m) =>
        m.rungs
          .find((r) => r.id === selected)
          .branches.push([
            {
              kind: 'NO',
              variable:
                Object.keys(model.inputs)[0] || Object.keys(model.outputs)[0]
            }
          ]),
      'Rama paralela añadida'
    );
  }
  function removeRung() {
    edit((m) => {
      m.rungs = m.rungs.filter((r) => r.id !== selected);
      selected = m.rungs[0]?.id ?? null;
    }, 'Red eliminada');
  }
  function save(name, body, mime) {
    const blob = new Blob([body], { type: mime }),
      url = URL.createObjectURL(blob),
      a = el('a');
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  const escapeHtml = (v) =>
    String(v ?? '').replace(
      /[&<>"']/g,
      (c) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
        })[c]
    );
  function exportSvg() {
    const ns = 'http://www.w3.org/2000/svg',
      svg = document.createElementNS(ns, 'svg'),
      width = Math.max(
        1200,
        280 +
          Math.max(
            ...model.rungs.flatMap((r) => r.branches.map((b) => b.length))
          ) *
            140
      ),
      height =
        130 + model.rungs.reduce((a, r) => a + r.branches.length * 90 + 70, 0);
    for (const [k, v] of Object.entries({
      xmlns: ns,
      width,
      height,
      viewBox: `0 0 ${width} ${height}`
    }))
      svg.setAttribute(k, v);
    const add = (tag, attrs, text) => {
      const n = document.createElementNS(ns, tag);
      for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
      if (text !== undefined) n.textContent = text;
      svg.append(n);
      return n;
    };
    const line = (x1, y1, x2, y2) =>
      add('line', { x1, y1, x2, y2, stroke: '#7991a7', 'stroke-width': 2 });
    const text = (x, y, value, size = 13) =>
      add(
        'text',
        {
          x,
          y,
          fill: '#d7e3ed',
          'font-size': size,
          'font-family': 'Consolas,monospace'
        },
        value
      );
    add('rect', { width, height, fill: '#101c26' });
    text(30, 40, 'AB / KOP STUDIO · ' + model.name, 22);
    text(
      30,
      68,
      'Esquema del proyecto · TON en ciclos · sin estado de ejecución',
      12
    );
    let y = 110;
    for (const r of model.rungs) {
      text(30, y, r.id + ' · ' + r.name);
      y += 30;
      const top = y,
        bottom = y + (r.branches.length - 1) * 90,
        middle = (top + bottom) / 2,
        join = width - 220;
      line(40, top - 18, 40, bottom + 18);
      line(join, top, join, bottom);
      line(join, middle, width - 40, middle);
      line(width - 40, top - 18, width - 40, bottom + 18);
      for (const br of r.branches) {
        line(40, y, join, y);
        br.forEach((c, i) => {
          const x = 90 + i * 140;
          add('rect', {
            x: x - 5,
            y: y - 18,
            width: 80,
            height: 36,
            fill: '#101c26'
          });
          const symbol = symbolSVG(c.kind);
          symbol.setAttribute('x', x);
          symbol.setAttribute('y', y - 18);
          symbol.setAttribute('width', 70);
          symbol.setAttribute('height', 36);
          symbol.setAttribute('color', '#a9bfd0');
          svg.append(symbol);
          text(x - 3, y - 27, c.variable, 11);
        });
        y += 90;
      }
      add('rect', {
        x: width - 170,
        y: middle - 20,
        width: 70,
        height: 40,
        fill: '#101c26'
      });
      const coil = symbolSVG(r.operation);
      for (const [k, v] of Object.entries({
        x: width - 170,
        y: middle - 18,
        width: 70,
        height: 36,
        color: '#77dfc7'
      }))
        coil.setAttribute(k, v);
      svg.append(coil);
      text(width - 180, middle - 28, r.target, 12);
      if (r.operation === 'TON')
        text(width - 180, middle + 42, 'PT ' + r.preset + ' ciclos', 11);
      y += 70;
    }
    save(
      'AB-KOP-esquema.svg',
      new XMLSerializer().serializeToString(svg),
      'image/svg+xml;charset=utf-8'
    );
  }
  function report() {
    const rows = model.rungs
      .map(
        (r) =>
          `<tr><td>${escapeHtml(r.id)}</td><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.branches.map((b) => b.map((c) => c.kind + ' ' + c.variable).join(' AND ')).join(' OR '))}</td><td>${escapeHtml(r.operation + ' ' + r.target)}</td></tr>`
      )
      .join('');
    const body = `<!doctype html><html lang="es"><meta charset="utf-8"><title>Informe AB-KOP</title><style>body{font:14px Segoe UI,Arial;margin:35px;color:#142934}h1{color:#0b7a69}table{border-collapse:collapse;width:100%}th,td{padding:9px;border:1px solid #aec7cf;text-align:left}th{background:#e1f2ec}small{color:#647984}</style><h1>Informe de lógica Ladder / KOP</h1><p><b>Proyecto:</b> ${escapeHtml(model.name)}</p><p>${escapeHtml(model.description)}</p><p><b>Entradas:</b> ${escapeHtml(Object.keys(model.inputs).join(', '))}</p><p><b>Salidas:</b> ${escapeHtml(Object.keys(model.outputs).join(', '))}</p><table><thead><tr><th>Red</th><th>Función</th><th>Contactos (DNF)</th><th>Salida</th></tr></thead><tbody>${rows}</tbody></table><h2>Limitaciones</h2><p>SOLO SIMULACIÓN. El orden de exploración es significativo; TON avanza por ciclos de prueba, no milisegundos reales. No se genera programa KOP de fabricante ni código de seguridad.</p><small>MS ROBOTIKA · AB-KOP Studio · AB Suite · MIT</small></html>`;
    save('AB-KOP-informe.html', body, 'text/html;charset=utf-8');
  }
  function init() {
    let recoveryMessage = '';
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) {
        const parsed = JSON.parse(raw);
        E.validate(parsed);
        model = parsed;
        state = E.initial(model);
        selected = model.rungs[0]?.id ?? null;
      }
    } catch (_) {
      model = {
        schema: 1,
        name: 'Proyecto recuperable',
        description: '',
        inputs: { I0: false },
        outputs: { Q0: false },
        rungs: [
          {
            id: 'R1',
            name: 'Red 1',
            operation: 'COIL',
            target: 'Q0',
            branches: [[{ kind: 'NO', variable: 'I0' }]]
          }
        ]
      };
      state = E.initial(model);
      selected = null;
      recoveryMessage =
        'No se pudo abrir el proyecto guardado. Se conserva sin sobrescribir hasta tu próxima edición; recupera el archivo anterior desde el almacenamiento del navegador o importa una copia JSON.';
    }
    render();
    log('Aplicación iniciada.');
    if (recoveryMessage) msg(recoveryMessage, true);
    $('new-project').onclick = () => {
      edit((m) => {
        Object.assign(m, {
          schema: 1,
          name: 'Mi programa Ladder',
          description: '',
          inputs: { I0: false },
          outputs: { Q0: false },
          rungs: [
            {
              id: 'R1',
              name: 'Red 1',
              operation: 'COIL',
              target: 'Q0',
              branches: [[{ kind: 'NO', variable: 'I0' }]]
            }
          ]
        });
        selected = null;
      }, 'Proyecto vacío creado; puedes deshacer');
    };
    const history = (direction) => {
      const from = direction === 'undo' ? undo : redo,
        to = direction === 'undo' ? redo : undo;
      if (!from.length) return;
      stop();
      to.push(take());
      const old = from.pop();
      model = old.model;
      selected = old.selected;
      resetSilent();
      store();
      render();
      msg(direction === 'undo' ? 'Cambio deshecho.' : 'Cambio rehecho.');
    };
    $('kop-undo').onclick = () => history('undo');
    $('kop-redo').onclick = () => history('redo');
    for (const [id, cls] of [
      ['toggle-tools', 'tools-hidden'],
      ['toggle-inspector', 'inspector-hidden']
    ])
      $(id).onclick = () => {
        const hidden = document
          .querySelector('.kop-layout')
          .classList.toggle(cls);
        $(id).setAttribute('aria-expanded', String(!hidden));
      };
    if (innerWidth <= 1100) {
      document.querySelector('.kop-layout').classList.add('tools-hidden');
      $('toggle-tools').setAttribute('aria-expanded', 'false');
    }
    if (innerWidth <= 800) {
      document.querySelector('.kop-layout').classList.add('inspector-hidden');
      $('toggle-inspector').setAttribute('aria-expanded', 'false');
    }
    $('kop-zoom').onchange = (e) => {
      $('rungs').style.zoom = e.target.value;
    };
    for (const [id, delta] of [
      ['rung-up', -1],
      ['rung-down', 1]
    ])
      $(id).onclick = () =>
        edit((m) => {
          const i = m.rungs.findIndex((r) => r.id === selected),
            j = i + delta;
          if (j < 0 || j >= m.rungs.length)
            throw Error('La red ya está en ese extremo.');
          [m.rungs[i], m.rungs[j]] = [m.rungs[j], m.rungs[i]];
        }, 'Orden de redes actualizado');
    $('rung-copy').onclick = () =>
      edit((m) => {
        const r = structuredClone(m.rungs.find((r) => r.id === selected));
        let i = 1;
        while (
          m.rungs.some((r) => r.id === 'R' + i) ||
          allSymbols().includes('COPY_' + i)
        )
          i++;
        r.id = 'R' + i;
        r.target = 'COPY_' + i;
        r.name = r.name.slice(0, 85) + ' · copia';
        if (r.operation !== 'TON') m.outputs[r.target] = false;
        m.rungs.push(r);
        selected = r.id;
      }, 'Red duplicada con destino propio');
    document.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        history(e.shiftKey ? 'redo' : 'undo');
      }
      if (e.key === 'F5') {
        e.preventDefault();
        step();
      }
    });
    $('add-rung').addEventListener('click', addRung);
    $('add-contact').addEventListener('click', addContact);
    $('add-branch').addEventListener('click', addBranch);
    $('step').addEventListener('click', step);
    $('back').addEventListener('click', back);
    $('reset').addEventListener('click', reset);
    $('auto').addEventListener('click', () => {
      if (running !== null) {
        stop();
        msg('Simulación automática detenida.');
        return;
      }
      running = setInterval(step, 1000);
      $('auto').textContent = '■ Detener auto';
      step();
    });
    $('clear-history').addEventListener('click', () => {
      events = [];
      renderEvents();
      msg('Historial vaciado.');
    });
    $('export-csv').addEventListener('click', () => {
      const quote = (v) => '"' + String(v ?? '').replaceAll('"', '""') + '"';
      save(
        'AB-KOP-historial.csv',
        [
          ['fecha_iso', 'ciclo', 'evento'].join(','),
          ...events
            .slice()
            .reverse()
            .map((e) => [e.time, e.scan, e.message].map(quote).join(','))
        ].join('\r\n') + '\r\n',
        'text/csv;charset=utf-8'
      );
    });
    $('export-json').addEventListener('click', () =>
      save(
        'AB-KOP-proyecto.json',
        JSON.stringify(model, null, 2),
        'application/json;charset=utf-8'
      )
    );
    $('export-svg').addEventListener('click', exportSvg);
    $('export-report').addEventListener('click', report);
    $('import-json').addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        if (file.size > 250000) throw Error('Archivo mayor de 250 KB.');
        const next = JSON.parse(await file.text());
        E.validate(next);
        stop();
        undo.push(take());
        if (undo.length > 40) undo.shift();
        redo = [];
        model = JSON.parse(JSON.stringify(next));
        selected = model.rungs[0]?.id ?? null;
        resetSilent();
        store();
        render();
        log('Proyecto importado');
        msg('Proyecto importado y validado.');
      } catch (err) {
        msg('Importación rechazada: ' + err.message, true);
      } finally {
        e.target.value = '';
      }
    });
    $('restore').addEventListener('click', () => {
      stop();
      undo.push(take());
      if (undo.length > 40) undo.shift();
      redo = [];
      model = E.sample();
      selected = null;
      resetSilent();
      store();
      render();
      log('Ejemplo restaurado');
      msg('Ejemplo original restaurado.');
    });
    $('project-name').addEventListener('change', (e) =>
      edit((m) => {
        m.name = e.target.value.trim();
      }, 'Nombre actualizado')
    );
    $('description').addEventListener('change', (e) =>
      edit((m) => {
        m.description = e.target.value;
      }, 'Descripción actualizada')
    );
    window.addEventListener('pagehide', stop);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
    });
  }
  window.ABSuite?.register({
    snapshot: () =>
      Object.fromEntries([
        ...Object.entries(model.inputs).map(([k, v]) => ['inputs.' + k, v]),
        ...Object.entries(state.outputs).map(([k, v]) => ['outputs.' + k, v]),
        ['scan', state.scan]
      ]),
    project: () => (model.rungs.length ? cl() : null),
    documents: {
      get: () => cl(),
      create: (name) => {
        if (
          !edit((m) => {
            for (const k of Object.keys(m)) delete m[k];
            Object.assign(m, blankKop(name));
            selected = null;
          }, 'Programa nuevo creado')
        )
          throw Error('No se pudo crear el programa');
      },
      restore: (doc) => {
        E.validate(doc);
        if (
          !edit((m) => {
            for (const k of Object.keys(m)) delete m[k];
            Object.assign(m, structuredClone(doc));
            selected = doc.rungs[0]?.id ?? null;
          }, 'Programa recuperado')
        )
          throw Error('No se pudo recuperar el programa');
      }
    },
    test: (steps) => E.scenario(model, steps),
    runtime: () => ({
      inputs: { ...model.inputs },
      outputs: { ...state.outputs }
    })
  });
  init();
})();
