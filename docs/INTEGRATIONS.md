# Integraciones actuales de la distribución

| Origen y destino | Canal real | Alcance |
| --- | --- | --- |
| KOP/SCL → PLC | Transferencia validada del proyecto | Aceptación, mapa de símbolos y carga en CPU residente |
| PLC → Modbus | TCP FC01–04 | La misma CPU de edición/laboratorio; solo lectura |
| PLC → BI | Captura HTTP explícita al espacio activo | Tabla SuitePLC; cambiar espacio detiene la captura anterior |
| PLC → HMI | HTTP autenticado al estado residente | CPU independiente de pestañas; caducidad a cinco segundos si el servicio falla |
| KOP/SCL/GRAFCET/Vision/Modbus/Serial → HMI | Señales de navegador del mismo origen | Publicación real; caducidad a cinco segundos; mantener pestañas de origen abiertas |
| Serial/Vision/Modbus → BI | Exportar/importar archivos | No afirmar streaming donde solo existe un CSV |
| CPU → Core aislado | Puente versionado y HTTP/SSE autenticado | Adaptadores independientes; no es el mecanismo de todas las conexiones de la suite |

Se distinguen `msrobotika.suite.event.v1` del bus, `ab-suite.signals.v1` de navegador y formatos nativos de documentos. Las interfaces y validadores compartidos se consumen desde `@msrobotika/ab-suite-core/contracts`; [PROTOCOL.md](PROTOCOL.md) y CI comprueban su uso.

La [práctica PLC → Modbus → BI](WORKFLOW_PLC_MODBUS_BI.md) verifica la cadena completa. La [arquitectura](WORKSPACE_ARCHITECTURE.md) explica servicios y persistencia. Los adaptadores por archivo anteriores son antecedentes, no la descripción de toda la distribución actual.
