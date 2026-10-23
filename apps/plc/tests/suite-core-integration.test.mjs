import test from "node:test";
import assert from "node:assert/strict";
import { VirtualPLC } from "../src/plant-runtime.js";
import { startSuiteLive } from "../src/suite-live-server.js";
import { startSuiteCore, SuiteClient, SuitePLCBridge } from "../../../src/index.js";
import { connect } from "node:net";

async function coil(port){
  const request=Buffer.alloc(12);
  request.writeUInt16BE(1,0);request.writeUInt16BE(6,4);
  request[6]=1;request[7]=1;request.writeUInt16BE(0,8);request.writeUInt16BE(1,10);
  return new Promise((resolve,reject)=>{
    const socket=connect({host:"127.0.0.1",port},()=>socket.write(request));
    let content=Buffer.alloc(0);
    socket.on("data",chunk=>{
      content=Buffer.concat([content,chunk]);
      if(content.length>=7 && content.length>=6+content.readUInt16BE(4)){
        socket.destroy();resolve((content[9]&1)===1);
      }
    });
    socket.on("error",reject);
  });
}
test("puente local registra cambios de modo y snapshots de la misma CPU",()=>{
  const cpu=new VirtualPLC("conveyor");
  const saved=[];
  const bridge=new SuitePLCBridge({cpu,bus:{publish(source,event){
    assert.equal(source,"ab-plc-simulator");saved.push(event);return event;
  }},everyScans:1,runId:"known"});
  assert.equal(bridge.flush().length,2);
  cpu.setMode("RUN");cpu.pulse("I0.0");cpu.tick();
  const changes=bridge.flush();
  assert.equal(changes.length,2);
  assert.equal(changes[1].topic,"plc.snapshot");
  assert.equal(changes[1].data.outputs["Q0.0"],true);
  assert.equal(bridge.flush().length,0);
});
test("HTTP HMI, Modbus y Suite Core comparten exactamente la CPU virtual",async()=>{
  const live=await startSuiteLive({httpPort:0,modbusPort:0,clock:false});
  let core;
  try{
    core=await startSuiteCore({port:0});
    const bridge=new SuitePLCBridge({bus:core.bus,cpu:live.cpu,everyScans:1});
    const command=async value=>{
      const r=await fetch("http://127.0.0.1:"+live.httpPort+"/api/live/command",{
        method:"POST",headers:{Authorization:"Bearer "+live.token,"Content-Type":"application/json"},
        body:JSON.stringify(value)
      });
      assert.equal(r.status,200);
    };
    const monitor=new SuiteClient({url:core.url,token:core.tokens.monitor});
    bridge.flush();
    await command({command:"mode",mode:"RUN"});
    await command({command:"pulse",tag:"I0.0"});
    await command({command:"step"});
    bridge.flush();
    assert.equal(await coil(live.modbusPort),true);
    const snapshots=(await monitor.history({after:0})).events.filter(e=>e.topic==="plc.snapshot");
    assert.equal(snapshots.at(-1).data.outputs["Q0.0"],true);
    assert.equal(snapshots.at(-1).data.scan,1);
    await command({command:"stop-input"});
    await command({command:"step"});
    bridge.flush();
    assert.equal(await coil(live.modbusPort),false);
    const after=(await monitor.history({after:0})).events.filter(e=>e.topic==="plc.snapshot");
    assert.equal(after.at(-1).data.outputs["Q0.0"],false);
  }finally{
    if(core)await core.close();
    await live.close();
  }
});
