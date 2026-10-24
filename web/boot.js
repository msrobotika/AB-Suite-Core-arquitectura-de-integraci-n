/** Native engines opt into this host; outside the suite they keep their original behavior. */
(()=>{
 const id=document.currentScript.dataset.app,base=`/apps/${id}`,nativeFetch=window.fetch.bind(window);
 let adapter=null,timer=null,lastProject='',saveError=false;
 const instance=crypto.randomUUID();
 const sdk={id,instance,base,conflict:false,exerciseRequest:{exercise:new URLSearchParams(location.search).get('exercise'),recovery:new URLSearchParams(location.search).get('recovery')},
  fetch(input,options){return nativeFetch(typeof input==='string'&&input.startsWith('/')&&!input.startsWith('//')&&!input.startsWith('/suite/')&&!input.startsWith('/apps/')?base+input:input,options)},
  register(value){adapter=value},
  get adapter(){return adapter},
  async transfer(){if(!adapter?.project)throw Error('Este editor no ofrece un proyecto transferible');const project=adapter.project();if(!project)throw Error('Analiza un proyecto válido antes de enviarlo');localStorage.setItem('ab-suite:transfer:plc',JSON.stringify({schema:'ab-suite.transfer.v1',from:id,at:Date.now(),project}));window.open('/apps/plc/','_blank','noopener')},
  get storageError(){return saveError}
 };
 window.ABSuite=sdk;
 const channel=typeof BroadcastChannel==='function'?new BroadcastChannel('ab-suite.signals.v1'):null;
 async function publish(){
  if(!adapter?.snapshot)return;
  try{
   const tags=await adapter.snapshot();if(!tags)return;
   const entries=Object.entries(tags);if(entries.length>256||entries.some(([key,value])=>!/^[A-Za-z0-9_.:-]{1,100}$/.test(key)||!(typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))))throw Error('Contrato de señales inválido');
   const previous=JSON.parse(localStorage.getItem('ab-suite:signals:'+id)||'null');
   if(!(id==='plc'&&window.ABSuitePLC)&&previous?.instance!==instance&&Date.now()-(previous?.at??0)<5000){sdk.conflict=true;return}
   sdk.conflict=false;
   const snapshot={schema:'ab-suite.signals.v1',source:id,instance,at:Date.now(),tags};
   localStorage.setItem('ab-suite:signals:'+id,JSON.stringify(snapshot));channel?.postMessage(snapshot);
   if(adapter.project){const project=JSON.stringify(adapter.project());if(project!==lastProject){localStorage.setItem('ab-suite:project:'+id,project);lastProject=project}}
   saveError=false;
  }catch(error){saveError=true;console.warn('AB Suite: no se pudo publicar o guardar el ejercicio',error.message)}
 }
 document.addEventListener('DOMContentLoaded',async()=>{
  // Load after native styles so one visual system wins consistently.
  document.head.append(document.querySelector('link[href="/suite/shell.css"]'));
  document.body.dataset.suiteApp=id;
  await import('/suite/shell.js');
  await publish();timer=setInterval(publish,750);
 });
 window.addEventListener('pagehide',()=>{clearInterval(timer);channel?.close()});
})();
