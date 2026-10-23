/** Versioned application-to-application contracts. No PLC commands or hardware control. */
export const SUITE_EVENT_SCHEMA = "msrobotika.suite.event.v1";
export const SUITE_API_VERSION = 1;
export const SUITE_TOPICS = Object.freeze({
  "ab-plc-simulator": ["plc.snapshot", "plc.status"],
  "ab-vision-inspector": ["vision.inspection.result"],
  "ab-grafcet-studio": ["grafcet.stage.changed"],
  "ab-bi-studio": ["bi.metric.updated"],
  "ab-kop-studio": ["project.updated"],
  "ab-scl-studio": ["project.updated"],
  "ab-modbus-studio": []
});
export const MAX_DATA_BYTES = 16_384;
const fail = message => { throw new Error(message); };
const dict = value => value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value,max=128) => typeof value==="string" && value.length>=1 && value.length<=max;
const natural = value => Number.isSafeInteger(value) && value>=0;
const safeScalar = value => value === null || typeof value === "boolean" ||
 (typeof value==="string" && value.length<=512) ||
 (typeof value==="number" && Number.isFinite(value));
function safeJSON(value,depth=0){
  if(depth>8)return false;
  if(Array.isArray(value))return value.length<=400 && value.every(v=>safeJSON(v,depth+1));
  if(dict(value)) {
    const pairs=Object.entries(value);
    return pairs.length<=80 && pairs.every(([key,v])=>
      /^[a-zA-Z0-9_.:-]{1,64}$/.test(key) && safeJSON(v,depth+1));
  }
  return safeScalar(value);
}
export function validateSuiteEvent(raw, authenticatedSource){
  if(!dict(raw))fail("Evento no válido");
  if(raw.schema!==SUITE_EVENT_SCHEMA)fail("Versión de contrato incompatible");
  if(!text(raw.source,64) || !Object.hasOwn(SUITE_TOPICS,raw.source))
    fail("Aplicación emisora desconocida");
  if(raw.source!==authenticatedSource)fail("El origen no coincide con la identidad autenticada");
  if(!SUITE_TOPICS[raw.source].includes(raw.topic))fail("Tema no autorizado para la aplicación");
  if(!text(raw.trace_id,100) || !/^[a-zA-Z0-9_.:-]+$/.test(raw.trace_id))
    fail("trace_id inválido");
  if(!dict(raw.data) || !safeJSON(raw.data))fail("Payload inválido o demasiado profundo");
  const serialized=JSON.stringify(raw.data);
  if(Buffer.byteLength(serialized,"utf8")>MAX_DATA_BYTES)fail("Payload supera el límite");
  if(raw.simulated_ms!==undefined && !natural(raw.simulated_ms))
    fail("Tiempo simulado inválido");
  const d=raw.data;
  switch(raw.topic){
    case "plc.snapshot":
      if(!natural(d.scan) || !text(d.scenario,50) || !["RUN","PAUSE","STOP"].includes(d.mode) ||
         !dict(d.inputs) || !dict(d.outputs) || !dict(d.analog))
        fail("Snapshot PLC incompleto");
      if(!Object.values(d.inputs).every(x=>typeof x==="boolean") ||
         !Object.values(d.outputs).every(x=>typeof x==="boolean") ||
         !Object.values(d.analog).every(x=>typeof x==="number" && Number.isFinite(x)))
        fail("Tipos de señales PLC inválidos");
      break;
    case "plc.status":
      if(!["RUN","PAUSE","STOP"].includes(d.mode))fail("Estado CPU inválido");
      break;
    case "vision.inspection.result":
      if(!text(d.image_id,100) || typeof d.passed!=="boolean" ||
         !natural(d.defects))fail("Resultado de visión inválido");
      break;
    case "grafcet.stage.changed":
      if(!text(d.step_id,100) || typeof d.active!=="boolean")
        fail("Cambio GRAFCET inválido");
      break;
    case "bi.metric.updated":
      if(!text(d.metric,100) || typeof d.value!=="number" || !Number.isFinite(d.value))
        fail("Indicador BI inválido");
      break;
    case "project.updated":
      if(!text(d.project_id,100) || !text(d.format,50))
        fail("Proyecto inválido");
      break;
  }
  return {
    schema:SUITE_EVENT_SCHEMA,
    topic:raw.topic,
    source:raw.source,
    trace_id:raw.trace_id,
    ...(raw.simulated_ms===undefined?{}:{simulated_ms:raw.simulated_ms}),
    data:JSON.parse(serialized)
  };
}
