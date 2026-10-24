/** AB Suite · bi workbench extensions, using its native engine. MIT. */
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
  const api = sdk.bi,
    p = el('div', undefined, 'ab-sql-browser'),
    heading = el('h3', 'Tablas de este espacio'),
    tables = el('div'),
    info = el('p');
  p.id = 'bi-sql-browser';
  p.append(heading, info, tables);
  $('#view-sql .sql-layout').prepend(p);
  const quote = (text) => '"' + text.replaceAll('"', '""') + '"';
  let previousTableCount = -1,
    previousSpace = '';
  function refreshSchema() {
    const model = api.model();
    if (!model) return;
    if (
      previousSpace !== model.workspace_id ||
      (previousTableCount === 0 && model.tables.length > 0)
    ) {
      byId('quickstart').open = model.tables.length === 0;
      previousSpace = model.workspace_id;
    }
    previousTableCount = model.tables.length;
    tables.replaceChildren();
    info.textContent = model.tables.length
      ? 'Elige una tabla para escribir una consulta válida con tus columnas.'
      : 'Importa una tabla para consultar tus datos. No hay consultas de demostración cargadas.';
    for (const t of model.tables) {
      const detail = el('details'),
        summary = el('summary', t.name + ' · ' + t.rows + ' filas');
      detail.append(summary, el('p', t.columns.join(' · ')));
      detail.append(
        button('Consultar filas', null, () => {
          byId('sqlSource').value =
            'SELECT ' +
            t.columns.map(quote).join(', ') +
            '\nFROM ' +
            quote(t.name) +
            '\nLIMIT 50;';
          byId('sqlSource').focus();
        }),
        button('Contar filas', null, () => {
          byId('sqlSource').value =
            'SELECT COUNT(*) AS total\nFROM ' + quote(t.name) + ';';
        })
      );
      tables.append(detail);
    }
  }
  window.addEventListener('ab-suite:model', refreshSchema);
  refreshSchema();
  const exportButton = button('Exportar resultado CSV', 'sql-export-result'),
    history = el('select');
  history.id = 'sql-history';
  history.setAttribute('aria-label', 'Consultas guardadas de este espacio');
  const help = el('p');
  let historySpace = '',
    queries = [],
    lastResult = null;
  function loadHistory() {
    const space = api.model()?.workspace_id;
    if (!space || space === historySpace) return;
    historySpace = space;
    lastResult = null;
    try {
      queries = JSON.parse(
        localStorage.getItem('ab-suite:sql:' + space) || '[]'
      );
      if (!Array.isArray(queries)) queries = [];
    } catch {
      queries = [];
    }
    showHistory();
  }
  function showHistory() {
    history.replaceChildren(el('option', 'Recuperar consulta reciente…'));
    history.firstChild.value = '';
    queries.forEach((q, i) => {
      const o = el('option', q.slice(0, 75));
      o.value = i;
      history.append(o);
    });
  }
  history.onchange = () => {
    if (history.value !== '')
      byId('sqlSource').value = queries[Number(history.value)];
  };
  const run = byId('executeSql');
  run.onclick = async () => {
    loadHistory();
    run.disabled = true;
    try {
      const query = byId('sqlSource').value;
      const result = await api.post('/api/sql', { query });
      lastResult = result;
      byId('sqlError').textContent = '';
      byId('sqlResults').replaceChildren(table(result.columns, result.rows));
      help.textContent =
        result.rows.length +
        ' filas' +
        (result.truncated ? ' · resultado limitado a 500' : '');
      queries = [query, ...queries.filter((q) => q !== query)].slice(0, 12);
      try {
        localStorage.setItem(
          'ab-suite:sql:' + historySpace,
          JSON.stringify(queries)
        );
      } catch {
        help.textContent += ' · historial solo en memoria';
      }
      showHistory();
    } catch (err) {
      lastResult = null;
      error(byId('sqlError'), err);
    } finally {
      run.disabled = false;
    }
  };
  exportButton.onclick = () => {
    if (!lastResult)
      return error(
        help,
        Error('Ejecuta una consulta válida antes de exportar.')
      );
    const cell = (v) => '"' + String(v ?? '').replaceAll('"', '""') + '"';
    download(
      'AB-BI-consulta.csv',
      [lastResult.columns, ...lastResult.rows]
        .map((row) => row.map(cell).join(','))
        .join('\r\n'),
      'text/csv;charset=utf-8'
    );
  };
  $('#view-sql .actionbar').append(exportButton, history);
  $('#view-sql .actionbar').after(help);
  byId('sqlSource').addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      run.click();
    }
  });
  window.addEventListener('ab-suite:model', () => {
    loadHistory();
    byId('sqlError').textContent = '';
  });
  loadHistory();
  const toggle = button('Panel de datos', 'bi-toggle-tools', () =>
    document.body.classList.toggle('bi-tools-closed')
  );
  $('.top-actions').prepend(toggle);
  const filter = button('Filtros', 'bi-toggle-filters', () =>
    document.body.classList.toggle('bi-filters-closed')
  );
  $('#view-dashboard .right-inline').append(filter);
  document.body.classList.add('bi-filters-closed');
}
