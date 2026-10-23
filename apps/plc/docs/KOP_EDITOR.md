# Editor KOP visual · v0.2

## Alcance real

El panel **Editor KOP** es un editor gráfico funcional del AST JSON propio de AB-PLC Simulator. Representa redes como contactos NO/NC en serie (AND) y en paralelo (OR), conectadas con una instrucción de salida.

No es una implementación completa de IEC 61131-3, no importa archivos nativos Siemens/Omron y no genera código AWL ni SCL.

## Cómo se usa

1. Abre Editor KOP desde el menú lateral.
2. En cada contacto escribe una dirección (p. ej. I0.0, M0.0, Q0.0, T0 o C0) y selecciona NO o NC.
3. Usa **+ SER** para añadir un contacto en serie (AND) a continuación.
4. Usa **+ PAR** para añadir una rama en paralelo (OR) dentro del mismo punto de la red.
5. Configura la instrucción de salida: bobina, SET, RESET, TON, TOF, CTU o resetCounter.
6. Puedes añadir, borrar y reordenar redes, o deshacer/rehacer hasta 60 operaciones.
7. Pulsa **Validar y cargar** para enviar el programa al motor. Hasta ese momento, la CPU virtual continúa ejecutando la versión anterior.

El botón **Descartar** elimina las modificaciones pendientes y restaura el programa cargado. Tras cargar, el motor reinicia entradas, salidas, contadores y temporizadores (se activan las entradas de permiso I0.1 e I0.2 del ejemplo).

## Equivalencia lógica

Contacto individual: contact.

Serie: and(contact1, contact2, ...).

Paralelo: or(contact1, contact2, ...).

Una red es una serie de etapas; cada etapa puede contener contactos en paralelo. El modelo permite así condiciones como:

~~~text
 L+ --+-- I0.0 --+-- I0.2 -- ( Q0.0 ) -- N
      |          |
      +-- I0.1 --+
~~~

que compila a AND(OR(I0.0,I0.1),I0.2).

## Garantía de conservación de condiciones avanzadas

Algunas expresiones AST son más complejas que el modelo visual, por ejemplo comparadores analógicos, NOT de expresiones o un OR entre dos subredes con series diferentes. Se muestran como **red avanzada protegida** en vez de reinterpretarse incorrectamente. Su condición permanece idéntica al guardar. Para editarla utiliza el editor JSON existente.

## Validación y restricciones

La validación definitiva sigue siendo la de src/plc-engine.js: limita tamaños, direcciones, acciones y presets. Una edición inválida bloquea Validar y cargar y muestra el error, sin corromper el programa en ejecución. El editor no genera scripts ejecutables ni usa eval. Las vistas de redes y salida pueden reflejar los valores del motor actual, no un preview de ejecución de cambios pendientes.

## Pruebas

El modelo sin DOM se cubre en tests/kop-model.test.mjs. El workflow Capture screenshots ejecuta Chromium, verifica la presentación de las redes, añade una red, deshace, rehace, añade paralelo y carga el programa; genera la captura real de la interfaz KOP.

## Limitaciones pendientes

- Drag-and-drop real de elementos (por ahora botones de edición).
- Redibujado a gran escala de topologías arbitrarias y OR de ramas con secuencias diferentes.
- Simulación de hardware y E/S físicas.
- Intercambio de archivos nativos de fabricantes.
- WYSIWYG completo / editor estándar IEC certificado.

**Todos los controles, incluidos PARO y E-STOP, son exclusivamente de simulación.**
