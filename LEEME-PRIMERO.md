# AB Suite completa · 0.6.1 de revisión

Esta carpeta contiene las nueve herramientas: PLC, KOP, SCL, GRAFCET, SCADA, Modbus, Serial, Vision y BI. No necesitas descargarlas por separado.

## Instalador Windows (recomendado)

Si has recibido `AB-Suite-0.6.1-Windows-x64-Setup.exe`, ábrelo, elige Español o English y sigue el asistente. Incluye Node, Python y los motores: no tienes que prepararlos. Abre AB Suite desde Inicio. El icono de bandeja permite volver a abrirla o cerrarla. La edición portable incluye los mismos motores. [Guía bilingüe de instalación, datos y desinstalación](desktop/README.md).

El idioma inicial sigue el navegador (español o inglés; inglés para otros idiomas). Puedes cambiarlo en la barra sin reiniciar ni perder el documento. Los nombres, datos y código del usuario conservan su idioma original.

## Descargar el código fuente desde GitHub

1. Abre [Descargar suite completa](https://github.com/msrobotika/AB-Suite-Core-arquitectura-de-integraci-n/archive/refs/heads/codex/suite-workspace.zip).
2. Guarda el ZIP y usa **Extraer todo**. Trabaja dentro de la carpeta extraída, nunca dentro de la vista del ZIP.
3. En Windows abre **iniciar.bat**. En macOS/Linux abre una terminal en esa carpeta y ejecuta `sh iniciar.sh`.
4. Se abrirá el catálogo en **http://127.0.0.1:4170**. Mantén abierta la consola mientras trabajas. Si el navegador no se abre, copia esa dirección.

Necesitas **Node.js 20+**, **Python 3.11+** y un navegador moderno. La primera preparación necesita Internet para instalar las dependencias Python en `.venv`, dentro de esta carpeta. No hay cuentas ni cuotas.

Descargas oficiales de los requisitos: [Node.js](https://nodejs.org/en/download) y [Python](https://www.python.org/downloads/). En Windows, activa la opción de añadir Python al PATH durante su instalación y reinicia la terminal después.

El enlace de GitHub descarga la rama de revisión y recibirá los cambios que se suban a ella. El ZIP versionado entregado junto a la revisión es una instantánea. Sigue siendo una versión en desarrollo, sin lanzamiento en redes.

## Llevarte un ejercicio completo

Desde el catálogo abre **Mis ejercicios** y crea uno vacío. En **Proyectos → Añadir a un ejercicio** de cada herramienta usa **Añadir copia actual**. Después descarga el `.absuite` desde Mis ejercicios. Al importarlo en otro equipo se crea una entrada nueva; cada componente se abre con copia previa del trabajo actual. Las copias no se actualizan automáticamente: vuelve a añadir los cambios antes de descargar. [Guía y límites](docs/EXERCISES.md).

## Empezar desde cero

Abre una herramienta y pulsa **＋ Nuevo** en la barra común. Escribe un nombre. El trabajo anterior queda en **Proyectos**, desde donde puedes recuperarlo. Los ejemplos se abren expresamente; no son necesarios para practicar.

KOP y PLC empiezan sin redes. GRAFCET necesita una etapa inicial, pero no introduce acciones ni una secuencia de ejemplo. Vision empieza sin imagen; SCADA, sin objetos; BI, sin tablas.

En Vision, la imagen permanece en el centro. El inspector cambia entre Fuente, Detección, Región, Medición y Archivos. **Ampliar imagen** oculta los paneles; el mismo botón o Escape vuelve al taller. Se puede trabajar con piezas o fotogramas de producto lineal continuo; no se anuncia cálculo de longitud acumulada ni rechazo automático.

Consulta [una práctica propia por herramienta](docs/NEW_USER_WORKFLOW.md).

## Si no arranca

- «Node no se reconoce»: instala Node.js, vuelve a abrir la carpeta y repite.
- Falta Python o falla la preparación: ejecuta `node scripts/setup.mjs` desde esta carpeta y lee el error. Comprueba conexión a Internet; no descargues HTML como alternativa.
- Puerto ocupado: cierra otra instancia de la suite o elige otro puerto. En PowerShell: `$env:AB_SUITE_PORT='4171'; node scripts/workspace.mjs --open`.
- Una herramienta indica motor no disponible: conserva el mensaje de la consola; corrige la preparación y reinicia la suite.
- Para salir: Ctrl+C en la consola. Los proyectos guardados quedan en el navegador o `.suite-data`; exporta los archivos antes de cambiar de ordenador o borrar esa carpeta.

Los ocho puntos de vuelta por herramienta son una ayuda local, no una copia externa. Exporta tus proyectos y conserva `.suite-data` para no perder los espacios BI y el programa de CPU.

La CPU virtual sigue en el servidor al cerrar PLC. SCADA consulta directamente esa CPU; si detienes la suite, las lecturas caducan. Los editores KOP/SCL/GRAFCET que ejecutan en navegador conservan su alcance de pestaña.
