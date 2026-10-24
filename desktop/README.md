# AB Suite for Windows / AB Suite para Windows

## Español

Windows 10/11 de 64 bits. Ejecuta el instalador, elige idioma y abre **AB Suite** desde Inicio. No requiere permisos de administrador, Node.js, Python ni Internet para instalar y usar los motores incluidos. Las cámaras de red requieren acceso a esa red; las imágenes y los ejercicios locales funcionan sin conexión.

Se abre tu navegador con las nueve herramientas. Cambia entre Español y English desde la barra. El icono **ab** de la bandeja permite volver a abrir la suite, consultar registros o **Cerrar AB Suite**. Cerrar el navegador no detiene la CPU virtual; utiliza la bandeja para detenerla.

Los motores guardan sus datos en `%LOCALAPPDATA%\AB Suite\data` y los registros en `%LOCALAPPDATA%\AB Suite\logs`. Los documentos del navegador siguen vinculados al navegador y a `http://127.0.0.1:4170`. Exporta los proyectos y ejercicios para trasladarlos. No cambies el puerto sin exportarlos primero.

Para actualizar, cierra AB Suite desde la bandeja y ejecuta el nuevo instalador. Para desinstalar, usa **Configuración → Aplicaciones → AB Suite → Desinstalar**. Los datos del usuario se conservan. No se importan automáticamente proyectos de otras carpetas o versiones fuente: ábrelos mediante sus formatos de proyecto.

La edición portable incluye los mismos motores: extrae toda la carpeta y abre **AB Suite.exe**. Si el puerto está ocupado, cierra la otra instancia. No abras los HTML por separado.

## English

64-bit Windows 10/11. Run Setup, choose a language and open **AB Suite** from Start. No administrator rights, Node.js, Python or Internet connection are required to install and use the bundled engines. Network cameras require access to their network; local images and exercises work offline.

Your browser opens with all nine tools. Choose Español or English in the toolbar. The **ab** tray icon lets you reopen the suite, inspect logs or **Quit AB Suite**. Closing the browser does not stop the virtual CPU; use the tray to stop it.

Engine data is stored in `%LOCALAPPDATA%\AB Suite\data`; logs in `%LOCALAPPDATA%\AB Suite\logs`. Browser documents remain associated with your browser and `http://127.0.0.1:4170`. Export projects and exercises before moving to another browser or changing the port.

To update, quit AB Suite from the tray and run the new installer. To uninstall, use **Settings → Apps → AB Suite → Uninstall**. User data is retained. Projects from other folders or source editions are not automatically imported: open their project files explicitly.

The portable edition includes the same engines: extract the entire folder and open **AB Suite.exe**. If the port is occupied, close the other instance. Do not open individual HTML files.

## Build references / Referencias

- [Python embeddable distribution](https://docs.python.org/3/using/windows.html#the-embeddable-package): isolated runtime, dependencies vendored at build time.
- [Inno Setup per-user installation](https://jrsoftware.org/ishelp/topic_setup_privilegesrequired.htm).
- [Node.js official distributions](https://nodejs.org/dist/v22.23.3/SHASUMS256.txt): pinned SHA-256 runtime.

AB Suite is original open-source software (MIT). Runtime and dependency licenses are included in the distribution. This review build has no AB Suite code-signing certificate.
