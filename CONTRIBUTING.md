# Contribuir a AB Suite

La fuente de la distribución integrada es este repositorio. `apps/sources.json` conserva la procedencia de sus motores; las aplicaciones independientes no se actualizan automáticamente con los cambios de la suite.

## Preparar y verificar

Necesitas Git, Node.js 20+ y Python 3.11+. Ejecuta `node scripts/setup.mjs` y `node scripts/workspace.mjs`. Los motores Python requieren las dependencias preparadas en `.venv`; el Core aislado no tiene dependencias externas de ejecución.

Lee [AGENTS.md](AGENTS.md), el [estándar de producto](docs/PRODUCT_STANDARD.md) y la [arquitectura](docs/WORKSPACE_ARCHITECTURE.md). Trabaja en una rama y describe en la PR problema, cambio, validación y límites.

1. Ejecuta `node scripts/check-workspace.mjs`.
2. Usa el Python de `.venv` para `python scripts/verify-python.py` cuando afecten motores Python.
3. Para navegación, estilos o integración ejecuta los cuatro recorridos de [VALIDATION.md](docs/VALIDATION.md) y revisa capturas de escritorio y móvil.
4. Para contratos, instala desarrollo con `npm install --ignore-scripts` y ejecuta `npm run test:contracts`. CI compila consumidores y prueba los validadores reales.
5. Actualiza capacidades y límites. Toda aplicación debe permitir crear trabajo propio, comprobar un resultado y recuperarlo, usando el mismo proyecto/motor.

No cambies de forma incompatible un contrato v1: publica una versión nueva y prueba sus consumidores. No añadas otra CPU, telemetría prefijada, controles sin implementación ni interfaces comerciales copiadas. No incluyas datos del usuario, tokens, imágenes privadas, `.venv` ni `.suite-data`.

Consulta [SECURITY.md](SECURITY.md) para un reporte privado. No publiques secretos ni reproducciones explotables. No contactes a terceros en nombre del proyecto.

La difusión sigue aplazada. Una PR, badge o ZIP no autoriza anuncios ni equivale a certificación industrial. Lee [RELEASE_READINESS.md](docs/RELEASE_READINESS.md).
