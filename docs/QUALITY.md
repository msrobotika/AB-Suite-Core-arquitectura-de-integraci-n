# Evidencias y criterios de calidad

## Cómo ejecutar el proyecto

Node.js 20 o superior:

    npm run check
    npm start

Para probar la distribución sin publicarla:

    npm pack --dry-run

## Pruebas incluidas

- tests/protocol.test.mjs: contratos, identidad y permisos por tema, validación de campos y límites.
- tests/server.test.mjs: HTTP, autenticación, histórico y SSE con conexión real a localhost.
- tests/bridge.test.mjs: puente inyectado con CPU simulada, secuencia y datos recuperados por HTTP.

El CI debe terminar en verde en Ubuntu Node 20/22, Windows Node 22 y macOS Node 22 antes de fusionar cambios.

## Integración con simulador

El puente integrado con la CPU real de AB-PLC Simulator se prueba en su repositorio, mediante packages/ab-suite-core/tests/bridge.test.mjs y el test de Suite Live. Este repositorio mantiene un test de contrato con CPU inyectada, de forma que AB-Suite Core no depende del código fuente del simulador para instalarse y probarse.

## Limitaciones

No se certifica equivalencia con sistemas IEC ni interoperabilidad industrial. Los mensajes no tienen garantía exactly-once ni retención durable. Las credenciales son efímeras. La captura real de la HMI compartida pertenece al simulador y puede verse en https://github.com/msrobotika/AB-PLC-Simulator/blob/main/docs/screenshots/lab-suite-live.png; no se presenta como una interfaz gráfica nativa de este bus.

## Pruebas entre repositorios

AB-PLC Simulator consume este paquete fijado a un SHA Git y ejecuta tests/suite-core-integration.test.mjs en su CI. AB-BI Studio ejecuta tests/test_ab_suite_telemetry.py en su propia CI. Ambos proyectos deben permanecer en verde antes de actualizar la revisión fijada.
