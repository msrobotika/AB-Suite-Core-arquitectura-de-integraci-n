# Plan de desarrollo

## v0.1 — Entregada
Editor ST/SCL en español; lexer y AST seguros; IF/ELSE y lógica BOOL combinacional; traducción a KOP schema 1; equivalencia exhaustiva hasta 12 entradas; simulación local y exportaciones; 4 capturas reales de Chromium y CI.

## v0.2 — Pendiente
Evaluación de semántica secuencial, retenciones, temporizadores TON, comparación numérica, variables internas, ramas IF anidadas y diagnóstico de orden de redes. Requiere verificación temporal del ciclo PLC antes de afirmar equivalencia.

## v0.3 — Pendiente
Integración con AB-GRAFCET Studio y AB-KOP Studio; tablas de direcciones y símbolos, metadatos de fabricantes, exportadores para revisión técnica de Omron/Siemens.

Nunca generar código PLC ejecutable o funciones de seguridad sin pruebas de equivalencia y validación humana del hardware.
