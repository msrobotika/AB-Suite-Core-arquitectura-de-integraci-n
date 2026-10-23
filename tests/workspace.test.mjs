import {test} from 'node:test';
import assert from 'node:assert/strict';
import {startWorkspace,appIds,integrateHTML} from '../src/workspace-server.js';
import {blankProject,newWidget,validateProject,isAlarm} from '../apps/scada/src/hmi-model.js';
import {SCHEMA,validSnapshot,quality,signalValue} from '../web/signal-contract.js';
test('HMI: validación, límites, valores no finitos e IDs duplicados',()=>{
 const p=blankProject();p.screens[0].widgets.push(newWidget('alarm'));assert.equal(validateProject(p).screens.length,1);
 const q=structuredClone(p);q.screens[0].widgets.push({...q.screens[0].widgets[0]});assert.throws(()=>validateProject(q),/duplicado/);
 p.screens[0].widgets[0].threshold=Infinity;assert.throws(()=>validateProject(p),/finito/);
 assert.throws(()=>newWidget('script'));assert.throws(()=>validateProject({schema:'unknown'}));
});
test('HMI: alarmas booleanas y numéricas con condiciones explícitas',()=>{
 assert.equal(isAlarm({comparison:'gte',threshold:1},true),true);assert.equal(isAlarm({comparison:'eq',threshold:1},false),false);assert.equal(isAlarm({comparison:'lte',threshold:5},4.2),true);
});
test('Señales: la pérdida de fuente nunca se convierte en cero',()=>{
 const s={schema:SCHEMA,source:'plc',instance:'one',at:10000,tags:{'outputs.Q0.0':false,AI0:23}};
 assert.equal(validSnapshot(s),true);assert.equal(quality(s,15001),'stale');
 assert.deepEqual(signalValue({plc:s},'plc','AI0',16000),{quality:'stale',value:null});
 assert.deepEqual(signalValue({plc:s},'plc','missing',10000),{quality:'missing',value:null});
 assert.deepEqual(signalValue({plc:s},'plc','outputs.Q0.0',10000),{quality:'good',value:false});
 assert.equal(validSnapshot({...s,tags:{AI0:NaN}}),false);
});
test('Las rutas de activos nativos quedan dentro de su aplicación',()=>{
 const html=integrateHTML('<head><script src="/app.js"></script><a href="//example.test">External</a></head>','modbus');
 assert.match(html,/src="\/apps\/modbus\/app.js"/);assert.match(html,/href="\/\/example.test"/);assert.match(html,/suite-session.js/);
});
test('Una entrada web, MIME HTML correcto y secretos fuera de los archivos públicos',async t=>{
 const suite=await startWorkspace({port:0});t.after(()=>suite.close());
 const home=await fetch(suite.url);assert.match(home.headers.get('content-type'),/text\/html/);
 for(const id of appIds.filter(id=>!['bi','serial','modbus'].includes(id))){const r=await fetch(suite.url+'/apps/'+id+'/');assert.equal(r.status,200,id);const html=await r.text();assert.match(html,/\/suite\/boot.js/);assert.match(html,/suite-session.js/)}
 assert.equal((await fetch(suite.url+'/apps/bi/')).status,503);
 for(const path of ['/suite/../.env','/apps/plc/.git/config','/suite/%2e%2e%2fpackage.json','/apps/unknown/'])assert.equal((await fetch(suite.url+path)).status,404,path);
 assert.equal((await fetch(suite.url,{headers:{Origin:'https://external.test'}})).status,403);
 assert.equal((await fetch(suite.url,{method:'POST'})).status,405);
});
