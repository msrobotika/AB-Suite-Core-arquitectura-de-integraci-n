# Integración de herramientas MS ROBOTIKA

| Aplicación | Estado comprobable |
| --- | --- |
| AB-PLC Simulator | Puente directo de snapshots y estados al bus Suite Core |
| AB-Modbus Studio | Lee la misma CPU por Modbus TCP; aún no usa SSE |
| AB-KOP Studio | Exportación JSON schema 1 importable por el simulador; no publica eventos |
| AB-SCL Studio | Exporta subconjunto a JSON AB-KOP; no publica eventos |
| AB-GRAFCET Studio | Adaptador Node al motor nativo por JSON+escenario; publicaciones HTTP autenticadas; sin sincronización de pestaña |
| AB-BI Studio | Receptor SSE→CSV validado, importación manual del CSV; streaming integrado en dashboard pendiente |
| AB-Vision Inspector | Adaptador Python al historial JSON nativo; clasificación filtrada, con checkpoint; sin streaming de cámara |

Los adaptadores faltantes no están hechos; registrar tarjetas o enlaces en pantalla no constituye integración.

## Próxima fase

Integrar el receptor SSE→CSV de AB-BI en su dashboard (sin reimportación manual), ofrecer sincronización continua opcional para GRAFCET/Vision, y completar el análisis de seguridad de los canales locales. El conector de GRAFCET deberá respetar receptividades y acciones de su propio editor sin asumir compatibilidad universal de PLC.

## Prueba de extremo a extremo

Este repositorio verifica en tests/bridge.test.mjs el puente read-only con una CPU simulada inyectada y el histórico HTTP. La comprobación extremo a extremo de órdenes HMI, CPU, Modbus FC01 y bus se ejecuta en AB-PLC Simulator: tests/suite-core-integration.test.mjs. No es una certificación industrial.

## Estado de extracción

El paquete autónomo reside en este repositorio y es la referencia de código de AB-Suite Core a partir de v0.1.0. AB-PLC Simulator ya utiliza una dependencia Git fijada por commit de este repositorio, probada en Linux, Windows y macOS. Se retiró la copia duplicada de packages/ab-suite-core. Para ejecutar el modo Suite Core desde el simulador es necesario instalar dependencias una vez con npm install.

## Enlaces a adaptadores publicados

- [GRAFCET: motor nativo → eventos grafcet.stage.changed](https://github.com/msrobotika/AB-GRAFCET-Studio-v0.1-c/blob/main/docs/SUITE_CORE.md). Exportación manual del proyecto + escenario simulado por Node.
- [Vision: historial nativo → eventos vision.inspection.result](https://github.com/msrobotika/-AB-Vision-Inspector/blob/main/docs/SUITE_CORE.md). Publicación manual de resultados JSON; no entrega imágenes ni fuentes de cámara.
- [BI: eventos PLC → CSV](https://github.com/msrobotika/AB-BI-Studio/blob/main/docs/AB_SUITE_CORE.md). Recepción SSE, importación manual de archivo.

**Importante:** un adaptador por archivo no equivale a streaming directo ni a acoplamiento con hardware. Los motores de simulación y análisis permanecen en sus repositorios.
