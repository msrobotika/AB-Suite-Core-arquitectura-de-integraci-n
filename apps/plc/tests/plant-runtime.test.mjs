import test from "node:test";
import assert from "node:assert/strict";
import { VirtualPLC, conveyorProgram, tankProgram, rackProgram } from "../src/plant-runtime.js";
import { telemetryCSV, telemetryEnvelope, modbusPreview, SUITE_SCHEMA } from "../src/suite-contract.js";
import { importABKop } from "../src/kop-import.js";

const run = (cpu,n) => { for(let i=0;i<n;i++) cpu.tick(100); };

test("CPU arranca en STOP y no genera scans automáticamente",()=>{
  const cpu=new VirtualPLC();
  assert.equal(cpu.mode,"STOP");
  assert.equal(cpu.tick(),null);
  assert.equal(cpu.scanNumber,0);
});
test("modo RUN/P AUSE/STOP y paso manual reproducibles",()=>{
  const cpu=new VirtualPLC();
  cpu.setMode("RUN");cpu.tick(100);cpu.setMode("PAUSE");
  assert.equal(cpu.tick(100),null);
  assert.equal(cpu.scanNumber,1);
  cpu.tick(100,true);
  assert.equal(cpu.scanNumber,2);
  cpu.setMode("STOP");
  assert.equal(cpu.engine.read("Q0.0"),false);
  assert.equal(cpu.engine.scanCount,0);
});
test("transportador arranca, cuenta paquetes y puede detenerse",()=>{
  const cpu=new VirtualPLC("conveyor",conveyorProgram);
  cpu.setMode("RUN");cpu.pulse("I0.0");
  run(cpu,160);
  assert.equal(cpu.engine.read("Q0.0"),true);
  assert.ok(cpu.plant.delivered>0);
  assert.ok((cpu.engine.counters.C0?.cv??0)>0);
  cpu.pressStop();run(cpu,2);
  assert.equal(cpu.engine.read("Q0.0"),false);
});
test("fallo mecánico fuerza permiso a cero y registra evento",()=>{
  const cpu=new VirtualPLC("conveyor");
  cpu.setMode("RUN");cpu.pulse("I0.0");run(cpu,5);
  cpu.setFault("jam",true);cpu.tick();
  assert.equal(cpu.engine.read("I0.6"),false);
  assert.equal(cpu.engine.read("Q0.0"),false);
  assert.ok(cpu.events.some(e=>e.message.includes("jam")));
});
test("forcing de entradas no altera el estado físico y se puede liberar",()=>{
  const cpu=new VirtualPLC("conveyor");
  cpu.setMode("RUN");cpu.setFault("sensorStuck",true);cpu.tick();
  assert.equal(cpu.engine.read("I0.3"),true);
  cpu.forceInput("I0.3",false);cpu.tick();
  assert.equal(cpu.engine.read("I0.3"),false);
  assert.equal(cpu.plant.sensor,true);
  cpu.forceInput("I0.3",null);cpu.tick();
  assert.equal(cpu.engine.read("I0.3"),true);
});
test("tanque acumula y drena volumen virtual al llegar a niveles",()=>{
  const cpu=new VirtualPLC("tank",tankProgram);
  cpu.setMode("RUN");cpu.pulse("I0.0");
  run(cpu,390);
  const level=cpu.plant.level;
  assert.ok(level>=0&&level<=100);
  assert.ok(cpu.plant.totalFill>0,"no llenó");
  assert.ok(cpu.plant.totalDrain>0,"no descargó");
  assert.equal(cpu.engine.read("I0.6"),true);
});
test("bastidor genérico responde a entradas manuales sin planta",()=>{
  const cpu=new VirtualPLC("rack",rackProgram);
  cpu.setInput("I0.0",true);cpu.setMode("RUN");run(cpu,11);
  assert.equal(cpu.engine.read("Q0.0"),true);
  assert.equal(cpu.engine.read("Q0.1"),true);
});
test("determinismo por secuencia de entradas",()=>{
  const scenario=()=>{
    const cpu=new VirtualPLC("conveyor");cpu.setMode("RUN");cpu.pulse("I0.0");
    run(cpu,57);cpu.setFault("sensorStuck",true);run(cpu,15);
    return {snapshot:cpu.snapshot(),samples:cpu.samples};
  };
  assert.deepEqual(scenario(),scenario());
});
test("exportación CSV de telemetría y contrato JSON versión 1",()=>{
  const cpu=new VirtualPLC("tank");cpu.setMode("RUN");cpu.pulse("I0.0");
  run(cpu,15);
  const csv=telemetryCSV(cpu.samples);
  assert.match(csv,/scan,simulated_ms,scenario/);
  assert.equal(csv.trim().split("\n").length,16);
  const env=telemetryEnvelope(cpu);
  assert.equal(env.schema,SUITE_SCHEMA);
  assert.equal(env.samples.length,15);
  assert.equal(env.samples[0].source,undefined);
});
test("preview Modbus solo en memoria con enteros limitados 16 bits",()=>{
  const cpu=new VirtualPLC("conveyor");cpu.setMode("RUN");cpu.pulse("I0.0");cpu.tick();
  const p=modbusPreview(cpu.snapshot());
  assert.equal(p.holding_registers.length,5);
  assert.equal(p.coils[0],true);
  assert.equal(p.discrete_inputs[1],true);
  assert.deepEqual(p.address_base,0);
});
test("importador AB-KOP acepta red combinacional real schema 1",()=>{
  const source={schema:1,name:"Ejemplo AB-KOP",inputs:{START:false,STOP_OK:true},
    outputs:{MOTOR:false},
    rungs:[{id:"R1",name:"Marcha",operation:"COIL",target:"MOTOR",
      branches:[[{kind:"NO",variable:"START"},{kind:"NO",variable:"STOP_OK"}]]}]};
  const converted=importABKop(source);
  const cpu=new VirtualPLC("rack",converted.program);
  for(const [tag,value] of Object.entries(converted.inputDefaults))cpu.setInput(tag,value);
  cpu.setMode("RUN");cpu.setInput(converted.symbols.START,true);cpu.tick();
  assert.equal(cpu.engine.read(converted.symbols.MOTOR),true);
  assert.equal(converted.program.rungs[0].when.op,"and");
});
test("importador AB-KOP interpreta TON en ciclos convertidos a ms",()=>{
  const src={schema:1,name:"TON",inputs:{ENABLE:false},outputs:{LED:false},
    rungs:[
      {id:"R1",name:"Timer",operation:"TON",target:"TIMER",preset:3,
       branches:[[{kind:"NO",variable:"ENABLE"}]]},
      {id:"R2",name:"Salida",operation:"COIL",target:"LED",
       branches:[[{kind:"NO",variable:"TIMER_DONE"}]]}
    ]};
  const imported=importABKop(src);
  assert.equal(imported.program.rungs[0].action.presetMs,300);
  const cpu=new VirtualPLC("rack",imported.program);cpu.setMode("RUN");
  cpu.setInput(imported.symbols.ENABLE,true);run(cpu,3);
  assert.equal(cpu.engine.read(imported.symbols.LED),true);
});
test("formato externo inválido se rechaza sin evaluación arbitraria",()=>{
  assert.throws(()=>importABKop({schema:999}),/schema 1/);
  assert.throws(()=>new VirtualPLC("unknown"),/desconocido/);
  const cpu=new VirtualPLC();
  assert.throws(()=>cpu.setFault("laser",true),/disponible/);
  assert.throws(()=>cpu.forceInput("Q0.0",true),/inválida/);
});

test("STEP desde STOP pasa a PAUSE y ejecuta una única red",()=>{
 const cpu=new VirtualPLC("rack");
 cpu.tick(100,true);
 assert.equal(cpu.mode,"PAUSE");
 assert.equal(cpu.scanNumber,1);
 cpu.tick(100);
 assert.equal(cpu.scanNumber,1);
});
test("el importador evita símbolos TON ambiguos",()=>{
 const src={schema:1,name:"Conflicto",inputs:{T_DONE:false},outputs:{OUT:false},
 rungs:[{id:"R1",name:"Temporizador",operation:"TON",target:"T",preset:2,
 branches:[[{kind:"NO",variable:"T_DONE"}]]}]};
 assert.throws(()=>importABKop(src),/ambiguo/);
});
