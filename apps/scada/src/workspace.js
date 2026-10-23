import {blankProject,newWidget,validateProject,isAlarm} from './hmi-model.js';
import {PREFIX,parseSnapshot,signalValue} from '/suite/signal-contract.js';
const $=id=>document.getElementById(id),KEY='ab-suite:hmi-project:v1';
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
let project=blankProject(),screenId,selected=null,preview=false,undo=[],redo=[];
const trends=new Map(),acks=new Set();let recoverError='';
try{const raw=localStorage.getItem(KEY);if(raw)project=validateProject(JSON.parse(raw))}catch{recoverError='El proyecto guardado no es válido. Se mantiene en el almacenamiento hasta que guardes una edición nueva; puedes recuperarlo desde las herramientas del navegador.'}
screenId=project.screens[0].id;
const screen=()=>project.screens.find(s=>s.id===screenId)??project.screens[0];
const widget=()=>screen().widgets.find(w=>w.id===selected);
function notice(text,error=false){$('hmi-notice').textContent=text;$('hmi-notice').classList.toggle('is-error',error)}
function save(){try{localStorage.setItem(KEY,JSON.stringify(project));$('save-state').textContent='Guardado en este navegador'}catch{$('save-state').textContent='No se pudo guardar. Exporta tu proyecto.';notice('Almacenamiento no disponible o lleno. Tu proyecto sigue en memoria: expórtalo para conservarlo.',true)}}
function mutate(fn,message){const before=structuredClone(project);try{fn(project);project=validateProject(project);undo.push(before);if(undo.length>50)undo.shift();redo=[];save();render();notice(message)}catch(error){project=before;notice(error.message,true)}}
function snapshots(){const result={};for(const name of ['plc','kop','scl','grafcet','vision','modbus','serial','bi']){try{const s=parseSnapshot(localStorage.getItem(PREFIX+name));if(s)result[name]=s}catch{}}return result}
function options(){const source=$('widget-source').value,s=snapshots()[source],old=$('available-tags').value;const picker=$('available-tags');picker.replaceChildren(el('option','Seleccionar una señal…'));picker.firstChild.value='';$('tag-names').replaceChildren();for(const key of Object.keys(s?.tags??{}).sort()){const option=el('option',`${key} = ${s.tags[key]}`);option.value=key;picker.append(option);const data=el('option');data.value=key;$('tag-names').append(data)}picker.value=old}
function inspect(){const w=widget();$('properties').hidden=!w;if(!w)return;$('widget-label').value=w.label;$('widget-source').value=w.source;$('widget-tag').value=w.tag;$('widget-unit').value=w.unit;$('widget-threshold').value=w.threshold;$('widget-comparison').value=w.comparison;$('alarm-fields').hidden=w.type!=='alarm';options()}
function render(){
 if(!project.screens.some(s=>s.id===screenId))screenId=project.screens[0].id;
 $('project-name').value=project.name;$('screen-title').textContent=screen().name;$('screen-name').value=screen().name;
 $('undo').disabled=!undo.length;$('redo').disabled=!redo.length;$('remove-screen').disabled=project.screens.length<2||Boolean(screen().widgets.length);
 $('screens').replaceChildren();for(const s of project.screens){const b=el('button',s.name+(s.widgets.length?' · '+s.widgets.length:''));b.type='button';b.setAttribute('aria-current',String(s.id===screenId));b.onclick=()=>{screenId=s.id;selected=null;render()};$('screens').append(b)}
 $('canvas').replaceChildren();$('component-count').textContent=screen().widgets.length+' componentes';
 if(!screen().widgets.length){const empty=el('div',undefined,'hmi-empty');empty.append(el('span','＋'),el('h3','Aquí empieza tu pantalla.'),el('p',preview?'Vuelve a Diseñar para añadir componentes.':'Elige un componente en la paleta. Después vincúlalo a una señal de tu ejercicio.'));$('canvas').append(empty)}
 for(const w of screen().widgets){const card=el('article',undefined,'hmi-widget'+(w.id===selected?' selected':''));card.dataset.widget=w.id;
  const head=el('div',undefined,'widget-head');head.append(el('strong',w.label));if(!preview){const edit=el('button','Editar');edit.type='button';edit.setAttribute('aria-label','Editar '+w.label);edit.onclick=()=>{selected=w.id;render();$('widget-label').focus()};head.append(edit)}
  const content=el('div',undefined,'widget-content'),signal=el('p',`${w.source} / ${w.tag||'Sin vincular'}`,'widget-signal');card.append(head,content,signal);$('canvas').append(card);
 }
 document.body.classList.toggle('hmi-preview',preview);$('design-mode').setAttribute('aria-pressed',String(!preview));$('preview-mode').setAttribute('aria-pressed',String(preview));inspect();updateValues();
}
function updateValues(){
 const sources=snapshots();for(const w of screen().widgets){const card=[...$('canvas').children].find(e=>e.dataset.widget===w.id);if(!card)continue;const root=card.querySelector('.widget-content');root.replaceChildren();const value=signalValue(sources,w.source,w.tag);card.dataset.quality=value.quality;
  if(value.quality!=='good'){root.append(el('strong','—','widget-reading'),el('span',!w.tag?'Vincula una señal':value.quality==='stale'?'Señal caducada · origen sin actualizar':'Sin señal · abre el origen','widget-quality'));continue}
  const v=value.value;
  if(w.type==='indicator'){root.append(el('span',v?'●':'○','widget-indicator'+(v?' active':'')),el('strong',v?'ACTIVA':'INACTIVA','widget-state'));}
  else if(w.type==='value'){root.append(el('strong',typeof v==='boolean'?(v?'1':'0'):v.toLocaleString('es-ES',{maximumFractionDigits:3}),'widget-reading'),el('span',w.unit,'widget-unit'));}
  else if(w.type==='alarm'){const active=isAlarm(w,v);if(!active)acks.delete(w.id);root.append(el('strong',active?'△ Umbral alcanzado':'✓ Dentro del umbral',active?'alarm-active':'alarm-clear'));root.append(el('p',`${Number(v).toLocaleString('es-ES')} ${w.unit} · ${w.comparison==='gte'?'≥':w.comparison==='lte'?'≤':'='} ${w.threshold}`));if(active){const ack=el('button',acks.has(w.id)?'Reconocida':'Reconocer');ack.type='button';ack.disabled=acks.has(w.id);ack.onclick=()=>{acks.add(w.id);updateValues()};root.append(ack)}}
  else if(w.type==='trend'){
   const stamp=sources[w.source].at,key=w.id+':'+w.source+':'+w.tag;let history=trends.get(key)??[];
   if(history.at(-1)?.at!==stamp)history.push({at:stamp,value:Number(v)});history=history.slice(-120);trends.set(key,history);
   const min=Math.min(...history.map(p=>p.value)),max=Math.max(...history.map(p=>p.value)),range=Math.max(max-min,1);
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 400 100');svg.setAttribute('role','img');svg.setAttribute('aria-label',`${w.label}: mínimo ${min}, máximo ${max}, ${history.length} muestras`);
   const line=document.createElementNS(svg.namespaceURI,'polyline');line.setAttribute('points',history.map((p,i)=>`${5+i/Math.max(history.length-1,1)*390},${90-(p.value-min)/range*80}`).join(' '));line.setAttribute('fill','none');line.setAttribute('stroke','currentColor');line.setAttribute('stroke-width','2');svg.append(line);root.append(el('strong',Number(v).toLocaleString('es-ES')+' '+w.unit,'trend-value'),svg,el('small',`Mín ${min.toLocaleString('es-ES')} · Máx ${max.toLocaleString('es-ES')} · ${history.length} muestras · ${history.length>1?Math.round((stamp-history[0].at)/1000):0} s`));
  }
 }
}
$('project-name').onchange=e=>mutate(p=>{p.name=e.target.value.trim()},'Nombre de proyecto actualizado.');
document.querySelectorAll('[data-type]').forEach(button=>{button.onclick=()=>mutate(()=>{const w=newWidget(button.dataset.type);screen().widgets.push(w);selected=w.id},'Componente añadido. Selecciona su origen y señal en el inspector.')});
$('add-screen').onclick=()=>mutate(p=>{const s={id:crypto.randomUUID(),name:'Pantalla '+(p.screens.length+1),widgets:[]};p.screens.push(s);screenId=s.id;selected=null},'Pantalla creada.');
$('rename-screen').onclick=()=>mutate(()=>{screen().name=$('screen-name').value.trim()},'Pantalla renombrada.');
$('remove-screen').onclick=()=>mutate(p=>{if(p.screens.length<2||screen().widgets.length)throw Error('Solo se pueden eliminar pantallas vacías cuando hay otra pantalla');p.screens=p.screens.filter(s=>s.id!==screenId);screenId=p.screens[0].id},'Pantalla vacía eliminada. Puedes deshacer.');
$('properties').onsubmit=e=>{e.preventDefault();mutate(()=>{Object.assign(widget(),{label:$('widget-label').value.trim(),source:$('widget-source').value,tag:$('widget-tag').value.trim(),unit:$('widget-unit').value,threshold:Number($('widget-threshold').value),comparison:$('widget-comparison').value})},'Propiedades aplicadas.')};
$('widget-source').onchange=options;$('available-tags').onfocus=options;$('available-tags').onchange=e=>{$('widget-tag').value=e.target.value};
$('delete-widget').onclick=()=>mutate(()=>{screen().widgets=screen().widgets.filter(w=>w.id!==selected);selected=null},'Componente eliminado. Puedes deshacer.');
$('duplicate-widget').onclick=()=>mutate(()=>{const copy=structuredClone(widget());copy.id=crypto.randomUUID();copy.label+=' · copia';screen().widgets.push(copy);selected=copy.id},'Componente duplicado.');
for(const [button,delta] of [['move-up',-1],['move-down',1]])$(button).onclick=()=>mutate(()=>{const items=screen().widgets,i=items.findIndex(w=>w.id===selected),j=i+delta;if(j<0||j>=items.length)throw Error('El componente ya está en ese extremo');[items[i],items[j]]=[items[j],items[i]]},'Orden actualizado.');
function history(direction){const from=direction==='undo'?undo:redo,to=direction==='undo'?redo:undo;if(!from.length)return;to.push(structuredClone(project));project=from.pop();selected=null;save();render();notice(direction==='undo'?'Cambio deshecho.':'Cambio rehecho.')}
$('undo').onclick=()=>history('undo');$('redo').onclick=()=>history('redo');
$('preview-mode').onclick=()=>{preview=true;render();notice('Vista previa: comprueba tu pantalla con los datos de las otras pestañas.')};$('design-mode').onclick=()=>{preview=false;render();notice('Diseño: selecciona un componente para modificarlo.')};
$('export-project').onclick=()=>{const blob=new Blob([JSON.stringify(project,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=project.name.replace(/[^\p{L}\p{N}_ -]/gu,'').slice(0,70)+'.hmi.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notice('Proyecto HMI exportado.')};
$('import-project').onchange=async e=>{try{const file=e.target.files?.[0];if(!file)return;if(file.size>500000)throw Error('El proyecto supera 500 KB');const next=validateProject(JSON.parse(await file.text()));mutate(()=>{project=next;screenId=project.screens[0].id;selected=null},'Proyecto importado. Puedes deshacer para recuperar el anterior.')}catch(error){notice('No se pudo importar: '+error.message,true)}finally{e.target.value=''}};
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)){e.preventDefault();history(e.shiftKey?'redo':'undo')}});
render();if(recoverError)notice(recoverError,true);setInterval(updateValues,750);
