## Alcance y riesgos

Describe el contrato, tema, SDK o transporte afectado.

## Comprobaciones

- [ ] npm run check
- [ ] npm pack --dry-run
- [ ] Tests de autenticación y temas autorizados
- [ ] Tests de replay/cursor y caídas de clientes para cambios en SSE
- [ ] Sin secretos ni claves de sesión en el repositorio
- [ ] Sin conexiones a PLC industriales ni escritura de salida física
- [ ] Cambios de protocolo documentados con versión

## Evidencias

Enlaza CI y pruebas reproducibles, no métricas inventadas.
