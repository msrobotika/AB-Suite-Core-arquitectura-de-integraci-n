# Changelog

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
