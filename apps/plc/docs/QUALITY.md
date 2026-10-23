# Plan de calidad · AB-PLC Simulator

## CI y pruebas

GitHub Actions ejecuta npm run check en Ubuntu con Node 20 y 22, Windows con Node 22 y macOS con Node 22. Otro workflow abre la aplicación real en Chromium y captura la CPU, transportador, depósito, fallo y la importación de AB-KOP.

Tests:
- tests/plc-engine.test.mjs: redes, temporizadores, contadores y determinismo.
- tests/kop-model.test.mjs: conservación y edición de redes.
- tests/plant-runtime.test.mjs: CPU, sensor forzado, proceso y adaptador de importación.
- tests/scenario-runner.test.mjs: eventos, RUN/PAUSE/STOP y secuencia reproducible.
- tests/modbus-tcp.test.mjs: funciones FC01–04, excepciones y socket de localhost.

## Reproducción local

    npm run check
    npm run sim:demo
    npm run sim:tank
    npm run sim:modbus

Los comandos anteriores usan Node.js 20+. El último deja abierto únicamente un servidor Modbus TCP local y de solo lectura; se cierra con Ctrl+C.

## Limitaciones

Que la lógica sea determinista no garantiza equivalencia con PLC Siemens u Omron. Que responda un puerto Modbus no certifica compatibilidad industrial. Las plantas virtuales no son modelos metrológicos ni sustituyen pruebas de seguridad funcional.

## Pendientes

Pruebas cruzadas de formatos con proyectos completos de los editores de la Suite, pruebas multicliente Modbus, rendimiento prolongado, CI con métricas de cobertura y bus IPC versionado y autenticado.

## Suite Live v0.4
Prueba cruzada HTTP ↔ Modbus con socket TCP real y autenticación. Capture screenshots ejecuta el escenario en Chromium y verifica que RUN/MARCHA de la HMI activan la salida del objeto VirtualPLC servidor antes de guardar la captura. No se declara interoperabilidad con una CPU física.
