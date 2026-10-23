#!/usr/bin/env node
/**
 * Native AB-GRAFCET simulation → AB-Suite Core event adapter.
 * Runs EXISTING src/engine.js; no second sequencer, no PLC writes.
 * Input: exported project JSON + optional scenario with boolean input changes.
 */
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
const require=createRequire(import.meta.url);
const engine=require("../src/engine.js");
const EVENT_SCHEMA="msrobotika.suite.event.v1";
const MAX_FILE_BYTES=250_000;
const fail=(message)=>{throw new Error(message);};

export function compileStageEvents(project,scenario,runId="demo-run"){
  engine.validateModel(project);
  if(!/^[a-zA-Z0-9_.:-]{1,70}$/.test(runId))fail("Identificador de ejecución inválido");
  if(!scenario || scenario.schema!==1 || !Array.isArray(scenario.steps) ||
     scenario.steps.length<1 || scenario.steps.length>200)fail("Escenario schema 1: 1–200 pasos requeridos");
  const runtime=JSON.parse(JSON.stringify(project));
  let state=engine.initialState(runtime);
  const events=[];
  const emit=(stepId,active,cycle,transitions)=>{
    const traceId="grafcet-"+runId+"-"+cycle+"-"+stepId+"-"+(active?"on":"off");
    events.push({
      schema:EVENT_SCHEMA,source:"ab-grafcet-studio",topic:"grafcet.stage.changed",
      trace_id:traceId,
      data:{step_id:stepId,active,cycle,project_id:project.name.slice(0,100),
        transition_ids:transitions.slice(0,20),source_kind:"native-grafcet-simulation"}
    });
  };
  for(const id of state.active)emit(id,true,0,[]);
  const history=[];
  for(let i=0;i<scenario.steps.length;i++){
    const step=scenario.steps[i];
    if(!step || typeof step!=="object" || Array.isArray(step) ||
       !step.inputs || typeof step.inputs!=="object" || Array.isArray(step.inputs))
      fail("Paso de escenario inválido: "+(i+1));
    for(const [tag,value] of Object.entries(step.inputs)){
      if(!Object.hasOwn(runtime.inputs,tag) || typeof value!=="boolean")
        fail("Entrada o valor inválido: "+tag);
      runtime.inputs[tag]=value;
    }
    const prior=state.active;
    state=engine.advance(runtime,state);
    if(state.status==="conflict")fail("GRAFCET bloqueado por transiciones competitivas: "+state.conflict.join(","));
    if(step.expectActive!==undefined){
      if(!Array.isArray(step.expectActive) ||
         JSON.stringify([...step.expectActive].sort())!==JSON.stringify([...state.active].sort()))
        fail("La expectativa del paso "+(i+1)+" no coincide con el motor");
    }
    const previous=new Set(prior),next=new Set(state.active);
    for(const id of prior)if(!next.has(id))emit(id,false,state.cycle,state.last);
    for(const id of state.active)if(!previous.has(id))emit(id,true,state.cycle,state.last);
    history.push({cycle:state.cycle,status:state.status,
      fired:[...state.last],active:[...state.active],outputs:[...state.outputs]});
  }
  // Only return after the entire scenario validates. No partially published runs.
  return {events,history,final:state};
}
export async function loadJSON(path){
  if(typeof path!=="string")fail("Falta ruta de archivo");
  const buffer=await readFile(path);
  if(buffer.length>MAX_FILE_BYTES)fail("Archivo demasiado grande");
  return JSON.parse(buffer.toString("utf8"));
}
export function validLoopback(base){
  if(!/^http:\/\/127\.0\.0\.1:\d{1,5}$/.test(base))fail("Solo HTTP localhost por 127.0.0.1");
  const port=Number(base.split(":").at(-1));
  if(!Number.isInteger(port)||port<1||port>65535)fail("Puerto inválido");
  return base;
}
export async function publishStageEvents(events,{url="http://127.0.0.1:4175",token,fetchImpl=fetch}={}){
  validLoopback(url);
  if(!/^[a-f0-9]{64}$/.test(token??""))fail("Define AB_GRAFCET_TOKEN con el token de la aplicación");
  let sent=0;
  for(const item of events){
    if(item.source!=="ab-grafcet-studio" || item.topic!=="grafcet.stage.changed")
      fail("No se admite publicar otros temas");
    const r=await fetchImpl(url+"/v1/events",{
      method:"POST",redirect:"error",headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
      body:JSON.stringify(item)
    });
    if(!r.ok){
      let detail="";try{detail=(await r.json()).error??"";}catch{}
      fail("Publicación rechazada "+r.status+": "+detail);
    }
    sent++;
  }
  return sent;
}
export async function main(args=process.argv.slice(2)){
  const flag=name=>{const i=args.indexOf(name);return i<0?null:args[i+1];};
  if(!flag("--project")||!flag("--scenario"))
    fail("Uso: node tools/suite_bridge.mjs --project proyecto.json --scenario pasos.json [--dry-run]");
  const runId="run-"+randomUUID().replaceAll("-","").slice(0,16);
  const result=compileStageEvents(await loadJSON(flag("--project")),
    await loadJSON(flag("--scenario")),runId);
  if(args.includes("--dry-run")){
    process.stdout.write(JSON.stringify({ok:true,events:result.events,history:result.history},null,2)+"\n");
    return;
  }
  const count=await publishStageEvents(result.events,{
    url:flag("--url")??"http://127.0.0.1:4175",
    token:process.env.AB_GRAFCET_TOKEN
  });
  process.stdout.write("AB-GRAFCET → AB-Suite Core: "+count+
    " eventos de etapa publicados. Simulación local, sin PLC físico.\n");
}
if(process.argv[1] && fileURLToPath(import.meta.url)===process.argv[1]){
  main().catch(err=>{process.stderr.write("AB-GRAFCET Suite: "+err.message+"\n");process.exitCode=1;});
}
