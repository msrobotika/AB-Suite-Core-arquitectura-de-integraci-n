# Crear, comprobar y recuperar · AB Suite 0.4

## Patrón común

En cualquier aplicación: **＋ Nuevo → nombre → Crear trabajo nuevo**. Se guarda primero un punto del documento anterior. **Proyectos → Recuperar** abre ese trabajo, guardando antes el actual. **Guardar punto de vuelta** crea una copia expresamente. Se retienen ocho puntos por herramienta en este navegador; las exportaciones portables siguen en cada herramienta.

Si falla el almacenamiento, se indica el problema; la copia temporal no sobrevive al cierre de la pestaña. Exporta para conservarla. Una captura archivada no se presenta como una conexión en directo.

## Prácticas sin depender de ejemplos

| Herramienta | Estado al crear | Primera práctica propia | Resultado verificable |
| --- | --- | --- | --- |
| KOP | Cero redes; I0/Q0 declaradas a cero | Crear primera red; seleccionar contacto NO I0 y bobina Q0; activar I0 y ejecutar un ciclo | Q0 activa y red CONDUCE. Cambiar I0 muestra TRAZA PENDIENTE hasta el siguiente ciclo |
| SCL | Código vacío y análisis pendiente | Insertar estructura BOOL o escribir A/B/Q; asignar `Q := A AND NOT B;`; analizar | Tabla de cuatro combinaciones calculadas por ST y KOP; aplicar una al banco |
| GRAFCET | E0 inicial sin acciones ni transiciones | Añadir E1 con acción RUN; transición E0→E1 con `start AND permit`; activar entradas y avanzar | E1 y RUN activas; Decisiones explica la receptividad |
| PLC | Bastidor libre, programa sin redes, CPU STOP | Editor KOP: añadir red, elegir I0.0/Q0.0, validar y cargar. Observación: añadir ambas variables, preparar I0.0 y ejecutar un ciclo | Último ciclo muestra Q0.0. Preparado distingue la entrada que aún no se ha ejecutado |
| SCADA | Pantalla sin objetos | Añadir rectángulo, texto e indicador; configurar geometría y señal de KOP; Probar | El indicador sigue la señal real; al cerrar el origen caduca |
| Modbus | Conexión sin lectura, puerto sin asignar | Configurar el laboratorio y lectura FC03, o pegar una trama TCP propia en Interpretar bytes | MBAP/PDU y registros; int16/binario/float32 con orden explícito. El intérprete local no envía paquetes |
| Serial | Sesión sin captura ni eventos | Trama propia: `01 03 00 00 00 02`, añadir CRC y decodificar; o iniciar captura del laboratorio | CRC C4 0B con desglose del decodificador RTU original; captura exportable |
| Vision | Sin imagen ni resultados anteriores | Abrir imagen propia, ajustar umbral/área en Detección y analizar. Guardar A, cambiar umbral, analizar B y comparar | Detecciones y diferencias reales. Una región se edita por coordenadas sin arrastre |
| BI | Espacio independiente sin tablas | Importar CSV propio al espacio actual o a otro nuevo; abrir SQL, desplegar esquema y Contar filas | Consulta sobre la tabla real, exportación del resultado e historial por espacio |

## Vision: imagen permanente

La imagen ocupa el centro. **Inspector** pliega los controles; **Ampliar imagen** oculta paneles y pestañas; Escape vuelve. El selector del inspector muestra una tarea cada vez: Fuente, Detección, Región, Medición o Archivos. Fuente permite configurar Archivo/USB/IP sin mezclar sus campos. La explicación extensa de calibración se abre en un diálogo, sin alargar el taller.

La geometría se comprueba a 1280×720, 1366×768 y 1920×1080: no requiere desplazamiento de la página ni de los paneles de configuración. En pantallas más pequeñas los controles se abren como panel superpuesto; las tablas e historiales tienen desplazamiento interno cuando el contenido lo necesita. No se comprimen datos ilimitados hasta hacerlos ilegibles.

La aplicación se refiere a **piezas y producto lineal continuo**. Una cámara permite inspección periódica de fotogramas; una foto estática no simula un flujo. No hay acumulación de longitud, sincronización con encoder ni control automático de rechazo. La medición dimensional exige patrón y verificación por fotograma; un resultado visual OK no certifica dimensiones.

## Qué se conserva

KOP/GRAFCET/HMI y el código SCL se guardan en el navegador. Vision conserva imagen/receta en el documento local, pero exige volver a inspeccionar y verificar la calibración. Modbus conserva perfil/lectura archivada, sin restaurar una autorización LAN. Serial recupera registros como archivo de lectura; las cámaras y conexiones no se abren silenciosamente. BI conserva espacios en disco; PLC conserva programa/escenario y arranca detenido. Exporta desde la herramienta para trasladar archivos.

Los puntos de BI referencian espacios del servidor: no son una copia independiente de todas sus tablas. Ninguna de estas funciones promete un archivo universal que restaure toda la suite.
