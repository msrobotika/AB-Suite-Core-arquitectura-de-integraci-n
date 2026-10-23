# Contribución a AB-Suite Core

Requisitos: Node.js 20+ y Git. No hay dependencias externas de ejecución.

    npm run check

Cada función nueva debe contar con un test reproducible y una actualización de docs/PROTOCOL.md si afecta contratos. No fusionar alteraciones incompatibles de msrobotika.suite.event.v1; publicar nuevo contrato versionado.

La responsabilidad del bus se limita a los eventos y su transporte. No duplicar editores Ladder, SCL, GRAFCET, motores analíticos ni lógica de control de maquinaria. Los adaptadores viven junto a cada aplicación o en módulos explícitos.

Los cambios de seguridad y autorizaciones deben probar que un token no puede publicar en nombre de otra aplicación y que el monitor sigue sin publicar. No aceptar trazas con tokens o información privada.

Consulta SECURITY.md para alcance y limitaciones.
