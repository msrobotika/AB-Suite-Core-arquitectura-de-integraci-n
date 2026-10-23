import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { compileStageEvents,publishStageEvents,validLoopback } from "../tools/suite_bridge.mjs";
const require=createRequire(import.meta.url);
const E=require("../src/engine.js");
const scenario={schema:1,steps:[
  {inputs:{marcha:true,seguridad:true},expectActive:["E1"]},
  {inputs:{carga_terminada:true},expectActive:["E2"]},
  {inputs:{sellado_terminado:true},expectActive:["E3"]}
]};
test("usa el motor nativo y respeta salidas/etapas de escenario",()=>{
  const r=compileStageEvents(E.sample(),scenario,"suite-test");
  assert.deepEqual(r.history.map(x=>x.active),[["E1"],["E2"],["E3"]]);
  assert.equal(r.events[0].data.step_id,"E0");
  assert.equal(r.events[0].data.active,true);
  assert.deepEqual(r.events.filter(x=>x.data.cycle===1).map(x=>[x.data.step_id,x.data.active]),
    [["E0",false],["E1",true]]);
  assert.equal(r.events.length,7);
  assert.ok(r.events.every(x=>x.schema==="msrobotika.suite.event.v1"));
});
test("no emite falsa evolución si la receptividad no es verdadera",()=>{
  const r=compileStageEvents(E.sample(),{schema:1,steps:[{inputs:{marcha:false}}]},"waiting");
  assert.equal(r.events.length,1);
  assert.equal(r.history[0].status,"waiting");
});
test("rechaza expectativas incorrectas antes de publicar",()=>{
  assert.throws(()=>compileStageEvents(E.sample(),{schema:1,steps:[
    {inputs:{marcha:true},expectActive:["E3"]}]},"conflict"),/expectativa/);
});
test("rechaza URL remota y token inválido",async()=>{
  assert.throws(()=>validLoopback("http://192.168.1.5:4175"),/Solo/);
  await assert.rejects(publishStageEvents([], {token:"bad"}),/AB_GRAFCET_TOKEN/);
});
test("publica contrato real por HTTP a endpoint loopback",async()=>{
  const messages=[];
  const server=createServer(async(req,res)=>{
    assert.equal(req.url,"/v1/events");
    assert.equal(req.headers.authorization,"Bearer "+"a".repeat(64));
    const parts=[];for await(const c of req)parts.push(c);
    messages.push(JSON.parse(Buffer.concat(parts).toString()));
    res.writeHead(201,{"Content-Type":"application/json"});res.end('{"sequence":1}');
  });
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  try{
    const url="http://127.0.0.1:"+server.address().port;
    const list=compileStageEvents(E.sample(),{schema:1,steps:[{inputs:{marcha:true}}]},"publish").events;
    const count=await publishStageEvents(list,{url,token:"a".repeat(64)});
    assert.equal(count,list.length);
    assert.deepEqual(messages.map(x=>x.data.step_id),["E0","E0","E1"]);
  }finally{await new Promise(resolve=>server.close(resolve));}
});

test("no permite que un redirect copie el token a un host externo",async()=>{
 const list=compileStageEvents(E.sample(),{schema:1,steps:[{inputs:{marcha:true}}]},"redirect").events;
 const fake=async(_url,request)=>{
   assert.equal(request.redirect,"error");
   throw new TypeError("redirect not followed");
 };
 await assert.rejects(()=>publishStageEvents(list,{
   url:"http://127.0.0.1:4175",token:"a".repeat(64),fetchImpl:fake
 }),/redirect/);
});
