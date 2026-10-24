# Validación de AB Suite · 24 de octubre de 2026

Validación local realizada en Windows, Node 24 y Python 3.13, con Chromium headless. No equivale a una validación de hardware físico ni a una auditoría de accesibilidad completa. Los jobs adicionales de Linux/macOS/Windows están configurados en GitHub Actions; su resultado se consulta en cada ejecución.

## Comprobaciones reproducibles

```sh
node scripts/check-workspace.mjs
```

La comprobación analiza la sintaxis de JavaScript y ejecuta **235 pruebas Node** del bus, contratos, HMI, almacenamiento de CPU y motores PLC/KOP/SCL/GRAFCET/Vision/SCADA histórico. Las 62 pruebas del PLC incluyen ejecución determinista y uso de una misma CPU desde HTTP/Modbus/Core.

```sh
python -m pip install pytest==9.1.1 httpx==0.28.1
python scripts/verify-python.py
```

Usar el intérprete preparado de `.venv`. Se ejecutan **145 pruebas Python**: 47 Modbus, 17 Serial, 15 Vision y 66 BI. Las nuevas pruebas BI verifican inicio vacío, migración de datos anteriores, aislamiento entre espacios, importación de varios archivos sin resultados parciales, recuperación, espacios de ejemplo y bloqueo de escrituras de una pestaña con otro espacio activo.

Las pruebas Python históricas de navegador no se incluyen en este comando. La nueva distribución se recorre mediante las pruebas de navegador comunes; no se contabilizan pruebas omitidas como aprobadas. FastAPI/Starlette emite un aviso de deprecación de su adaptador httpx de pruebas; no produjo fallos.

## Navegador

Con la suite arrancada, instala Playwright (`npm install`, seguido de `npx playwright install chromium`) y ejecuta:

```sh
node scripts/verify-browser.cjs
node scripts/verify-bi-browser.cjs
node scripts/verify-editors-browser.cjs
node scripts/verify-new-user-browser.cjs
node scripts/verify-resident-browser.cjs
node scripts/verify-exercises-browser.cjs
node scripts/verify-portal-browser.cjs
```

El primer script verifica **14 recorridos**: apertura de las nueve herramientas, ejecución KOP, HMI vinculado/caducidad/persistencia/errores, transferencia SCL a PLC, etapas GRAFCET, lecturas Modbus auténticas, comparación con la CPU compartida, captura/exportación Serial, inspección Vision, datos propios/SQL/exportación BI , caída/recuperación de servicios sin publicar señales obsoletas y adaptación a 390 px de las nueve herramientas y catálogo.

El segundo verifica **8 recorridos específicos de BI**: crear un espacio vacío; importar datos propios en otro espacio; consultar SQL; crear una visualización; cambiar y reabrir; conservar el análisis anterior; rechazar una importación inválida sin sustituir el trabajo; capturar opcionalmente la CPU en el modelo nativo. También prueba el renombrado. La respuesta HTTP 422 del caso inválido es intencional y su mensaje se verifica; no es un error de ejecución JavaScript.

El tercer script verifica **14 recorridos de edición KOP/HMI**: área de trabajo y paneles plegables; programa KOP propio con NC, ejecución y recuperación; ramas, copia, orden y rechazo de errores; archivos JSON/SVG; creación de los 14 tipos HMI; límite de objetos conservando selección; arrastre, rejilla y tamaño; propiedades, teclado y capas; almacenamiento lleno con recuperación por exportación; composición propia e importación reversible; Probar sin recorte y persistencia; pantallas independientes; navegación con teclado manteniendo el foco durante las actualizaciones; y uso móvil con paneles desplegables.

El cuarto script añade **29 recorridos de primer uso**: inicio sin demo; trabajo propio y resultado en cada herramienta; reemplazo, recuperación y recarga/móvil en las nueve; y Vision con imagen permanente, cinco paneles sin desplazamiento a 1280×720, 1366×768 y 1920×1080, región por coordenadas, ayuda y ampliación.

