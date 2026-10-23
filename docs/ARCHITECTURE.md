# Arquitectura AB-Suite Core v1

## Subsistemas

- protocol.js: contratos y allowlist aplicación/tema.
- bus.js: eventos con secuencia, memoria acotada y difusión.
- server.js: transporte HTTP/SSE, credenciales de sesión y gestión de conexiones.
- client.js: SDK HTTP/SSE sin dependencias externas.
- plc-bridge.js: adaptador de telemetría para la CPU VirtualPLC existente, sin duplicarla.
- scripts/serve.mjs: servidor autónomo de eventos local. La composición Suite Live + bus todavía reside en scripts/serve-suite-core.mjs del repositorio AB-PLC Simulator.

## Orden y replay

Cada evento aceptado recibe sequence monótono, id evt-... y received_at UTC del servidor. Los consumidores guardan la última secuencia y reanudan mediante after=última_secuencia. Se conserva el histórico en memoria hasta la capacidad configurada. Si el cursor se refiere a mensajes sobrescritos, HTTP 409 incluye oldest_sequence. Los consumidores lentos se desconectan cuando el buffer SSE se satura; deben reconectar mediante replay.

No hay entrega transaccional, exactly-once, persistencia, cifrado TLS, retención durable, ni coordinación entre varios ordenadores.

## Seguridad

Tokens Bearer aleatorios de 256 bits por aplicación, emitidos cada ejecución. Temas autorizados:

| App | Puede publicar |
| --- | --- |
| ab-plc-simulator | plc.snapshot, plc.status |
| ab-grafcet-studio | grafcet.stage.changed |
| ab-vision-inspector | vision.inspection.result |
| ab-bi-studio | bi.metric.updated |
| ab-kop-studio, ab-scl-studio | project.updated |
| ab-modbus-studio | ninguno |
| monitor | ninguno |

Se valida identidad del token y suplantación de source, Host, Origin y Sec-Fetch-Site. Puerto solamente loopback. No hay endpoints para ejecutar lógica de seguridad ni escribir en PLC reales.

## Flujo implementado

    AB-PLC Simulator (Suite Live en Node.js)
                   |
             CPU VirtualPLC
               /       \
      HMI + Modbus    SuitePLCBridge
                           |
                   AB-Suite Core BUS
                    /           \
              HTTP history     SSE eventos
                                     |
                          SDK JS / futuros adaptadores

La salida de la CPU no cambia al publicar un evento. El bus solo contiene mensajes y estado de ejecución virtual.
