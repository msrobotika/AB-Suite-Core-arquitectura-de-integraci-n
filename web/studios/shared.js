/** Original AB Suite UI helpers. MIT. */
export const $ = (s) => document.querySelector(s),
  byId = (id) => document.getElementById(id);
export const el = (tag, text, cls) => {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = String(text);
  if (cls) n.className = cls;
  return n;
};
export function button(label, id, action) {
  const b = el('button', label, 'suite-action');
  b.type = 'button';
  if (id) b.id = id;
  if (action) b.onclick = action;
  return b;
}
export function panel(id, title, help) {
  const p = el('section', undefined, 'ab-table-panel');
  p.id = id;
  p.append(el('h2', title), el('p', help));
  document.body.append(p);
  return p;
}
export function table(headers, rows) {
  const wrap = el('div', undefined, 'ab-table-scroll'),
    t = el('table'),
    head = el('thead'),
    tr = el('tr'),
    body = el('tbody');
  for (const h of headers) tr.append(el('th', h));
  head.append(tr);
  for (const values of rows) {
    const row = el('tr');
    for (const v of values) {
      const td = el('td');
      td.append(
        v instanceof Node ? v : document.createTextNode(String(v ?? '—'))
      );
      row.append(td);
    }
    body.append(row);
  }
  t.append(head, body);
  wrap.append(t);
  return wrap;
}
export function download(name, data, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([data], { type })),
    a = el('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
export function error(node, err) {
  node.textContent = err.message ?? err;
  node.setAttribute('role', 'alert');
}
