/** One workspace and one CPU for program editing, execution and communications. */
import { labMarkup } from './lab-markup.js';
import { mountLabSimulator } from './lab-ui.js';
import { mountKopEditor } from './kop-ui.js';
import { validateProgram } from './plc-engine.js';
const $ = (id) => document.getElementById(id);
let timer;
function notify(message, kind = 'ok') {
  const toast = $('toast');
  toast.textContent = message;
  toast.className = 'show ' + kind;
  clearTimeout(timer);
  timer = setTimeout(() => (toast.className = ''), 5000);
}
// Keep the original entry's tested lab surfaces; retire its second, unrelated CPU.
for (const name of ['console', 'diagnostics']) {
  document.querySelector(`[data-view="${name}"]`)?.remove();
  $('view-' + name)?.remove();
}
$('program-rungs').closest('section').remove();
$('program-json')
  .closest('.two-col')
  ?.style.setProperty('grid-template-columns', '1fr');
document.querySelector('#view-program .hint').textContent =
  'Aplicar reinicia memoria, temporizadores y salidas. El programa residente se guarda en la carpeta de datos local de la suite; exporta una copia para compartirlo.';
document.querySelector('[data-view="help"]').textContent =
  'Guía de programación';
$('view-help').innerHTML =
  '<section class="panel help-panel"><p class="section-kicker">PROGRAMAR · EJECUTAR · OBSERVAR</p><h2>Un programa, una CPU</h2><div class="help-grid"><article><span class="help-number">01</span><h3>Elige tu ejercicio</h3><p>Usa el bastidor libre para probar lógica o elige Depósito/Transportador como escenarios de aprendizaje.</p></article><article><span class="help-number">02</span><h3>Construye el programa</h3><p>Abre Editor KOP para crear contactos, ramas y acciones. Valida y carga para aplicar los cambios a la CPU.</p></article><article><span class="help-number">03</span><h3>Inspecciona cada ciclo</h3><p>PASO ejecuta un scan. RUN avanza automáticamente. Consulta la traza, cambia entradas y prueba fallos virtuales.</p></article><article><span class="help-number">04</span><h3>Conecta tus herramientas</h3><p>En Modbus usa Leer CPU de la suite. En SCADA vincula sus señales. En BI pulsa Capturar CPU para analizar registros en SuitePLC.</p></article></div><p class="hint">El programa se conserva localmente al cambiarlo; la CPU vuelve a STOP al reiniciar la suite. Exporta tu programa para conservar una copia portable.</p></section>';

$('lab-root').innerHTML = labMarkup();
const lab = mountLabSimulator({ notify });
await lab.ready;
const editor = mountKopEditor({
  element: $('kop-editor'),
  getProgram: () => lab.cpu.program,
  readTag: (tag) => lab.cpu.engine.read(tag),
  notify,
  applyProgram: async (program) => {
    await lab.loadProgram(program);
    return true;
  }
});
const headings = {
  watch: [
    'Observación de variables',
    'Lee la CPU compartida y prepara tu banco de señales.'
  ],
  lab: ['CPU virtual y señales', 'Ejecuta, observa y diagnostica tu programa.'],
  program: [
    'Código del programa',
    'Edita el programa JSON que utiliza la misma CPU del laboratorio.'
  ],
  kop: [
    'Editor KOP',
    'Construye redes y carga tus cambios en la CPU compartida.'
  ],
  help: [
    'Programar y comprobar',
    'Trabaja sobre un único programa y verifica cada cambio.'
  ]
};
function view(name) {
  if (!headings[name]) return;
  for (const e of document.querySelectorAll('.view'))
    e.hidden = e.id !== 'view-' + name;
  for (const b of document.querySelectorAll('[data-view]'))
    b.classList.toggle('active', b.dataset.view === name);
  $('view-title').textContent = headings[name][0];
  $('view-subtitle').textContent = headings[name][1];
  $('breadcrumb-view').textContent = name.toUpperCase();
  if (name === 'kop') editor.show();
  if (name === 'program')
    $('program-json').value = JSON.stringify(lab.cpu.program, null, 2);
}
for (const b of document.querySelectorAll('[data-view]'))
  b.onclick = () => view(b.dataset.view);
window.addEventListener('ab-suite:plc-view', (event) => view(event.detail));
$('load-json').onclick = async () => {
  try {
    const program = JSON.parse($('program-json').value);
    validateProgram(program);
    await lab.loadProgram(program);
    notify('Programa validado y cargado. CPU reiniciada.');
  } catch (error) {
    notify(error.message, 'error');
  }
};
$('export-json').onclick = () => {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(lab.cpu.program, null, 2)], {
      type: 'application/json'
    })
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = 'AB-PLC-programa.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$('import-json').onclick = () => $('file-json').click();
$('file-json').onchange = async (e) => {
  try {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 300000) throw Error('Máximo 300 KB');
    const text = await f.text();
    validateProgram(JSON.parse(text));
    $('program-json').value = text;
    notify('Borrador importado. Pulsa Validar y cargar para aplicarlo.');
  } catch (error) {
    notify(error.message, 'error');
  } finally {
    e.target.value = '';
  }
};
$('reset-btn').onclick = async () => {
  try {
    await lab.cpu.reset();
    lab.refresh();
    notify('CPU virtual reiniciada');
  } catch (error) {
    notify(error.message, 'error');
  }
};
$('run-btn').onclick = async () => {
  try {
    await lab.cpu.setMode(lab.cpu.mode === 'RUN' ? 'PAUSE' : 'RUN');
    lab.refresh();
  } catch (error) {
    notify(error.message, 'error');
  }
};
// New networks are authored in the KOP editor, rather than an unbound second form.
function refreshRun() {
  $('run-btn').textContent =
    lab.cpu.mode === 'RUN' ? 'Ⅱ Pausar CPU' : '▶ Ejecutar CPU';
  $('run-btn').disabled = !lab.cpu.program.rungs.length;
}
refreshRun();
setInterval(refreshRun, 350);
window.addEventListener('pagehide', () => lab.dispose());
view('lab');

window.ABSuite.adapter.documents = {
  get: async () => {
    const response = await fetch('/apps/plc/api/live/state', {
      headers: { Authorization: 'Bearer ' + ABSuitePLC.token },
      cache: 'no-store'
    });
    if (!response.ok)
      throw Error('No se pudo leer el programa de la CPU residente');
    const current = await response.json();
    return {
      schema: 'ab.plc.document.v1',
      name: current.program.name || 'Programa PLC',
      scenario: current.snapshot.scenario,
      program: current.program
    };
  },
  create: async (name) => {
    await lab.cpu.loadScenario('rack', { version: 1, name, rungs: [] });
    await lab.cpu.setMode('STOP');
    lab.refresh();
    refreshRun();
    view('kop');
    notify(
      'Programa vacío en bastidor libre. Crea tu primera red; CPU detenida.'
    );
  },
  restore: async (doc) => {
    if (doc.schema !== 'ab.plc.document.v1')
      throw Error('Documento PLC inválido');
    validateProgram(doc.program);
    const response = await fetch('/apps/plc/api/live/command', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + ABSuitePLC.token
      },
      body: JSON.stringify({
        command: 'scenario',
        scenario: doc.scenario,
        program: doc.program
      })
    });
    if (!response.ok) throw Error('No se pudo recuperar el programa');
    await lab.cpu.setMode('STOP');
    lab.refresh();
    view('lab');
  }
};
