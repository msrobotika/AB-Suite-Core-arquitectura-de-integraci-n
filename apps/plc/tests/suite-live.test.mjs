import test from "node:test";
import assert from "node:assert/strict";
import { connect } from "node:net";
import { startSuiteLive, suiteLiveCommand } from "../src/suite-live-server.js";
import { VirtualPLC } from "../src/plant-runtime.js";

async function requestModbus(port,fc,qty=1,address=0){
  const req=Buffer.alloc(12);
  req.writeUInt16BE(37,0);
  req.writeUInt16BE(6,4);req[6]=1;req[7]=fc;
  req.writeUInt16BE(address,8);
  req.writeUInt16BE(qty,10);
  return new Promise((resolve,reject)=>{
    const socket=connect({host:"127.0.0.1",port},()=>socket.write(req));
    const chunks=[];
    socket.setTimeout(2500,()=>socket.destroy(new Error("Modbus timeout")));
    socket.on("data",part=>{
      chunks.push(part);
      const message=Buffer.concat(chunks);
      if(message.length>=7 && message.length>=6+message.readUInt16BE(4)){
        socket.destroy();resolve(message);
      }
    });
    socket.on("error",reject);
  });
}

test("CPU compartida: cambios vía HTTP aparecen inmediatamente en Modbus TCP",async()=>{
  const suite=await startSuiteLive({httpPort:0,modbusPort:0,clock:false});
  const host="http://127.0.0.1:"+suite.httpPort;
  const headers={Authorization:"Bearer "+suite.token,"Content-Type":"application/json"};
  const read=async()=>{
    const res=await fetch(host+"/api/live/state",{headers});
    assert.equal(res.status,200);
    return res.json();
  };
  const command=async(body)=>{
    const res=await fetch(host+"/api/live/command",{
      method:"POST",headers,body:JSON.stringify(body)
    });
    assert.equal(res.status,200);
    return res.json();
  };
  try {
    assert.equal((await read()).snapshot.mode,"STOP");
    await command({command:"mode",mode:"RUN"});
    await command({command:"pulse",tag:"I0.0"});
    await command({command:"step"});
    const frame=await read();
    assert.equal(frame.snapshot.scan,1);
    assert.equal(frame.snapshot.cpu.outputs["Q0.0"],true);
    const coils=await requestModbus(suite.modbusPort,1,3);
    assert.equal(coils[7],1);
    assert.equal(coils[8],1);
    assert.equal(coils[9]&1,1);
    const regs=await requestModbus(suite.modbusPort,3,2);
    assert.equal(regs[7],3);
    assert.equal(regs.readUInt16BE(9),frame.snapshot.scan);
    await command({command:"stop-input"});
    await command({command:"step"});
    assert.equal((await read()).snapshot.cpu.outputs["Q0.0"],false);
    const inactive=await requestModbus(suite.modbusPort,1,3);
    assert.equal(inactive[9]&1,0);
    assert.equal((await fetch(host+"/package.json",{headers})).status,404);
  } finally {await suite.close();}
});

test("API web rechaza falta de token y orígenes ajenos",async()=>{
  const suite=await startSuiteLive({httpPort:0,modbusPort:0,clock:false});
  const host="http://127.0.0.1:"+suite.httpPort;
  try{
    assert.equal((await fetch(host+"/api/live/state")).status,401);
    assert.equal((await fetch(host+"/api/live/state",{
      headers:{Authorization:"Bearer "+suite.token,Origin:"http://evil.invalid"}
    })).status,403);
    assert.equal((await fetch(host+"/api/live/state",{
      headers:{Authorization:"Bearer "+"f".repeat(64)}
    })).status,401);
    assert.equal((await fetch(host+"/")).status,200);
    const response=await fetch(host+"/api/live/command",{
      method:"POST",headers:{Authorization:"Bearer "+suite.token,
        "Content-Type":"application/json"},
      body:JSON.stringify({command:"write-physical-output",tag:"Q0.0",value:true})
    });
    assert.equal(response.status,400);
    assert.equal(suite.cpu.engine.read("Q0.0"),false);
  }finally{await suite.close();}
});

test("Suite Live cambia de proceso sobre la misma CPU y no admite hardware externo",()=>{
  const cpu=new VirtualPLC("conveyor");
  const result=suiteLiveCommand(cpu,{command:"scenario",scenario:"tank"});
  assert.equal(result.state.snapshot.scenario,"tank");
  assert.throws(()=>suiteLiveCommand(cpu,{command:"scenario",scenario:"safety-plc"}),/desconocido/);
  assert.throws(()=>suiteLiveCommand(cpu,{command:"input",tag:"Q0.0",value:true}),/inválida/);
});


test("AB-KOP Studio JSON → HTTP Suite Live → CPU → Modbus comparte la misma salida",async()=>{
  const suite=await startSuiteLive({httpPort:0,modbusPort:0,clock:false});
  const host="http://127.0.0.1:"+suite.httpPort;
  const headers={Authorization:"Bearer "+suite.token,"Content-Type":"application/json"};
  const command=async(value)=>{
    const response=await fetch(host+"/api/live/command",{
      method:"POST",headers,body:JSON.stringify(value)
    });
    assert.equal(response.status,200);
    return response.json();
  };
  try{
    const project={schema:1,name:"Circuito externo AB-KOP",
      inputs:{START:false,PERMISO:true},outputs:{MOTOR:false},
      rungs:[{id:"R1",name:"Arranque externo",
        operation:"COIL",target:"MOTOR",branches:[[
          {kind:"NO",variable:"START"},{kind:"NO",variable:"PERMISO"}
        ]]}]
    };
    const imported=await command({command:"import-kop",project});
    assert.equal(imported.imported.symbols.START,"I0.0");
    assert.equal(imported.imported.symbols.MOTOR,"Q0.0");
    assert.equal(imported.state.snapshot.scenario,"rack");
    await command({command:"mode",mode:"RUN"});
    await command({command:"input",tag:"I0.0",value:true});
    await command({command:"step"});
    assert.equal(suite.cpu.engine.read("Q0.0"),true);
    const modbus=await requestModbus(suite.modbusPort,1,1);
    assert.equal(modbus[9]&1,1);
    await command({command:"input",tag:"I0.0",value:false});
    await command({command:"step"});
    const off=await requestModbus(suite.modbusPort,1,1);
    assert.equal(off[9]&1,0);
  }finally{await suite.close();}
});
