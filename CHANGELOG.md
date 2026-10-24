# Changelog

## 0.6.1 — 2026-10-24 · Revisión actual

- KOP: borrar la última red desde barra/Supr, deshacer y recargar el programa vacío.
- Vision: tareas en pestañas, cámara seleccionable, directo sin registros ficticios, captura y rango de luminosidad validado y portable.
- Barras compactas y controles visibles en ES/EN; errores Modbus rechazados entregan JSON en Windows.
- 235 pruebas Node, 145 Python, 123 recorridos instalados; actualización/desinstalación conservando datos.
- Documentación e interfaces de referencia unificadas; guías e imágenes sustituidas retiradas de la rama vigente.

## 0.6.0 — 2026-10-24 · Instalación e idiomas

- Instalador y portable Windows x64 por usuario con runtimes privados.
- Preferencia ES/EN común y nueve ventanas con controles dentro del área útil.

## 0.5 — 2026-10-24 · Documentos y catálogo

- Ejercicios `.absuite` portables con documentos de las nueve herramientas, validación e importación recuperable.
- Nueve herramientas visibles, favoritas y biblioteca transaccional.

## 0.3–0.4 — 2026-10-24 · Trabajo propio e integración

- Lienzo HMI, redes KOP y creación/recuperación de trabajos propios en las nueve herramientas.
- Supervisión de la CPU residente, coherencia de señales y contratos tipados.

## 0.2.0 — 2026-10-23 · Distribución integrada

- Catálogo, arranque y origen comunes para nueve aplicaciones; motores propios incorporados con licencia y procedencia.
- Sistema visual AB Suite, navegación y guías comunes; recorridos de escritorio/móvil.
- CPU residente única para laboratorio, editores PLC y Modbus; transferencia validada desde KOP/SCL.
- SCADA como editor HMI de pantallas del usuario, con cuatro componentes vinculables y control de calidad de señales.
- AB BI con espacios independientes, inicio vacío, importación con destino y validación conjunta, recuperación entre espacios y ejemplos opcionales.
- Captura explícita de CPU en el modelo BI nativo y conexión del servicio opcional de cámara IP.
- Conservación del bus/SDK Core v1; su arranque separado pasa a `npm run bus`.
- Normas de producto, arquitectura y auditoría de capacidades. Pruebas nativas y de interfaz integradas en CI.

## 0.1.0 — 2026-10-23

- Primer repositorio independiente AB-Suite Core, extraído del prototipo del simulador PLC.
- Bus HTTP/SSE localhost, contratos JSON v1, tokens efímeros específicos por aplicación.
- Histórico con secuencia monótona, replay, gestión de cursor caducado HTTP 409.
- SDK JavaScript, cliente SSE y puente read-only hacia una CPU inyectada.
- Pruebas unitarias y tests de servidor TCP local, CI Ubuntu/Windows/macOS.
- Ejemplos de suscripción y emisor sintético Vision.

### Limitaciones

Sin persistencia después de reinicio, garantía exactly-once, uso en red industrial ni adaptadores productivos para todos los editores.
