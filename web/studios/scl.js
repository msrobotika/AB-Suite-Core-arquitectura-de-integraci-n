/** AB Suite · scl workbench extensions, using its native engine. MIT. */
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
  const api = sdk.adapter,
    core = window.ABSclCore;
  const empty = button('＋ Documento vacío', 'new-source', () =>
      byId('suite-new')?.click()
    ),
    undo = button('↶ Borrador anterior', 'undo-source', () =>
      byId('undo-demo').click()
    );
  empty.hidden = true;
  $('.file-actions').prepend(empty, undo);
  const scaffold = button('Insertar estructura BOOL', 'scl-scaffold', () =>
    api.loadSource(
      'VAR_INPUT\n  I0 : BOOL;\nEND_VAR\nVAR_OUTPUT\n  Q0 : BOOL;\nEND_VAR\n\nQ0 := I0;\n'
    )
  );
  $('.file-actions').append(scaffold);
  const p = panel(
    'truth-table',
    'Tabla de verdad de tu programa',
    'Cada fila es una combinación de entradas. Aplicar la lleva al banco del mismo programa. La verificación del motor cubre todas las combinaciones; la tabla se pagina de 32 en 32.'
  );
  const tools = el('div', undefined, 'ab-table-tools'),
    prev = button('Anterior', 'truth-prev'),
    next = button('Siguiente', 'truth-next'),
    state = el('span'),
    output = el('div');
  output.id = 'truth-results';
  let page = 0;
  tools.append(prev, state, next);
  p.append(tools, output);
  function truth() {
    const data = api.analysis();
    output.replaceChildren();
    if (!data) {
      output.append(
        el(
          'p',
          'Escribe y analiza un programa válido para generar su tabla.',
          'ab-empty'
        )
      );
      state.textContent = 'Sin programa analizado';
      prev.disabled = next.disabled = true;
      return;
    }
    const inputs = data.ast.inputNames,
      outputs = data.ast.outputNames,
      total = 2 ** inputs.length;
    page = Math.max(0, Math.min(page, Math.ceil(total / 32) - 1));
    const rows = [];
    for (
      let bits = page * 32;
      bits < Math.min(total, (page + 1) * 32);
      bits++
    ) {
      const values = Object.fromEntries(
          inputs.map((n, i) => [n, Boolean(bits & (1 << i))])
        ),
        st = outputs.map((n) => core.evaluate(data.ast.assigns[n], values)),
        kop = core.evaluateKop(data.model, values),
        apply = button('Aplicar', null, () => {
          api.simulate(values);
          sdk.workspace?.activate('Código');
        });
      rows.push([
        ...inputs.map((n) => (values[n] ? '1' : '0')),
        ...st.map((v) => (v ? '1' : '0')),
        outputs.every((n, i) => st[i] === kop[n]) ? '✓ ST = KOP' : 'DIFERENCIA',
        apply
      ]);
    }
    output.append(
      table(
        [...inputs, ...outputs.map((n) => '→ ' + n), 'Equivalencia', 'Banco'],
        rows
      )
    );
    state.textContent = `${page * 32 + 1}–${Math.min(total, (page + 1) * 32)} de ${total} combinaciones`;
    prev.disabled = page === 0;
    next.disabled = (page + 1) * 32 >= total;
  }
  prev.onclick = () => {
    page--;
    truth();
  };
  next.onclick = () => {
    page++;
    truth();
  };
  byId('convert').addEventListener('click', () => {
    page = 0;
    truth();
  });
  byId('source').addEventListener('input', truth);
  byId('source').addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      byId('convert').click();
    }
  });
  window.addEventListener('ab-suite:new-document', truth);
  new MutationObserver(truth).observe(byId('conversion-result'), {
    childList: true
  });
  truth();
  const go = button('Ir al error', 'scl-go-error', () => {
    const match = byId('notice').textContent.match(/l[ií]nea\s+(\d+)/i);
    if (!match) return;
    const t = byId('source'),
      line = Number(match[1]),
      lines = t.value.split('\n'),
      start = lines.slice(0, line - 1).join('\n').length + (line > 1 ? 1 : 0);
    t.focus();
    t.setSelectionRange(start, start + (lines[line - 1]?.length ?? 0));
    t.scrollTop = Math.max(0, (line - 3) * 25);
    sdk.workspace?.activate('Código');
  });
  $('#diagnostics .section-head').append(go);
}
