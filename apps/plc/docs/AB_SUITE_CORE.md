# AB-Suite Core independiente

El bus de interoperabilidad reside en el repositorio público:

https://github.com/msrobotika/AB-Suite-Core-arquitectura-de-integraci-n

AB-PLC Simulator lo consume mediante una dependencia Git fijada a una revisión. El código del bus ya no se mantiene dentro del simulador.

## Instalación en el simulador

    npm install
    npm run suite:core

Se inicia una CPU virtual común a HMI (127.0.0.1:4173), Modbus read-only (127.0.0.1:1502) y AB-Suite Core HTTP/SSE (127.0.0.1:4175). El servidor imprime tokens de sesión por aplicación.

## Pruebas

    npm run check

tests/suite-core-integration.test.mjs importa directamente el paquete autónomo y verifica comandos HTTP, datos de la misma CPU y lecturas Modbus junto al histórico de eventos del bus.

## Alcance

El bus es solo local, con eventos en memoria y tokens efímeros. Los adaptadores de Vision, GRAFCET y BI se versionan por separado. No hay maquinaria real, ni persistencia después de reiniciar, ni control de seguridad industrial.
