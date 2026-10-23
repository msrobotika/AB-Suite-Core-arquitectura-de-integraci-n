# Integración de herramientas MS ROBOTIKA

| Aplicación | Estado comprobable |
| --- | --- |
| AB-PLC Simulator | Puente directo de snapshots y estados al bus Suite Core |
| AB-Modbus Studio | Lee la misma CPU por Modbus TCP; aún no usa SSE |
| AB-KOP Studio | Exportación JSON schema 1 importable por el simulador; no publica eventos |
| AB-SCL Studio | Exporta subconjunto a JSON AB-KOP; no publica eventos |
| AB-GRAFCET Studio | Contrato de cambios de etapa disponible; adaptador pendiente |
| AB-BI Studio | Importación CSV del simulador; consumidor SSE pendiente |
| AB-Vision Inspector | Contrato de inspección y ejemplo sintético; integración de cámaras pendiente |

Los adaptadores faltantes no están hechos; registrar tarjetas o enlaces en pantalla no constituye integración.

## Próxima fase

Crear un conector AB-BI que convierta snapshots PLC a series persistidas y otro de AB-Vision Inspector que publique eventos de sus mediciones reales. El conector de GRAFCET deberá respetar receptividades y acciones de su propio editor sin asumir compatibilidad universal de PLC.

## Prueba de extremo a extremo

tests/bridge.test.mjs verifica: comando HTTP RUN/MARCHA/PASO, CPU, lectura Modbus FC01 y recepción en el histórico del bus. Se compara Q0.0 encendida y apagada. No es una certificación industrial.

## Estado de extracción

El paquete autónomo reside en este repositorio y es la referencia de código de AB-Suite Core a partir de v0.1.0. AB-PLC Simulator conserva provisionalmente una copia compatible de integración para que su comando npm run suite:core funcione sin instalar dependencias externas. Queda pendiente reemplazar la copia por una dependencia versionada y probar ambos repositorios juntos, sin romper la instalación offline existente.
