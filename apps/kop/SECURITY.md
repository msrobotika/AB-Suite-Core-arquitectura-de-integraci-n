# Seguridad de AB-KOP Studio

- Herramienta independiente de diseño y simulación, sin drivers ni APIs de PLC.
- Solo lee y escribe entradas/salidas **virtuales** en el navegador; no controla maquinaria.
- No contiene telemetría, comunicaciones externas ni dependencias JavaScript en tiempo de ejecución.
- Importaciones JSON limitadas en la UI a 250 KB; validador estricto de contactos, nombres, límites y operaciones.
- Exporta HTML escapando los valores del usuario, SVG mediante DOM y CSV entrecomillado.
- El bit de demostración ESTOP_OK NO es un paro de emergencia certificado.
- TON cuenta exploraciones virtuales, no milisegundos reales. El orden de redes afecta a la simulación.

No reutilices esta lógica en funciones de seguridad de máquinas sin un diseño y validación independientes.
