# Protocolo Suite MS ROBOTIKA — contrato v1

## Matriz de integración

| Emisor | Consumidor | Resultado actual |
| --- | --- | --- |
| AB-KOP Studio | AB-PLC Simulator | Importación JSON schema 1, mediante src/kop-import.js |
| AB-SCL Studio → AB-KOP JSON | AB-PLC Simulator | Importa el JSON AB-KOP generado, no SCL nativo |
| AB-PLC Simulator | AB-BI Studio | Exportación CSV tabular |
| AB-PLC Simulator | Suite futura | Contrato JSON msrobotika.suite.telemetry.v1 |
| AB-PLC Simulator | AB-Modbus Studio | **Puente TCP local de solo lectura (FC01–04)**, lanzado por separado |
| AB-GRAFCET Studio | AB-PLC Simulator | Pendiente de adaptador |
| AB-Vision Inspector | AB-PLC Simulator | Pendiente de adaptador |

## Importador AB-KOP

Convierte las entradas simbólicas a I0.N y las salidas a Q0.N, en orden de declaración. Convierte los contactos NO y NC a sus equivalentes del AST. Las ramas de serie se traducen a AND y las paralelas a OR. Los temporizadores TON se convierten de preset de ciclos a milisegundos multiplicando por 100. El importador rechaza formatos incompatibles. No se afirma equivalencia de scan y temporización entre dos implementaciones PLC distintas; las redes importadas requieren nuevas pruebas. La tabla de símbolos aparece en el simulador, en modo bastidor libre.

## CSV para AB-BI Studio

Campos: scan, simulated_ms, scenario, cpu_mode, process_value, process_unit, motor_or_fill, lamp_or_drain, count, analog_ai0, active_faults.

Cada fila es una muestra sintética. simulated_ms mide tiempo virtual, no tiempo UTC. Se admite CSV en AB-BI Studio como tabla de observaciones.

## JSON Suite

Nombre de contrato: msrobotika.suite.telemetry.v1. Campos: schema, producer, source, scenario, sample_period_ms, fields, samples. No representa una API en tiempo real.

## Modbus (solo representación in-memory)

Mapa de registros con direcciones de base cero:
- HR0 scan, HR1 tiempo dividido entre 100 ms, HR2 CV, HR3 AI0 multiplicado por 100, HR4 valor de proceso multiplicado por 100.
- Coils 0–2 corresponden Q0.0–Q0.2.
- Discrete inputs 0–3 corresponden I0.0–I0.3.
- Registros de 16 bits saturados a 0..65535.

**No está implementado un servidor Modbus TCP**: el preview no escucha sockets ni expone funciones FC01/03. El adaptador futuro deberá ser un proceso aislado de solo lectura, habilitado explícitamente.

## Arquitectura de Suite pendiente

Propuesta: AB-Suite Core alojará el contrato compartido y un bus IPC local versionado. Los editores emitirán proyectos mediante adaptadores independientes; AB-PLC Simulator ejecutará la CPU y planta virtual; AB-Modbus Studio supervisará por lectura; AB-BI Studio analizará históricos; AB-Vision Inspector aportará resultados virtuales de inspección; AB-GRAFCET Studio aportará secuencias transformadas bajo validación. La comunicación en vivo, autenticación y validación entre aplicaciones aún NO están implementadas.


## Puente Modbus TCP local implementado

Archivo: src/modbus-tcp.js. Arranque: npm run sim:modbus (Node.js 20+). Se enlaza únicamente a 127.0.0.1, puerto 1502, Unit ID 1 y utiliza el controlador virtual como fuente de los registros. Soporta reensamblado de tramas MBAP parciales, peticiones sucesivas y excepciones de Modbus en direcciones o cantidades inválidas. FC01–FC04 son las únicas funciones leíbles. Toda función de escritura responde con excepción 01 (Illegal Function), sin cambiar memorias.

FC04: Input Register 0 = AI0 × 100 y 1 = variable de proceso × 100. Todo es simulado y en memoria. El proceso de servidor es independiente de la pestaña web del simulador: no sincroniza aún un mismo estado de CPU con el navegador.

Comprobar en AB-Modbus Studio: host 127.0.0.1, puerto 1502, Unit ID 1, leer FC03 dirección 0 longitud 5. Arrancar el puente y mantener abierta su consola. Las pruebas unitarias incluyen una conexión TCP real por el bucle local y una escritura rechazada.

**Seguridad**: este servidor no enlaza a IP de LAN y no crea cliente de PLC físico. No exponerlo mediante port-forwarding ni usarlo como sistema de automatización de planta.

## Suite Live v0.4

Una única CPU VirtualPLC se aloja en el proceso Node, compartida por (1) servidor HTTP local de HMI autenticada y (2) servidor Modbus TCP FC01–04 de solo lectura. La HMI llama a /api/live/state y /api/live/command con Bearer token de 256 bits generado al inicio, introducido mediante fragmento de URL (no enviado al servidor en la navegación). Se valida Host, Origin y Sec-Fetch-Site. Ejecutar npm run suite:live.

El modo anterior npm run sim:modbus conserva su CPU independiente y no sincroniza la pestaña web. Para estado compartido usa Suite Live. No existe todavía bus IPC general ni conexión a PLC físico.

## AB-Suite Core v0.1 (módulo nuevo)

Se ha añadido el paquete packages/ab-suite-core, un bus HTTP/SSE independiente. El proceso npm run suite:core une la CPU Suite Live y el bus mediante SuitePLCBridge: snapshots plc.snapshot y cambios plc.status con secuencias y trazabilidad.

Los contratos para otros editores existen en el SDK, pero no se afirma conexión real de AB-BI, Vision o GRAFCET; siguen requiriendo sus respectivos adaptadores. Las claves son efímeras por aplicación y el bus escucha solo en 127.0.0.1. El bus no acepta comandos hacia PLC, ni E/S industriales.

## Paquete independiente (v0.1)

El código fuente primario de AB-Suite Core está ahora en https://github.com/msrobotika/AB-Suite-Core-arquitectura-de-integraci-n, incluido mediante una dependencia Git fijada a commit. AB-PLC Simulator conserva exclusivamente el adaptador de composición scripts/serve-suite-core.mjs y las pruebas de integración; las fuentes del bus dejaron de estar duplicadas en packages/ab-suite-core.
