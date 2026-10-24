/** Shared UI localization. Project payloads, code, addresses and entered values stay untouched. MIT. */
import english from './locales/en.js';
const key = 'ab-suite:language:v1';
const normalize = (text) => text.replace(/\s+/g, ' ').trim();
const message = (text) =>
  Object.hasOwn(english, text) ? english[text] : undefined;
let language = navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
try {
  const requested = new URLSearchParams(location.search).get('lang');
  const stored = localStorage.getItem(key);
  language = ['es', 'en'].includes(requested)
    ? requested
    : ['es', 'en'].includes(stored)
      ? stored
      : language;
} catch {}
const originals = new WeakMap();
const attributes = new WeakMap();
const skip =
  'script,style,textarea,pre,code,[contenteditable],[data-i18n-skip],.suite-brand,svg,.cm-editor,#dataBody,#dataHead,#sqlResults table,#filterValue,#filterChoices,#tableTree,#dataSort,#dataTableSelect,#relFromTable,#relToTable,#relFromColumn,#relToColumn,#cleanTable,#cleanColumns,#profileTableSelect,#visualDim,#visualMeasure,#space-select,#crumbName,#filterDimension,.viz-card h3,.exercise-list-item strong,#suite-document-list strong';
export function translate(text, target = language) {
  if (target !== 'en' || typeof text !== 'string') return text;
  const clean = normalize(text);
  const render = (value) => text.replace(/\S(?:[\s\S]*\S)?/, value);
  if (message(clean)) return render(message(clean));
  const exact = message(clean.replace(/^[＋↑↓↶↷↺↻▶▷◁◈◉◎■⟳⫸↥✓?]+\s*/, ''));
  if (exact)
    return render(
      (clean.match(/^[＋↑↓↶↷↺↻▶▷◁◈◉◎■⟳⫸↥✓?]+\s*/)?.[0] ?? '') + exact
    );
  const patterns = [
    [/^Marcar (.+) como favorita$/, (m) => 'Favorite ' + m[1]],
    [/^Quitar (.+) de favoritas$/, (m) => 'Unfavorite ' + m[1]],
    [/^Abrir (.+)$/, (m) => 'Open ' + m[1]],
    [/^Añadir (.+)$/, (m) => 'Add ' + translate(m[1])],
    [
      /^(\d+) herramientas disponibles · Procesamiento local$/,
      (m) => m[1] + ' tools available · Local processing'
    ],
    [/^(\d+) ejercicios en curso$/, (m) => m[1] + ' active exercises'],
    [/^(\d+) ejercicios archivados$/, (m) => m[1] + ' archived exercises'],
    [
      /^(\d+) (redes|REDES|componentes|etapas|transiciones|pasos|tablas|filas|medidas|relaciones|gráficos|muestras en memoria)$/,
      (m) => m[1] + ' ' + translate(m[2])
    ],
    [/^Ciclo (\d+)$/, (m) => 'Cycle ' + m[1]],
    [
      /^(\d+) líneas · (\d+) caracteres$/,
      (m) => m[1] + ' lines · ' + m[2] + ' characters'
    ],
    [
      /^✓ (\d+) etapa\(s\) inicial\(es\)$/,
      (m) => '✓ ' + m[1] + ' initial step(s)'
    ],
    [
      /^⚠ (.+) no tiene transición de salida\.$/,
      (m) => '⚠ ' + m[1] + ' has no outgoing transition.'
    ],
    [
      /^(.+) · simulación local$/,
      (m) => translate(m[1]) + ' · local simulation'
    ],
    [
      /^Posición: x=(.+) · y=(.+)\. Puedes moverla arrastrando su símbolo\.$/,
      (m) =>
        'Position: x=' + m[1] + ' · y=' + m[2] + '. Drag its symbol to move it.'
    ],
    [/^(\d+) valores seleccionados$/, (m) => m[1] + ' selected values'],
    [/^(\d+) valores disponibles$/, (m) => m[1] + ' available values'],
    [
      /^Mostrando (\d+) de (\d+)\. Busca para encontrar otros valores\.$/,
      (m) =>
        'Showing ' + m[1] + ' of ' + m[2] + '. Search to find other values.'
    ],
    [
      /^Proyecto actual: (\d+) tablas · (\d+) filas · (\d+) gráficos\. Datos del proyecto cargados correctamente\.$/,
      (m) =>
        'Current project: ' +
        m[1] +
        ' tables · ' +
        m[2] +
        ' rows · ' +
        m[3] +
        ' charts. Project data loaded successfully.'
    ],
    [
      /^(Instalador Windows|Portable Windows) · (\d+) MB ↓$/,
      (m) =>
        (m[1] === 'Instalador Windows'
          ? 'Windows installer'
          : 'Windows portable') +
        ' · ' +
        m[2] +
        ' MB ↓'
    ],
    [/^(.+) · Nueva transición$/, (m) => m[1] + ' · New transition'],
    [
      /^Transición (.+) seleccionada$/,
      (m) => 'Transition ' + m[1] + ' selected'
    ],
    [
      /^(.+) creada con condición 0 \(inactiva hasta que la edites\)\.$/,
      (m) => m[1] + ' created with condition 0 (inactive until edited).'
    ],
    [
      /^(.+) creada; edita nombre y acciones en el inspector\.$/,
      (m) => m[1] + ' created; edit its name and actions in the inspector.'
    ],
    [
      /^⚠ Etapa (.+) inaccesible desde el estado inicial \(análisis estructural\)\.$/,
      (m) =>
        '⚠ Step ' +
        m[1] +
        ' unreachable from the initial state (structural analysis).'
    ],
    [
      /^⚠ (.+) tiene receptividad constante falsa \(0\): nunca se disparará\.$/,
      (m) =>
        '⚠ ' +
        m[1] +
        ' has a constant false condition (0): it will never fire.'
    ],
    [/^(.+) \/ Sin vincular$/, (m) => m[1] + ' / Unlinked'],
    [
      /^CPU (.+) · ciclo (\d+) · (.+)$/,
      (m) => 'CPU ' + m[1] + ' · cycle ' + m[2] + ' · ' + m[3]
    ],
    [/^(.+) · (\d+) tablas$/, (m) => m[1] + ' · ' + m[2] + ' tables'],
    [/^(.+) añadida a favoritas\.$/, (m) => m[1] + ' added to favorites.'],
    [
      /^(.+) retirada de favoritas\.$/,
      (m) => m[1] + ' removed from favorites.'
    ],
    [/^0\.6\.0 · en desarrollo$/, () => '0.6.0 · development build'],
    [
      /^No se pudo (.+): (.+)$/,
      (m) => 'Could not ' + translate(m[1]) + ': ' + translate(m[2])
    ]
  ];
  for (const [pattern, format] of patterns) {
    const match = clean.match(pattern);
    if (match) return render(format(match));
  }
  return text;
}
function textNode(node) {
  if (!node.parentElement || node.parentElement.closest(skip)) return;
  const previous = originals.get(node);
  // A native renderer may replace an earlier translation with a new source message.
  const source =
    previous && node.nodeValue === previous.output
      ? previous.source
      : node.nodeValue;
  const output = translate(source);
  originals.set(node, { source, output });
  if (node.nodeValue !== output) {
    if (
      node.parentElement.tagName === 'OPTION' &&
      !node.parentElement.hasAttribute('value')
    )
      node.parentElement.setAttribute('value', node.parentElement.value);
    node.nodeValue = output;
  }
}
function elementAttributes(element) {
  if (element.closest(skip) || element.matches('.exercise-list-item')) return;
  const saved = attributes.get(element) || {};
  for (const name of ['title', 'placeholder', 'aria-label', 'alt']) {
    if (!element.hasAttribute(name)) continue;
    const value = element.getAttribute(name),
      previous = saved[name];
    const source =
      previous && value === previous.output ? previous.source : value;
    const output = translate(source);
    saved[name] = { source, output };
    if (value !== output) element.setAttribute(name, output);
  }
  attributes.set(element, saved);
}
function scan(root) {
  if (root.nodeType === Node.TEXT_NODE) {
    textNode(root);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root !== document) return;
  if (root.nodeType === Node.ELEMENT_NODE) elementAttributes(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) textNode(node);
  for (const el of root.querySelectorAll(
    '[title],[placeholder],[aria-label],[alt]'
  ))
    elementAttributes(el);
}
function mount() {
  const parent = document.querySelector(
    '.home-utilities,.suite-bar,.exercise-header'
  );
  if (!parent || document.getElementById('suite-language')) return;
  const label = document.createElement('label');
  label.className = 'suite-language';
  label.setAttribute('data-i18n-skip', '');
  const select = document.createElement('select');
  select.id = 'suite-language';
  select.setAttribute('aria-label', 'Idioma / Language');
  select.innerHTML =
    '<option value="es">Español</option><option value="en">English</option>';
  select.value = language;
  select.onchange = () => setLanguage(select.value);
  label.append(select);
  parent.append(label);
}
export function setLanguage(value, persist = true) {
  if (!['es', 'en'].includes(value)) return;
  language = value;
  if (persist) {
    try {
      localStorage.setItem(key, value);
    } catch {
      document.dispatchEvent(
        new CustomEvent('ab-suite:language-storage-error')
      );
    }
  }
  document.documentElement.lang = value;
  scan(document);
  mount();
  const picker = document.getElementById('suite-language');
  if (picker) picker.value = value;
  document.dispatchEvent(
    new CustomEvent('ab-suite:language', { detail: value })
  );
}
window.addEventListener('storage', (event) => {
  if (event.key === key && ['es', 'en'].includes(event.newValue))
    setLanguage(event.newValue, false);
});
for (const name of ['alert', 'confirm', 'prompt']) {
  const native = window[name].bind(window);
  window[name] = (message, ...args) => native(translate(message), ...args);
}
let queued = false;
const changed = new Set();
const observer = new MutationObserver((records) => {
  for (const record of records) {
    if (record.type === 'childList')
      for (const node of record.addedNodes) changed.add(node);
    else changed.add(record.target);
  }
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    const nodes = [...changed];
    changed.clear();
    for (const node of nodes) if (node.isConnected) scan(node);
    mount();
  });
});
window.ABSuiteI18n = Object.freeze({
  t: translate,
  get language() {
    return language;
  },
  setLanguage
});
const start = () => {
  setLanguage(language, false);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['title', 'placeholder', 'aria-label', 'alt']
  });
};
if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', start, { once: true });
else start();
