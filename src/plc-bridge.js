/**
 * Read-only telemetry bridge for the authoritative Suite Live VirtualPLC.
 * No PLC output writes, no new CPU instance, no network client.
 */
import { randomBytes } from "node:crypto";
import { SUITE_EVENT_SCHEMA } from "./protocol.js";

export class SuitePLCBridge {
  constructor({bus,cpu,everyScans=5,runId=randomBytes(8).toString("hex")}={}){
    if(!bus || typeof bus.publish!=="function" || !cpu || typeof cpu.snapshot!=="function")
      throw new Error("Se necesita bus y CPU virtual");
    if(!Number.isInteger(everyScans)||everyScans<1||everyScans>1000)
      throw new Error("Intervalo de publicación inválido");
    this.bus=bus;this.cpu=cpu;this.everyScans=everyScans;this.runId=runId;
    this.lastScan=null;this.lastMode=null;this.lastScenario=null;this.counter=0;
    this.timer=null;
  }
  publish(topic,data,ms){
    return this.bus.publish("ab-plc-simulator",{
      schema:SUITE_EVENT_SCHEMA,source:"ab-plc-simulator",topic,
      trace_id:"plc-"+this.runId+"-"+(++this.counter),
      simulated_ms:ms,data
    });
  }
  flush(){
    const s=this.cpu.snapshot();
    const out=[];
    if(s.mode!==this.lastMode || s.scenario!==this.lastScenario){
      out.push(this.publish("plc.status",{mode:s.mode,scenario:s.scenario,scan:s.scan},s.simulatedMs));
      this.lastMode=s.mode;this.lastScenario=s.scenario;
    }
    if(s.scan!==this.lastScan &&
       (this.lastScan===null || s.scan<this.lastScan ||
       s.scan%this.everyScans===0 || s.mode!=="RUN")){
      const signals=s.cpu;
      const data={
        scan:s.scan,scenario:s.scenario,mode:s.mode,
        inputs:Object.fromEntries(Object.entries(signals.inputs).map(([k,v])=>[k,Boolean(v)])),
        outputs:Object.fromEntries(Object.entries(signals.outputs).map(([k,v])=>[k,Boolean(v)])),
        analog:{...signals.analog},
        counters:Object.fromEntries(Object.entries(signals.counters).map(([k,v])=>[k,v.cv])),
        process:{...s.plant},
        faults:{...s.faults}
      };
      out.push(this.publish("plc.snapshot",data,s.simulatedMs));
    }
    this.lastScan=s.scan;
    return out;
  }
  start(periodMs=200){
    if(this.timer)throw new Error("Puente ya iniciado");
    if(!Number.isInteger(periodMs)||periodMs<50||periodMs>5000)
      throw new Error("Periodo de observación inválido");
    this.flush();
    this.timer=setInterval(()=>this.flush(),periodMs);
    return this;
  }
  stop(){if(this.timer){clearInterval(this.timer);this.timer=null;}}
}
