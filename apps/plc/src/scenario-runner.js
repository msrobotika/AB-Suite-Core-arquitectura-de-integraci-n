/** Reproducible testbench for virtual PLCs, independent of the browser. */
import { VirtualPLC } from "./plant-runtime.js";

const actions = ["start","stop-input","estop","set-input","force","fault","resume","pause","stop","step"];
function requireScenario(spec) {
  if(!spec || spec.schema!==1 || !["conveyor","tank","rack"].includes(spec.scenario))
    throw new Error("Escenario schema 1 inválido");
  if(!Number.isInteger(spec.scans)||spec.scans<1||spec.scans>10000)
    throw new Error("scans debe estar entre 1 y 10000");
  if(!Array.isArray(spec.events)||spec.events.length>250)
    throw new Error("Máximo 250 eventos");
  for(const event of spec.events) {
    if(!event||!Number.isInteger(event.at)||event.at<0||event.at>=spec.scans
      ||!actions.includes(event.action)) throw new Error("Evento inválido");
    if(["fault","force","set-input"].includes(event.action)&&typeof event.value!=="boolean"&&event.value!==null)
      throw new Error("Valor booleano inválido");
  }
}
export function runScenario(spec, program) {
  requireScenario(spec);
  const cpu = new VirtualPLC(spec.scenario,program);
  cpu.setMode("RUN");
  const plan = new Map();
  for(const event of spec.events) {
    if(!plan.has(event.at)) plan.set(event.at,[]);
    plan.get(event.at).push(event);
  }
  for(let i=0;i<spec.scans;i++) {
    for(const e of plan.get(i) ?? []) {
      switch(e.action){
        case "start": cpu.pulse("I0.0");break;
        case "stop-input":cpu.pressStop();break;
        case "estop":cpu.toggleEstop();break;
        case "set-input":cpu.setInput(e.tag,e.value);break;
        case "force":cpu.forceInput(e.tag,e.value);break;
        case "fault":cpu.setFault(e.fault,e.value);break;
        case "resume":cpu.setMode("RUN");break;
        case "pause":cpu.setMode("PAUSE");break;
        case "stop":cpu.setMode("STOP");break;
        case "step":cpu.tick(100,true);break;
      }
    }
    cpu.tick(100);
  }
  return { snapshot:cpu.snapshot(),samples:cpu.samples,events:cpu.events };
}
export const sampleScenario = {
  schema:1,scenario:"conveyor",scans:150,
  events:[
    {at:0,action:"start"},
    {at:50,action:"fault",fault:"sensorStuck",value:true},
    {at:80,action:"fault",fault:"sensorStuck",value:false},
    {at:100,action:"fault",fault:"jam",value:true},
    {at:120,action:"fault",fault:"jam",value:false},
    {at:125,action:"start"}
  ]
};
