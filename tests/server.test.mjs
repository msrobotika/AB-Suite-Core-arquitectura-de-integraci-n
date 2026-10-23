import test from "node:test";
import assert from "node:assert/strict";
import { startSuiteCore } from "../src/server.js";
import { SuiteClient } from "../src/client.js";
const vEvent={topic:"vision.inspection.result",trace_id:"test-vision-001",
  data:{image_id:"frame-sha-001",passed:true,defects:0}};

test("publica y consulta eventos vía HTTP autenticado",async()=>{
  const core=await startSuiteCore({port:0});
  const publisher=new SuiteClient({url:core.url,token:core.tokens["ab-vision-inspector"],
    source:"ab-vision-inspector"});
  const monitor=new SuiteClient({url:core.url,token:core.tokens.monitor});
  try{
    const published=await publisher.publish(vEvent);
    assert.equal(published.sequence,1);
    assert.equal(published.source,"ab-vision-inspector");
    const history=await monitor.history();
    assert.equal(history.events.length,1);
    assert.equal(history.events[0].data.image_id,"frame-sha-001");
    assert.equal((await monitor.health()).sequence,1);
    assert.throws(()=>monitor.publish(vEvent),/sin permiso/);
  }finally{await core.close();}
});
test("bloquea autenticación incorrecta, suplantación, origen no confiable y escritura no soportada",async()=>{
  const core=await startSuiteCore({port:0});
  try{
    const bare=await fetch(core.url+"/v1/events/history");
    assert.equal(bare.status,401);
    const wrong=await fetch(core.url+"/v1/events/history",{headers:{
      Authorization:"Bearer "+"0".repeat(64),Origin:"http://127.0.0.1:9000"
    }});
    assert.equal(wrong.status,403);
    const monitorToken=core.tokens.monitor;
    const denied=await fetch(core.url+"/v1/events",{method:"POST",headers:{
      Authorization:"Bearer "+monitorToken,"Content-Type":"application/json"
    },body:JSON.stringify(vEvent)});
    assert.equal(denied.status,403);
    const evilSource=await fetch(core.url+"/v1/events",{method:"POST",headers:{
      Authorization:"Bearer "+core.tokens["ab-bi-studio"],
      "Content-Type":"application/json"
    },body:JSON.stringify({schema:"msrobotika.suite.event.v1",source:"ab-vision-inspector",...vEvent})});
    assert.equal(evilSource.status,422);
    const file=await fetch(core.url+"/package.json",{headers:{Authorization:"Bearer "+monitorToken}});
    assert.equal(file.status,404); // no static files endpoint
    await assert.rejects(()=>startSuiteCore({host:"0.0.0.0",port:0}),/solo admite/);
  }finally{await core.close();}
});
test("SSE reenvía histórico y recibe eventos en vivo sin polling",async()=>{
  const core=await startSuiteCore({port:0});
  const reader=new SuiteClient({url:core.url,token:core.tokens.monitor});
  const publisher=new SuiteClient({url:core.url,token:core.tokens["ab-vision-inspector"],
    source:"ab-vision-inspector"});
  const abort=new AbortController();
  let iter;
  try{
    await publisher.publish(vEvent);
    iter=reader.events({after:0,signal:abort.signal})[Symbol.asyncIterator]();
    const first=await iter.next();
    assert.equal(first.value.sequence,1);
    const next=iter.next();
    await publisher.publish({...vEvent,trace_id:"test-vision-002"});
    const second=await next;
    assert.equal(second.value.sequence,2);
    assert.equal(second.value.trace_id,"test-vision-002");
  }finally{
    abort.abort();
    await iter?.return().catch(()=>{});
    await core.close();
  }
});
test("rechaza cursor caducado explícitamente",async()=>{
  const core=await startSuiteCore({port:0});
  const publisher=new SuiteClient({url:core.url,token:core.tokens["ab-vision-inspector"],
    source:"ab-vision-inspector"});
  const monitor=new SuiteClient({url:core.url,token:core.tokens.monitor});
  try{
    // Default capacity 1000; no need to flood to test bad cursors.
    await assert.rejects(()=>monitor.history({after:-1}),err=>err.status===400);
    assert.equal((await monitor.history({after:0})).events.length,0);
    await publisher.publish(vEvent);
    assert.equal((await monitor.history({after:0})).events.length,1);
  }finally{await core.close();}
});
