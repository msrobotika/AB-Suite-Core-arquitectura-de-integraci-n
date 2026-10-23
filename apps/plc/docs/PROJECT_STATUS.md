# Estado técnico · AB-PLC Simulator

Fecha de revisión: 22 de octubre de 2026. Versión: v0.4.

## Entregables implementados
- CPU virtual RUN/PAUSE/STOP/STEP, imagen de proceso y scan determinista.
- Plantas transportador y depósito, bastidor genérico, sensores y fallos.
- Adaptador AB-KOP schema 1 a AB-PLC version 1; exportación CSV de telemetría para AB-BI.
- Preview de registros Modbus y servidor TCP local de solo lectura FC01–04 iniciado manualmente.
- Pruebas unitarias e integración navegador via GitHub Actions.
- Capturas reales: lab-conveyor.png, lab-fault.png, lab-tank.png, lab-suite-import.png.

## Calidad verificable
El workflow Verify engine ejecuta npm run check. Capture screenshots vuelve a comprobar el motor y navega por las vistas de laboratorio y KOP antes de publicar PNG reales. Las capturas no constituyen validación industrial.

## No implementado
Un bus IPC general para toda la Suite, adaptadores GRAFCET/Vision, acceso de escritura y acceso por LAN desde Modbus TCP, importación binaria Step7/TIA Portal/Omron, E/S reales, gemelo digital calibrado, CI multiplataforma de SO y cumplimiento de normas de seguridad funcional.

## Riesgos y próximos pasos
1. Versionar el contrato de formatos y diseñar SDK AB-Suite Core independiente.
2. Completar pruebas cruzadas contra el motor real de AB-KOP para todos los casos admitidos.
3. Mantener pruebas de FC01–04 del puente Modbus local; falta sincronización de CPU entre navegador y proceso Node.
4. Medir rendimiento y memoria del simulador bajo escenarios de larga duración.
5. Diseñar una API de procesos y módulos de periféricos extensibles.

## Puente TCP implementado

Arranque manual con npm run sim:modbus, host único 127.0.0.1 puerto 1502, Unit ID 1. FC01/02/03/04 de lectura; escrituras rechazadas. El cliente AB-Modbus Studio puede conectar como cliente externo, pero esta integración no se ha certificado con hardware. La CPU del servicio Node no es todavía la CPU de la sesión web.

## Suite Live · estado compartido
Iniciar con npm run suite:live. La HMI HTTP y el puente Modbus TCP tienen una fuente única: una instancia VirtualPLC en Node.js. Los comandos del navegador se envían por API local autenticada y las lecturas del cliente Modbus consultan ese mismo objeto. Pruebas: tests/suite-live.test.mjs. Captura reproducible: docs/screenshots/lab-suite-live.png. No es todavía un bus de mensajes general para todas las aplicaciones.
