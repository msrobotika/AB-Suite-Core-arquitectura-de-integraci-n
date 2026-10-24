import {catalog} from './catalog.js';
import {PREFIX,parseSnapshot,quality} from './signal-contract.js';
const sdk=window.ABSuite,app=catalog.find(a=>a.id===sdk.id);
const create=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
document.documentElement.style.setProperty('--suite-accent',app.color);
const bar=create('div',undefined,'suite-bar');bar.setAttribute('role','navigation');bar.setAttribute('aria-label','AB Suite');
const brand=create('a',undefined,'suite-brand');brand.href='/';brand.innerHTML='<span class="suite-mark">ab<span>·</span></span><span>SUITE<small>MS ROBOTIKA</small></span>';
const divider=create('span','/','suite-divider'),badge=create('span',app.mark,'suite-app-mark'),title=create('strong',app.name);
const select=create('select');select.setAttribute('aria-label','Cambiar herramienta');
const placeholder=create('option','Cambiar herramienta…');placeholder.value='';select.append(placeholder);
for(const item of catalog){const option=create('option',item.name);option.value=item.id;select.append(option)}
select.addEventListener('change',()=>{if(select.value)location.href=`/apps/${select.value}/`});
const connections=create('a','Conexiones ↗','suite-action');connections.href='/#connections';connections.target='_blank';connections.rel='noopener';
const help=create('button','Ayuda','suite-action');help.type='button';help.setAttribute('aria-label','Guía de práctica');
const status=create('span','Laboratorio local','suite-status');status.setAttribute('role','status');
bar.append(brand,divider,badge,title,select,connections,help,status);document.body.prepend(bar);
if(sdk.id==='modbus'&&window.ABSuitePLC){const read=create('button','Leer CPU de la suite','suite-action suite-primary');read.type='button';read.onclick=()=>window.dispatchEvent(new CustomEvent('ab-suite:read-plc',{detail:{port:window.ABSuitePLC.modbusPort}}));bar.insertBefore(read,status)}
if(sdk.id==='bi'){
 const record=create('button','Capturar CPU','suite-action suite-primary');record.type='button';let active=false;
 const refresh=state=>{active=state.enabled;record.textContent=active?'Detener captura CPU':state.error?'Reintentar captura CPU':'Capturar CPU';record.setAttribute('aria-pressed',String(active));record.title=state.error??'Añade lecturas reales de la CPU virtual al espacio activo de BI';if(state.error)status.textContent=state.error};
 record.onclick=async()=>{try{const response=await fetch('/suite/bi-capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:!active})});const state=await response.json();if(!response.ok)throw Error(state.error);refresh(state)}catch(error){status.textContent=error.message}};
 fetch('/suite/bi-capture').then(response=>response.json()).then(refresh).catch(()=>{});bar.insertBefore(record,status);
 window.addEventListener('ab-suite:bi-capture-state',event=>refresh(event.detail));
 setInterval(()=>fetch('/suite/bi-capture').then(response=>response.json()).then(refresh).catch(()=>{}),2500);
}
if(sdk.adapter?.project){const transfer=create('button','Enviar al PLC ↗','suite-action suite-primary');transfer.type='button';transfer.disabled=!sdk.adapter.project();setInterval(()=>{transfer.disabled=!sdk.adapter.project()},500);transfer.onclick=()=>sdk.transfer().catch(err=>{status.textContent=err.message});bar.insertBefore(transfer,status)}
const dialog=create('dialog',undefined,'suite-guide');dialog.setAttribute('aria-labelledby','suite-guide-title');
const close=create('button','Cerrar ×','suite-action');close.type='button';close.onclick=()=>dialog.close();
dialog.append(close,create('p',app.area.toUpperCase(),'suite-eyebrow'));
const heading=create('h2',app.name);heading.id='suite-guide-title';dialog.append(heading,create('p',app.detail));
const list=create('ol');for(const text of app.steps){const item=create('li');const label=create('label');const check=create('input');check.type='checkbox';const key=`ab-suite:progress:${app.id}:${list.children.length}`;try{check.checked=localStorage.getItem(key)==='1'}catch{}check.onchange=()=>{try{localStorage.setItem(key,check.checked?'1':'0')}catch{status.textContent='No se pudo guardar el progreso'}};label.append(check,create('span',text));item.append(label);list.append(item)}
dialog.append(list,create('p',app.limit,'suite-limit'));document.body.append(dialog);help.onclick=()=>dialog.showModal();
let prompt=null;
async function checkTransfer(){
 const raw=localStorage.getItem('ab-suite:transfer:plc');
 if(sdk.id!=='plc'||!raw||prompt||!sdk.adapter?.receive)return;
 let packet;try{packet=JSON.parse(raw);if(packet.schema!=='ab-suite.transfer.v1'||Date.now()-packet.at>3600000)return}catch{return}
 prompt=create('dialog',undefined,'suite-guide');prompt.setAttribute('aria-label','Importar proyecto recibido');
 prompt.append(create('h2','Proyecto recibido'),create('p',`Procedencia: ${packet.from.toUpperCase()}. Al cargarlo se sustituye el programa del laboratorio y se reinicia la CPU virtual.`));
 const cancel=create('button','Conservar mi programa','suite-action'),apply=create('button','Cargar en el laboratorio','suite-action suite-primary'),message=create('p');
 cancel.onclick=()=>{localStorage.removeItem('ab-suite:transfer:plc');prompt.close();prompt.remove();prompt=null};
 apply.onclick=async()=>{try{await sdk.adapter.receive(packet.project);localStorage.removeItem('ab-suite:transfer:plc');prompt.close();prompt.remove();prompt=null;status.textContent='Proyecto importado · CPU reiniciada'}catch(err){message.textContent='No se pudo importar: '+err.message}};
 prompt.append(cancel,apply,message);document.body.append(prompt);prompt.showModal();
}
setInterval(()=>{
 const state=parseSnapshot(localStorage.getItem(PREFIX+sdk.id));
 status.textContent=sdk.documentStorageError?'Trabajo sin guardar':sdk.storageError?'No se pudo guardar/publicar':sdk.conflict?'Otra pestaña publica estas señales':quality(state)==='good'?'● Señales disponibles':'Laboratorio local';
 checkTransfer();
},1200);
window.addEventListener('storage',checkTransfer);checkTransfer();

const workspaceStyle=document.createElement('link');workspaceStyle.rel='stylesheet';workspaceStyle.href='/suite/workbench.css';document.head.append(workspaceStyle);await import('/suite/studio-features.js');await import('/suite/workbench.js');await import('/suite/documents.js');
