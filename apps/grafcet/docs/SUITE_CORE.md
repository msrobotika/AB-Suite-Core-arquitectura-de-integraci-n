# AB-GRAFCET Studio → AB-Suite Core

Este adaptador ejecuta el proyecto exportado JSON utilizando el motor original src/engine.js. Es una simulación de etapas, no un programa KOP ni un control industrial.

## Prueba sin conexión

    node tools/suite_bridge.mjs --project examples/suite-grafcet-project.json --scenario examples/suite-grafcet-scenario.json --dry-run

## Publicación al bus local

1. Arranca AB-Suite Core con npm start en https://github.com/msrobotika/AB-Suite-Core-arquitectura-de-integraci-n.
2. Obtén el token efímero ab-grafcet-studio del proceso Core.
3. En PowerShell, desde este repositorio:

    $env:AB_GRAFCET_TOKEN = "<TOKEN_AB_GRAFCET>"
    node tools/suite_bridge.mjs --project examples/suite-grafcet-project.json --scenario examples/suite-grafcet-scenario.json

Cada evento lleva grafcet.stage.changed, step_id, active, cycle, project_id y transition_ids. Se publica el marcado inicial y cada cambio ON/OFF. Se valida el escenario completo antes de publicar. No se inventan milisegundos físicos.

El escenario admite schema 1 con steps de inputs booleanos y expectActive. Máximo 200 pasos. Puedes sustituir el proyecto por el JSON exportado del propio editor.

## Límites

La simulación en Node no actualiza automáticamente una pestaña del editor ya abierta. Reproduce la lógica del mismo motor desde el proyecto exportado, sin modificar la planta. No existe PLC físico, accionamiento ni comportamiento IEC certificado. Solo se admite 127.0.0.1 y el token se recibe por variable de entorno.
