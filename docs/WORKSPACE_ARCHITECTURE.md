# Arquitectura de la distribución integrada

## Un arranque y un origen

`scripts/workspace.mjs` inicia una CPU virtual Node, un proceso acompañante Python y la entrada web en `http://127.0.0.1:4170`. El proceso Python aloja los motores originales Modbus, Serial, BI y el adaptador opcional de cámara IP de Vision. Los puertos internos son dinámicos; el usuario no tiene que copiarlos.

El servidor común sirve los editores y enruta las API nativas por `/apps/<id>/`. Reescribe las rutas de activos de las páginas propias e incorpora la barra. `ABSuite.fetch` resuelve las API de cada herramienta, sin modificar el `fetch` global. La comprobación de Host y Origin se realiza antes del proxy; las peticiones internas se dirigen exclusivamente a motores creados por el lanzador.

El antiguo bus HTTP/SSE sigue disponible con `node scripts/serve.mjs` o `npm run bus`. Sus exportaciones de biblioteca y contratos v1 permanecen. La experiencia web no exige que el estudiante configure credenciales de ese bus.

## Una CPU, varios consumidores

La entrada PLC usa `suite-app.js`, el editor KOP nativo y `mountLabSimulator`. Cuando se abre desde la suite, usa la CPU residente del servidor. El editor, JSON, laboratorio y endpoint Modbus TCP leen o cambian esa misma CPU. La consola antigua se conserva como antecedente, fuera de la navegación integrada.

SCL y KOP producen proyectos KOP schema 1. La transferencia propone su importación al destinatario; este valida y convierte símbolos con `importABKop`, mostrando su mapa. TON se convierte de ciclos a milisegundos según el scan. La importación no se presenta como compilación para un PLC comercial.

El programa y escenario residentes se guardan en `.suite-data/plc-program.json`. Al iniciar se restaura la configuración con la CPU detenida, no una ejecución anterior ni sus forzados.

## Señales entre herramientas

`web/boot.js` publica valores booleanos y numéricos bajo `ab-suite.signals.v1`, con origen, instancia y tiempo. El último estado se conserva en almacenamiento local del navegador; BroadcastChannel lo anuncia dentro del mismo origen. El contrato admite hasta 256 señales y rechaza valores no finitos. El origen común es necesario para que estas API compartan contexto: [referencia MDN](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API).

SCADA consume las señales del ejercicio y separa calidad buena, ausente y caducada. Cinco segundos sin actualización invalidan la lectura. Una instancia de un editor no sustituye silenciosamente a otra que ya publica; PLC puede tener varias vistas porque comparte la CPU de servidor. Mantener abiertas las pestañas que publiquen señales para el HMI. El navegador puede suspender pestañas en segundo plano y entonces se indica caducidad.

Las señales de Vision corresponden al último resultado y contadores de sesión, no a una cámara nueva inventada. Modbus publica únicamente una lectura reciente, e invalida su resultado cuando una petición falla. Serial publica estado y contadores de captura.

## Datos y espacios AB BI

`backend/workspaces.py` almacena cada espacio en `.suite-data/bi/spaces/<id>/workspace.json`, con sus propias copias de limpieza. El identificador activo se guarda aparte; las rutas se generan con UUID validados. Se migran los datos antiguos una vez, sin introducir una demo en un proyecto del usuario.

La carga de varios archivos valida todos antes de cambiar el modelo. Puede crear un espacio nuevo o añadir tablas al activo. El backend comprueba el identificador de destino y bloquea una escritura de una pestaña que conserva otro espacio. Un proyecto `.abbi` se abre en un espacio adicional.

La captura de CPU es explícita desde BI. `src/bi-capture.js` envía muestras a la API de ingesta nativa, en la tabla `SuitePLC`, asociadas al espacio elegido. Si cambia el espacio, una captura antigua se detiene en vez de escribir en otro. Los tokens efímeros de ingesta permanecen entre procesos y no se exportan con los proyectos.

## Distribución y mantenimiento

Las nueve aplicaciones son código propio incorporado con sus licencias MIT y revisiones de origen en `apps/sources.json`. Este repositorio contiene la versión integrada; actualizar una copia independiente no actualiza automáticamente la suite. Las siguientes versiones deben migrar fuentes conscientemente y repetir las pruebas comunes.

El navegador sigue necesitando los servicios locales de las herramientas que los requieren. La suite no es un conjunto de HTML autónomos de doble clic ni se presenta como un servicio alojado multiusuario. Después de preparar dependencias, la entrada y los motores funcionan sin CDN.
