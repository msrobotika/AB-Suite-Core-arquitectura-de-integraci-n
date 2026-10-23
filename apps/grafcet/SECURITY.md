# Seguridad y límites de AB-GRAFCET Studio

**Ejecución local:** la aplicación HTML y el motor JavaScript no hacen peticiones de red ni acceden a PLC. Las entradas y salidas solo existen en memoria. No se envían órdenes industriales.

**Importación JSON:** está limitada a 200 KB en el navegador. El modelo valida versiones, límites de etapas y transiciones, identificadores, referencias, tipos de entradas y un AST booleano sin `eval`. Las variables llamadas `constructor`, `__proto__` y `prototype` están bloqueadas.

**Exportaciones:** JSON y CSV son datos locales; SVG se construye mediante DOM SVG; los valores del informe HTML se escapan antes de insertarlos. Aun así, revisa archivos procedentes de fuentes desconocidas.

**Alcance de seguridad funcional:** `seguridad` en el ejemplo es una señal virtual didáctica, nunca una función de seguridad certificada. La semántica del GRAFCET y la lógica implementada en PLC real pueden diferir. Ninguna salida virtual garantiza la desactivación segura de un motor, resistencia o actuador en una situación de emergencia. Es obligatorio verificar hardware, paro de emergencia, enclavamientos y conformidad aplicable de forma independiente.

**Límites:** simulación parcial, sin temporización de PLC, ciclo de exploración, comunicaciones industriales, acciones especiales completas ni certificación IEC.

Para reportar incidencias de seguridad, utiliza un canal privado del mantenedor y evita adjuntar datos reales sensibles de instalaciones industriales.
