# Suite Live v0.4 — misma CPU para HTTP y Modbus

## Arranque

Se necesita Node.js 20+ y ambos puertos libres. En la carpeta del repositorio:

    npm run suite:live

Se imprime una URL local con un token secreto al final, tras #suite=. Ábrela en el navegador del mismo ordenador. El panel Simulador PLC muestra LIVE · CPU COMPARTIDA CON MODBUS. La CPU arranca en STOP. Pulsa RUN y MARCHA para activar Q0.0.

La URL privada no se registra en servidor; el navegador extrae el token del fragmento y lo incluye exclusivamente en cabeceras Authorization de la API local.

Después abre AB-Modbus Studio en otro proceso y configura host 127.0.0.1, puerto 1502, Unit ID 1, FC03, dirección base cero, cantidad 5. La misma CPU recibe los comandos de la pantalla y el cliente Modbus lee el mismo estado. Si detienes la CPU, las lecturas dejan de avanzar.

## Diagrama

    AB-PLC Suite Live / Node.js / 127.0.0.1
                  +---------------------+
                  | Una CPU VirtualPLC  |
                  | tiempo/scan/estado  |
                  +-----+---------+-----+
                        |         |
             HMI HTTP autenticada  Modbus TCP solo lectura
             /api/live/state      FC01/02/03/04
             /api/live/command         |
                        |         AB-Modbus Studio
              Navegador web
                  mismo PC

## API web

- GET /api/live/state: devuelve contrato msrobotika.suite.live.v1 con snapshot, programa, eventos y muestras recientes.
- POST /api/live/command: JSON con comando de lista blanca: mode, step, reset, pulse, stop-input, estop, input, force, fault, scenario e import-kop.
- Ambos requieren Authorization: Bearer [token de 64 dígitos hexadecimales].
- La API comprueba Host, Origin y Sec-Fetch-Site y solo escucha en 127.0.0.1.
- No existen endpoints para controlar PLC físicos ni escribir sobre Modbus industrial.
- Por defecto se conservan las últimas 140 muestras para la HMI; el PLC virtual mantiene hasta 1200 internamente.

## Modos de ejecución

- npm run dev: simulación offline dentro del navegador; no comparte CPU por Modbus.
- npm run sim:modbus: proceso Node con CPU autónoma; no comparte sesión web.
- npm run suite:live: misma CPU en el proceso Node, controlada por HMI HTTP y consultada por Modbus.
- Ctrl+C cierra ambos servicios.

## Comprobar reproducibilidad

    npm run check

Los tests suites/suite-live.test.mjs verifican que una pulsación HTTP cambia Q0.0 y que la respuesta Modbus FC01 devuelve el mismo valor. Se verifica además FC03, token y orígenes ajenos.

La captura docs/screenshots/lab-suite-live.png se genera en un navegador real ejecutado contra el servicio Suite Live. No es un render conceptual.

## Límites

Los comandos HTTP y los registros Modbus representan únicamente una CPU virtual didáctica. Los ticks dependen de Node.js, no de una CPU industrial de tiempo real. No se prueban todavía equivalencia IEC, periféricos reales, certificaciones, alarmas de seguridad, topologías de planta ni buses IPC entre PCs. El sistema se enlaza solo a localhost para no exponer el servicio a redes industriales.
