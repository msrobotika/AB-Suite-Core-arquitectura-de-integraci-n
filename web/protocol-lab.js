/** Read-only Modbus TCP interpretation. Derived from the public protocol, original code. MIT. */
export function hexBytes(text) {
  if (typeof text !== 'string' || text.length > 1600)
    throw Error('Máximo 1600 caracteres hexadecimales');
  const clean = text.replace(/\s/g, '');
  if (!clean || clean.length % 2 || !/^[\da-f]+$/i.test(clean))
    throw Error(
      'Escribe pares hexadecimales completos, separados por espacios'
    );
  return Uint8Array.from(clean.match(/../g), (x) => parseInt(x, 16));
}
export function parseTcp(text, direction = 'request') {
  const bytes = hexBytes(text);
  if (bytes.length < 8 || bytes.length > 260)
    throw Error('Una ADU TCP requiere entre 8 y 260 bytes');
  if (!['request', 'response'].includes(direction))
    throw Error('Selecciona solicitud o respuesta');
  const word = (i) => bytes[i] * 256 + bytes[i + 1],
    transaction = word(0),
    protocol = word(2),
    length = word(4),
    unit = bytes[6],
    fn = bytes[7];
  if (protocol !== 0) throw Error('El identificador de protocolo debe ser 0');
  if (length !== bytes.length - 6)
    throw Error('La longitud MBAP no coincide con los bytes recibidos');
  const result = {
    transaction,
    protocol,
    length,
    unit,
    function: fn,
    kind: direction === 'request' ? 'Solicitud' : 'Respuesta',
    fields: [
      ['0–1', 'Transacción', transaction],
      ['2–3', 'Protocolo', protocol],
      ['4–5', 'Longitud', length],
      ['6', 'Unidad', unit],
      ['7', 'Función', fn]
    ],
    values: []
  };
  if (fn & 128) {
    if (direction !== 'response' || bytes.length !== 9)
      throw Error('Excepción Modbus malformada');
    result.kind = 'Excepción';
    result.exception = bytes[8];
    result.fields.push(['8', 'Código de excepción', bytes[8]]);
    return result;
  }
  if (![1, 2, 3, 4].includes(fn))
    throw Error(
      'Este inspector interpreta funciones de lectura 01–04 y sus excepciones'
    );
  if (direction === 'request') {
    if (bytes.length !== 12)
      throw Error('Una solicitud de lectura contiene 12 bytes');
    result.address = word(8);
    result.quantity = word(10);
    if (
      result.quantity < 1 ||
      result.quantity > (fn < 3 ? 2000 : 125) ||
      result.address + result.quantity > 65536
    )
      throw Error('Dirección o cantidad fuera de rango');
    result.fields.push(
      ['8–9', 'Dirección PDU', result.address],
      ['10–11', 'Cantidad', result.quantity]
    );
  } else {
    const count = bytes[8];
    if (bytes.length !== 9 + count || count < 1 || (fn >= 3 && count % 2))
      throw Error('El recuento de datos de respuesta no es válido');
    result.fields.push(['8', 'Bytes de datos', count]);
    if (fn >= 3)
      for (let i = 9; i < bytes.length; i += 2) result.values.push(word(i));
    else
      for (let i = 9; i < bytes.length; i++)
        for (let b = 0; b < 8; b++)
          result.values.push(Boolean(bytes[i] & (1 << b)));
  }
  return result;
}
export function registerViews(values, order = 'ABCD') {
  if (
    !Array.isArray(values) ||
    values.some((v) => !Number.isInteger(v) || v < 0 || v > 65535)
  )
    throw Error('Se requieren registros uint16');
  if (!['ABCD', 'CDAB', 'BADC', 'DCBA'].includes(order))
    throw Error('Orden de bytes desconocido');
  const rows = values.map((v, i) => ({
    index: i,
    unsigned: v,
    signed: v > 32767 ? v - 65536 : v,
    hex: v.toString(16).toUpperCase().padStart(4, '0'),
    binary: v.toString(2).padStart(16, '0')
  }));
  let float = null;
  if (values.length >= 2) {
    const bytes = [
        values[0] >> 8,
        values[0] & 255,
        values[1] >> 8,
        values[1] & 255
      ],
      map = { A: 0, B: 1, C: 2, D: 3 },
      array = Uint8Array.from([...order], (c) => bytes[map[c]]);
    float = new DataView(array.buffer).getFloat32(0, false);
  }
  return { rows, float };
}
