# Validación de AB Suite · 24 de octubre de 2026

Validación local realizada en Windows, Node 24 y Python 3.13, con Chromium headless. No equivale a una validación de hardware físico ni a una auditoría de accesibilidad completa. Los jobs adicionales de Linux/macOS/Windows están configurados en GitHub Actions; su resultado se consulta en cada ejecución.

## Comprobaciones reproducibles

```sh
node scripts/check-workspace.mjs
```

La comprobación analiza la sintaxis de JavaScript y ejecuta **216 pruebas Node** del bus, contratos, HMI, almacenamiento de CPU y motores PLC/KOP/SCL/GRAFCET/Vision/SCADA histórico. Las 62 pruebas del PLC incluyen ejecución determinista y uso de una misma CPU desde HTTP/Modbus/Core.

```sh
python -m pip install pytest==9.1.1 httpx==0.28.1
python scripts/verify-python.py
```

Usar el intérprete preparado de `.venv`. Se ejecutan **136 pruebas Python**: 45 Modbus, 17 Serial, 15 Vision y 59 BI. Las nuevas pruebas BI verifican inicio vacío, migración de datos anteriores, aislamiento entre espacios, importación de varios archivos sin resultados parciales, recuperación, espacios de ejemplo y bloqueo de escrituras de una pestaña con otro espacio activo.

Las pruebas Python históricas de navegador no se incluyen en este comando. La nueva distribución se recorre mediante las pruebas de navegador comunes; no se contabilizan pruebas omitidas como aprobadas. FastAPI/Starlette emite un aviso de deprecación de su adaptador httpx de pruebas; no produjo fallos.

## Navegador

Con la suite arrancada, instala Playwright (`npm install`, seguido de `npx playwright install chromium`) y ejecuta:

```sh
node scripts/verify-browser.cjs
node scripts/verify-bi-browser.cjs
node scripts/verify-editors-browser.cjs
node scripts/verify-new-user-browser.cjs
```

El primer script verifica **14 recorridos**: apertura de las nueve herramientas, ejecución KOP, HMI vinculado/caducidad/persistencia/errores, transferencia SCL a PLC, etapas GRAFCET, lecturas Modbus auténticas, comparación con la CPU compartida, captura/exportación Serial, inspección Vision, datos propios/SQL/exportación BI , caída/recuperación de servicios sin publicar señales obsoletas y adaptación a 390 px de las nueve herramientas y catálogo.

El segundo verifica **8 recorridos específicos de BI**: crear un espacio vacío; importar datos propios en otro espacio; consultar SQL; crear una visualización; cambiar y reabrir; conservar el análisis anterior; rechazar una importación inválida sin sustituir el trabajo; capturar opcionalmente la CPU en el modelo nativo. También prueba el renombrado. La respuesta HTTP 422 del caso inválido es intencional y su mensaje se verifica; no es un error de ejecución JavaScript.

El tercer script verifica **14 recorridos de edición KOP/HMI**: área de trabajo y paneles plegables; programa KOP propio con NC, ejecución y recuperación; ramas, copia, orden y rechazo de errores; archivos JSON/SVG; creación de los 14 tipos HMI; límite de objetos conservando selección; arrastre, rejilla y tamaño; propiedades, teclado y capas; almacenamiento lleno con recuperación por exportación; composición propia e importación reversible; Probar sin recorte y persistencia; pantallas independientes; navegación con teclado manteniendo el foco durante las actualizaciones; y uso móvil con paneles desplegables.

El cuarto script añade **29 recorridos de primer uso**: inicio sin demo; trabajo propio y resultado en cada herramienta; reemplazo, recuperación y recarga/móvil en las nueve; y Vision con imagen permanente, cinco paneles sin desplazamiento a 1280×720, 1366×768 y 1920×1080, región por coordenadas, ayuda y ampliación.

En total son **65 recorridos de navegador** (14 generales + 8 BI + 14 editores + 29 primer uso). Se revisan capturas a 1600 × 1000 y 390 × 844 de los nuevos editores. Los tests de modelo comprueban la adaptación de los 30 componentes de un proyecto HMI v1 anterior, límites geométricos, escalas, colores y referencias de navegación.

Los scripts rechazan errores JavaScript/CSP y generan capturas/resultados en `.suite-data/qa`. Para usar instalaciones existentes de pruebas, `AB_SUITE_PLAYWRIGHT` permite indicar el módulo y `AB_SUITE_BROWSER` el ejecutable. `AB_SUITE_EVIDENCE` cambia el directorio de evidencia. Estas variables no afectan a la aplicación que usa el estudiante.

## Revisión visual

Se revisan el catálogo, las nueve herramientas, el HMI vinculado y un análisis BI creado con CSV propio. La revisión 0.4 añade reorganización de las nueve herramientas, primer uso y Vision sin desplazamiento de página. La revisión 0.3 añadió KOP industrial, un sinóptico creado con primitivas propias, Probar con el documento completo y capturas móviles de ambos editores. Los PNG de los repositorios originales son antecedentes; las capturas de esta versión se generan ejecutando la distribución integrada.

## Alcance restante

Los recorridos cubren los flujos descritos, no todas las combinaciones posibles de proyectos, archivos y dispositivos. No se probaron cámaras físicas, adaptadores serie, PLC externos ni instalación en un PC de usuario sin runtimes. La instalación automatizada y la matriz de CI permiten reproducir la validación en otros entornos. El catálogo y las guías mantienen los límites de cada motor explícitos.

La difusión sigue aplazada según [RELEASE_READINESS.md](RELEASE_READINESS.md). CI valida el código en su matriz, pero no sustituye la instalación manual en equipos limpios ni una auditoría de accesibilidad.

## Seguimiento 0.4.1

CI de 0.4.0 detectó desbordamiento real en el panel IP de Vision sobre Linux. Las credenciales opcionales se trasladan a un diálogo; se mantiene la aserción sin scroll y se prueba que la contraseña no entra en el documento. Se añaden contratos públicos tipados, compilación de consumidores en CI, pruebas de identidad de validadores y errores de red accionables. No se cuenta el CI anterior fallido como aprobado.

Tras instalar dependencias de desarrollo, `npm run test:contracts` verifica consumidores TypeScript. El runtime continúa usando los validadores originales; los tipos no sustituyen permisos, límites ni validación de datos recibidos.
