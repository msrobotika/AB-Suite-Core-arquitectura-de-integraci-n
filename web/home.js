import {catalog} from './catalog.js';
import {PREFIX,parseSnapshot,quality} from './signal-contract.js';
const $=id=>document.getElementById(id),node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
let active='Todas',runtime=null;const samples=[],seen=new Map();
function render(){
 const query=$('search').value.toLocaleLowerCase('es');$('tool-grid').replaceChildren();
 for(const app of catalog.filter(a=>(active==='Todas'||a.area===active)&&`${a.name} ${a.area} ${a.summary} ${a.detail}`.toLocaleLowerCase('es').includes(query))){
  const card=node('article',undefined,'tool-card');card.style.setProperty('--app-accent',app.color);
  const header=node('div',undefined,'tool-card-head');header.append(node('span',app.mark,'tool-mark'),node('span',app.area,'tool-area'));
  const name=node('h3',app.name),summary=node('p',app.summary,'tool-summary'),description=node('p',app.detail,'tool-detail');
  const bottom=node('div',undefined,'tool-card-bottom'),link=node('a','Abrir herramienta ↗','tool-open');link.href=`/apps/${app.id}/`;
  const ready=runtime?.find(a=>a.id===app.id)?.ready??true;
  if(!ready){link.removeAttribute('href');link.textContent='Requiere preparar Python';link.setAttribute('aria-disabled','true')}
  bottom.append(link,node('span',ready?'LOCAL':'SIN MOTOR','tool-local'));card.append(header,name,summary,description,bottom);$('tool-grid').append(card);
 }$('no-results').hidden=Boolean($('tool-grid').children.length);
}
for(const category of ['Todas',...new Set(catalog.map(a=>a.area))]){const b=node('button',category);b.type='button';b.setAttribute('aria-pressed',String(category===active));b.onclick=()=>{active=category;for(const sibling of b.parentElement.children)sibling.setAttribute('aria-pressed',String(sibling===b));render()};$('filters').append(b)}
$('search').oninput=render;render();
try{const response=await fetch('/suite/status');if(!response.ok)throw Error();runtime=(await response.json()).apps;if(runtime.some(a=>!a.ready))$('runtime-note').textContent='Faltan motores Python. Ejecuta node scripts/setup.mjs y reinicia la suite.';render()}catch{$('runtime-note').textContent='No se pudo comprobar el servicio local. Recarga la página.'}
function connections(){
 $('connection-grid').replaceChildren();
 for(const app of catalog.filter(a=>!['scada','bi'].includes(a.id))){
  const snapshot=parseSnapshot(localStorage.getItem(PREFIX+app.id)),state=quality(snapshot);
  const card=node('article',undefined,'connection-card');card.append(node('strong',app.name),node('span',state==='good'?'● Disponible':state==='stale'?'◌ Caducada':'○ Sin señales','signal-'+state));
  const entries=Object.entries(snapshot?.tags??{});card.append(node('p',entries.length?`${entries.length} señales · ${entries.slice(0,3).map(([k,v])=>`${k} = ${v}`).join(' · ')}`:'Abre la herramienta y ejecuta un ejercicio.'));
  if(state==='good'&&seen.get(app.id)!==snapshot.at){seen.set(app.id,snapshot.at);for(const [tag,value] of entries)samples.push({at:new Date(snapshot.at).toISOString(),source:app.id,tag,value});while(samples.length>600)samples.shift()}
  $('connection-grid').append(card);
 }
}
const csvCell=value=>'"'+String(value).replace(/"/g,'""')+'"';
$('export-signals').onclick=()=>{
 if(!samples.length){$('connection-note').textContent='Todavía no hay muestras. Abre un editor en otra pestaña y vuelve aquí.';return}
 const text='\uFEFFtime,source,tag,value\r\n'+samples.map(s=>[s.at,s.source,s.tag,typeof s.value==='boolean'?Number(s.value):s.value].map(csvCell).join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));const a=node('a');a.href=url;a.download='AB-Suite-telemetria.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('connection-note').textContent=`Exportadas ${samples.length} muestras. Puedes importarlas en BI Studio.`;
};connections();setInterval(connections,1000);
