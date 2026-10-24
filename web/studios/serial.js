/** AB Suite · serial workbench extensions, using its native engine. MIT. */
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
  const p = panel(
      'manual-rtu',
      'Tu propia trama RTU',
      'Escribe una ADU completa o un cuerpo sin CRC. El motor original calcula y comprueba CRC16. Esta operación no transmite ni añade tráfico a la captura.'
    ),
    form = el('form'),
    label = el('label', 'Hexadecimal'),
    hex = el('textarea');
  hex.id = 'manual-hex';
  hex.rows = 5;
  hex.maxLength = 1024;
  hex.spellcheck = false;
  label.append(hex);
  const appendLabel = el('label', undefined, 'ab-check'),
    append = el('input');
  append.type = 'checkbox';
  append.id = 'manual-append-crc';
  appendLabel.append(
    append,
    document.createTextNode(
      'Calcular y añadir CRC al texto (introducido sin CRC)'
    )
  );
  const run = button('Decodificar', 'manual-decode'),
    sample = button('Cargar ejemplo de lectura', 'manual-example', () => {
      hex.value = '01 03 00 00 00 02';
      append.checked = true;
    }),
    out = el('div');
  out.id = 'manual-result';
  form.append(label, appendLabel, run, sample);
  p.append(form, out);
  run.onclick = async () => {
    run.disabled = true;
    try {
      const result = await sdk.serial.decode(hex.value, append.checked);
      out.replaceChildren(
        el('p', result.hex),
        table(
          ['Campo', 'Resultado'],
          [
            ['Unidad', result.unit],
            ['Función', result.function_name || result.function],
            ['Tipo', result.kind],
            ['CRC recibido', result.crc_received],
            ['CRC calculado', result.crc_calculated],
            ['Integridad', result.valid ? 'VÁLIDA' : 'NO FIABLE'],
            ['Detalle', result.detail]
          ]
        )
      );
      if (result.values?.length)
        out.append(
          table(
            ['Índice', 'Valor'],
            result.values.map((v, i) => [i, v])
          )
        );
    } catch (err) {
      out.replaceChildren();
      error(out, err);
    } finally {
      run.disabled = false;
    }
  };
  form.onsubmit = (e) => {
    e.preventDefault();
    run.click();
  };
  window.addEventListener('ab-suite:new-document', () => {
    hex.value = '';
    out.replaceChildren();
  });
}
