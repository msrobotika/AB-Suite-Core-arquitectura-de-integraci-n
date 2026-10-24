/** Workspace composition shared by the native editors. Moves real controls, never clones state. MIT. */
import { catalog } from './catalog.js';
const $ = (s) => document.querySelector(s),
  id = window.ABSuite.id;
const node = (tag, text, cls) => {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (cls) n.className = cls;
  return n;
};
const configurations = {
  scl: {
    title: 'SCL Studio',
    goal: 'Escribe una condición. Comprueba todas sus combinaciones.',
    commands: ['#new-source', '#undo-source', '#convert', '#export-source'],
    pages: [
      ['Código', '#workbench .editor-panel'],
      ['KOP generado', '#converter'],
      ['Tabla de verdad', '#truth-table']
    ],
    left: [['Diagnóstico', '#diagnostics']],
    right: [
      ['Conversión', '.conversion-panel'],
      ['Banco de entradas', '#simulator']
    ],
    status: '.metrics',
    notice: '#notice'
  },
  grafcet: {
    title: 'GRAFCET Studio',
    goal: 'Construye una secuencia y descubre qué permite avanzar.',
    commands: ['#new-grafcet', '#reset', '#back', '#step', '#run'],
    pages: [
      ['Secuencia', '#editor .canvas-panel'],
      ['Decisiones', '#decisions'],
      ['Registro', '#events']
    ],
    left: [
      ['Señales', '#signals'],
      ['Proyecto', '#project-info']
    ],
    right: [['Inspector', '#editor .inspector']],
    status: '.metrics',
    notice: '#notice'
  },
  vision: {
    title: 'Vision Inspector',
    goal: 'Una imagen, una receta y un resultado que puedas explicar.',
    commands: ['#analyze', '#compare-baseline', '#compare-result'],
    pages: [
      ['Inspección', '#vision'],
      ['Historial', '#history'],
      ['Comparación', '#vision-comparison']
    ],
    right: [['Receta', '#config']],
    status: '.metrics',
    notice: '#message'
  },
  modbus: {
    title: 'Modbus Studio',
    goal: 'Configura, lee e interpreta cada registro y cada byte.',
    commands: ['#quick-demo', '#read-values-csv'],
    pages: [
      ['Registros', '#resultados'],
      ['Tramas TCP', '#monitor'],
      ['Interpretar bytes', '#packet-lab']
    ],
    left: [['Cliente TCP', '#lectura']],
    right: [
      ['Laboratorio', '#simulador'],
      ['Perfiles', '#perfiles']
    ],
    notice: '#notice'
  },
  serial: {
    title: 'Serial Analyzer',
    goal: 'Captura tráfico o examina tus propias tramas RTU.',
    commands: ['#start', '#stop', '#export-csv'],
    pages: [
      ['Captura', '#tramas'],
      ['Trama propia', '#manual-rtu'],
      ['Actividad', '.traffic']
    ],
    left: [['Adquisición', '#conexion']],
    right: [['Decodificación', '#decoder']],
    status: '.kpis',
    notice: '#message'
  }
};
const config = configurations[id];
if (config) {
  const notice = $(config.notice),
    status = $(config.status);
  const app = catalog.find((x) => x.id === id),
    frame = node('main', undefined, 'ab-workbench');
  frame.dataset.editor = id;
  const header = node('header', undefined, 'ab-command'),
    brand = node('div');
  brand.append(node('small', app.area.toUpperCase()), node('h1', config.title));
  header.append(brand);
  const controls = node('div', undefined, 'ab-actions');
  for (const selector of config.commands ?? []) {
    const control = $(selector);
    if (control) controls.append(control);
  }
  header.append(controls);
  const layout = node('div', undefined, 'ab-layout'),
    center = node('section', undefined, 'ab-document'),
    tabs = node('div', undefined, 'ab-tabs');
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', 'Área de trabajo');
  const pages = [];
  for (const [label, selector] of config.pages) {
    const content = $(selector);
    if (!content) continue;
    const page = node('section', undefined, 'ab-tab-page');
    page.id = 'ab-page-' + pages.length;
    page.setAttribute('role', 'tabpanel');
    page.tabIndex = -1;
    page.append(content);
    const tab = node('button', label);
    tab.type = 'button';
    tab.id = 'ab-tab-' + pages.length;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', page.id);
    page.setAttribute('aria-labelledby', tab.id);
    pages.push({ page, tab });
    tabs.append(tab);
    center.append(page);
  }
  function activate(index, focus = false) {
    pages.forEach(({ page, tab }, i) => {
      page.hidden = i !== index;
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
    });
    if (focus) pages[index].tab.focus();
    frame.dispatchEvent(new Event('ab:resize'));
  }
  pages.forEach(({ tab }, i) => {
    tab.onclick = () => activate(i);
    tab.onkeydown = (e) => {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
        activate(
          e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? pages.length - 1
              : (i + (e.key === 'ArrowRight' ? 1 : -1) + pages.length) %
                pages.length,
          true
        );
      }
    };
  });
  center.prepend(tabs);
  function dock(kind, items) {
    if (!items?.length) return;
    const rail = node('aside', undefined, 'ab-dock ab-' + kind);
    rail.id = 'ab-' + kind;
    rail.setAttribute(
      'aria-label',
      kind === 'tools' ? 'Herramientas del documento' : 'Inspector'
    );
    for (const [title, selector] of items) {
      const content = $(selector);
      if (!content) continue;
      const detail = node('details', undefined, 'ab-dock-section');
      detail.open = true;
      detail.append(node('summary', title), content);
      rail.append(detail);
    }
    layout.append(rail);
    const toggle = node(
      'button',
      kind === 'tools' ? 'Herramientas' : 'Inspector'
    );
    toggle.type = 'button';
    toggle.setAttribute('aria-controls', rail.id);
    toggle.setAttribute('aria-expanded', String(innerWidth > 1000));
    if (innerWidth <= 1000) layout.classList.add(kind + '-closed');
    toggle.onclick = () => {
      const closed = layout.classList.toggle(kind + '-closed');
      toggle.setAttribute('aria-expanded', String(!closed));
    };
    header.append(toggle);
  }
  dock('tools', config.left);
  layout.append(center);
  dock('properties', config.right);
  layout.classList.toggle('has-tools', Boolean(config.left));
  layout.classList.toggle('has-properties', Boolean(config.right));
  frame.append(header);
  if (notice) {
    notice.classList.add('ab-notice');
    frame.append(notice);
  }
  layout.classList.add('ab-editor-' + id);
  frame.append(layout);
  if (status) {
    const footer = node('footer', undefined, 'ab-status');
    footer.append(status);
    frame.append(footer);
  }
  // Old chrome is retained only as a hidden ancestor of controls not used by this workspace.
  const shell = $('.shell');
  if (shell) shell.hidden = true;
  else {
    const main = $('body>main');
    if (main) main.hidden = true;
    const side = $('body>.sidebar');
    if (side) side.hidden = true;
  }
  document.body.append(frame);
  activate(0);
  document.body.classList.add('ab-studio');
  window.ABSuite.workspace = {
    activate(name) {
      const index = config.pages.findIndex(([label]) => label === name);
      if (index >= 0) activate(index);
    }
  };
  if (id === 'vision') {
    const { mountVisionWorkspace } = await import('./vision-workspace.js');
    mountVisionWorkspace();
  }
}
