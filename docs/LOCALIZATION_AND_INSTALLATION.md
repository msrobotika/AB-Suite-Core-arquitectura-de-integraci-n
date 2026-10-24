# Languages and installation / Idiomas e instalación

## English

AB Suite has nine independent tools. The Windows x64 Setup and portable edition include private Node.js and Python runtimes and the locked native-engine dependencies. End users do not install development tools or use a terminal. See the [bilingual installation guide](../desktop/README.md).

The first launch uses Spanish for a Spanish browser and English otherwise. The common language selector persists across tools and open tabs. Switching language does not reload the application or replace the current document. UI localization never translates source code, formulas, signal addresses, user-entered values, table cells or saved project names. The UI uses reviewed local messages, not a network translation service.

Vision Inspector is a general image-inspection learning tool: parts, surfaces and frames from continuous products. Users supply their images and criteria. Measurement still requires explicit calibration and verification. No material, production line or process is imposed.

### Reproducible Windows build

Use a Windows CPython 3.13 x64 host with the .NET Framework C# compiler and Inno Setup. From a clean Git revision:

```powershell
node scripts/build-locales.mjs
python scripts/build-windows.py --output C:\build\ab-suite --iscc "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
python scripts/verify-windows-install.py --installer C:\build\ab-suite\AB-Suite-0.6.1-Windows-x64-Setup.exe --workspace C:\build\verification --browser-tests
```

Create the disposable verification directory before running the last command. Browser verification needs the build host's Playwright/Chromium, not an end-user dependency. `AB_SUITE_PLAYWRIGHT` and `AB_SUITE_BROWSER` select their paths. Do not use a real installation or a user-data directory for verification.

The builder packages tracked files only, verifies pinned runtime SHA-256 hashes and vendors the dependency lock into the private Python distribution. Upstream runtime licenses and Python package license metadata are included. Runtimes are not committed to Git. Setup creates Start shortcuts, an optional desktop shortcut and a registered uninstaller. Data resides outside the application folder. There is no automatic network update or public release in this review build. Code signing and native installers for macOS/Linux remain separate release work; the source edition supports those platforms with their documented prerequisites.

Messages live in `web/locales/en.txt`; compile them with `node scripts/build-locales.mjs`. Add new UI strings in both languages, keep option values stable and explicitly exclude user content with `data-i18n-skip` where needed. Run the shared browser journeys plus `verify-i18n-browser.cjs` and inspect the relevant screens. New translated operations need an actual functional journey, including errors where relevant.

## Español

El instalador y la edición portable Windows x64 incluyen runtimes privados y las dependencias bloqueadas. La instalación no requiere elevación ni preparar Node o Python. La carpeta de datos permanece fuera del programa y se conserva al actualizar/desinstalar. El código fuente mantiene su forma de preparación para Windows, macOS y Linux; no se presenta como instalador nativo de esos sistemas.

El primer uso sigue el navegador: español para navegadores en español, inglés para los demás. El selector común se recuerda entre aplicaciones y pestañas. Cambiar idioma conserva el trabajo abierto. Se traducen las etiquetas y mensajes de interfaz; no el código, las fórmulas, las direcciones de señales ni los nombres y datos introducidos por el usuario. Los textos se incluyen localmente y no se envían a un servicio de traducción.

Vision se presenta como laboratorio de inspección de imágenes, piezas, superficies y producto continuo con criterios propios. No impone un material ni una línea de producción. Las condiciones de calibración y los límites de la medición se explican en ambos idiomas.

Los comandos anteriores generan y comprueban el instalador. La verificación cubre arranque con PATH vacío, las nueve herramientas, actualización y desinstalación conservando datos. La compilación de revisión no tiene firma de código AB Suite, no activa actualizaciones por red y no autoriza difusión en redes.
