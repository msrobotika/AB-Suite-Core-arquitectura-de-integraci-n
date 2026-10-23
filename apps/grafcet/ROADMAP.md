# Hoja de ruta · AB-GRAFCET Studio

## v0.1 — Editor y simulador (implementado)

Etapas, transiciones, receptividades booleanas, acciones virtuales, convergencia, simulación por ciclo, detección de conflictos con fuentes compartidas, importación y exportación JSON, SVG, CSV.

## v0.2 — Trazabilidad y productividad (implementado)

- Diagnóstico dinámico por transición: origen, destino, condición, receptividad y etapas faltantes.
- Deshacer/rehacer hasta 40 ediciones; historial inverso de 200 avances simulados.
- Motor puro de escenarios reproducibles con expectativas de marcado, sin modificar el proyecto.
- Informe HTML local e imprimible, escapando todos los valores aportados por el usuario.
- Alertas de condiciones permanentemente falsas, conflictos potenciales y autorretornos.
- Tests y captura auténtica del diagnóstico en Chromium. Formato JSON esquema 1 compatible.

## v0.3 — Semántica avanzada, pendiente

- Prioridades formalizadas y divergencias y convergencias OR/Y revisadas contra IEC 60848.
- Acciones calificadas y temporizadas, flancos y reloj inyectable.
- Análisis de alcanzabilidad más potente, pruebas de ciclo y de regresión.
- Zoom/pan, ajuste automático del gráfico, importación guiada, reportes PDF.

## v0.4 — Documentación para programar PLC, pendiente

- Contrato AST/JSON versionado con tabla de señales y mapeo por fabricante.
- Especificación asistida de ST/SFC para revisión técnica, sin ejecución directa.
- Prototipo KOP Omron solo tras pruebas en CX-Programmer/CX-One, revisión de riesgos y evidencia de equivalencia.
- Integración con AB-Modbus Studio y herramientas de la suite solo en simulador/laboratorio por defecto.

No se declara conformidad certificada con IEC 60848 ni IEC 61131-3; no se promete generador KOP automático listo para producción.
