# Protocolo AB-Suite Core · msrobotika.suite.event.v1

## Estructura

```json
{
  "schema": "msrobotika.suite.event.v1",
  "source": "ab-vision-inspector",
  "topic": "vision.inspection.result",
  "trace_id": "inspection-job-123",
  "simulated_ms": 400,
  "data": { "image_id": "SIMULATED-1", "passed": true, "defects": 0 }
}
```

El servidor valida el emisor autenticado, los tipos y límites, y añade `sequence`, `id` y `received_at`.

### Publicar

`POST /v1/events` con `Authorization: Bearer <token-de-app>`, Content-Type `application/json`. El token de aplicación solo autoriza los temas correspondientes; el token `monitor` **no publica**.

### Leer histórico

`GET /v1/events/history?after=0&limit=100`. El cursor es exclusivo (devuelve `sequence > after`); máximo 200 resultados por página. El cliente debe conservar el último número procesado.

### Stream

`GET /v1/events?after=0` con Authorization. Respuesta SSE con eventos JSON. Al desconectarse, reconecta usando el último cursor. Si los mensajes fueron sobrescritos, HTTP **409** indica `oldest_sequence`: los datos perdidos no pueden recuperarse automáticamente.

### Temas

| source | topic | Campos mínimos de data |
| --- | --- | --- |
| ab-plc-simulator | plc.snapshot | scan, scenario, mode, inputs, outputs, analog |
| ab-plc-simulator | plc.status | mode |
| ab-vision-inspector | vision.inspection.result | image_id, passed, defects |
| ab-grafcet-studio | grafcet.stage.changed | step_id, active |
| ab-bi-studio | bi.metric.updated | metric, value |
| ab-kop-studio | project.updated | project_id, format |
| ab-scl-studio | project.updated | project_id, format |

No existen temas para escritura física, y el cliente ab-modbus-studio tiene permisos únicamente de lectura.

## Adaptadores nativos disponibles (octubre de 2026)

GRAFCET publica por evento `grafcet.stage.changed` los campos `step_id`, `active`, `cycle`, `transition_ids` y `project_id`. El ciclo es lógico: no equivale a milisegundos del PLC.

Vision publica `vision.inspection.result` con `image_id` (ID derivado del registro, no hash de imagen), `passed`, `defects`, estados de veredicto/auditoría y medidas seleccionadas. `passed=true` únicamente cuando el propio adaptador comprueba auditoría VERIFIED y estado dimensional OK además del veredicto visual OK. Esa decisión no acredita calibración metrológica industrial.

Los adaptadores no modifican los temas ni el contrato v1. Los permisos siguen siendo por identidad del emisor, con publicación local voluntaria.

## Contratos públicos para consumidores

`@msrobotika/ab-suite-core/contracts` exporta las interfaces TypeScript y los mismos validadores que utiliza el bus y el navegador. No crea un segundo motor ni cambia el contrato v1. La unión `SuiteEvent` relaciona emisor, tema y tipos de payload; `SignalValue` distingue señal buena de ausente/caducada con valor `null`.

El consumidor debe validar cualquier JSON recibido: TypeScript no protege frente a datos de red, NaN, tamaños, profundidad ni permisos del token. `validateSuiteEvent` y `validSnapshot` siguen comprobando estos límites en ejecución.

`npm run test:contracts` compila ejemplos de consumidores, incluyendo casos que deben fallar por emisor/tema incorrecto, tipos de señal y métricas de texto. `tests/contracts.test.mjs` comprueba que la API pública reutiliza los validadores originales. El CI ejecuta ambas comprobaciones. No se publica un paquete independiente ni se duplican definiciones entre nueve repositorios.
