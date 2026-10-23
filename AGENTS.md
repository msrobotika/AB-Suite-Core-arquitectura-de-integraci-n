# Reglas de desarrollo de AB Suite

Este repositorio es la fuente de la distribución integrada. `apps/sources.json` conserva el origen y revisión de los motores propios incorporados. Las aplicaciones independientes se conservan como antecedentes; las mejoras de esta suite se hacen aquí para poder probar y distribuir un conjunto coherente.

## Requisitos de producto

- Toda herramienta se abre desde el catálogo en `/apps/<id>/`. Abrir y exportar son acciones distintas.
- Toda herramienta declara propósito, capacidades reales, límites y una práctica reproducible en `web/catalog.js`.
- Usar la barra, los tokens y componentes de `web/shell.css`. No crear otro menú global ni un sistema de estilos independiente.
- Programar, ejecutar e inspeccionar deben actuar sobre el mismo proyecto/motor. No introducir una segunda CPU ni datos de demostración como sustituto silencioso de una conexión fallida.
- BI comienza vacío. Crear, importar y abrir un ejemplo deben conservar los demás espacios. Validar todos los archivos antes de crear un espacio de importación.
- No reemplazar trabajo del usuario sin una acción explícita y una vía de recuperación. Importaciones y restauraciones deben ser reversibles o abrir un espacio nuevo.
- Nunca representar una señal ausente/caducada como cero. Mantener origen, calidad, tiempo y unidades. No afirmar interconexión si solo existe una captura o un enlace al repositorio.
- Los errores de validación se explican junto a la operación. Un botón visible tiene que funcionar; si una capacidad no existe, no anunciarla.
- Mantener los formatos y las licencias. No copiar interfaces, código, marcas ni activos de productos comerciales. Las referencias funcionales se documentan como investigación, no como diseño para calcar.

## Verificación

Ejecutar `node scripts/check-workspace.mjs` y las pruebas Python de los motores afectados. Ante cambios de navegación, proyecto, integración o estilos, ejecutar los recorridos de navegador correspondientes y revisar capturas de escritorio y móvil.

No presentar una prueba omitida o un error HTTP esperado como un éxito general. Distinguir pruebas de motor, de red y recorridos de interfaz. Una captura decorativa no sustituye a ninguna de ellas.

Mantener actualizados README, matriz de capacidades y evidencia de validación. No versionar `.suite-data`, `.venv`, credenciales, proyectos del usuario o resultados temporales.
