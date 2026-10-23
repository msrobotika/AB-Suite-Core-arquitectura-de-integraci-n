import test from "node:test";
import assert from "node:assert/strict";
import { SuitePLCBridge } from "../src/plc-bridge.js";
import { SuiteEventBus } from "../src/bus.js";
import { startSuiteCore } from "../src/server.js";
import { SuiteClient } from "../src/client.js";

function mockCPU() {
  const f={mode:"STOP",scenario:"conveyor",scan:0,simulatedMs:0,motor:false};
  return { f, snapshot() {
    return {
      schema:"msrobotika.plc.snapshot.v1",
      mode:f.mode,scenario:f.scenario,scan:f.scan,simulatedMs:f.simulatedMs,
      cpu:{
        inputs:{"I0.0":f.motor},outputs:{"Q0.0":f.motor},
        analog:{AI0:15.5},counters:{C0:{cv:1}}
      },
      plant:{kind:"conveyor",delivered:1},
      faults:{jam:false}
    };
  }};
}
test("puente autónomo no crea otra CPU y publica estado tipado",()=>{
  const cpu=mockCPU();const bus=new SuiteEventBus();
  const bridge=new SuitePLCBridge({bus,cpu,everyScans:1,runId:"standalone"});
  const start=bridge.flush();
  assert.equal(start.length,2);
  assert.deepEqual(start.map(x=>x.topic),["plc.status","plc.snapshot"]);
  cpu.f.mode="RUN";cpu.f.scan=1;cpu.f.simulatedMs=100;cpu.f.motor=true;
  const next=bridge.flush();
  assert.equal(next.length,2);
  assert.equal(next[1].data.outputs["Q0.0"],true);
  assert.equal(next[1].data.scan,1);
  assert.equal(next[1].simulated_ms,100);
  assert.equal(bridge.flush().length,0);
  assert.equal(bus.stats().sequence,4);
  assert.equal(cpu.f.scan,1,"el puente no debe alterar la CPU");
});
test("estado y snapshot aparecen en el histórico HTTP del SDK",async()=>{
  const core=await startSuiteCore({port:0});
  const cpu=mockCPU();
  const bridge=new SuitePLCBridge({bus:core.bus,cpu,everyScans:1});
  const monitor=new SuiteClient({url:core.url,token:core.tokens.monitor});
  try {
    bridge.flush();
    cpu.f.mode="RUN";cpu.f.motor=true;cpu.f.scan=1;cpu.f.simulatedMs=100;
    bridge.flush();
    const result=await monitor.history({after:0});
    assert.equal(result.events.length,4);
    const snapshots=result.events.filter(x=>x.topic==="plc.snapshot");
    assert.equal(snapshots[1].data.outputs["Q0.0"],true);
    assert.equal(snapshots[1].source,"ab-plc-simulator");
    assert.equal(snapshots[1].schema,"msrobotika.suite.event.v1");
  } finally {await core.close();}
});
test("configuración de puente inválida se rechaza",()=>{
  assert.throws(()=>new SuitePLCBridge({cpu:mockCPU()}),/bus y CPU/);
  assert.throws(()=>new SuitePLCBridge({cpu:mockCPU(),bus:new SuiteEventBus(),everyScans:0}),/Intervalo/);
});
