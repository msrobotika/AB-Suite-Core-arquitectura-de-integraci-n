# AB-KOP-Studio-v0.1 · Estado técnico

**Revisión:** 2026-10-22 · **Área:** Editor y simulador Ladder/KOP  
**Estado:** v0.1 · simulación local · **Visibilidad:** pública · **Licencia:** Archivo LICENSE presente.

## Evidencias en el repositorio

- Código y documentación versionados en `main`.
- CI de pruebas: [workflow](../.github/workflows/ci.yml). Su existencia no constituye certificación industrial.
- Capturas existentes: [`docs/screenshots/kop-escritorio.png`](../docs/screenshots/kop-escritorio.png), [`docs/screenshots/kop-editor.png`](../docs/screenshots/kop-editor.png), [`docs/screenshots/kop-enclavamiento.png`](../docs/screenshots/kop-enclavamiento.png), [`docs/screenshots/kop-paro.png`](../docs/screenshots/kop-paro.png), [`docs/screenshots/kop-movil.png`](../docs/screenshots/kop-movil.png).

## Alcance y límites

Sin comunicación física con PLC; temporizadores por ciclos virtuales. Las capturas son de aplicación/simulación y no demuestran validez para maquinaria. Cada cambio funcional requiere ejecutar la CI y documentar el resultado.

## Siguiente ciclo de calidad

- Mantener pruebas deterministas y contratos de formato intercambiado.
- Verificar ejecución en versiones de navegador y sistemas soportados.
- Publicar versiones reproducibles y documentar las incompatibilidades.
