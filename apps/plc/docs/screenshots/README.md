# Capturas verificadas

Los ficheros dashboard.png, program.png y kop-editor.png se generan con Chromium mediante scripts/capture.mjs en GitHub Actions y después se incorporan al repositorio. **Son capturas de la interfaz en ejecución, no mockups.**

Si aún no existen, ejecutar manualmente la acción Capture screenshots y revisar su resultado.


## Laboratorio PLC v0.3
- lab-conveyor.png: CPU en RUN y transportador.
- lab-fault.png: fallo de atasco y diagnóstico.
- lab-tank.png: proceso de depósito.
- lab-suite-import.png: carga de un proyecto JSON AB-KOP schema 1.

Se capturan tras comprobar acciones reales en Chromium. Si el workflow falla, no se consideran disponibles.

- lab-suite-live.png: Chromium contra Suite Live; HMI y Modbus comparten una CPU virtual en Node.js. Generada por scripts/capture-suite-live.mjs.
