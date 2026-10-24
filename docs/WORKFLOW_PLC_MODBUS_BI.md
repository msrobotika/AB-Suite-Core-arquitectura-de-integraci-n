# Una condición, una CPU y dos formas de observarla

Práctica sin hardware ni ejemplos obligatorios. Objetivo: comprobar que una salida calculada en PLC es la misma que consulta Modbus y que captura BI. No conectar equipos externos.

## 1. Construir el programa

Desde el catálogo abre PLC. Pulsa **＋ Nuevo**, escribe un nombre y crea un programa vacío en bastidor libre. En Editor KOP añade una red. Cambia la dirección del contacto a **I0.0**, destino de bobina a **Q0.0**, y pulsa **Validar y cargar**. La CPU permanece detenida y no se ha ejecutado todavía esa condición.

En **Observación** añade `inputs.I0.0` y `outputs.Q0.0`. Prepara I0.0 a 1 y ejecuta un ciclo. Antes del ciclo, Preparado y Último ciclo son estados distintos; después, Q0.0 debe valer TRUE. Esta es tu referencia.

## 2. Leer esa CPU por Modbus

Abre Modbus en otra pestaña desde el catálogo. Pulsa **Leer CPU de la suite**. El botón configura el puerto del servidor residente y una lectura FC01 desde dirección PDU 0. El primer bit corresponde a Q0.0 y debe ser 1.

Vuelve a PLC, prepara I0.0 a 0 y ejecuta un ciclo. Repite la lectura Modbus: el primer bit debe ser 0. En Tramas TCP observa petición y respuesta reales. El laboratorio local de Modbus es otro destino: no comparar sus registros con la CPU como si fueran el mismo origen.

Si falla la conexión, conserva el error y comprueba que sigues usando la misma instancia de la suite. No sustituir un fallo por valores de ejemplo.

## 3. Registrar y consultar en BI

Abre BI, crea un espacio nuevo y pulsa **Capturar CPU**. Mantén la captura mientras alternas I0.0 y ejecutas varios ciclos en PLC. Detén la captura desde el mismo botón.

En Tablas de datos comprueba que aparece **SuitePLC**. Abre SQL y despliega esa tabla en el explorador de esquema: los nombres de columnas se descubren del modelo real. Pulsa **Consultar filas** y **Ejecutar SQL**. Comprueba las filas de ambos estados y exporta el resultado CSV si quieres conservarlo.

Las muestras se toman a intervalos; no se garantiza registrar cada flanco ni cada ciclo breve. Mantén cada estado varios segundos para esta práctica. Cambiar el espacio detiene una captura anterior para evitar escribir en otro análisis.

## Guardar y recuperar

Exporta el programa PLC como JSON y el espacio BI como `.abbi`. Los ocho puntos de Proyectos ayudan a recuperar trabajo local; no son un archivo universal de toda la suite. El programa de CPU y los espacios BI también quedan en `.suite-data`.

El recorrido automatizado comprueba CPU/Modbus y captura BI. Una futura grabación debe mostrar este flujo ejecutado, con datos sintéticos y sin tokens; no se publica una animación que aparente una conexión que no existe.
