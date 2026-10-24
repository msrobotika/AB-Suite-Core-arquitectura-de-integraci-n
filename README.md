# AB Suite · MS ROBOTIKA

[![CI de la suite](https://github.com/msrobotika/AB-Suite-Core-arquitectura-de-integraci-n/actions/workflows/ci.yml/badge.svg?branch=codex%2Fsuite-workspace)](https://github.com/msrobotika/AB-Suite-Core-arquitectura-de-integraci-n/actions/workflows/ci.yml) · [Licencia MIT](LICENSE) · [Contribuir](CONTRIBUTING.md) · [Seguridad](SECURITY.md)

Un laboratorio local de programación y automatización con nueve herramientas propias: PLC, KOP, SCL, GRAFCET, SCADA, Modbus, Serial, Vision y BI. Código abierto bajo MIT; las dependencias mantienen sus licencias.

**Una entrada:** abre el catálogo y pulsa **Abrir herramienta**. Los editores, simuladores y herramientas con backend se presentan en la misma dirección y comparten navegación, guía y lenguaje visual. Exportar un proyecto es una operación separada.

## Descargar toda la suite

**[Descargar AB Suite completa · ZIP de revisión](https://github.com/msrobotika/AB-Suite-Core-arquitectura-de-integraci-n/archive/refs/heads/codex/suite-workspace.zip)**

Esta rama contiene las nueve herramientas integradas. Descarga un solo ZIP, pulsa **Extraer todo** y abre `iniciar.bat` dentro de la carpeta extraída. No abras los HTML sueltos ni descargues nueve repositorios. La revisión sigue en desarrollo; el [cambio completo está en la PR #4](https://github.com/msrobotika/AB-Suite-Core-arquitectura-de-integraci-n/pull/4).

Consulta [LEEME-PRIMERO.md](LEEME-PRIMERO.md) para instalación, requisitos y solución de problemas.

## Empezar

Requisitos: **Node.js 20+**, **Python 3.11+** y un navegador moderno. No se requiere npm para ejecutar los motores. La primera preparación necesita Internet para las dependencias Python de BI.

En Windows, abre **`iniciar.bat`**. En macOS/Linux, ejecuta `sh iniciar.sh`. Preparan el entorno local cuando falta y abren el catálogo. La consola debe permanecer abierta durante la sesión.

También puedes hacerlo desde terminal:

```sh
node scripts/setup.mjs
node scripts/workspace.mjs
```

Abre **[AB Suite local](http://127.0.0.1:4170)**. Ctrl+C detiene la suite. `AB_SUITE_PORT` permite elegir otro puerto y `AB_SUITE_PYTHON` un intérprete ya preparado. Si falta Python, las herramientas de navegador siguen disponibles y el catálogo identifica los motores pendientes.

## Tú eliges las herramientas

El inicio muestra las nueve aplicaciones al mismo nivel. Puedes usar una sola, marcar favoritas o buscar por función; no exige seguir una ruta ni crear un ejercicio conjunto. La ayuda, las conexiones y la descarga se abren desde la cabecera. En cada entrada se muestran de nuevo las nueve, conservando las estrellas que hayas marcado.

## Tu primer proyecto

En cualquiera de las nueve herramientas, pulsa **＋ Nuevo** en la barra común, escribe un nombre y crea tu trabajo. El anterior queda recuperable en **Proyectos**. Los ejemplos son opcionales y no se cargan al iniciar KOP, SCL, GRAFCET o Vision.

KOP y PLC empiezan sin redes: añade la primera y define tus contactos. GRAFCET conserva una única etapa inicial sin acciones; SCADA un lienzo sin objetos; Vision no tiene imagen; Modbus y Serial no muestran resultados anteriores; BI crea otro espacio sin tablas. La [guía de primer uso](docs/NEW_USER_WORKFLOW.md) explica una práctica propia en cada herramienta y qué se conserva al cerrar.

Para comprobar la interconexión, sigue la [práctica PLC → Modbus → BI](docs/WORKFLOW_PLC_MODBUS_BI.md). La [revisión de la auditoría externa](docs/AUDIT_FOLLOWUP.md) distingue lo implementado, lo corregido y lo pendiente. La [estrategia de plataforma](docs/PLATFORM_STRATEGY.md) ordena las siguientes entregas y contrasta la segunda auditoría con el código real.

## Un ejercicio con varias herramientas

Abre **Mis ejercicios** desde el catálogo y crea uno vacío. En **Proyectos → Añadir a un ejercicio** de cada herramienta, selecciona ese ejercicio y pulsa **Añadir copia actual**. La biblioteca reúne los documentos incorporados y permite descargarlos en un solo `.absuite`, con datos BI completos e imágenes/recetas de Vision.

Importar valida el conjunto y crea una entrada nueva. Abrir un componente conserva primero el trabajo actual; la CPU queda en STOP y las comunicaciones no arrancan. Las copias se actualizan expresamente al añadirlas: no se sincronizan solas con ediciones posteriores. Consulta [contenido, recuperación y límites](docs/EXERCISES.md).

## Herramientas y conexiones reales

| Herramienta | Trabajo propio | Conexión integrada |
| --- | --- | --- |
| KOP Studio | Editor industrial de redes, bobinas y TON, paneles plegables | Transferencia validada al PLC; señales para HMI |
| SCL Studio | Expresiones BOOL verificadas y conversión KOP | Transferencia al PLC; señales para HMI; borrador local |
| GRAFCET Studio | Etapas, transiciones y acciones editables | Etapas y acciones publicadas para HMI |
| PLC Simulator | Programa KOP/JSON, escenarios y diagnóstico | Una CPU para editor, laboratorio, Modbus y captura BI |
| SCADA Studio | Lienzo libre, figuras, símbolos industriales y navegación | Vinculación de señales, tendencias y alarmas de umbral |
| Modbus Studio | Lecturas FC01–04 y examen de tramas TCP | «Leer CPU de la suite» consulta la CPU residente |
| Serial Analyzer | Captura RTU de laboratorio, CRC y filtros | Estado de sesión para HMI; exportación CSV para BI |
| Vision Inspector | Imágenes, regiones, umbrales y recetas | Resultados para HMI; CSV para BI; adaptador IP opcional |
| AB BI | Espacios vacíos o importados, SQL, expresiones y gráficos | Captura explícita de CPU en `SuitePLC`; importación de datos |

Los límites de cada motor se explican en su guía y documentación. La suite se centra en automatización, lógica, comunicaciones y análisis; no implementa todos los lenguajes de programación ni los runtimes de fabricantes de PLC.

## BI con datos propios

AB BI empieza con un espacio vacío. **Nuevo espacio** crea un análisis independiente. Al importar CSV/TSV, JSON o XLSX, elige **Crear un espacio nuevo** o **Añadir tablas al espacio actual**. Todos los archivos se validan antes de aplicar la importación. Un recuento de filas por tabla permite crear la primera visualización sin heredar fórmulas de una demo.

El selector permite volver a los espacios guardados. También puedes renombrarlos, duplicarlos y exportarlos como `.abbi`. **Abrir ejemplo** crea otro espacio, y un proyecto `.abbi` importado tampoco sustituye el actual. Las copias de limpieza pertenecen a su espacio.

AB BI tiene identidad y motor de expresiones propios. La gramática incluye compatibilidad parcial con funciones conocidas; no es una réplica ni afirma compatibilidad total con productos comerciales.

## Crear tu pantalla HMI

Abre PLC, KOP, SCL o GRAFCET en otra pestaña. En SCADA compón un lienzo libre con rectángulos, elipses, líneas, texto y tuberías. Añade depósitos, bombas, válvulas, motores, indicadores, valores, tendencias o alarmas y selecciona sus señales. Las figuras no introducen una simulación física adicional.

Mueve y redimensiona con el ratón o escribe coordenadas y dimensiones en el inspector. Ajusta rejilla, colores, trazo, escala del depósito y capas. Los paneles se pueden plegar para ampliar el trabajo; **Encajar** considera ancho y alto. Las flechas mueven 1 px y Mayús+flecha, 10 px. Duplicar, eliminar, importar y editar admiten deshacer/rehacer.

Crea pantallas independientes y usa el componente **Navegación** para abrirlas en modo **Probar**. Exporta el proyecto `.hmi.json`; los proyectos v1 de tarjetas se adaptan al lienzo sin perder sus señales. Consulta la [guía de editores](docs/EDITORS.md).

No se impone una línea de producción. Si una fuente no actualiza sus señales durante cinco segundos, se muestran como caducadas. La CPU PLC permanece en el servidor y SCADA la consulta directamente: cerrar PLC no detiene la CPU ni sus lecturas en el HMI. Los demás editores que publican desde el navegador necesitan su pestaña abierta.

## Guardado y privacidad

- `.suite-data/`: espacios BI, copias de limpieza, perfiles Modbus y programa residente de la CPU. No se versiona ni se distribuye.
- Navegador: proyectos KOP/GRAFCET/HMI, borrador SCL, recetas Vision y progreso de las guías. IndexedDB conserva ejercicios `.absuite`, copias previas y trabajo activo Vision/Modbus/Serial. Exporta archivos para trasladarlos a otro navegador/equipo.
- Serial e históricos de ejecución: buffers limitados de sesión; exportación explícita. Las capturas recuperadas son archivos de lectura, no una conexión en directo.
- Proyectos: hasta ocho puntos de vuelta por herramienta en este navegador. No sustituyen a la exportación portable ni a las copias del disco. Vision conserva imagen/receta; Modbus configuración/última lectura; Serial una captura acotada. Un fallo de almacenamiento se indica y permite exportar.

La suite escucha en loopback. No necesita cuentas ni CDN, y no envía proyectos a una nube. La captura BI es una acción explícita. Las contraseñas de cámaras y tokens de motores no se incorporan a los proyectos.

## Desarrollo y calidad

```sh
node scripts/check-workspace.mjs
python scripts/verify-python.py
```

El segundo comando debe usar el Python preparado de `.venv` y requiere las dependencias de pruebas indicadas en [VALIDATION.md](docs/VALIDATION.md). Los recorridos de navegador se ejecutan con la suite arrancada y Playwright instalado:

```sh
node scripts/verify-browser.cjs
node scripts/verify-bi-browser.cjs
node scripts/verify-editors-browser.cjs
node scripts/verify-new-user-browser.cjs
node scripts/verify-resident-browser.cjs
node scripts/verify-exercises-browser.cjs
```

Consulta [auditoría por herramienta](docs/SUITE_AUDIT.md), [estándar de producto](docs/PRODUCT_STANDARD.md), [arquitectura integrada](docs/WORKSPACE_ARCHITECTURE.md), [validación y límites](docs/VALIDATION.md) y [reglas de desarrollo](AGENTS.md).

La versión 0.5.1 sigue en desarrollo. La publicación del perfil y la difusión en redes están aplazadas; los [criterios de preparación](docs/RELEASE_READINESS.md) definen el trabajo pendiente antes de proponer un lanzamiento.

## Procedencia y núcleo de integración

Las fuentes de las nueve aplicaciones son proyectos propios de MS ROBOTIKA incorporados con sus licencias y revisión original en [apps/sources.json](apps/sources.json). Esta es la fuente de la distribución integrada; los repositorios independientes no se actualizan automáticamente con estos cambios.

El bus Core v1 mantiene sus contratos y exportaciones de biblioteca. Para iniciarlo por separado, usa `node scripts/serve.mjs` o `npm run bus`. Su documentación anterior se conserva en [Core v0.1](docs/CORE_README_v0.1.md).
