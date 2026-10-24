/**
 * Suite Live: one VirtualPLC drives the authenticated local web HMI and
 * read-only Modbus TCP endpoint. MIT · MS ROBOTIKA.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, dirname, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { VirtualPLC, plantCatalog } from "./plant-runtime.js";
import { createModbusLabServer } from "./modbus-tcp.js";
import { importABKop } from "./kop-import.js";

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const ERROR=(text,status=400)=>Object.assign(new Error(text),{status});
const STATIC={"/":"index.html","/index.html":"index.html"};
const types={".html":"text/html",".js":"text/javascript",".css":"text/css",".svg":"image/svg+xml",".png":"image/png"};
const allowPath=p=>STATIC[p]??(
  /^\/(?:src|assets)\/[a-zA-Z0-9_.\/-]+\.(?:js|css|svg)$/.test(p) &&
  !p.split("/").includes("..") ? p.slice(1):null
);
const authorized=(value,token)=>{
  const a=Buffer.from(value??""),b=Buffer.from("Bearer "+token);
  return a.length===b.length && timingSafeEqual(a,b);
};
const send=(res,code,obj)=>{
  const body=Buffer.from(JSON.stringify(obj));
  res.writeHead(code,{"Content-Type":"application/json; charset=utf-8",
    "Content-Length":body.length,"Cache-Control":"no-store","X-Content-Type-Options":"nosniff",
    "Referrer-Policy":"no-referrer","Cross-Origin-Resource-Policy":"same-origin"});
  res.end(body);
};
async function jsonBody(req){
  let size=0;const parts=[];
  for await(const part of req) {
    size+=part.length;
    if(size>300000)throw ERROR("Petición demasiado grande",413);
    parts.push(part);
  }
  try{return JSON.parse(Buffer.concat(parts).toString("utf8"));}
  catch{throw ERROR("JSON inválido");}
}

export function suiteLiveState(cpu){
  return {schema:"msrobotika.suite.live.v1",snapshot:cpu.snapshot(),
    program:cpu.program,preparedInputs:{...cpu.manual},samples:cpu.samples.slice(-140),events:cpu.events.slice(0,40)};
}
export function suiteLiveCommand(cpu,data){
  if(!data||typeof data!=="object"||Array.isArray(data))throw ERROR("Comando inválido");
  switch(data.command){
    case "mode":cpu.setMode(data.mode);break;
    case "step":cpu.tick(100,true);break;
    case "reset":cpu.reset();break;
    case "pulse":cpu.pulse(data.tag,data.ticks??1);break;
    case "stop-input":cpu.pressStop();break;
    case "estop":cpu.toggleEstop();break;
    case "input":cpu.setInput(data.tag,data.value);break;
    case "force":cpu.forceInput(data.tag,data.value);break;
    case "fault":cpu.setFault(data.fault,data.value);break;
    case "scenario":{
      if(!Object.hasOwn(plantCatalog,data.scenario))throw ERROR("Escenario desconocido");
      cpu.loadScenario(data.scenario,data.program);
      if(data.inputDefaults){
        if(Object.keys(data.inputDefaults).length>60)throw ERROR("Exceso de entradas");
        for(const [tag,v] of Object.entries(data.inputDefaults))cpu.setInput(tag,v);
      }
      break;
    }
    case "import-kop":{
      const imported=importABKop(data.project);
      cpu.loadScenario("rack",imported.program);
      for(const [tag,v] of Object.entries(imported.inputDefaults))cpu.setInput(tag,v);
      return {imported,state:suiteLiveState(cpu)};
    }
    default:throw ERROR("Operación no admitida");
  }
  return {state:suiteLiveState(cpu)};
}

export async function startSuiteLive({
  httpPort=4173,modbusPort=1502,scenario="conveyor",autoRun=false,
  clock=true,host="127.0.0.1"
}={}){
  if(host!=="127.0.0.1")throw ERROR("Solo se admite 127.0.0.1");
  if(![httpPort,modbusPort].every(x=>Number.isInteger(x)&&x>=0&&x<=65535))
    throw ERROR("Puerto incorrecto");
  if(!Object.hasOwn(plantCatalog,scenario))throw ERROR("Escenario incorrecto");
  const cpu=new VirtualPLC(scenario),token=randomBytes(32).toString("hex");
  if(autoRun){cpu.setMode("RUN");cpu.pulse("I0.0");}
  let web,modbus,interval;
  const handler=async(req,res)=>{
    try{
      const addr=web.address();
      const authority="127.0.0.1:"+addr.port;
      const origin="http://"+authority;
      if(req.headers.host!==authority ||
         (req.headers.origin&&req.headers.origin!==origin) ||
         req.headers["sec-fetch-site"]==="cross-site")throw ERROR("Origen prohibido",403);
      const path=new URL(req.url,origin).pathname;
      if(path.startsWith("/api/live/")){
        if(!authorized(req.headers.authorization,token))throw ERROR("Sesión inválida",401);
        if(path==="/api/live/state"&&req.method==="GET")
          return send(res,200,suiteLiveState(cpu));
        if(path==="/api/live/command"&&req.method==="POST")
          return send(res,200,suiteLiveCommand(cpu,await jsonBody(req)));
        throw ERROR("API desconocida",404);
      }
      if(req.method!=="GET"&&req.method!=="HEAD")throw ERROR("Método no permitido",405);
      const relative=allowPath(path);
      if(!relative)throw ERROR("Archivo no disponible",404);
      const file=resolve(ROOT,relative);
      if(!file.startsWith(ROOT+sep))throw ERROR("Ruta prohibida",403);
      const bytes=await readFile(file);
      res.writeHead(200,{"Content-Type":(types[extname(file)]??"application/octet-stream")+"; charset=utf-8",
        "Content-Length":bytes.length,"Cache-Control":"no-store","X-Content-Type-Options":"nosniff",
        "Referrer-Policy":"no-referrer",
        "Content-Security-Policy":"default-src 'self'; connect-src 'self'; script-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});
      res.end(req.method==="HEAD"?undefined:bytes);
    }catch(err){
      if(!res.headersSent)send(res,err.status??(err.code==="ENOENT"?404:400),{error:err.message});
    }
  };
  try{
    modbus=await createModbusLabServer({simulator:cpu,port:modbusPort});
    web=createServer(handler);
    await new Promise((ok,bad)=>{
      web.once("error",bad);
      web.listen(httpPort,host,ok);
    });
    if(clock)interval=setInterval(()=>{
      try{cpu.tick(100);}
      catch{cpu.setMode("PAUSE");}
    },100);
  }catch(err){
    if(interval)clearInterval(interval);
    if(web?.listening)await new Promise(ok=>web.close(ok));
    if(modbus?.listening)await new Promise(ok=>modbus.close(ok));
    throw err;
  }
  const close=async()=>{
    if(interval)clearInterval(interval);
    await Promise.all([new Promise(ok=>web.close(ok)),new Promise(ok=>modbus.close(ok))]);
  };
  return {cpu,web,modbus,token,close,
    httpPort:web.address().port,modbusPort:modbus.address().port,
    url:"http://127.0.0.1:"+web.address().port+"/#suite="+token};
}
