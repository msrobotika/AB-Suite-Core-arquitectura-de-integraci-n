#!/usr/bin/env node
import { startSuiteLive } from "../src/suite-live-server.js";
const args=process.argv.slice(2);
const arg=(name,otherwise)=>{
  const i=args.indexOf(name);
  return i<0?otherwise:args[i+1];
};
try{
  const live=await startSuiteLive({
    httpPort:Number(arg("--http-port",4173)),
    modbusPort:Number(arg("--modbus-port",1502)),
    scenario:arg("--scenario","conveyor"),
    autoRun:args.includes("--auto-run")
  });
  process.stdout.write("\nAB-PLC SIMULATOR · SUITE LIVE\n"+
    "Una CPU compartida entre web y Modbus TCP.\n"+
    "Abre esta URL PRIVADA en el navegador del PC:\n"+live.url+"\n\n"+
    "AB-Modbus Studio: 127.0.0.1:"+live.modbusPort+
    " · Unit ID 1 · FC01–04 SOLO LECTURA.\n"+
    "Sin acceso a maquinaria real; Ctrl+C cierra ambos servicios.\n");
  const stop=()=>live.close().then(()=>process.exit(0));
  process.on("SIGINT",stop);process.on("SIGTERM",stop);
}catch(err){
  process.stderr.write("Error al iniciar Suite Live: "+err.message+"\n");
  process.exitCode=1;
}
