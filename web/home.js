import { catalog } from './catalog.js';
import { translate } from './i18n.js';
import { PREFIX, parseSnapshot, quality } from './signal-contract.js';
import { createResidentSource } from './resident-source.js';
fetch('/suite/distribution')
  .then((response) => response.json())
  .then(({ files }) => {
    const list = document.getElementById('distribution-files');
    // Show one coherent review revision when older installers remain in the local folder.
    const version = (file) =>
      file.name.match(/^AB-Suite-(\d+\.\d+\.\d+)-/)?.[1] || '0.0.0';
    files.sort((a, b) => {
      const av = version(a).split('.').map(Number),
        bv = version(b).split('.').map(Number);
      return bv[0] - av[0] || bv[1] - av[1] || bv[2] - av[2];
    });
    const latest = files.filter((file) => version(file) === version(files[0]));
    for (const file of latest) {
      const link = document.createElement('a');
      link.className = 'suite-action suite-primary';
      link.href = file.href;
      link.textContent =
        (file.name.endsWith('Setup.exe')
          ? 'Instalador Windows · '
          : 'Portable Windows · ') +
        version(file) +
        ' · ' +
        Math.ceil(file.bytes / 1048576) +
        ' MB ↓';
      link.download = file.name;
      list.append(link);
    }
    if (!files.length)
      document.getElementById('distribution-note').textContent =
        'Esta copia no incluye archivos de distribución para descargar. Usa el instalador entregado con la revisión o descarga el código fuente.';
  })
  .catch(() => {
    document.getElementById('distribution-note').textContent =
      'No se pudo consultar la descarga del instalador. Puedes usar el paquete entregado con la revisión.';
  });
const $ = (id) => document.getElementById(id),
  node = (tag, text, cls) => {
    const e = document.createElement(tag);
    if (text !== undefined) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  };
let runtime = null,
  favoritesOnly = false;
const favorites = new Set(),
  favoriteKey = 'ab-suite:favorite-tools:v1',
  samples = [],
  seen = new Map();
let resident = null,
  plcSnapshot = null;
