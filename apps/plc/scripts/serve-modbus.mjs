#!/usr/bin/env node
/** Deliberately local read-only Modbus TCP bridge for AB-Modbus Studio. */
import { VirtualPLC } from "../src/plant-runtime.js";
import { createModbusLabServer } from "../src/modbus-tcp.js";
const scenario = process.argv.includes("--tank") ? "tank" :
  process.argv.includes("--rack") ? "rack" : "conveyor";
const portFlag=process.argv.indexOf("--port");
const port=portFlag<0?1502:Number(process.argv[portFlag+1]);
const cpu=new VirtualPLC(scenario);
cpu.setMode("RUN");
cpu.pulse("I0.0");
const clock=setInterval(()=>{
  try{cpu.tick(100);}catch(err){console.error("Scan error:",err.message);clearInterval(clock);}
},100);
try{
 const server=await createModbusLabServer({simulator:cpu,port});
 process.stdout.write(
  "AB-PLC Simulator Modbus TCP — SOLO LECTURA\n"+
  "Host: 127.0.0.1  Puerto: "+port+"  Unit ID: 1\n"+
  "FC01 Coils / FC02 Discrete / FC03 Holding / FC04 Input registers\n"+
  "El proceso virtual está activo. No existe salida a hardware ni LAN.\n"+
  "Conecta AB-Modbus Studio a 127.0.0.1:"+port+" y pulsa Leer.\n"+
  "Ctrl+C para detener el servicio.\n"
 );
 const shutdown=()=>{clearInterval(clock);server.close(()=>process.exit(0));};
 process.on("SIGINT",shutdown);process.on("SIGTERM",shutdown);
}catch(err){clearInterval(clock);console.error("No se pudo abrir el servidor:",err.message);process.exitCode=1;}
