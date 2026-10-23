import test from "node:test";
import assert from "node:assert/strict";
import { validateSuiteEvent } from "../src/protocol.js";
import { SuiteEventBus } from "../src/bus.js";

test("evento de etapa GRAFCET nativo cumple el contrato y permisos",()=>{
 const data={schema:"msrobotika.suite.event.v1",source:"ab-grafcet-studio",
   topic:"grafcet.stage.changed",trace_id:"grafcet-run-002-1-E1-on",
   data:{step_id:"E1",active:true,cycle:1,project_id:"Ciclo de envasado",
     transition_ids:["T0"],source_kind:"native-grafcet-simulation"}};
 const validated=validateSuiteEvent(data,"ab-grafcet-studio");
 assert.equal(validated.data.cycle,1);
 assert.throws(()=>validateSuiteEvent(data,"ab-vision-inspector"),/origen/);
});
test("Vision nativa puede indicar falta de auditoría sin falso passed",()=>{
 const e={schema:"msrobotika.suite.event.v1",source:"ab-vision-inspector",
   topic:"vision.inspection.result",trace_id:"vision-"+"a".repeat(32),
   data:{image_id:"record-"+"a".repeat(32),passed:false,defects:0,
     quality_state:"REVIEW_UNVERIFIED",final_verdict:"SIN MEDICIÓN",
     visual_verdict:"OK",dimension_status:"UNCALIBRATED",
     audit_status:"NO_CALIBRATION",source_kind:"native-vision-history"}};
 const bus=new SuiteEventBus();
 const result=bus.publish("ab-vision-inspector",e);
 assert.equal(result.data.passed,false);
 assert.equal(bus.since(0)[0].data.quality_state,"REVIEW_UNVERIFIED");
 assert.deepEqual(Object.keys(result.data).filter(k=>/sourceIdentity|camera|password|image_bytes/i.test(k)),[]);
});
test("no se aceptan eventos con temas de otro emisor",()=>{
 const forged={schema:"msrobotika.suite.event.v1",source:"ab-grafcet-studio",
   topic:"vision.inspection.result",trace_id:"forged-01",
   data:{image_id:"rec-1",passed:true,defects:0}};
 assert.throws(()=>validateSuiteEvent(forged,"ab-grafcet-studio"),/Tema no autorizado/);
});
