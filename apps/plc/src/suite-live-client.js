/**
 * Same-origin authenticated client for Suite Live.
 * HMI controls and Modbus read the same server-owned VirtualPLC.
 */
export async function connectSuiteLive(){
  const match=location.hash.match(/(?:^#|&)suite=([a-f0-9]{64})(?:&|$)/);
  if(!match&&!window.ABSuitePLC)return null;
  const token=window.ABSuitePLC?.token??match[1];
  let documentState=null;
  let commandQueue=Promise.resolve();
  let generation=0,polling=false;
  const call=async(path,method="GET",body)=>{
    const response=await (window.ABSuite?.fetch??window.fetch.bind(window))(path,{
      method,
      headers:{"Authorization":"Bearer "+token,
        ...(body?{"Content-Type":"application/json"}:{})},
      ...(body?{body:JSON.stringify(body)}:{})
    });
    let result;
    try{result=await response.json();}
    catch{throw new Error("Respuesta no válida del servidor Suite");}
    if(!response.ok)throw new Error(result.error??"Error HTTP "+response.status);
    return result;
  };
  documentState=await call("/api/live/state");
  if(documentState.schema!=="msrobotika.suite.live.v1")
    throw new Error("Contrato Suite Live no soportado");

  const apply=state=>{
    if(state?.schema!=="msrobotika.suite.live.v1")
      throw new Error("Snapshot Suite incompatible");
    documentState=state;
  };
  const dispatch=payload=>{
    generation++;
    const run=async()=>{
      const result=await call("/api/live/command","POST",payload);
      apply(result.state);
      return result;
    };
    commandQueue=commandQueue.catch(()=>{}).then(run);
    return commandQueue;
  };
  const client={
    get scenario(){return documentState.snapshot.scenario;},
    get mode(){return documentState.snapshot.mode;},
    get program(){return documentState.program;},
    get faults(){return documentState.snapshot.faults;},
    get force(){return documentState.snapshot.forces;},
    get samples(){return documentState.samples;},
    get events(){return documentState.events;},
    get engine(){return {read(tag){
      const s=documentState.snapshot.cpu;
      if(/^I/.test(tag))return !!s.inputs[tag];
      if(/^Q/.test(tag))return !!s.outputs[tag];
      if(/^M/.test(tag))return !!s.memory[tag];
      if(/^T/.test(tag))return !!s.timers[tag]?.q;
      if(/^C/.test(tag))return !!s.counters[tag]?.q;
      return false;
    }};},
    snapshot(){return documentState.snapshot;},
    setMode:mode=>dispatch({command:"mode",mode}),
    tick:()=>dispatch({command:"step"}),
    reset:()=>dispatch({command:"reset"}),
    pulse:(tag,ticks)=>dispatch({command:"pulse",tag,ticks}),
    pressStop:()=>dispatch({command:"stop-input"}),
    toggleEstop:()=>dispatch({command:"estop"}),
    setInput:(tag,value)=>dispatch({command:"input",tag,value}),
    setFault:(fault,value)=>dispatch({command:"fault",fault,value}),
    forceInput:(tag,value)=>dispatch({command:"force",tag,value}),
    loadScenario:(scenario,program,inputDefaults)=>dispatch({
      command:"scenario",scenario,program,inputDefaults
    }),
    async poll(){
      if(polling)return false;
      polling=true;
      const myGen=generation;
      try{
        await commandQueue.catch(()=>{});
        const result=await call("/api/live/state");
        if(myGen===generation){apply(result);return true;}
        return false;
      }finally{polling=false;}
    }
  };
  return client;
}
