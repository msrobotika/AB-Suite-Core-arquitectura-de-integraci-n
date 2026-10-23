# Roadmap · MS ROBOTIKA

## v0.1 · Fundamentos (implementados)
- [x] Motor reproducible y desacoplado
- [x] Contactos y redes, TON/TOF, CTU
- [x] Interfaz industrial responsive y ejemplo de cinta
- [x] Editor JSON, diagnóstico, pruebas CI

## v0.2 · Editor gráfico
- [x] Editor KOP visual por contactos/bobinas, conexiones AND/OR, presets, edición por formularios y undo/redo
- [ ] Drag-and-drop de componentes de circuitos (actualmente mediante botones)
- [ ] Tabla de símbolos, variables y gráficos de tendencia
- [x] Prueba E2E del editor en Chromium a través del workflow de capturas
- [ ] Accesibilidad avanzada, pruebas multi-navegador y responsive E2E

## v0.3 · Motor extendido
- [ ] Contadores CTD/CTUD, flancos R_TRIG/F_TRIG y TONR
- [ ] Interpretación de un subconjunto de SCL/ST **documentado**
- [ ] Editor GRAFCET traducido al AST propio

## v0.4 · Integración
- [ ] Adaptador Modbus TCP / OPC UA de solo lectura por defecto
- [ ] Replay CSV/JSON, pruebas multi-PLC, HMI

## v1.0
- [ ] API pública estable, proyectos versionados y pruebas de conformidad por escenario

Estas fases son propuestas, **no funcionalidades presentes**. Cualquier control industrial real requiere una revisión de seguridad independiente.


## v0.3 · Simulación PLC y puente Suite
- [x] CPU virtual RUN/PAUSE/STOP/STEP y reset
- [x] Rack de señales virtuales y banco de fallos
- [x] Transportador y depósito deterministas
- [x] Importación AB-KOP Studio schema 1 a direcciones I/Q/T propias
- [x] CSV de telemetría para AB-BI Studio y JSON Suite v1
- [x] Mapa de registros Modbus preview sin red
- [ ] Sincronización bidireccional entre editores y CPU
- [x] Servidor de solo lectura Modbus TCP en 127.0.0.1, iniciado manualmente por CLI
- [ ] Bus IPC autenticado para Suite y adaptador GRAFCET
- [ ] Validación de equivalencia total entre motores de diferentes herramientas

## Puente Suite · hitos en marcha
- [x] Modbus TCP localhost FC01–FC04 (solo lectura, instancia separada)
- [x] Modo Suite Live con una CPU en Node compartida entre interfaz web y Modbus
- [ ] Conectores verificados mediante pruebas cruzadas con AB-Modbus Studio