try {
  const saved = JSON.parse(localStorage.getItem(favoriteKey) || '[]');
  if (Array.isArray(saved))
    for (const id of saved)
      if (catalog.some((app) => app.id === id)) favorites.add(id);
} catch {
  $('launcher-message').textContent =
    'No se pudieron leer las favoritas guardadas. Las nueve herramientas siguen disponibles.';
}
function render() {
  const query = $('search').value.trim().toLocaleLowerCase('es'),
    area = $('filters').value;
  const shown = catalog.filter(
    (app) =>
      (area === 'Todas' || area === app.area) &&
      (!favoritesOnly || favorites.has(app.id)) &&
      `${app.name} ${app.area} ${app.summary} ${app.detail} ${translate(app.area, 'en')} ${translate(app.detail, 'en')}`
        .toLocaleLowerCase('es')
        .includes(query)
  );
  $('tool-grid').replaceChildren();
  for (const app of shown) {
    const card = node('article', undefined, 'tool-card');
    card.dataset.tool = app.id;
    card.style.setProperty('--app-accent', app.color);
    const mark = node('span', app.mark, 'tool-mark'),
      name = node('div', undefined, 'tool-name');
    mark.setAttribute('aria-hidden', 'true');
    name.append(node('h2', app.name), node('span', app.area, 'tool-area'));
    const favorite = node(
      'button',
      favorites.has(app.id) ? '★' : '☆',
      'tool-favorite'
    );
    favorite.type = 'button';
    favorite.dataset.tool = app.id;
    favorite.setAttribute('aria-pressed', String(favorites.has(app.id)));
    favorite.setAttribute(
      'aria-label',
      (favorites.has(app.id) ? 'Quitar ' : 'Marcar ') +
        app.name +
        (favorites.has(app.id) ? ' de favoritas' : ' como favorita')
    );
    favorite.onclick = () => {
      if (favorites.has(app.id)) favorites.delete(app.id);
      else favorites.add(app.id);
      try {
        localStorage.setItem(favoriteKey, JSON.stringify([...favorites]));
        $('launcher-message').textContent = favorites.has(app.id)
          ? app.name + ' añadida a favoritas.'
          : app.name + ' retirada de favoritas.';
      } catch {
        $('launcher-message').textContent =
          'La preferencia solo está disponible en esta pestaña: no se pudo guardar en el navegador.';
      }
      render();
      (
        $('tool-grid').querySelector(
          '.tool-favorite[data-tool="' + app.id + '"]'
        ) ?? $('view-favorites')
      ).focus();
    };
    const bottom = node('div', undefined, 'tool-card-bottom'),
      ready = runtime?.find((item) => item.id === app.id)?.ready ?? true,
      link = node(
        'a',
        ready ? 'Abrir herramienta ↗' : 'Preparar herramienta →',
        'tool-open'
      );
    link.href = ready ? `/apps/${app.id}/` : '#download';
    link.setAttribute(
      'aria-label',
      (ready ? 'Abrir ' : 'Preparar ') + app.name
    );
    if (!ready)
      link.onclick = (event) => {
        event.preventDefault();
        $('download-dialog').showModal();
      };
    bottom.append(
      link,
      node(
        'span',
        ready ? '● Disponible' : '◌ Motor pendiente',
        'tool-local' + (ready ? '' : ' pending')
      )
    );
    card.append(
      mark,
      name,
      favorite,
      node('p', app.summary, 'tool-detail'),
      bottom
    );
    $('tool-grid').append(card);
  }
  $('view-all').setAttribute('aria-pressed', String(!favoritesOnly));
  $('view-favorites').setAttribute('aria-pressed', String(favoritesOnly));
  $('no-results').hidden = Boolean(shown.length);
  $('no-results').textContent =
    favoritesOnly && !favorites.size
      ? 'Todavía no has marcado favoritas. Muestra las nueve y utiliza la estrella de las que prefieras.'
      : 'No hay herramientas con esa selección. Cambia la búsqueda o muestra las nueve.';
  $('reset-catalog').hidden = !favoritesOnly && !query && area === 'Todas';
}
for (const category of new Set(catalog.map((app) => app.area))) {
  const option = node('option', category);
  option.value = category;
  $('filters').append(option);
}
$('view-all').onclick = () => {
  favoritesOnly = false;
  render();
};
$('view-favorites').onclick = () => {
  favoritesOnly = true;
  render();
};
$('search').oninput = render;
$('filters').onchange = render;
$('reset-catalog').onclick = () => {
  favoritesOnly = false;
  $('search').value = '';
  $('filters').value = 'Todas';
  render();
};
render();
try {
  const response = await fetch('/suite/status');
  if (!response.ok) throw Error();
  runtime = (await response.json()).apps;
  const ready = runtime.filter((app) => app.ready).length;
  $('runtime-note').textContent =
    ready === 9
      ? '9 herramientas disponibles · Procesamiento local'
      : ready +
        ' de 9 listas · Consulta Instalación para preparar los motores pendientes';
  render();
} catch {
  $('runtime-note').textContent =
    'No se pudo comprobar el servicio. Recarga el catálogo.';
}
function connections() {
  $('connection-grid').replaceChildren();
  for (const app of catalog.filter(
    (app) => !['scada', 'bi'].includes(app.id)
  )) {
    let snapshot = null;
    try {
      snapshot =
        app.id === 'plc'
          ? plcSnapshot
          : parseSnapshot(localStorage.getItem(PREFIX + app.id));
    } catch {}
    const state = quality(snapshot),
      card = node('article', undefined, 'connection-card');
    card.dataset.source = app.id;
    card.append(
      node('strong', app.name),
      node(
        'span',
        state === 'good'
          ? '● Disponible'
          : state === 'stale'
            ? '◌ Caducada'
            : '○ Sin señales',
        'signal-' + state
      )
    );
    const entries = Object.entries(snapshot?.tags ?? {});
    card.append(
      node(
        'p',
        entries.length
          ? `${entries.length} señales · ${entries
              .slice(0, 3)
              .map(([key, value]) => `${key} = ${value}`)
              .join(' · ')}`
          : app.id === 'plc'
            ? 'Comprueba la CPU residente; no necesitas abrir su vista.'
            : 'Abre esta herramienta si quieres observar sus señales.'
      )
    );
    if (state === 'good' && seen.get(app.id) !== snapshot.at) {
      seen.set(app.id, snapshot.at);
      for (const [tag, value] of entries)
        samples.push({
          at: new Date(snapshot.at).toISOString(),
          source: app.id,
          tag,
          value
        });
      while (samples.length > 600) samples.shift();
    }
    $('connection-grid').append(card);
  }
}
function openDialog(id) {
  const dialog = $(id);
  if (!dialog.open) dialog.showModal();
  if (id === 'connections-dialog') {
    resident?.stop();
    resident = window.ABSuitePLC?.token
      ? createResidentSource({
          fetcher: fetch.bind(window),
          token: ABSuitePLC.token,
          onChange: () => {
            plcSnapshot = resident.get();
            connections();
          }
        })
      : null;
    resident?.start();
    connections();
  }
}
for (const [button, dialog] of [
  ['open-help', 'help-dialog'],
  ['open-download', 'download-dialog'],
  ['open-connections', 'connections-dialog']
])
  $(button).onclick = () => openDialog(dialog);
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.querySelector('[data-close]').onclick = () => dialog.close();
  dialog.addEventListener('close', () => {
    if (dialog.id === 'connections-dialog') {
      resident?.stop();
      resident = null;
    }
    if (location.hash)
      history.replaceState(null, '', location.pathname + location.search);
  });
}
const hashes = {
  connections: 'connections-dialog',
  download: 'download-dialog',
  path: 'help-dialog'
};
const fromHash = () => {
  const id = hashes[location.hash.slice(1)];
  if (id) openDialog(id);
};
window.addEventListener('hashchange', fromHash);
fromHash();
const csvCell = (value) => '"' + String(value).replace(/"/g, '""') + '"';
$('export-signals').onclick = () => {
  if (!samples.length) {
    $('connection-note').textContent =
      'Todavía no hay muestras disponibles. Abre la fuente que quieras observar.';
    return;
  }
  const text =
    '\uFEFFtime,source,tag,value\r\n' +
    samples
      .map((sample) =>
        [
          sample.at,
          sample.source,
          sample.tag,
          typeof sample.value === 'boolean'
            ? Number(sample.value)
            : sample.value
        ]
          .map(csvCell)
          .join(',')
      )
      .join('\r\n');
  const url = URL.createObjectURL(
      new Blob([text], { type: 'text/csv;charset=utf-8' })
    ),
    a = node('a');
  a.href = url;
  a.download = 'AB-Suite-telemetria.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  $('connection-note').textContent =
    `Exportadas ${samples.length} muestras observadas. Puedes importarlas en BI Studio.`;
};
setInterval(() => {
  if ($('connections-dialog').open) connections();
}, 1000);
window.addEventListener('pagehide', (event) => {
  if (!event.persisted) resident?.stop();
});
