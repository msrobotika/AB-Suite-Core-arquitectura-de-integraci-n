/** AB Suite · modbus workbench extensions, using its native engine. MIT. */
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
import { parseTcp, registerViews } from '../protocol-lab.js';
export async function mount(sdk) {
  const p = panel(
      'packet-lab',
      'Inspector de ADU TCP',
      'Pega una trama propia o copia una del monitor. El análisis es local: no envía paquetes. Elige la dirección para evitar interpretar una solicitud como respuesta.'
    ),
    form = el('form'),
    label = el('label', 'ADU hexadecimal'),
    hex = el('textarea');
  hex.id = 'packet-hex';
  hex.rows = 4;
  hex.maxLength = 1600;
  hex.spellcheck = false;
  label.append(hex);
  const direction = el('select');
  direction.id = 'packet-direction';
  direction.setAttribute('aria-label', 'Dirección de la trama');
  for (const [v, t] of [
    ['request', 'Solicitud'],
    ['response', 'Respuesta']
  ]) {
    const o = el('option', t);
    o.value = v;
    direction.append(o);
  }
  const controls = el('div', undefined, 'ab-table-tools'),
    parse = button('Interpretar trama', 'packet-parse'),
    sample = button('Cargar ejemplo FC03', 'packet-example', () => {
      hex.value = '00 01 00 00 00 06 01 03 00 00 00 02';
      direction.value = 'request';
    }),
    last = button('Usar última trama', 'packet-latest', () => {
      const frame = sdk.adapter
        .frames()
        .filter((x) => x.hex)
        .at(-1);
      if (!frame)
        return error(
          out,
          Error('Ejecuta una lectura para disponer de una trama.')
        );
      hex.value = frame.hex;
      direction.value = frame.direction === 'RX' ? 'response' : 'request';
    }),
    out = el('div');
  out.id = 'packet-result';
  controls.append(direction, parse, sample, last);
  form.append(label, controls);
  p.append(form, out);
  const order = el('select');
  order.id = 'register-byte-order';
  order.setAttribute('aria-label', 'Orden de bytes para float32');
  for (const value of ['ABCD', 'CDAB', 'BADC', 'DCBA']) {
    const o = el('option', value);
    order.append(o);
  }
  controls.append(order);
  parse.onclick = () => {
    try {
      const data = parseTcp(hex.value, direction.value);
      out.replaceChildren(table(['Bytes', 'Campo', 'Valor'], data.fields));
      if (data.values.length && typeof data.values[0] === 'number') {
        const decoded = registerViews(data.values, order.value);
        out.append(
          table(
            ['Registro', 'uint16', 'int16', 'Hex', 'Binario'],
            decoded.rows.map((r) => [
              r.index,
              r.unsigned,
              r.signed,
              r.hex,
              r.binary
            ])
          )
        );
        if (decoded.float !== null)
          out.append(
            el(
              'p',
              'Primer par como float32 (' +
                order.value +
                '): ' +
                (Number.isFinite(decoded.float) ? decoded.float : 'No finito')
            )
          );
      } else if (data.values.length)
        out.append(
          table(
            ['Bit', 'Estado'],
            data.values.map((v, i) => [i, v ? '1' : '0'])
          )
        );
    } catch (err) {
      out.replaceChildren();
      error(out, err);
    }
  };
  form.onsubmit = (e) => {
    e.preventDefault();
    parse.click();
  };
  const csv = button('Exportar registros CSV', 'read-values-csv', () => {
    const reading = sdk.adapter.reading();
    if (!reading)
      return error(byId('notice'), Error('No hay una lectura para exportar.'));
    const r = reading.result;
    download(
      'AB-Modbus-registros.csv',
      'timestamp,funcion,direccion,valor\r\n' +
        r.values
          .map((v, i) =>
            [
              new Date(reading.at).toISOString(),
              r.function,
              r.address + i,
              v
            ].join(',')
          )
          .join('\r\n'),
      'text/csv;charset=utf-8'
    );
  });
  $('#resultados .panel-title').append(csv);
  const refreshExport = () => (csv.disabled = !sdk.adapter.reading());
  new MutationObserver(refreshExport).observe(byId('notice'), {
    childList: true
  });
  refreshExport();
}
