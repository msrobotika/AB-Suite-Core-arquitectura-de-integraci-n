# Estándar de producto · AB Suite

## Identidad

AB Suite es un taller de programación y experimentación. Su unidad de trabajo es un ejercicio que el usuario puede crear, ejecutar, observar y explicar. La suite se organiza por tarea: programación, ejecución, interfaces, comunicaciones, visión y datos. No es un catálogo de fábricas de demostración.

La marca común es **AB Suite · MS ROBOTIKA**. Los identificadores cortos Pl/Ko/Sc/Gr/Hm/Mb/Se/Vi/Bi, los colores por disciplina y la composición tipográfica son una implementación propia. No se incorporan activos, iconos, tipografías descargadas ni código de productos comerciales.

## Sistema visual

- Fondo `#10141d`, superficie `#181e29`, borde `#30394a`, texto `#eef1f6`, texto secundario `#a5afc1`.
- Acento mint para la suite, azul para ejecución, lavanda para SCL, rosa para HMI, dorado para datos; acentos completos en `web/catalog.js`.
- Tipografía del sistema; jerarquía clara, cifras tabulares, código con fuente monoespaciada. Sin dependencias CDN.
- Espaciados de 4/8/12/16/24/32 px; paneles de 14 px de radio y controles de 8 px. El área de edición tiene prioridad sobre métricas y adornos.
- Estados: disponible, detenido, error, sin señal y caducado. El color se acompaña de texto o símbolo; no es la única indicación.
- Barra común de 68 px en escritorio y 110 px en móvil, con cambio de aplicación, conexiones y guía. Los controles del ejercicio quedan dentro de su herramienta.

## Interacciones comunes

1. **Abrir** ejecuta la herramienta desde el catálogo. No descarga código ni lleva a GitHub.
2. **Crear** produce un trabajo propio y vacío. Los ejemplos son opcionales e identificados.
3. **Editar** conserva borradores y distingue lo editado de lo que se está ejecutando.
4. **Ejecutar** muestra el motor y el proyecto que realmente intervienen. Un cambio de código exige validación antes de cargarlo.
5. **Inspeccionar** explica por qué cambia una salida, transición, trama, detección o cálculo.
6. **Guardar/exportar** identifica formato, contenido y destino. La exportación no sustituye a un arranque de aplicación.
7. **Recuperar** permite deshacer ediciones, volver a abrir otro espacio o recuperar el archivo exportado.

En BI, los espacios son independientes y persisten en disco. La importación propone crear un espacio y también permite añadir tablas al actual; la validación es conjunta. Los ejemplos y proyectos `.abbi` se abren como espacios nuevos. Las expresiones son una función propia; su gramática y compatibilidad parcial se documentan sin presentar AB BI como una réplica de otra marca.

## Accesibilidad y errores

Usar HTML semántico, etiquetas de campos, controles nativos y foco visible. Los diálogos nuevos permiten Escape y devuelven el foco. Las operaciones no dependen exclusivamente de arrastrar. Reducir movimiento si el usuario lo solicita. Comprobar tablas/diagramas con desplazamiento interno y ausencia de desbordamiento de la página en móvil.

No anunciar conformidad WCAG sin una auditoría completa. Las referencias de teclado, foco y contraste se basan en [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

Un error de archivo, formato, conexión o almacenamiento no debe restaurar una demo ni inventar resultados. Mostrar causa y siguiente acción, conservar el trabajo válido y permitir repetir la operación.

## Incorporar una herramienta

Crear `apps/<id>` con su licencia, fuentes y pruebas; registrar su procedencia; declarar la entrada y su tipo de motor en el servidor; añadir ficha y práctica en el catálogo; reutilizar la barra y el contrato de señales; y completar al menos un recorrido con trabajo del usuario. Si necesita servicio, lo arranca el lanzador común y su ausencia se indica en el catálogo. No añadir instrucciones de instalación incompatibles en el flujo normal.

## Investigación funcional

Las fuentes sirven para estudiar principios, no para copiar pantallas. Se consultaron documentación oficial sobre [vinculación de propiedades a señales](https://www.docs.inductiveautomation.com/docs/8.1/ignition-modules/perspective/working-with-perspective-components/bindings-in-perspective), [comunicación entre contextos del mismo origen](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API) y accesibilidad W3C. El editor HMI, sus componentes y la biblioteca de espacios AB BI están implementados en este repositorio.
