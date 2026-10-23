# Integración de herramientas MS ROBOTIKA

| Aplicación | Estado comprobable |
| --- | --- |
| AB-PLC Simulator | Puente directo de snapshots y estados al bus Suite Core |
| AB-Modbus Studio | Lee la misma CPU por Modbus TCP; aún no usa SSE |
| AB-KOP Studio | Exportación JSON schema 1 importable por el simulador; no publica eventos |
| AB-SCL Studio | Exporta subconjunto a JSON AB-KOP; no publica eventos |
| AB-GRAFCET Studio | Contrato de cambios de etapa disponible; adaptador pendiente |
| AB-BI Studio | Receptor SSE→CSV validado, importación manual del CSV; streaming integrado en dashboard pendiente |
| AB-Vision Inspector | Contrato de inspección y ejemplo sintético; integración de cámaras pendiente |

Los adaptadores faltantes no están hechos; registrar tarjetas o enlaces en pantalla no constituye integración.

## Próxima fase

Integrar el receptor SSE→CSV ya disponible en AB-BI Studio directamente en su dashboard (sin reimportación manual) y crear un adaptador de AB-Vision Inspector que publique mediciones verificables. El conector de GRAFCET deberá respetar receptividades y acciones de su propio editor sin asumir compatibilidad universal de PLC.

## Prueba de extremo a extremo

Este repositorio verifica en tests/bridge.test.mjs el puente read-only con una CPU simulada inyectada y el histórico HTTP. La comprobación extremo a extremo de órdenes HMI, CPU, Modbus FC01 y bus se ejecuta en AB-PLC Simulator: tests/suite-core-integration.test.mjs. No es una certificación industrial.

## Estado de extracción

El paquete autónomo reside en este repositorio y es la referencia de código de AB-Suite Core a partir de v0.1.0. AB-PLC Simulator ya utiliza una dependencia Git fijada por commit de este repositorio, probada en Linux, Windows y macOS. Se retiró la copia duplicada de packages/ab-suite-core. Para ejecutar el modo Suite Core desde el simulador es necesario instalar dependencias una vez con npm install.
