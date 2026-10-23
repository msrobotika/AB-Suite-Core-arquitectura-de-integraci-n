# AB-Serial-Analyzer-v0.1- · Estado técnico

**Corte de auditoría:** 2026-10-22

| Propiedad | Valor |
|---|---|
| Área | Diagnóstico de comunicaciones serie |
| Estado | v0.1 · laboratorio y recepción opcional de hardware |
| Visibilidad | pública |
| Licencia | MIT declarada en archivo LICENSE |
| CI | [Workflow](../.github/workflows/serial-ci.yml) |

## Evidencias

- [Captura `docs/screenshots/serial-escritorio.png`](../docs/screenshots/serial-escritorio.png)
- [Captura `docs/screenshots/serial-decodificador.png`](../docs/screenshots/serial-decodificador.png)
- [Captura `docs/screenshots/serial-movil.png`](../docs/screenshots/serial-movil.png)

Las capturas son reales del software en un entorno de prueba, **no una certificación**. La existencia de CI no constituye validación de hardware industrial.

## Trabajo pendiente

La captura RS-485 real y su precisión temporal necesitan pruebas con adaptadores físicos.

Se deben mantener pruebas deterministas, documentación de versión y comprobación de escenarios de fallo antes de ampliar funcionalidades.
