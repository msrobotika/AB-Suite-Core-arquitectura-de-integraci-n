# Contraste de la auditoría aportada · 24 de octubre de 2026

Alcance: código y documentación de esta distribución, pruebas locales y CI de su revisión. El texto externo no acredita por sí mismo haber auditado cada repositorio, el perfil público ni equipos industriales. Sus elogios y porcentajes no son criterios de aceptación.

| Recomendación | Evidencia encontrada | Acción y estado |
| --- | --- | --- |
| CONTRIBUTING y SECURITY | Ya existían en la raíz y en varios motores | Actualizados: distinguían mal el antiguo Core y la suite persistente. Canal de reporte explicado sin inventar correo o SLA |
| Estilos comunes | Barra y tokens en shell.css; taller central en workbench.css | Mantener y probar. CI detectó que Fuente IP de Vision desbordaba 31 px en Linux a 1280×720; credenciales opcionales pasan a diálogo y Medición separa escala/tolerancias sin rebajar la prueba |
| Contratos compartidos | Core ya valida emisor/tema/tipos/tamaño; navegador valida señales y caducidad | Añadido submódulo público contracts con interfaces TypeScript y los mismos validadores. CI compila consumidores válidos y errores esperados. Sin duplicar la CPU ni crear otro repositorio |
| SSRF | Vision valida RFC1918 literal/aprobación, bloquea DNS/loopback/link-local/públicas y redirects; Modbus limita destinos y FC01–04 | Añadidas pruebas de bloqueo antes de abrir red en Vision. Mantener límites: RFC1918 autorizado no demuestra identidad del equipo; quedan endurecimientos de recursos y plazo total de Vision |
| Errores accionables | Modbus podía mostrar OSError del sistema; cámara daba un mensaje genérico | API Modbus indica destino, puerto y pasos; Vision indica conectividad y JPEG/MJPEG. Se prueban mensajes sin credenciales ni detalle interno |
| Flujo completo | CPU/Modbus y captura BI ya se verifican, pero INTEGRATIONS seguía describiendo adaptadores antiguos | Actualizada la matriz y añadida práctica PLC → Modbus → BI. No afirmar que todas las herramientas utilizan SSE |
| Badges | CI único cubre motores y navegador de la suite | Badge real y enlaces a licencia, contribución y seguridad en README. Un badge de la suite no acredita el CI independiente de nueve repositorios |
| Distribución binaria | Windows x64 incluye instalador y portable con Node/Python privados | Verificados arranque con PATH vacío, actualización y desinstalación conservando datos. Código fuente mantiene requisitos propios; firma y paquetes nativos macOS/Linux siguen pendientes |
| Nombres de repositorio | Nombres históricos inconsistentes, preservados en procedencia y enlaces | Preparar una migración coordinada con mapa de URLs, consumidores, dependencias Git fijadas y CI. No renombrar repositorios como un cambio cosmético aislado |
| GIF/video | Recomendación de documentación, no evidencia de producto | Prioridad: recorrido reproducible y resultado comprobable. Una grabación futura deberá mostrar la ejecución real y no autoriza difusión en redes |

## Prioridad siguiente

Las correcciones de interfaz y la distribución Windows están verificadas en 0.6.1. Siguen pendientes usuarios externos, accesibilidad completa, cámaras físicas, sesiones prolongadas y paquetes nativos macOS/Linux. El endurecimiento adicional de Vision conserva sus propios criterios; el paquete Windows no acredita esas tareas.

El estándar sigue siendo [RELEASE_READINESS.md](RELEASE_READINESS.md): no hay certificación, lanzamiento estable ni anuncio autorizado por esta revisión.

## Fuentes de investigación

[OWASP: prevención SSRF](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html), [TypeScript: discriminación y validación de tipos](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) y [PyInstaller](https://pyinstaller.org/en/stable/). Sirven de referencia técnica; los motores, interfaces y contratos son propios.
