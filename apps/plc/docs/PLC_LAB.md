# AB-PLC Simulator v0.3 · Laboratorio técnico

El producto principal es la **simulación de PLC**: CPU virtual, imagen de proceso, scan, bastidor de entradas/salidas, procesos simplificados, averías, tendencias, forzado de sensores y telemetría. El editor KOP es una herramienta secundaria.

## Arquitectura implementada

AB-KOP Studio JSON → adaptador de importación → CPU VirtualPLC → PLCEngine.scan(dtMs) → proceso virtual ConveyorPlant / TankPlant / RackPlant → captura de variables → exportadores de telemetría MS ROBOTIKA.

- CPU virtual: RUN ejecuta scans; PAUSE congela; STOP detiene y reinicia memoria de programa; STEP realiza una exploración; RESET reinicia también el modelo físico.
- Reloj: paso de 100 ms de tiempo simulado (no garantizado por el navegador); modo acelerado con varios scans por tick.
- Rack: imágenes digitales I/Q, marcas M, temporizadores T, contadores C y entrada analógica AI0.
- Ejemplo CV-01: marcha I0.0; permisos I0.1, I0.2 e I0.6; motor Q0.0; TON T0; fotocélula I0.3; contador C0.
- Ejemplo T-01: nivel inicial 15 %, entrada +19 puntos porcentuales/s, salida -15 puntos porcentuales/s. Sensor bajo I0.3 a 12 %, sensor alto I0.4 a 82 %, AI0 nivel.
- Fallos CV-01: atasco del transportador y fotocélula pegada en ON. Fallos T-01: fuga y nivel alto pegado en ON.
- FORCE ON / FORCE OFF: sobrescriben lecturas virtuales, nunca señales físicas. Liberar revierte el cambio.

## Verificación CLI sin navegador

Node.js 20 o superior:

    npm test
    npm run check
    npm run sim:demo
    npm run sim:tank
    node scripts/run-scenario.mjs --scenario examples/conveyor-with-fault.json --csv trace.csv --json trace.json

Ejemplo de escenario reproducible: examples/conveyor-with-fault.json. El runner permite hasta 10.000 scans y 250 eventos. El buffer de telemetría de la CPU conserva las últimas 1.200 muestras.

## Límites verificables

La simulación implementa semántica propia, no instrucciones binariamente compatibles con Siemens, Omron o Codesys. No existe E/S física, precisión certificada, funcionalidad de seguridad real ni modelo termohidráulico o mecánico validado. Los mandos de emergencia son digitales virtuales y no deben confundirse con una parada de seguridad. El uso es educativo y de laboratorio exclusivamente.

## Puente Modbus en vivo

Inicia npm run sim:modbus en una consola independiente para simular un PLC accesible por TCP exclusivamente en localhost. AB-Modbus Studio puede leer FC01–FC04 en 127.0.0.1:1502, Unit ID 1. Los datos proceden de un nuevo proceso virtual autónomo, no de la misma sesión del navegador. Sin escritura ni hardware.
