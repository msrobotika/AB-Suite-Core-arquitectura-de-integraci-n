#!/usr/bin/env node
/**
 * Unified MS ROBOTIKA development lab:
 * same VirtualPLC -> HTTP HMI / Modbus TCP read-only / Suite Core SSE bus.
 */
import { startSuiteLive } from "../src/suite-live-server.js";
import { startSuiteCore, SuitePLCBridge } from "../../../src/index.js";

const args=process.argv.slice(2);
const option=(flag,fallback)=>{
  const i=args.indexOf(flag);
  return i===-1?fallback:args[i+1];
};
let live=null,core=null,bridge=null;
try{
  live=await startSuiteLive({
    httpPort:Number(option("--http-port",4173)),
    modbusPort:Number(option("--modbus-port",1502)),
    scenario:option("--scenario","conveyor"),
    autoRun:args.includes("--auto-run")
  });
  core=await startSuiteCore({port:Number(option("--bus-port",4175))});
  bridge=new SuitePLCBridge({bus:core.bus,cpu:live.cpu,everyScans:5}).start(200);
  process.stdout.write("\nMS ROBOTIKA · AB-SUITE CORE v0.1\n"+
    "PLANTA/CPU virtual compartida (Node, sin maquinaria):\n"+
    "  HMI privada: "+live.url+"\n"+
    "  Modbus TCP solo lectura: 127.0.0.1:"+live.modbusPort+" · Unit ID 1\n"+
    "  Bus HTTP/SSE: "+core.url+"\n"+
    "  Token monitor (SSE/consultas): "+core.tokens.monitor+"\n"+
    "  Token AB-BI (lectura + publicación BI): "+core.tokens["ab-bi-studio"]+"\n"+
    "  Token AB-Vision (solo publica visión): "+core.tokens["ab-vision-inspector"]+"\n"+
    "  Token AB-GRAFCET (solo publica etapas): "+core.tokens["ab-grafcet-studio"]+"\n"+
    "\nNo distribuyas estos tokens ni la URL HMI. Solo accesible desde este PC.\n"+
    "Ctrl+C detiene servicios y destruye las credenciales de sesión.\n\n");
  const stop=async()=>{
    process.off("SIGINT",stop);process.off("SIGTERM",stop);
    bridge?.stop();
    await Promise.all([core?.close(),live?.close()]);
    process.exit(0);
  };
  process.on("SIGINT",stop);process.on("SIGTERM",stop);
}catch(err){
  bridge?.stop();
  if(core)await core.close();
  if(live)await live.close();
  process.stderr.write("Error al iniciar AB-Suite Core: "+err.message+"\n");
  process.exitCode=1;
}
