# Validación de AB Suite · 23 de octubre de 2026

Validación local realizada en Windows, Node 24 y Python 3.13, con Chromium headless. No equivale a una validación de hardware físico ni a una auditoría de accesibilidad completa. Los jobs adicionales de Linux/macOS/Windows están configurados en GitHub Actions; su resultado se consulta en cada ejecución.

## Comprobaciones reproducibles

```sh
node scripts/check-workspace.mjs
```

La comprobación analiza la sintaxis de JavaScript y ejecuta **200 pruebas Node** del bus, contratos, HMI, almacenamiento de CPU y motores PLC/KOP/SCL/GRAFCET/Vision/SCADA histórico. Las 62 pruebas del PLC incluyen ejecución determinista y uso de una misma CPU desde HTTP/Modbus/Core.

```sh
python -m pip install pytest==9.1.1 httpx==0.28.1
python scripts/verify-python.py
```

Usar el intérprete preparado de `.venv`. Se ejecutan **130 pruebas Python**: 44 Modbus, 14 Serial, 13 Vision y 59 BI. Las nuevas pruebas BI verifican inicio vacío, migración de datos anteriores, aislamiento entre espacios, importación de varios archivos sin resultados parciales, recuperación, espacios de ejemplo y bloqueo de escrituras de una pestaña con otro espacio activo.

Las pruebas Python históricas de navegador no se incluyen en este comando. La nueva distribución se recorre mediante las pruebas de navegador comunes; no se contabilizan pruebas omitidas como aprobadas. FastAPI/Starlette emite un aviso de deprecación de su adaptador httpx de pruebas; no produjo fallos.

## Navegador

Con la suite arrancada, instala Playwright (`npm install`, seguido de `npx playwright install chromium`) y ejecuta:

```sh
node scripts/verify-browser.cjs
node scripts/verify-bi-browser.cjs
```

El primer script verifica **14 recorridos**: apertura de las nueve herramientas, ejecución KOP, HMI vinculado/caducidad/persistencia/errores, transferencia SCL a PLC, etapas GRAFCET, lecturas Modbus auténticas, comparación con la CPU compartida, captura/exportación Serial, inspección Vision, datos propios/SQL/exportación BI , caída/recuperación de servicios sin publicar señales obsoletas y adaptación a 390 px de las nueve herramientas y catálogo.

El segundo verifica **8 recorridos específicos de BI**: crear un espacio vacío; importar datos propios en otro espacio; consultar SQL; crear una visualización; cambiar y reabrir; conservar el análisis anterior; rechazar una importación inválida sin sustituir el trabajo; capturar opcionalmente la CPU en el modelo nativo. También prueba el renombrado. La respuesta HTTP 422 del caso inválido es intencional y su mensaje se verifica; no es un error de ejecución JavaScript.

Los scripts rechazan errores JavaScript/CSP y generan capturas/resultados en `.suite-data/qa`. Para usar instalaciones existentes de pruebas, `AB_SUITE_PLAYWRIGHT` permite indicar el módulo y `AB_SUITE_BROWSER` el ejecutable. `AB_SUITE_EVIDENCE` cambia el directorio de evidencia. Estas variables no afectan a la aplicación que usa el estudiante.

## Revisión visual

Se revisan el catálogo, las nueve herramientas, el HMI vinculado y un análisis BI creado con CSV propio. Los PNG de los repositorios originales son antecedentes; las capturas de esta versión se generan ejecutando la distribución integrada.

## Alcance restante

Los recorridos cubren los flujos descritos, no todas las combinaciones posibles de proyectos, archivos y dispositivos. No se probaron cámaras físicas, adaptadores serie, PLC externos ni instalación en un PC de usuario sin runtimes. La instalación automatizada y la matriz de CI permiten reproducir la validación en otros entornos. El catálogo y las guías mantienen los límites de cada motor explícitos.
