# Calidad de la distribución integrada

La evidencia actual está en [VALIDATION.md](VALIDATION.md), los criterios previos a difusión en [RELEASE_READINESS.md](RELEASE_READINESS.md) y las reglas de creación en [PRODUCT_STANDARD.md](PRODUCT_STANDARD.md).

Ejecuta `node scripts/check-workspace.mjs`, las pruebas Python con el intérprete preparado y los nueve scripts de navegador. El CI debe pasar en el mismo commit entregado. Comprueba también el ZIP extraído: no basta con probar el árbol de desarrollo.

El Core v1 conserva contratos de bus y pruebas de integración con CPU inyectada. Esta distribución incorpora además los nueve motores propios: la CPU residente es la que usan PLC, Modbus y captura BI. Los antecedentes del bus no sustituyen la evidencia de uso de la suite.

No se certifica conformidad IEC, interoperabilidad con equipos industriales ni accesibilidad completa. Todo resultado de inspección y comunicación mantiene sus límites visibles. Los proyectos del usuario y los tokens no se empaquetan.
