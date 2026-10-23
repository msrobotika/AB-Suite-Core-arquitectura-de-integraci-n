
/* SPDX-License-Identifier: MIT — MS ROBOTIKA 2026. Educational virtual Ladder simulator. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ABKopEngine=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const IDENT=/^[A-Z][A-Z0-9_]{0,31}$/;const KINDS=['NO','NC'];const OPS=['COIL','SET','RESET','TON'];
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function validName(n){return typeof n==='string'&&IDENT.test(n)&&!['__PROTO__','CONSTRUCTOR','PROTOTYPE'].includes(n);}
function ensure(p,m){if(!p)throw Error(m);}
function validate(model){
 ensure(model&&typeof model==='object'&&!Array.isArray(model)&&model.schema===1,'Proyecto incompatible: se requiere schema 1.');
 ensure(typeof model.name==='string'&&model.name.trim()&&model.name.length<=100,'Nombre de proyecto inválido.');
 ensure(model.inputs&&typeof model.inputs==='object'&&!Array.isArray(model.inputs)&&Object.keys(model.inputs).length<=60,'Entradas inválidas.');
 ensure(model.outputs&&typeof model.outputs==='object'&&!Array.isArray(model.outputs)&&Object.keys(model.outputs).length<=60,'Salidas inválidas.');
 for(const group of [model.inputs,model.outputs])for(const [k,v]of Object.entries(group))ensure(validName(k)&&typeof v==='boolean','Variable o valor booleano inválido: '+k);
 ensure(!Object.keys(model.inputs).some(k=>own(model.outputs,k)),'Una señal no puede ser a la vez entrada y salida.');
 ensure(Array.isArray(model.rungs)&&model.rungs.length>=1&&model.rungs.length<=40,'Se requieren entre 1 y 40 redes.');
 const rungIds=new Set(),writers=new Map(),tonTargets=new Set();
 for(const r of model.rungs){
  ensure(r&&validName(r.id)&&!rungIds.has(r.id),'ID de red duplicado o inválido.');rungIds.add(r.id);
  ensure(typeof r.name==='string'&&r.name.length<=100,'Nombre de red inválido.');
  ensure(OPS.includes(r.operation),'Operación de bobina inválida.');
  ensure(validName(r.target),'Destino inválido.');
  ensure(Array.isArray(r.branches)&&r.branches.length>=1&&r.branches.length<=8,'Se requieren entre 1 y 8 ramas.');
  for(const branch of r.branches){ensure(Array.isArray(branch)&&branch.length>=1&&branch.length<=12,'Cada rama debe tener de 1 a 12 contactos.');for(const c of branch)ensure(c&&KINDS.includes(c.kind)&&validName(c.variable),'Contacto inválido.');}
  if(r.operation==='TON'){
   ensure(!own(model.inputs,r.target)&&!own(model.outputs,r.target),'El temporizador necesita un destino propio.');
   ensure(Number.isInteger(r.preset)&&r.preset>=1&&r.preset<=3600,'TON: preselección entre 1 y 3600 ciclos.');tonTargets.add(r.target);
  }else ensure(own(model.outputs,r.target),'La bobina debe apuntar a una salida declarada.');
  const prev=writers.get(r.target)||[];prev.push(r.operation);writers.set(r.target,prev);
 }
 for(const [name,ops]of writers){ensure(ops.length<=2,'Varias redes escriben el mismo destino: '+name);if(ops.length===2)ensure(ops.includes('SET')&&ops.includes('RESET'),'Solo se admite un par SET/RESET en '+name);}
 for(const r of model.rungs)for(const branch of r.branches)for(const c of branch){
  const ok=own(model.inputs,c.variable)||own(model.outputs,c.variable)||(c.variable.endsWith('_DONE')&&tonTargets.has(c.variable.slice(0,-5)));
  ensure(ok,'Contacto sin variable declarada: '+c.variable);
 }
 return true;
}
const sample=()=>({schema:1,name:'Marcha-paro de cinta · ejemplo didáctico',description:'Enclavamiento clásico + temporizador TON, sin conexión a máquinas.',
inputs:{ESTOP_OK:true,STOP_OK:true,START:false},outputs:{MOTOR:false,PILOTO_VERDE:false,ALARMA:false},rungs:[
{id:'R1',name:'Marcha / paro con autoenclavamiento',operation:'COIL',target:'MOTOR',branches:[
 [{kind:'NO',variable:'ESTOP_OK'},{kind:'NO',variable:'STOP_OK'},{kind:'NO',variable:'START'}],
 [{kind:'NO',variable:'ESTOP_OK'},{kind:'NO',variable:'STOP_OK'},{kind:'NO',variable:'MOTOR'}]]},
{id:'R2',name:'Retardo de confirmación: 3 ciclos',operation:'TON',target:'T1',preset:3,branches:[[{kind:'NO',variable:'MOTOR'}]]},
{id:'R3',name:'Piloto listo tras retardo',operation:'COIL',target:'PILOTO_VERDE',branches:[[{kind:'NO',variable:'T1_DONE'}]]},
{id:'R4',name:'Aviso de circuito de emergencia abierto',operation:'COIL',target:'ALARMA',branches:[[{kind:'NC',variable:'ESTOP_OK'}]]}
]});
function initial(model){validate(model);const timers=Object.create(null);for(const r of model.rungs)if(r.operation==='TON')timers[r.target]={count:0,done:false};return{scan:0,outputs:{...model.outputs},timers,traces:[],status:'ready'};}
function bit(v,s){if(own(v,s))return v[s]===true;if(s.endsWith('_DONE')&&own(v,s.slice(0,-5)))return v[s.slice(0,-5)]===true;return false;}
function traceRung(r,signals){return r.branches.map(branch=>({contacts:branch.map(c=>({kind:c.kind,variable:c.variable,value:bit(signals,c.variable),pass:c.kind==='NO'?bit(signals,c.variable):!bit(signals,c.variable)}))})).map(br=>({...br,pass:br.contacts.every(c=>c.pass)}));}
function scan(model,state,overrides={}){
 validate(model);ensure(state&&typeof state.scan==='number'&&state.scan>=0,'Estado de simulación inválido.');
 const inputs={...model.inputs};for(const [k,v]of Object.entries(overrides)){ensure(own(inputs,k)&&typeof v==='boolean','Entrada externa inválida: '+k);inputs[k]=v;}
 let outputs={...state.outputs};for(const o of Object.keys(model.outputs))if(typeof outputs[o]!=='boolean')outputs[o]=false;
 const timers=Object.create(null);for(const r of model.rungs)if(r.operation==='TON'){const prev=state.timers?.[r.target];timers[r.target]={count:Math.max(0,Math.min(r.preset,Number.isInteger(prev?.count)?prev.count:0)),done:prev?.done===true};}
 const traces=[];
 for(const r of model.rungs){
  const signals=Object.assign(Object.create(null),inputs,outputs);
  for(const [name,t]of Object.entries(timers))signals[name+'_DONE']=t.done;
  const branches=traceRung(r,signals),energized=branches.some(b=>b.pass),before=r.operation==='TON'?timers[r.target].done:outputs[r.target];
  if(r.operation==='COIL')outputs[r.target]=energized;
  if(r.operation==='SET'&&energized)outputs[r.target]=true;
  if(r.operation==='RESET'&&energized)outputs[r.target]=false;
  if(r.operation==='TON'){const t=timers[r.target];t.count=energized?Math.min(r.preset,t.count+1):0;t.done=t.count>=r.preset;}
  const after=r.operation==='TON'?timers[r.target].done:outputs[r.target];
  traces.push({id:r.id,name:r.name,target:r.target,operation:r.operation,energized,branches,before,after,count:r.operation==='TON'?timers[r.target].count:null});
 }
 return{scan:state.scan+1,outputs,timers,traces,status:'scanned'};
}
function diagnostics(model){validate(model);const issues=[],written=new Set();for(const r of model.rungs){
 for(const branch of r.branches)for(const c of branch){const known=own(model.inputs,c.variable)||written.has(c.variable)||(c.variable.endsWith('_DONE')&&written.has(c.variable.slice(0,-5)));
 if(!known&&own(model.outputs,c.variable))issues.push(`${r.id}: ${c.variable} depende del valor inicial o del ciclo anterior; revisa el orden de redes.`);
 }
 written.add(r.target);
 }return [...new Set(issues)];}
function scenario(model,steps){validate(model);ensure(Array.isArray(steps)&&steps.length<=500,'Máximo 500 ciclos de escenario.');let state=initial(model);let inputs={...model.inputs};const history=[];for(let i=0;i<steps.length;i++){const step=steps[i];ensure(step&&typeof step==='object'&&!Array.isArray(step),'Paso de escenario inválido.');const patch=step.inputs||{};ensure(patch&&typeof patch==='object'&&!Array.isArray(patch),'Entradas del paso inválidas.');for(const [k,v]of Object.entries(patch)){ensure(own(inputs,k)&&typeof v==='boolean','Entrada del paso inválida: '+k);inputs[k]=v;}state=scan(model,state,inputs);const expected=step.expect||{};for(const[k,v]of Object.entries(expected))ensure(own(state.outputs,k)&&typeof v==='boolean','Expectativa inválida: '+k);const ok=Object.entries(expected).every(([k,v])=>state.outputs[k]===v);history.push({index:i+1,inputs:{...inputs},outputs:{...state.outputs},timers:JSON.parse(JSON.stringify(state.timers)),ok});}return{ok:history.every(x=>x.ok),state,history};}
return Object.freeze({validate,sample,initial,scan,traceRung,diagnostics,scenario});
});