En total son **123 recorridos de navegador** (14 generales + 8 BI + 15 editores + 32 primer uso + 4 CPU residente + 17 ejercicios portables + 10 portal y biblioteca + 14 idiomas + 9 ventana). Se revisan capturas a 1600 × 1000 y 390 × 844 de los nuevos editores. Los tests de modelo comprueban la adaptación de los 30 componentes de un proyecto HMI v1 anterior, límites geométricos, escalas, colores y referencias de navegación.

Los scripts rechazan errores JavaScript/CSP y generan capturas/resultados en `.suite-data/qa`. Para usar instalaciones existentes de pruebas, `AB_SUITE_PLAYWRIGHT` permite indicar el módulo y `AB_SUITE_BROWSER` el ejecutable. `AB_SUITE_EVIDENCE` cambia el directorio de evidencia. Estas variables no afectan a la aplicación que usa el estudiante.

## Revisión visual

Se revisan el catálogo, las nueve herramientas, el HMI vinculado y un análisis BI creado con CSV propio. La revisión 0.4 añade reorganización de las nueve herramientas, primer uso y Vision sin desplazamiento de página. La revisión 0.3 añadió KOP industrial, un sinóptico creado con primitivas propias, Probar con el documento completo y capturas móviles de ambos editores. Los PNG de los repositorios originales son antecedentes; las capturas de esta versión se generan ejecutando la distribución integrada.

## Alcance restante

Los recorridos cubren los flujos descritos, no todas las combinaciones posibles de proyectos, archivos y dispositivos. No se probaron cámaras físicas, adaptadores serie, PLC externos ni instalación en un PC de usuario sin runtimes. La instalación automatizada y la matriz de CI permiten reproducir la validación en otros entornos. El catálogo y las guías mantienen los límites de cada motor explícitos.

La difusión sigue aplazada según [RELEASE_READINESS.md](RELEASE_READINESS.md). CI valida el código en su matriz, pero no sustituye la instalación manual en equipos limpios ni una auditoría de accesibilidad.

## Seguimiento 0.4.1

CI de 0.4.0 detectó desbordamiento real en el panel IP de Vision sobre Linux. Las credenciales opcionales se trasladan a un diálogo; se mantiene la aserción sin scroll y se prueba que la contraseña no entra en el documento. Se añaden contratos públicos tipados, compilación de consumidores en CI, pruebas de identidad de validadores y errores de red accionables. No se cuenta el CI anterior fallido como aprobado.

Tras instalar dependencias de desarrollo, `npm run test:contracts` verifica consumidores TypeScript. El runtime continúa usando los validadores originales; los tipos no sustituyen permisos, límites ni validación de datos recibidos.

## CPU residente y SCADA 0.4.2

Cuatro pruebas de motor/HTTP comprueban proyección del estado ejecutado, autorización, Origin, lectura sin comandos, error 503 y que una caída no refresca timestamps. Cuatro recorridos de navegador comprueban salida/ciclo reales, cerrar PLC manteniendo CPU y HMI, caída/caducidad sin recurrir a datos de otra pestaña y recarga de SCADA sin reabrir PLC.

El resto de motores de navegador conservan su alcance de pestaña. El histórico SCADA persistente y la distribución con runtimes incluidos continúan pendientes.

## Ejercicios portables 0.5.0

Once pruebas Node nuevas verifican los nueve documentos, límites de archivo, versiones y objetos, ausencia de referencias BI, señales archivadas, cabeceras PNG y parámetros de entrada de los servidores nativos. Siete pruebas Python BI verifican validación semántica de solo lectura, datos rechazados y conservación del espacio activo. Diecisiete recorridos adicionales de navegador reúnen documentos propios de las nueve herramientas, descargan el archivo, importan en otro contexto, abren cada componente y recuperan el trabajo previo. Incluyen SQL sobre los datos recuperados, imagen/ROI/referencia Vision, CPU STOP, archivo Serial, lectura Modbus caducada, error al conservar y error al aplicar, detección de otra vista, migración de biblioteca, conservación de componentes anteriores al actualizarlos, Vision tras recargar sin depender del límite de localStorage y móvil.

El total actual es 123 recorridos (14 + 8 + 15 + 32 + 4 + 17 + 10 + 14 + 9). [Contrato, operaciones y límites](EXERCISES.md). Una copia explícita de documentos no se presenta como sincronización automática ni restauración simultánea del entorno de ejecución.

