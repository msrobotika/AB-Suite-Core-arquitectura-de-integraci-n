/** Vision workspace: a permanent image and one compact task panel at a time. MIT. */
const $ = (selector) => document.querySelector(selector);
const make = (tag, text, cls) => {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (cls) node.className = cls;
  return node;
};
export function mountVisionWorkspace() {
  document.body.classList.add('vision-workspace');
  const rail = $('.ab-properties');
  const source = make('section');
  const recipe = make('section');
  const region = make('section');
  const measure = make('section');
  const files = make('section');
  const place = (parent, selector) => {
    const node = $(selector);
    if (node) parent.append(node);
    return node;
  };
  const heading = make('header', undefined, 'vision-inspector-heading');
  heading.append(make('strong', 'Inspector de imagen'));
  const select = make('select');
  select.id = 'vision-task';
  select.setAttribute('aria-label', 'Panel de inspección');
  heading.append(select);
  rail.prepend(heading);
  const tasks = [
    ['source', 'Fuente de imagen', source],
    ['recipe', 'Detección', recipe],
    ['region', 'Región de interés', region],
    ['measure', 'Medición', measure],
    ['files', 'Receta y archivos', files]
  ];
  for (const [id, label, panel] of tasks) {
    const option = make('option', label);
    option.value = id;
    select.append(option);
    panel.id = 'vision-panel-' + id;
    panel.className = 'vision-task-panel';
    panel.setAttribute('aria-label', label);
    rail.append(panel);
  }
  const hint = make(
    'p',
    'Inspecciona piezas o fotogramas de producto lineal continuo. La detección utiliza los mismos criterios visuales.',
    'vision-context'
  );
  source.append(hint);
  const sourceType = make('select');
  sourceType.id = 'vision-source-type';
  sourceType.setAttribute('aria-label', 'Configurar fuente');
  const groups = [];
  for (const [id, label] of [
    ['file', 'Archivo de imagen'],
    ['usb', 'Cámara USB'],
    ['ip', 'Cámara IP']
  ]) {
    const option = make('option', label);
    option.value = id;
    sourceType.append(option);
    const group = make('div');
    group.dataset.source = id;
    groups.push(group);
  }
  source.append(sourceType, ...groups);
  // Keep the native file input in its label; all other controls retain their handlers.
  const fileInput = $('#image-file');
  const fileLabel = make('label', 'Abrir imagen', 'button file-button');
  fileLabel.append(fileInput);
  groups[0].append(fileLabel);
  place(groups[0], '#demo');
  for (const id of ['camera-start', 'capture', 'camera-stop', 'auto'])
    place(groups[1], '#' + id);
  const ip = place(groups[2], '#ip-camera-panel');
  ip.open = true;
  const ipInfo = ip.querySelector('.small-muted');
  const infoButton = make('button', 'Formatos y límites');
  infoButton.type = 'button';
  const infoDialog = make('dialog', undefined, 'suite-guide');
  infoDialog.setAttribute('aria-label', 'Conexión de cámara');
  const close = make('button', 'Cerrar ×');
  close.type = 'button';
  close.onclick = () => infoDialog.close();
  infoDialog.append(close, make('h2', 'Cámara IP'), ipInfo);
  document.body.append(infoDialog);
  infoButton.onclick = () => infoDialog.showModal();
  groups[2].append(infoButton);
  const credentials = make('dialog', undefined, 'suite-guide');
  credentials.setAttribute('aria-label', 'Credenciales de cámara IP');
  const credentialsOpen = make('button', 'Usuario y contraseña');
  credentialsOpen.type = 'button';
  credentialsOpen.id = 'vision-ip-credentials';
  const credentialsClose = make('button', 'Guardar y volver');
  credentialsClose.type = 'button';
  credentialsClose.onclick = () => credentials.close();
  credentials.append(
    make('h2', 'Acceso a la cámara'),
    make(
      'p',
      'Opcional: solo para cámaras con autenticación HTTP Basic. Estos campos permanecen en esta sesión y no se guardan en el proyecto.'
    ),
    $('#ip-user').parentElement,
    $('#ip-password').parentElement,
    credentialsClose
  );
  document.body.append(credentials);
  credentialsOpen.onclick = () => credentials.showModal();
  const connectionHelp = make('div', undefined, 'vision-connection-help');
  connectionHelp.append(credentialsOpen, infoButton);
  groups[2].append(connectionHelp);
  sourceType.onchange = () => {
    hint.hidden = sourceType.value !== 'file';
    for (const group of groups)
      group.hidden = group.dataset.source !== sourceType.value;
  };
  sourceType.onchange();
  const feed = $('#feed-status');
  feed.classList.add('vision-feed');
  $('.viewer').append(feed);
  $('.ab-actions').append($('#auto'));
  // Move field wrappers, preserving native labels and events.
  recipe.append($('#lot').parentElement);
  recipe.append($('#mode').parentElement);
  for (const id of ['threshold', 'min-area'])
    recipe.append($('#' + id).closest('.parameter'));
  recipe.append($('#max-defects').parentElement);
  place(recipe, '.reference-box');
  const roi = place(region, '.ab-roi-form');
  roi.open = true;
  place(region, '.selection-bar');
  region.prepend(
    make(
      'p',
      'Selecciona una zona sobre la imagen o introduce sus coordenadas en píxeles.'
    )
  );
  const calibration = place(measure, '#calibration-panel');
  calibration.open = true;
  const audit = calibration.querySelector('.camera-audit');
  const explanation = calibration.querySelector('.small-muted');
  const help = make('button', 'Cómo calibrar y qué se verifica');
  help.type = 'button';
  help.id = 'vision-calibration-help';
  const calibrationHelp = make('dialog', undefined, 'suite-guide');
  calibrationHelp.setAttribute('aria-label', 'Guía de calibración');
  const closeHelp = make('button', 'Cerrar ×');
  closeHelp.type = 'button';
  closeHelp.onclick = () => calibrationHelp.close();
  const auditStatus = $('#audit-status');
  calibration.append(auditStatus);
  calibrationHelp.append(
    closeHelp,
    make('h2', 'Calibración por patrón'),
    explanation,
    audit
  );
  document.body.append(calibrationHelp);
  help.onclick = () => calibrationHelp.showModal();
  measure.append(help);
  measure.prepend(
    make(
      'p',
      'Las dimensiones requieren un patrón visible y verificación. En producto continuo se analiza el fotograma; no se calcula la longitud acumulada.'
    )
  );
  place(files, '.recipe-actions');
  files.prepend(
    make('h3', 'Conserva tu configuración'),
    make(
      'p',
      'La receta contiene parámetros. Proyectos conserva también la imagen en este navegador. Exporta el PNG anotado y el historial desde Registro.'
    )
  );
  // Empty original wrappers no longer consume vertical space.
  $('#config').hidden = true;
  $('.tool-bar').hidden = true;
  $('.connect-panels').hidden = true;
  const open = make('button', 'Abrir imagen');
  open.type = 'button';
  open.id = 'vision-open-image';
  open.onclick = () => fileInput.click();
  $('.ab-actions').prepend(open);
  function activate() {
    for (const [id, , panel] of tasks) panel.hidden = id !== select.value;
  }
  select.value = 'recipe';
  select.onchange = activate;
  activate();
  $('.ab-document').prepend(
    make(
      'p',
      'Piezas y producto lineal continuo · inspección por imagen',
      'vision-document-context'
    )
  );
  const focus = make('button', 'Ampliar imagen');
  focus.type = 'button';
  focus.id = 'vision-focus';
  focus.setAttribute('aria-pressed', 'false');
  focus.onclick = () => {
    window.ABSuite.workspace?.activate('Inspección');
    const active = document.body.classList.toggle('vision-focus');
    focus.textContent = active ? 'Volver al taller' : 'Ampliar imagen';
    focus.setAttribute('aria-pressed', String(active));
  };
  $('.ab-actions').append(focus);
  window.addEventListener('keydown', (event) => {
    if (
      event.key === 'Escape' &&
      document.body.classList.contains('vision-focus')
    )
      focus.click();
  });
}
