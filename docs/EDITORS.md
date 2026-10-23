# Edición de programas y pantallas · AB Suite 0.3

## KOP Studio

El programa ocupa el centro. Explorador abre el banco de señales y los archivos; Inspector abre las propiedades de la red. Ambos se pueden plegar. Traza y diagnóstico se despliega debajo del esquema. El zoom no modifica el programa.

1. Pulsa **Nuevo** para crear una entrada I0, una salida Q0 y una red de partida. Puedes deshacer la creación para recuperar el programa anterior.
2. Selecciona la red. En el inspector cambia nombre, operación, destino y contactos NO/NC. **Guardar cambios** valida las referencias antes de aplicar; un destino de bobina tiene que estar declarado como salida. Añadir una señal permite declararlo.
3. **Serie** añade un contacto a la primera rama de la red seleccionada. **Paralelo** crea otra rama. Los botones de cada rama añaden contactos en esa rama. Hasta 12 contactos por rama, 8 ramas por red y 40 redes.
4. Las flechas de la barra cambian el orden de evaluación. **Duplicar** crea una red y un destino propio; no introduce una segunda escritura COIL sobre la misma salida.
5. Conmuta las entradas del banco. **Ejecutar 1 ciclo** (F5) evalúa el programa de arriba abajo. **Auto** ejecuta un ciclo por segundo. **Ciclo** restaura el estado y las entradas del ciclo anterior; **Reiniciar** conserva las entradas.
6. Los trazos verdes muestran conducción. Después de un ciclo, la representación usa la traza capturada durante ese ciclo, respetando el orden de las redes. Cambiar una entrada requiere ejecutar otro ciclo para actualizar esa traza. Consulta el diagnóstico para detectar dependencias entre redes.
7. El inspector conserva los campos que estés escribiendo al conmutar entradas o ejecutar ciclos. **Guardar cambios** aplica el programa y reinicia su simulación.

Ctrl+Z y Ctrl+Mayús+Z deshacen/rehacen fuera de los campos de texto. El JSON conserva el programa; el SVG es un esquema estático vectorial, no una captura de la ejecución. El informe HTML y el historial CSV son exportaciones separadas.

TON mide ciclos educativos, no tiempo real. ESTOP_OK es una entrada del ejercicio, no un circuito de seguridad. Enviar al PLC transfiere el proyecto a la CPU virtual de AB Suite.

## SCADA Studio

Cada pantalla es una composición independiente; el inicio es un lienzo vacío. La biblioteca y el inspector se pliegan. **Encajar** tiene en cuenta ancho y alto; puedes ampliar y desplazarte por el documento.

- **Figuras:** rectángulo, elipse, línea y texto. Colores y trazo editables. El contenido del texto se edita en Título.
- **Tubería:** trazo doble horizontal, vertical o diagonal; cambia sus dimensiones para componer el trazado. No transporta ni calcula un fluido.
- **Depósito:** visualiza una señal numérica entre una escala mínima y máxima. El nivel se limita visualmente a ese rango; la lectura conserva el valor recibido.
- **Bomba, válvula y motor:** representan el estado de una señal booleana o numérica mediante el símbolo y su estado. No contienen otro motor de simulación.
- **Indicador, valor, tendencia y alarma:** supervisan señales del contrato común. La tendencia conserva hasta 120 muestras de sesión; reconocer una alarma es una acción local, no un comando al origen.
- **Navegación:** elige una pantalla de destino. En Probar, su botón abre esa pantalla. Sin un destino configurado queda deshabilitado y el inspector permite corregirlo.

Selecciona desde el lienzo o Capas. Arrastra para mover y usa el tirador de la esquina para cambiar tamaño. También puedes escribir X, Y, Ancho y Alto; las flechas mueven 1 px y Mayús+flecha, 10 px. La rejilla ajusta el arrastre a 10 px y se puede desactivar. Flechas de capa bajan o suben un nivel; Duplicar crea otra identidad y desplaza la copia. Suprimir y Ctrl+D actúan fuera de los campos. Las operaciones admiten Deshacer/Rehacer.

Para vincular, abre el origen en otra pestaña del mismo navegador. Elige Origen y Señal; las señales disponibles se descubren al abrir el selector. Puedes preparar un enlace escribiendo su identificador sin conexión. Pulsa **Aplicar propiedades**. Una señal ausente o con más de cinco segundos sin actualizar se representa como desconocida o caducada. No se interpreta como cero.

**Probar** oculta las herramientas de diseño y conserva posiciones, tamaños y capas. La navegación cambia la pantalla visible; no modifica el proyecto. Diseño vuelve al editor.

El nombre, las dimensiones y el fondo se editan en Configuración de pantalla. Reducir el lienzo no puede recortar objetos: la validación rechaza la operación y conserva el proyecto anterior. Una pantalla solo puede eliminarse vacía, con otra pantalla disponible y sin enlaces de navegación que la referencien.

Autoguardado en el navegador y exportación `.hmi.json`. Importar es reversible mediante Deshacer. El formato v1 admite los campos de escena nuevos y normaliza los documentos de tarjetas anteriores con posiciones iniciales; no altera sus etiquetas ni vínculos. Límite de 12 pantallas, 30 objetos por pantalla y 120 por proyecto. Pantallas de 640–3840 × 400–2160 px. Sin grupos, rotación libre, scripting, SVG externo, escritura de consignas ni unión automática de tuberías.