## Inicio independiente y biblioteca 0.5.1

Diez recorridos adicionales comprueban las nueve aplicaciones visibles con enlaces de apertura dentro de tres tamaños de escritorio, favoritas persistentes con inicio en Todas, búsqueda/filtros, diálogos por teclado y apertura de una herramienta sin cargar servicios de otras. El panel opcional consulta la CPU residente sin necesitar su vista, exporta muestras y verifica caducidad/recuperación ante 503 sin recurrir a una caché falsa reciente. Verifican migración desde IndexedDB v2 conservando documentos y copias, listado solo de índices sin getAll de cargas completas, renombrado con fallo de almacenamiento, duplicado independiente, archivo/restauración, bloqueo de captura sobre archivados, retirada/recuperación de componentes, cambios desde otra pestaña, concurrencia y móvil. No se afirma una auditoría completa de accesibilidad.

## Instalación e idiomas (0.6.0)

`node scripts/verify-i18n-browser.cjs`: 14 recorridos adicionales. Verifican los nueve proyectos propios, conservación de datos al cambiar idioma, búsqueda en inglés y valores internos de filtros, preferencia entre pestañas, código escrito sin modificar, primer uso según idioma y controles KOP ejecutando lógica real. Serial verifica que recuperar un documento anteriormente en vivo conserva sus tramas aunque la captura del servidor esté vacía.

`python scripts/verify-windows-install.py --installer <exe> --workspace <carpeta de pruebas> --browser-tests`: instalación en inglés sin elevación, nueve herramientas con PATH vacío, recorridos del paquete instalado, actualización en español, salida de los procesos y desinstalación conservando datos. Solo ejecutarlo sobre carpetas de pruebas descartables. La compilación se documenta en `desktop/README.md`.

`node scripts/verify-viewport-browser.cjs`: 9 recorridos de ventana por aplicación, en español e inglés a 1280×720 y 1366×768. Abre las tareas y paneles reales; crea redes/etapas y los 14 tipos HMI; verifica que ningún mando activo quede fuera de la ventana. El documento (programa, imagen, tablas, histórico o capas) puede desplazarse dentro de su área; la página y las barras de control permanecen fijas.

Modbus verifica respuestas HTTP 413 ante tres tamaños de petición excesiva. El servidor descarta un cuerpo acotado antes de cerrar para que Windows no sustituya la respuesta por un reinicio TCP; no analiza ni ejecuta esas solicitudes.

## Edición y adquisición 0.6.1

KOP permite eliminar la última red con el mando del lienzo o Supr, deshacer y conservar el programa sin redes al recargar. Supr dentro de un campo sigue editando el texto. El comando nativo de nuevo proyecto también crea cero redes.

Vision separa Fuente, Detección, Región, Medición y Archivos mediante pestañas. Conectar cámara abre la fuente USB y permite escoger dispositivo. Directo presenta una máscara sin registrar inspecciones; Capturar congela y Analizar registra. El rango de luminosidad incluye ambos extremos 0–255, se valida en el motor y viaja en recetas, documentos e historial CSV. Cambiar parámetros invalida la comparación del resultado anterior hasta analizar otra vez.

Dos pruebas de motor verifican extremos inclusivos, ROI, serialización y rangos rechazados. Los recorridos nuevos cubren borrado y persistencia, rango sin resultados ficticios, cámara sintética de Chromium, captura y liberación del stream, y denegación simulada de getUserMedia. No certifican una cámara USB física ni una instalación de cámara IP concreta. El auditor de ventana recorre también cada pestaña, fuente y método de Vision en ES/EN a 1280×720 y 1366×768.

[Normas de interacción y referencias](WORKSPACE_INTERACTION.md). Continúan pendientes las pruebas físicas y con usuarios externos.

Modbus descarta cuerpos rechazados antes de cerrar la conexión, con máximo de 1 MiB y plazo total de 0,5 s. La prueba nueva exige errores JSON 401/403/415 con cuerpo recibido y confirma que no se ejecuta ninguna acción rechazada. Esto amplía el manejo anterior de errores 413 para evitar reinicios TCP en Windows.
