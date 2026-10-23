# AB-Suite Core

**MS ROBOTIKA · Plataforma de integración industrial virtual · v0.1.0**

[![CI](https://github.com/msrobotika/AB-Suite-Core-arquitectura-de-integraci-n/actions/workflows/ci.yml/badge.svg)](https://github.com/msrobotika/AB-Suite-Core-arquitectura-de-integraci-n/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

Bus de eventos y SDK propios para interconectar herramientas de MS ROBOTIKA **sin duplicar** los editores KOP, SCL, GRAFCET, el simulador PLC, la aplicación de visión o AB-BI Studio.

> **Alcance real:** bus local HTTP/SSE, contratos versionados, credenciales por aplicación, histórico limitado y adaptador read-only de telemetría PLC. Todavía no es una suite distribuida por red ni está conectada directamente a los proyectos Vision o GRAFCET.

## Arquitectura

```mermaid
flowchart LR
  PLC["AB-PLC Simulator · CPU virtual"] --> Bridge["SuitePLCBridge · solo lectura"]
  Bridge --> Bus["AB-Suite Core"]
  Bus --> SDK["SDK JavaScript · HTTP/SSE"]
  SDK --> Apps["Adaptadores de aplicaciones"]
  PLC --> MB["Modbus TCP · solo lectura"]
  SDK -. "pendiente" .-> BI["AB-BI Studio · streaming nativo"]
  SDK -. "pendiente" .-> Vision["AB-Vision Inspector"]
  SDK -. "pendiente" .-> Grafcet["AB-GRAFCET Studio"]
```

El bus es **headless**: no incluye un editor ni necesita capturas decorativas. Su funcionamiento está respaldado por pruebas de red, contratos y eventos.

## Requisitos e instalación

Node.js **20 o superior**, Windows, Linux o macOS. No hay dependencias de terceros en tiempo de ejecución.

```bash
git clone https://github.com/msrobotika/AB-Suite-Core-arquitectura-de-integraci-n.git
cd AB-Suite-Core-arquitectura-de-integraci-n
npm test
npm start
```

El servidor standalone abre **127.0.0.1:4175**. En consola imprime un token efímero por aplicación y un token **monitor** de solo lectura; no se guardan en disco. Termina con Ctrl+C.

| API | Método | Uso |
| --- | --- | --- |
| `/v1/health` | GET | Estado no sensible del bus |
| `/v1/events` | POST | Publicar evento autenticado y validado |
| `/v1/events` | GET | Suscripción SSE con cursor `after` |
| `/v1/events/history` | GET | Recuperar eventos retenidos |

## Ejemplo de consumo

En Windows PowerShell, con el servidor funcionando, abre una segunda consola:

```powershell
$env:AB_SUITE_TOKEN = "<TOKEN_MONITOR>"
node examples/subscribe.mjs
```

Publicación de un resultado de **visión sintético**, sin cámara conectada:

```powershell
$env:AB_VISION_TOKEN = "<TOKEN_AB_VISION>"
node examples/vision-publish.mjs
```

El código de los ejemplos está incluido; **no son conectores nativos** de los editores correspondientes.

## Integración con AB-PLC Simulator y AB-BI

La primera integración efectiva mantiene una **única CPU virtual** que abastece a la HMI, Modbus y el bus. AB-PLC Simulator consume este repositorio mediante una dependencia Git fijada a una revisión, sin copiar las fuentes del bus dentro del simulador. El comando del simulador es:

```bash
npm run suite:core
```

El receptor de AB-BI Studio ya convierte eventos SSE en CSV importable, sin streaming nativo dentro de su dashboard. No añade streaming nativo al dashboard.

Consulta [arquitectura](docs/ARCHITECTURE.md), [matriz de integraciones](docs/INTEGRATIONS.md), [contratos](docs/PROTOCOL.md) y [límites de seguridad](SECURITY.md).

## Calidad y límites

Ejecuta `npm run check` para validación de sintaxis y batería de pruebas. GitHub Actions cubre Node 20/22 en varios sistemas. Los eventos tienen secuencia monótona y permiten replay dentro del histórico de **1.000 eventos en memoria**; ante pérdida irreversible del cursor se notifica con HTTP 409.

El bus no es un broker MQTT, ni Modbus TCP, ni servidor OPC UA, ni componente certificado IEC 61508/62443. No ofrece acceso a equipos físicos, no dispone de persistencia tras reinicio, ACK distribuido ni garantía de entrega exactamente una vez. Solo escucha en **127.0.0.1**.

**Licencia:** MIT · MS ROBOTIKA.

### Evidencias de integración

- [Prueba HTTP → CPU virtual → Modbus → bus en AB-PLC Simulator](https://github.com/msrobotika/AB-PLC-Simulator/blob/main/tests/suite-core-integration.test.mjs)
- [Conector SSE → CSV de AB-BI Studio](https://github.com/msrobotika/AB-BI-Studio/blob/main/scripts/ab_suite_telemetry.py)
- [Captura auténtica del simulador compartido](https://github.com/msrobotika/AB-PLC-Simulator/blob/main/docs/screenshots/lab-suite-live.png), que pertenece al simulador y **no** representa una interfaz gráfica del bus

### Adaptadores originales ya publicados

- [AB-GRAFCET Studio — estado de etapas](https://github.com/msrobotika/AB-GRAFCET-Studio-v0.1-c/blob/main/docs/SUITE_CORE.md): ejecuta el motor nativo con proyecto y escenario JSON y publica en el bus cambios ON/OFF.
- [AB-Vision Inspector — resultados de inspección](https://github.com/msrobotika/-AB-Vision-Inspector/blob/main/docs/SUITE_CORE.md): toma el historial exportado y publica una selección prudente de calidad y metrología, sin IP ni imágenes.

Ambos funcionan mediante archivos exportados y acciones explícitas. **No hay aún streaming automático del navegador de estas dos aplicaciones.** Se mantienen en repositorios independientes.
