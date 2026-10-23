# AB-SCL-Studio · Estado técnico

**Revisión:** 2026-10-22 · **Área:** Conversor ST/SCL → KOP  
**Estado:** v0.1 · laboratorio / conversión booleana comprobada · **Visibilidad:** pública · **Licencia:** Archivo LICENSE presente.

## Evidencias en el repositorio

- Código y documentación versionados en `main`.
- CI de pruebas: [workflow](../.github/workflows/ci.yml). Su existencia no constituye certificación industrial.
- Capturas existentes: [`docs/screenshots/scl-escritorio.png`](../docs/screenshots/scl-escritorio.png), [`docs/screenshots/scl-conversor-kop.png`](../docs/screenshots/scl-conversor-kop.png), [`docs/screenshots/scl-rechazo-seguro.png`](../docs/screenshots/scl-rechazo-seguro.png), [`docs/screenshots/scl-movil.png`](../docs/screenshots/scl-movil.png).

## Alcance y límites

No admite lógica secuencial ST general ni compila para PLC. Las capturas son de aplicación/simulación y no demuestran validez para maquinaria. Cada cambio funcional requiere ejecutar la CI y documentar el resultado.

## Siguiente ciclo de calidad

- Mantener pruebas deterministas y contratos de formato intercambiado.
- Verificar ejecución en versiones de navegador y sistemas soportados.
- Publicar versiones reproducibles y documentar las incompatibilidades.
