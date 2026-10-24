# Reglas de desarrollo de AB Suite

Este repositorio es la fuente de la distribución integrada. `apps/sources.json` conserva el origen y revisión de los motores propios incorporados. Las aplicaciones independientes se conservan como antecedentes; las mejoras de esta suite se hacen aquí para poder probar y distribuir un conjunto coherente.

## Requisitos de producto

- El inicio es un lanzador de las nueve herramientas al mismo nivel. Se pueden usar de forma independiente; ejercicios, conexiones y ayuda son opcionales. La vista inicial siempre muestra las nueve, aunque existan favoritas. En escritorio verificar apertura visible de todas a 1280×720, 1366×768 y 1920×1080.
- Toda herramienta se abre desde el catálogo en `/apps/<id>/`. Abrir y exportar son acciones distintas.
- Toda herramienta declara propósito, capacidades reales, límites y una práctica reproducible en `web/catalog.js`.
- Usar la barra, los tokens y componentes de `web/shell.css`. No crear otro menú global ni un sistema de estilos independiente.
- Programar, ejecutar e inspeccionar deben actuar sobre el mismo proyecto/motor. No introducir una segunda CPU ni datos de demostración como sustituto silencioso de una conexión fallida.
- Toda aplicación implementa el contrato `documents.get/create/restore` y usa Nuevo/Proyectos de la barra común. Crear conserva un punto anterior, nombra el nuevo trabajo y no carga ejemplos. KOP/PLC admiten cero redes; GRAFCET explica su etapa inicial mínima. Añadir un recorrido de creación, resultado propio, reemplazo, recuperación y recarga/móvil a `verify-new-user-browser.cjs`.
- BI comienza vacío. Crear, importar y abrir un ejemplo deben conservar los demás espacios. Validar todos los archivos antes de crear un espacio de importación.
- No reemplazar trabajo del usuario sin una acción explícita y una vía de recuperación. Importaciones y restauraciones deben ser reversibles o abrir un espacio nuevo.
- Los ejercicios `.absuite` contienen documentos portables, nunca punteros locales BI ni credenciales. Añadir es explícito; no anunciar sincronización automática. Validar todos los componentes antes de importar en una entrada nueva. Conservar una copia persistente antes de abrir un componente; si falla, bloquear la apertura. Mantener `exercise-contract.js`, EXERCISES.md y los recorridos de portabilidad al ampliar herramientas o formatos.
- SCADA consulta PLC mediante la proyección autenticada de la CPU residente. Cerrar la vista PLC no interrumpe esa fuente. No sustituir una caída del servidor por telemetría de otra pestaña ni crear una segunda CPU. Verificar cierre, caducidad y recuperación en `verify-resident-browser.cjs`.
- Nunca representar una señal ausente/caducada como cero. Mantener origen, calidad, tiempo y unidades. No afirmar interconexión si solo existe una captura o un enlace al repositorio.
- Los errores de validación se explican junto a la operación. Un botón visible tiene que funcionar; si una capacidad no existe, no anunciarla.
- Mantener los formatos y las licencias. No copiar interfaces, código, marcas ni activos de productos comerciales. Las referencias funcionales se documentan como investigación, no como diseño para calcar.

- En editores, el lienzo ocupa el centro y la altura útil. Herramientas, propiedades y diagnóstico van alrededor o en paneles plegables; evitar cabeceras y métricas que desplacen el trabajo.
- Las figuras y los símbolos HMI son originales y no imponen una instalación de demostración. Vincular señales no equivale a simular el proceso representado.
- La difusión del perfil y la publicación en redes siguen aplazadas. No automatizar ni ejecutar anuncios; consultar `docs/RELEASE_READINESS.md` antes de proponer un lanzamiento.

## Verificación

Ejecutar `node scripts/check-workspace.mjs` y las pruebas Python de los motores afectados. Ante cambios de navegación, proyecto, integración o estilos, ejecutar los recorridos de navegador correspondientes y revisar capturas de escritorio y móvil.

No presentar una prueba omitida o un error HTTP esperado como un éxito general. Distinguir pruebas de motor, de red y recorridos de interfaz. Una captura decorativa no sustituye a ninguna de ellas.

Mantener actualizados README, matriz de capacidades y evidencia de validación. No versionar `.suite-data`, `.venv`, credenciales, proyectos del usuario o resultados temporales.

La biblioteca lista metadatos sin cargar imágenes/tablas completas. Toda modificación mantiene documento e índice en una transacción; archivar es reversible. Retirar componentes conserva su contenido completo e índice de recuperación. Las migraciones IndexedDB conservan ejercicios, copias y documentos activos anteriores.
