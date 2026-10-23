import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {startWorkspace,workspaceRoot as root} from '../src/workspace-server.js';
import {startSuiteLive} from '../apps/plc/src/suite-live-server.js';
import {restoreCPU,persistCPU} from '../src/workspace-project.js';
import {createBICapture} from '../src/bi-capture.js';
import {randomBytes} from 'node:crypto';
const executable=process.env.AB_SUITE_PYTHON??resolve(root,'.venv',process.platform==='win32'?'Scripts/python.exe':'bin/python');
let child=null,engines={},suite=null,live=null,capture=null,closing=false,saveTimer=null,lastSaved='',saving=false;
const biToken=randomBytes(32).toString('hex');
const dataDirectory=resolve(root,'.suite-data');
async function saveChanged(){if(!live||saving)return;const key=JSON.stringify([live.cpu.scenario,live.cpu.program]);if(key===lastSaved)return;saving=true;try{await persistCPU(live.cpu,dataDirectory);lastSaved=key}catch(error){console.error('No se pudo guardar el programa CPU:',error.message)}finally{saving=false}}
async function stop(){if(closing)return;closing=true;clearInterval(saveTimer);capture?.close();await saveChanged();child?.kill();await suite?.close();await live?.close()}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
try{
  if(existsSync(executable)||process.env.AB_SUITE_PYTHON){
    child=spawn(executable,['scripts/engines.py'],{cwd:root,env:{...process.env,ABBI_SUITE_WRITE_TOKEN:biToken},stdio:['ignore','pipe','pipe'],windowsHide:true});
    child.stderr.on('data',chunk=>process.stderr.write(chunk));
    engines=await new Promise((ok,bad)=>{
      const timeout=setTimeout(()=>bad(Error('Los motores no arrancaron en 30 segundos')),30000);let buffer='';
      child.once('error',bad);child.once('exit',()=>bad(Error('No se pudieron iniciar los motores Python. Ejecuta node scripts/setup.mjs')));
      child.stdout.on('data',chunk=>{buffer+=chunk;const end=buffer.indexOf('\n');if(end>=0){clearTimeout(timeout);try{ok(JSON.parse(buffer.slice(0,end)))}catch{bad(Error('Respuesta de motores inválida'))}}});
    });
    // Probe the BI engine as well: its import and startup may finish after the other engines.
    let ready=false;for(let i=0;i<100;i++){try{const r=await fetch(`http://127.0.0.1:${engines.bi.port}/api/health`,{signal:AbortSignal.timeout(500)});if(r.ok){ready=true;break}}catch{}await new Promise(ok=>setTimeout(ok,100))}
    if(!ready)throw Error('BI no pudo arrancar. Revisa sus dependencias.');
    child.on('exit',()=>{for(const id of ['modbus','serial','bi','vision'])delete engines[id];if(!closing)console.error('Motores Python detenidos: reinicia la suite para recuperarlos.')});
  }else console.error('Falta preparar Python: node scripts/setup.mjs. Modbus, Serial y BI estarán señalados como no disponibles.');
  live=await startSuiteLive({httpPort:0,modbusPort:0,scenario:'rack'});
  try{await restoreCPU(live.cpu,dataDirectory)}catch(error){console.error('No se pudo recuperar el programa CPU guardado:',error.message)}
  lastSaved=JSON.stringify([live.cpu.scenario,live.cpu.program]);
  saveTimer=setInterval(saveChanged,1000);
  engines.plc={port:live.httpPort,token:live.token,modbusPort:live.modbusPort};
  if(engines.bi)capture=createBICapture({cpu:live.cpu,port:engines.bi.port,token:biToken});
  suite=await startWorkspace({port:Number(process.env.AB_SUITE_PORT??4170),engines,capture});
  console.log(`AB Suite · Laboratorio de programación\n${suite.url}\nLas nueve herramientas se abren desde el catálogo. Ctrl+C para salir.`);
  if(process.argv.includes('--open')){
    const [command,args]=process.platform==='win32'?['cmd.exe',['/d','/c','start','',suite.url]]:process.platform==='darwin'?['open',[suite.url]]:['xdg-open',[suite.url]];
    const opener=spawn(command,args,{stdio:'ignore',windowsHide:true});opener.on('error',()=>console.error('Abre la dirección anterior en tu navegador.'));opener.unref();
  }
}catch(error){console.error(error.message);await stop();process.exitCode=1}
