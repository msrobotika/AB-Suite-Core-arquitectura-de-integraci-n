# Ejercicios portables de AB Suite

Cada herramienta se puede usar por separado desde el catálogo; la biblioteca de ejercicios es opcional.

Un `.absuite` reúne copias completas de documentos de las nueve herramientas. Puedes empezar con una sola y añadir las demás conforme avance tu práctica. Los formatos nativos siguen disponibles.

## Crear y llevarte tu ejercicio

1. En el catálogo abre **Mis ejercicios** y crea uno vacío con tu nombre.
2. Trabaja en una herramienta. Desde **Proyectos → Añadir a un ejercicio**, elige el ejercicio de destino y pulsa **Añadir copia actual**. También puedes crear el ejercicio desde ese diálogo.
3. Repite con las herramientas que necesites. Añadir de nuevo la misma herramienta actualiza su componente dentro del ejercicio y conserva la copia anterior en Trabajos conservados. La herramienta activa se conserva.
4. Vuelve a **Mis ejercicios** y pulsa **Descargar .absuite**. Cada tarjeta indica la fecha de la copia incorporada.
5. En otro navegador o equipo, arranca AB Suite y usa **Importar .absuite**. El archivo se valida completo y crea una entrada nueva. No cambia documentos abiertos ni activa motores.
6. Pulsa **Abrir copia guardada** en un componente. Antes de aplicarlo, la suite conserva el trabajo actual en **Trabajos conservados**. BI abre otro espacio y mantiene el anterior en su biblioteca.

**Las copias son explícitas.** Editar después en una herramienta no actualiza automáticamente el ejercicio ni un archivo ya descargado. Vuelve a añadir la copia y descargar el archivo cuando quieras incorporar los cambios.

## Organizar sin perder el trabajo

Busca por nombre de ejercicio o componente. Cada entrada muestra su última actualización y número de componentes. **Organizar** permite renombrar, crear una copia independiente y archivar. Los archivados conservan sus datos, siguen siendo descargables y aparecen al elegir **Archivados**; **Restaurar ejercicio** los devuelve a los destinos de captura. Archivar no libera espacio ni borra archivos.

El menú de un componente permite **Retirar del ejercicio** sin modificar la herramienta activa. Su documento completo queda en **Trabajos conservados**, donde puedes filtrar por herramienta, abrirlo o volver a añadirlo al ejercicio seleccionado. Antes de sustituir un componente al recuperarlo se conserva también el que estuviera en su lugar.

La biblioteca lista índices pequeños con nombres, fechas y herramientas. Las imágenes, tablas y fuentes completas se leen al abrir, descargar, modificar, duplicar o recuperar. Las migraciones conservan los documentos y las copias guardadas en versiones anteriores.

## Contenido y límites

| Herramienta | Se incorpora | Al abrir |
| --- | --- | --- |
| KOP | Redes, variables y parámetros | Simulación reiniciada, sin Auto |
| PLC | Programa y escenario elegido | CPU en STOP; sin forzados ni entradas preparadas |
| SCL | Fuente y nombre, incluso un borrador pendiente de corregir | Se analiza el código, sin ejecutarlo en la CPU |
| GRAFCET | Etapas, transiciones, acciones, geometría y entradas del documento | Marcado inicial, sin Auto |
| SCADA | Pantallas, figuras, señales y propiedades | Diseño; los valores proceden de fuentes conectadas, no del archivo |
| Modbus | Configuración, últimas tramas y lectura archivada | Sin sondeo ni autorización LAN; la lectura no se publica como señal viva |
| Serial | Hasta 500 eventos visibles de la captura | Archivo de lectura; sin abrir un puerto ni iniciar laboratorio |
| Vision | Imagen PNG, referencia de comparación si existe, región, receta y parámetros de medida | Sin cámara ni inspección continua; la calibración debe verificarse de nuevo |
| BI | Tablas y filas, relaciones, expresiones, visualizaciones, filtros y metadatos del proyecto nativo | Espacio nuevo, captura de CPU detenida |

No contiene estados internos de ejecución, permisos de cámara/LAN, contraseñas, tokens de motores ni referencias de espacio BI que dependan de otro equipo. No reúne todos los espacios de BI, históricos ilimitados de HMI, copias físicas de limpieza ni otros archivos externos. Conserva expresamente los datos de usuario incorporados a imágenes, tablas, fuentes y capturas: el archivo se comparte por decisión de su propietario.

Límite de archivo: 50 MiB; BI mantiene su límite nativo de 30 MiB, tablas/filas y 32 visualizaciones. Vision admite hasta 2 millones de píxeles por imagen y referencia del mismo tamaño. Las funciones y errores de los motores originales siguen aplicándose. Si hay datos BI, su motor debe estar disponible para validar antes de añadir, importar o descargar.

## Recuperación y almacenamiento

La biblioteca y el trabajo activo de Vision/Modbus/Serial usan IndexedDB en este navegador y origen local (dirección y puerto). Importar dos veces un archivo crea dos entradas independientes con identificadores nuevos. No se envían documentos a una nube. El cierre de una pestaña no borra la biblioteca; borrar datos del navegador sí puede hacerlo. El `.absuite` descargado es la copia portable.

La escritura de cada ejercicio se confirma al completar la transacción de IndexedDB. Una importación inválida no crea un ejercicio parcial. Al actualizar un componente se conserva su copia anterior en la misma transacción. Un error de cuota o permisos al conservar el trabajo anterior bloquea la apertura del componente; no se presenta un guardado en memoria como persistente. Si falla su aplicación, se intenta restaurar el documento previo y se conserva además la copia recuperable. Un error de recuperación se informa expresamente.

Cierra otras pestañas de la misma herramienta antes de abrir un componente. La suite comprueba las vistas activas que responden por BroadcastChannel para evitar que una segunda vista sobrescriba después los cambios. Esto no es un sistema colaborativo de edición concurrente ni una transacción que restaure las nueve herramientas a la vez: cada componente se abre mediante una acción propia.

## Contrato y pruebas

Manifiesto JSON UTF-8: `schema: ab-suite.exercise.v1`, `name`, `createdAt` ISO y `components`, con claves de herramienta y entradas `{savedAt, document}`. No incluye IDs internos de biblioteca. Cada componente se valida antes de guardarse y todos se validan antes de importar o descargar. Se reutilizan validadores nativos; BI dispone de una validación semántica de solo lectura. PNG se verifica por dimensiones y decodificación en el navegador.

`tests/exercise-contract.test.mjs` cubre modelos, versiones, límites, estructura, errores y rechazo de referencias locales. `scripts/verify-exercises-browser.cjs` realiza una práctica con las nueve herramientas, descarga e importa en un contexto independiente, abre cada documento, verifica datos SQL y Vision, inyecta fallos de almacenamiento/aplicación y recupera el trabajo previo. Las capturas y resultados se generan localmente, no se versionan.
