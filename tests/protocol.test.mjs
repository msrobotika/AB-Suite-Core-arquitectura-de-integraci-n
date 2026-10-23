import test from "node:test";
import assert from "node:assert/strict";
import { validateSuiteEvent, SUITE_EVENT_SCHEMA } from "../src/protocol.js";
import { SuiteEventBus } from "../src/bus.js";
const event=(source="ab-plc-simulator",topic="plc.snapshot",data={
  scan:2,scenario:"conveyor",mode:"RUN",inputs:{"I0.0":true},
  outputs:{"Q0.0":true},analog:{AI0:20}
})=>({schema:SUITE_EVENT_SCHEMA,source,topic,trace_id:"test-run-2",
  simulated_ms:200,data});

test("acepta snapshot tipado y preserva dato fuente",()=>{
  const e=event();const v=validateSuiteEvent(e,e.source);
  assert.deepEqual(v.data,e.data);
  assert.equal(v.schema,SUITE_EVENT_SCHEMA);
});
test("bloquea origen suplantado y temas no permitidos",()=>{
  assert.throws(()=>validateSuiteEvent(event(),"ab-vision-inspector"),/origen/);
  assert.throws(()=>validateSuiteEvent(event("ab-plc-simulator","vision.inspection.result"),"ab-plc-simulator"),/no autorizado/);
  assert.throws(()=>validateSuiteEvent({...event(),schema:"msrobotika.suite.event.v999"},"ab-plc-simulator"),/incompatible/);
});
test("rechaza timestamps, datos mal tipados, objetos patológicos y payloads grandes",()=>{
  assert.throws(()=>validateSuiteEvent({...event(),simulated_ms:-1},"ab-plc-simulator"),/Tiempo/);
  assert.throws(()=>validateSuiteEvent(event("ab-plc-simulator","plc.snapshot",{
    scan:3,scenario:"rack",mode:"RUN",inputs:{"I0.0":1},outputs:{},analog:{}
  }),"ab-plc-simulator"),/señales/);
  assert.throws(()=>validateSuiteEvent(event("ab-plc-simulator","plc.status",{mode:"RUN",extra:"x".repeat(17_000)}),"ab-plc-simulator"),/inválido|supera/);
  assert.throws(()=>validateSuiteEvent(event("ab-vision-inspector","vision.inspection.result",{
    image_id:"IMG-01",passed:"yes",defects:1
  }),"ab-vision-inspector"),/visión/);
});
test("valida contratos mínimos GRAFCET, BI y Vision",()=>{
  for(const [source,topic,data] of [
    ["ab-grafcet-studio","grafcet.stage.changed",{step_id:"S1",active:true}],
    ["ab-bi-studio","bi.metric.updated",{metric:"OEE",value:0.92}],
    ["ab-vision-inspector","vision.inspection.result",{image_id:"hash123",passed:false,defects:2}],
    ["ab-kop-studio","project.updated",{project_id:"demo",format:"ab-kop.schema1"}]
  ]) assert.equal(validateSuiteEvent(event(source,topic,data),source).topic,topic);
});
test("histórico acotado, secuencias y caducidad explícita",()=>{
  const b=new SuiteEventBus({capacity:10});
  for(let i=0;i<12;i++)b.publish("ab-plc-simulator",event());
  assert.equal(b.sequence,12);
  assert.equal(b.history.length,10);
  assert.deepEqual(b.since(10).map(e=>e.sequence),[11,12]);
  assert.throws(()=>b.since(0),/caducado/);
  assert.equal(b.stats().retained,10);
});
test("suscriptores reciben secuencia y se desuscriben",()=>{
  const b=new SuiteEventBus({capacity:10,maxListeners:1});
  const seen=[];
  const close=b.subscribe(e=>seen.push(e.id));
  assert.throws(()=>b.subscribe(()=>{}),/Demasiados/);
  b.publish("ab-plc-simulator",event());
  close();
  b.publish("ab-plc-simulator",event());
  assert.deepEqual(seen,["evt-000000000001"]);
});
