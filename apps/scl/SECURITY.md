# Seguridad de AB-SCL Studio v0.1

El programa portátil es local: no ejecuta SCL, no evalúa JavaScript del usuario, no usa red ni establece comunicación con máquinas. Lexer/parser y verificación booleana son propios, sin `eval`.

Límites preventivos: 50.000 caracteres de fuente, 8.000 tokens, 12 entradas para prueba exhaustiva, 40 bobinas, 8 ramas por red y 12 contactos por rama. No se realiza conversión si el código no puede representarse. El informe escapa el código fuente.

Las retenciones, temporizadores, enclavamientos y diferencias de ejecución PLC no están modelados y se rechazan. **No hay ninguna certificación, garantía de equivalencia industrial ni función de seguridad.** Un bit llamado ESTOP_OK no representa un dispositivo de parada de emergencia.

No envíes a incidencias públicas proyectos reales confidenciales, credenciales o datos de clientes.
