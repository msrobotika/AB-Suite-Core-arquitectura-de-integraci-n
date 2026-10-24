/** AB Suite · scada workbench extensions, using its native engine. MIT. */
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
  const toolbar = $('.hmi-canvas-head');
  toolbar.append(
    button('Centrar X', 'hmi-center-x', () => {
      try {
        sdk.adapter.arrange('center-x');
      } catch (err) {
        error(byId('hmi-notice'), err);
      }
    }),
    button('Centrar Y', 'hmi-center-y', () => {
      try {
        sdk.adapter.arrange('center-y');
      } catch (err) {
        error(byId('hmi-notice'), err);
      }
    })
  );

  const refresh = () => {
    for (const id of ['hmi-center-x', 'hmi-center-y'])
      byId(id).disabled = byId('properties').hidden;
  };
  new MutationObserver(refresh).observe(byId('properties'), {
    attributes: true,
    attributeFilter: ['hidden']
  });
  refresh();
}
