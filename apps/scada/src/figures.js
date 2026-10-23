/** Original vector primitives for AB HMI. No external assets or executable markup. MIT. */
export const FIGURES = [
  'rectangle',
  'ellipse',
  'line',
  'text',
  'pipe',
  'tank',
  'pump',
  'valve',
  'motor'
];
const ns = 'http://www.w3.org/2000/svg';
function node(tag, attrs, text) {
  const n = document.createElementNS(ns, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text !== undefined) n.textContent = text;
  return n;
}
export function drawFigure(w, signal) {
  const root = document.createElement('div');
  root.className = 'figure-drawing';
  root.style.width = '100%';
  root.style.height = '100%';
  if (w.type === 'text') {
    const text = document.createElement('span');
    text.className = 'text-shape';
    text.style.color = w.stroke;
    text.textContent = w.label;
    root.append(text);
    return root;
  }
  const svg = node('svg', {
    viewBox: '0 0 100 100',
    preserveAspectRatio: ['pump', 'motor', 'valve'].includes(w.type)
      ? 'xMidYMid meet'
      : 'none',
    class: 'figure-svg',
    role: 'img',
    'aria-label': w.label
  });
  const good = signal?.quality === 'good',
    active = good && Boolean(signal.value),
    color = active ? '#77dfc7' : w.stroke;
  const add = (tag, attrs, text) => {
    const e = node(
      tag,
      {
        fill: w.fill,
        stroke: color,
        'stroke-width': w.strokeWidth,
        'vector-effect': 'non-scaling-stroke',
        ...attrs
      },
      text
    );
    svg.append(e);
    return e;
  };
  if (w.type === 'rectangle')
    add('rect', { x: 2, y: 2, width: 96, height: 96, rx: 3 });
  if (w.type === 'ellipse') add('ellipse', { cx: 50, cy: 50, rx: 47, ry: 47 });
  const ends =
    w.direction === 'vertical'
      ? { x1: 50, y1: 0, x2: 50, y2: 100 }
      : w.direction === 'diagonal'
        ? { x1: 0, y1: 100, x2: 100, y2: 0 }
        : { x1: 0, y1: 50, x2: 100, y2: 50 };
  if (w.type === 'line') add('line', ends);
  if (w.type === 'pipe') {
    add('line', {
      ...ends,
      'stroke-width': w.strokeWidth * 4 + 4,
      stroke: w.stroke
    });
    add('line', { ...ends, 'stroke-width': w.strokeWidth * 4, stroke: w.fill });
  }
  if (w.type === 'tank') {
    add('path', { d: 'M15 12Q50 -2 85 12V84Q50 103 15 84Z' });
    if (good) {
      const fraction = Math.max(
        0,
        Math.min(1, (Number(signal.value) - w.min) / (w.max - w.min))
      );
      add('rect', {
        x: 18,
        y: 82 - 65 * fraction,
        width: 64,
        height: 65 * fraction,
        fill: '#77dfc755',
        stroke: 'none'
      });
    }
    add('path', { d: 'M15 12Q50 28 85 12 M15 84Q50 65 85 84', fill: 'none' });
  }
  if (w.type === 'pump') {
    add('circle', { cx: 50, cy: 50, r: 36 });
    add('path', {
      d: 'M29 28L76 50L29 72Z',
      fill: active ? '#77dfc7' : w.fill
    });
    add('path', {
      d: 'M0 50H14 M86 50H100 M28 87H72 M35 83V87 M65 83V87',
      fill: 'none'
    });
  }
  if (w.type === 'valve') {
    add('path', { d: 'M5 25L95 75V25L5 75Z' });
    add('path', { d: 'M50 50V8 M28 8H72 M0 50H5 M95 50H100', fill: 'none' });
  }
  if (w.type === 'motor') {
    add('circle', { cx: 50, cy: 50, r: 37 });
    add(
      'text',
      {
        x: 50,
        y: 61,
        'font-size': 34,
        'font-family': 'Consolas,monospace',
        'text-anchor': 'middle',
        fill: color,
        stroke: 'none'
      },
      'M'
    );
    add('path', {
      d: 'M0 50H13 M87 50H100 M25 92H75 M35 85V92 M65 85V92',
      fill: 'none'
    });
  }
  svg.setAttribute(
    'aria-label',
    w.label +
      (good
        ? ' · ' +
          (w.type === 'tank'
            ? signal.value + ' ' + w.unit
            : active
              ? 'ACTIVA'
              : 'INACTIVA')
        : '')
  );
  root.append(svg);
  if (['tank', 'pump', 'motor', 'valve'].includes(w.type)) {
    const label = document.createElement('span');
    label.className = 'figure-label';
    label.textContent = w.label;
    root.append(label);
    if (w.type === 'tank') {
      const reading = document.createElement('span');
      reading.className = 'figure-reading';
      reading.textContent = good
        ? Number(signal.value).toLocaleString('es-ES', {
            maximumFractionDigits: 1
          }) +
          ' ' +
          w.unit
        : '—';
      root.append(reading);
    }
    if (good && w.type !== 'tank') {
      const state = document.createElement('span');
      state.className = 'figure-state';
      state.textContent = active ? 'ACTIVA' : 'INACTIVA';
      root.append(state);
    }
    if (!good) {
      const quality = document.createElement('span');
      quality.className = 'widget-quality';
      quality.textContent = !w.tag
        ? 'Sin vincular'
        : signal.quality === 'stale'
          ? 'Señal caducada'
          : 'Sin señal';
      root.append(quality);
    }
  }
  return root;
}
