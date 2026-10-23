# Preparación del producto y difusión

Estado: **desarrollo; lanzamiento y difusión del perfil aplazados** por decisión del propietario. Una versión de trabajo, una PR o un ZIP de revisión no autorizan publicaciones en redes. No se ha preparado una automatización de difusión.

«Premium» es un objetivo de calidad, no un estado que se obtenga cambiando una etiqueta. Antes de proponer un lanzamiento deben quedar verificadas las condiciones siguientes para la distribución exacta que se vaya a entregar.

## Condiciones de aceptación

1. **Uso real por disciplina.** Cada aplicación debe permitir crear un ejercicio propio, ejecutarlo, observar un resultado explicable, guardarlo y volver a abrirlo. Un recorrido no puede depender de la demo. Repetir el ejercicio con un usuario nuevo y documentar dónde se bloquea.
2. **Coherencia.** Una entrada para todas las herramientas, identidad AB, patrones comunes de proyecto/ejecución/error, área central de trabajo amplia y herramientas periféricas plegables. Auditar todas las aplicaciones, no solo KOP y HMI.
3. **Integridad del trabajo.** Rechazo atómico de archivos inválidos, recuperación ante importación o restauración, límites de almacenamiento visibles, pruebas de proyectos grandes y de los límites declarados. Comprobar migraciones con archivos de versiones distribuidas.
4. **Motores e interconexión.** El resultado procede del programa y motor anunciados. Fallos de servicios y señales caducadas se explican. La suite no afirma compatibilidad industrial, control físico ni lenguajes completos que no implementa.
5. **Instalación.** Probar el ZIP final en equipos limpios de Windows, Linux y macOS, con las versiones mínimas declaradas de Node y Python, incluyendo instalación fallida, recuperación, rutas con espacios y desinstalación de dependencias locales.
6. **Interacción y accesibilidad.** Revisión completa con teclado, lector de pantalla y escalado de texto, contraste medido, foco y controles táctiles; tamaños de pantalla reales y navegadores Chrome/Edge/Firefox/Safari según soporte decidido. No declarar una conformidad que no se haya auditado.
7. **Robustez y rendimiento.** Sesiones largas y carga máxima de cada motor, memoria/historial acotados, desconexión y recuperación, almacenamiento lleno, exportaciones reimportables y comportamiento con varias pestañas. No tener incidencias críticas abiertas ni controles visibles sin implementación.
8. **Distribución y documentación.** CI del mismo commit aprobada, paquete sin datos personales, dependencias/licencias identificadas, guía reproducible, notas de versión y límites visibles en el producto. Verificar el paquete extraído, no solo el árbol de desarrollo.

## Evidencia actual y pendientes

La distribución tiene pruebas de motores, contratos e integración; recorridos de las nueve herramientas, BI con datos propios y nuevos recorridos de edición KOP/HMI. `VALIDATION.md` identifica comandos y alcance. Las capturas se generan ejecutando los editores.

Quedan pendientes la auditoría de accesibilidad completa, el estudio con usuarios ajenos al desarrollo, las instalaciones en equipos limpios de los tres sistemas, sesiones prolongadas/carga máxima y validación manual de navegadores adicionales. También queda revisar con este criterio la ergonomía profunda de SCL, GRAFCET, comunicaciones, visión, PLC y BI. La prueba automatizada actual no sustituye esas actividades.

Los símbolos HMI, la geometría y la navegación ya son utilizables para prácticas de supervisión. Funciones mayores como grupos, rotación libre, escritura de consignas a la CPU virtual, librerías de usuario o nuevos lenguajes requieren diseño, implementación y evidencia propia antes de anunciarse.

No publicar ni anunciar el perfil hasta completar la evaluación del producto y recibir una instrucción expresa del propietario para su difusión.
