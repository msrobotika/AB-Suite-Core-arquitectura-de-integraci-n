/** AB Suite · grafcet workbench extensions, using its native engine. MIT. */
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
  const fresh = button('＋ Secuencia nueva', 'new-grafcet', () =>
    byId('suite-new')?.click()
  );
  fresh.hidden = true;
  $('.toolbar').prepend(fresh);
  const align = button('Ordenar etapas', 'grafcet-layout', () =>
      sdk.adapter.layout()
    ),
    zoom = el('select');
  zoom.id = 'grafcet-zoom';
  zoom.setAttribute('aria-label', 'Zoom del diagrama');
  for (const [v, t] of [
    [0.5, '50 %'],
    [0.75, '75 %'],
    [1, '100 %'],
    [1.5, '150 %']
  ]) {
    const o = el('option', t);
    o.value = v;
    zoom.append(o);
  }
  zoom.value = '1';
  zoom.onchange = () => (byId('diagram').style.zoom = zoom.value);
  $('.toolbar').append(align, zoom);
  byId('fit').onclick = () => {
    const svg = byId('diagram'),
      view = byId('diagram-viewport');
    svg.style.zoom = Math.min(
      (view.clientWidth - 20) / svg.viewBox.baseVal.width,
      (view.clientHeight - 20) / svg.viewBox.baseVal.height
    );
    view.scrollTo(0, 0);
  };
}
