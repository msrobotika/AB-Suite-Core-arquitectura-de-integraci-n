/** Native workbench extensions are independent modules; the host owns common chrome. MIT. */
const sdk = window.ABSuite;
const supported = [
  'kop',
  'scl',
  'grafcet',
  'vision',
  'modbus',
  'serial',
  'scada',
  'bi',
  'plc'
];
if (supported.includes(sdk.id)) {
  const { mount } = await import('./studios/' + sdk.id + '.js');
  await mount(sdk);
}
