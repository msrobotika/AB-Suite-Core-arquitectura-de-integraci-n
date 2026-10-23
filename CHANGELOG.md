# Changelog

## 0.1.0 — 2026-10-23

- Primer repositorio independiente AB-Suite Core, extraído del prototipo del simulador PLC.
- Bus HTTP/SSE localhost, contratos JSON v1, tokens efímeros específicos por aplicación.
- Histórico con secuencia monótona, replay, gestión de cursor caducado HTTP 409.
- SDK JavaScript, cliente SSE y puente read-only hacia una CPU inyectada.
- Pruebas unitarias y tests de servidor TCP local, CI Ubuntu/Windows/macOS.
- Ejemplos de suscripción y emisor sintético Vision.

### Limitaciones

Sin persistencia después de reinicio, garantía exactly-once, uso en red industrial ni adaptadores productivos para todos los editores.
