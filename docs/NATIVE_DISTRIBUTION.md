# Distribución actual · AB Suite 0.6.1

Windows 10/11 x64 dispone de instalador por usuario y edición portable con Node/Python incluidos. No necesita preparar herramientas de desarrollo. [Uso, actualización y desinstalación](../desktop/README.md).

## Descargar desde GitHub

1. Inicia sesión en GitHub y abre el artefacto [windows-review-distribution](https://github.com/msrobotika/AB-Suite-Core-arquitectura-de-integraci-n/actions/runs/40115275379/artifacts/12567902552).
2. Extrae el ZIP de artefactos. Ejecuta `AB-Suite-0.6.1-Windows-x64-Setup.exe`, o extrae toda la carpeta de `Portable.zip` y abre `AB Suite.exe`.
3. Abre las herramientas desde el catálogo. Cerrar el navegador no detiene la CPU: usa Cerrar AB Suite en la bandeja.

El artefacto fue comprobado como existente y no caducado el 24/10/2026; GitHub indica conservación hasta el 22/01/2027. Es una distribución de revisión, no una publicación estable. [Ejecución verificada](https://github.com/msrobotika/AB-Suite-Core-arquitectura-de-integraci-n/actions/runs/40115275379), commit `e82d432fc6b97e0af6281cbe42221c47f3f60577`, ocho jobs aprobados. Una actualización de documentación posterior no cambia ese commit de construcción. Los binarios compilados en distintos equipos pueden tener huellas distintas: no aplicar al ZIP de CI el hash de una entrega local diferente.

## Evidencia y límites

- 235 pruebas Node, 145 Python y 123 recorridos de navegador. La entrega local del mismo código se recorrió instalada con runtimes privados.
- Ciclo de instalador: inglés, arranque con PATH vacío, nueve motores listos, actualización en español y desinstalación conservando datos y registros.
- Dependencias de [desktop/requirements.txt](../desktop/requirements.txt) y runtimes con SHA-256 fijado en [build-windows.py](../scripts/build-windows.py); licencias incluidas.
- Lanzador e instalador AB sin firma digital. Hardware de cámara verificado solo mediante fuente sintética; la validación física, usuarios externos y accesibilidad completa siguen pendientes.
- Los datos nativos quedan fuera de la carpeta del programa. Los proyectos del navegador dependen de su navegador/origen; exporta para trasladarlos.
- No hay instaladores nativos validados de macOS/Linux; la modalidad de código fuente exige sus requisitos documentados. No hay actualización automática ni difusión autorizada.

[Construcción reproducible ES/EN](LOCALIZATION_AND_INSTALLATION.md) · [Validación](VALIDATION.md) · [Criterios previos al lanzamiento](RELEASE_READINESS.md).
