import {randomBytes} from 'node:crypto';
/** Explicit capture into the native BI model. No separate analytics engine. */
export function toBIRow(snapshot,sequence){
 const {cpu,plant}=snapshot;
 return {sequence,received_at:new Date().toISOString(),simulated_ms:snapshot.simulatedMs,scenario:snapshot.scenario,mode:snapshot.mode,scan:snapshot.scan,
  Q0_0:Number(Boolean(cpu.outputs['Q0.0'])),Q0_1:Number(Boolean(cpu.outputs['Q0.1'])),Q0_2:Number(Boolean(cpu.outputs['Q0.2'])),AI0:cpu.analog.AI0??0,counter_C0:cpu.counters.C0?.cv??0,
  process_value:plant.kind==='tank'?plant.level:plant.kind==='conveyor'?plant.delivered:0,
  process_unit:plant.kind==='tank'?'percent':plant.kind==='conveyor'?'packages':'none',
  active_faults:Object.entries(snapshot.faults).filter(([,v])=>v).map(([k])=>k).join('|')};
}
export function createBICapture({cpu,port,token}){
 let enabled=false,busy=false,sequence=0,last='',inserted=0,error=null,workspaceId=null;
 const session=randomBytes(12).toString('hex');
 const tick=async()=>{
  if(!enabled||busy)return;
  const snapshot=cpu.snapshot(),key=JSON.stringify([snapshot.scenario,snapshot.scan,snapshot.mode]);if(key===last)return;
  busy=true;
  try{
   if(!workspaceId){const response=await fetch(`http://127.0.0.1:${port}/api/model`,{signal:AbortSignal.timeout(5000)});if(!response.ok)throw Error('BI no disponible');workspaceId=(await response.json()).workspace_id}
   const response=await fetch(`http://127.0.0.1:${port}/api/suite/ingest`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(5000),headers:{'Content-Type':'application/json','x-abbi-suite-token':token},body:JSON.stringify({schema:'msrobotika.bi.suite.ingest.v1',session_id:session,workspace_id:workspaceId,rows:[toBIRow(snapshot,sequence+1)]})});
   const result=await response.json();if(!response.ok)throw Error(result.detail??'No se pudo incorporar telemetría a BI');sequence++;last=key;inserted+=result.inserted;error=null;
  }catch(failure){error=failure.message;enabled=false}finally{busy=false}
 };
 const timer=setInterval(tick,500);timer.unref();
 return {status:()=>({enabled,inserted,error,table:'SuitePLC'}),set(value){enabled=value;if(value){last='';error=null;workspaceId=null}return this.status()},close:()=>clearInterval(timer),tick};
}
