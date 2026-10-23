# Arquitectura y semántica de ejecución

La capa de simulación de src/plc-engine.js no depende del DOM, red ni reloj físico; recibe intervalos de tiempo explícitos y produce un estado reproducible.

Flujo: JSON version 1 → validateProgram → motor → scan(dtMs) → traza de redes y cambios → interfaz.

## Direcciones

- I0.0: entrada digital, booleana, escrita por setInput.
- Q0.0: salida digital, booleana, bobina / SET / RESET.
- M0.0: memoria booleana, bobina / SET / RESET.
- AI0: entrada analógica numérica, escrita por setAnalog.
- T0: temporizador, ET ms y Q booleana.
- C0: contador, CV entero y Q booleana.
- AQ0: reservado, no se escribe en v0.1.

## Condiciones del AST JSON

- {"op":"contact","tag":"I0.0","nc":false}
- {"op":"and","items":[condición,condición]}
- {"op":"or","items":[condición,condición]}
- {"op":"not","item":condición}
- {"op":"compare","tag":"AI0","cmp":">=","value":50}
- {"op":"always"}

## Acciones del AST JSON

- {"type":"coil","target":"Q0.0"}
- {"type":"set","target":"M0.0"}
- {"type":"reset","target":"M0.0"}
- {"type":"ton","target":"T0","presetMs":2000}
- {"type":"tof","target":"T0","presetMs":2000}
- {"type":"ctu","target":"C0","preset":5}
- {"type":"resetCounter","target":"C0"}

## Scan

Las redes se evalúan ordenadamente. Los cambios se aplican inmediatamente, de modo que las redes siguientes leen el nuevo valor. TON suma dtMs mientras la condición sea cierta. TOF mantiene Q durante el tiempo programado desde que cae la condición. CTU suma una vez por cada transición false→true. Un scan no depende del tiempo de CPU ni del reloj del navegador.

El motor implementa semántica propia inspirada en conceptos IEC, **no es un emulador fiel de Siemens, Omron ni Codesys**. El JSON es un esquema de este proyecto, no formato AWL/KOP/SCL de fabricantes.

## Límites

No hay compilación GRAFCET, tareas cíclicas avanzadas, entradas de hardware, salidas analógicas, Modbus/OPC UA ni seguridad certificada. El proceso de transporte es matemático y didáctico, no un gemelo digital calibrado físicamente.
