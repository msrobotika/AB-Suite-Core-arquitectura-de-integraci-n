/* SPDX-License-Identifier: MIT · Copyright (c) 2026 MS ROBOTIKA */
'use strict';
const $ = id => document.getElementById(id);
const fragment = new URLSearchParams(location.hash.slice(1));
const freshToken = fragment.get('token') || '';
if(freshToken) sessionStorage.setItem('ab-serial-token', freshToken);
const token = freshToken || sessionStorage.getItem('ab-serial-token') || '';
history.replaceState(null,'',location.pathname);
let events=[], lastSeq=-1, selected=null, uiMode='demo', working=false, hasError=false;
const el=(tag,text,cl)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);if(cl)e.className=cl;return e;};
async function api(path,body){
  const response=await (window.ABSuite?.fetch ?? window.fetch.bind(window))(path,{method:body===undefined?'GET':'POST',cache:'no-store',
    headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
    body:body===undefined?undefined:JSON.stringify(body)});
  const raw=await response.json();if(!response.ok)throw new Error(raw.error||`HTTP ${response.status}`);return raw;
}
function message(s,error=false){$('message').textContent=s;$('message').classList.toggle('error',error);}
function pickMode(mode){if(working)return;uiMode=mode;
 $('demo-mode').classList.toggle('active',mode==='demo');$('serial-mode').classList.toggle('active',mode==='serial');
 $('lab-controls').classList.toggle('hidden',mode!=='demo');$('serial-controls').classList.toggle('hidden',mode!=='serial');
 $('authorized').checked=false;
 message(mode==='demo'?'Laboratorio preparado. No abre ningún puerto.':'Selecciona un puerto detectado y confirma el acceso.');
 if(mode==='serial')scanPorts();
}
$('demo-mode').addEventListener('click',()=>pickMode('demo'));
$('serial-mode').addEventListener('click',()=>pickMode('serial'));
async function scanPorts(){try{const ports=(await api('/api/ports')).ports;const select=$('serial-port');select.replaceChildren();
  if(!ports.length){const opt=el('option','No hay puertos (o falta pySerial)');opt.value='';select.append(opt);}
  for(const p of ports){const opt=el('option',`${p.device} · ${p.description}`);opt.value=p.device;select.append(opt);}
  message(ports.length?`${ports.length} puerto(s) detectados. No se ha abierto ninguno.`:'No hay puertos disponibles. Instala pyserial para recepción física.');
 }catch(e){message(e.message,true);}}
$('scan-ports').addEventListener('click',scanPorts);
$('start').addEventListener('click',async()=>{
 if(working)return;working=true;
 try{
  if(uiMode==='demo'){await api('/api/demo/start',{});message('Laboratorio RTU en ejecución: tramas demostrativas, CRC y excepciones.');}
  else{if(!$('serial-port').value||!$('authorized').checked)throw new Error('Selecciona y autoriza expresamente el puerto serie.');
    await api('/api/serial/open',{port:$('serial-port').value,baud:Number($('baud').value),parity:$('parity').value,
      data_bits:Number($('data-bits').value),stop_bits:Number($('stop-bits').value),authorized:true});
    message('Puerto abierto en recepción. DTR/RTS pueden depender del adaptador.');
  }
  await refresh();
 }catch(e){message(e.message,true);working=false;}
});
$('stop').addEventListener('click',async()=>{try{await api('/api/stop',{});message('Captura detenida. Los registros siguen disponibles para exportar.');await refresh();}catch(e){message(e.message,true);}});
$('clear').addEventListener('click',async()=>{if(events.length&&!window.confirm('¿Vaciar las tramas registradas? La captura continuará si está activa. Exporta los datos antes si los necesitas.'))return;try{await api('/api/clear',{});selected=null;lastSeq=-1;await refresh();message('Tramas vaciadas. La captura no se ha interrumpido.');}catch(e){message(e.message,true);}});
$('reset-view').addEventListener('click',()=>{$('filter').value='all';$('search').value='';selected=null;renderTable();renderDetails();message('Vista restaurada: sin filtros y sin trama seleccionada. No se han borrado datos.');});
$('new-session').addEventListener('click',async()=>{
 if(!window.confirm('¿Iniciar una sesión desde cero? Se detendrá la captura activa y se borrarán las tramas no exportadas. Los ajustes del puerto no se eliminarán.'))return;
 $('new-session').disabled=true;
 try{await api('/api/stop',{});await api('/api/clear',{});working=false;selected=null;lastSeq=-1;$('filter').value='all';$('search').value='';$('authorized').checked=false;await refresh();renderTable();renderDetails();message('Sesión reiniciada: captura detenida, contadores y tramas a cero. Configuración conservada.');}
 catch(error){message('No se ha completado la puesta a cero: '+error.message,true);}
 finally{$('new-session').disabled=false;}
});
for(const name of ['filter','search'])$(name).addEventListener('input',renderTable);
function filterEvents(){const filter=$('filter').value,search=$('search').value.trim().toLowerCase();
 return events.filter(r=>(filter==='all'||(filter==='valid'?r.valid:!r.valid)) && (!search||[r.hex,r.detail,r.function_name,r.kind,String(r.unit??'')].some(x=>String(x||'').toLowerCase().includes(search))));}
function renderTable(){const visible=filterEvents().slice(-160).reverse();const tbody=$('rows');tbody.replaceChildren();
 for(const rec of visible){const tr=el('tr');tr.classList.toggle('selected',selected?.id===rec.id);
  const time=rec.time?new Date(rec.time).toLocaleTimeString('es-ES',{hour12:false}):'—';
  const columns=[time,rec.source,rec.unit??'—',rec.function===null?'—':`FC${String(rec.function).padStart(2,'0')}`,rec.hex||rec.detail];
  for(let i=0;i<columns.length;i++){const td=el('td',columns[i],i===4?'mono frame-bytes':i===0?'mono':'');tr.append(td);}
  const td=el('td');td.append(el('span',rec.crc_ok?'OK':'ERROR','crc-pill'+(rec.crc_ok?'':' fail')));tr.append(td);
  tr.addEventListener('click',()=>{selected=rec;renderTable();renderDetails();});tbody.append(tr);
 }
 if(!visible.length){const tr=el('tr');const td=el('td','No hay tramas que coincidan. Inicia el laboratorio o cambia el filtro.','empty-row');td.colSpan=6;tr.append(td);tbody.append(tr);}
 $('table-counter').textContent=String(events.length);$('count-label').textContent=`${visible.length} visibles de ${events.length} retenidos`;
}
function renderDetails(){const rec=selected;$('values-strip').replaceChildren();
 if(!rec){$('frame-id').textContent='SIN SELECCIÓN';$('hex-len').textContent='—';$('hex-detail').textContent='Selecciona una trama para inspeccionar sus bytes.';
  for(const id of ['detail-function','detail-kind','detail-crc'])$(id).textContent='—';$('detail-description').textContent='Esperando datos de captura';return;}
 $('frame-id').textContent=`TRAMA #${rec.id}`;$('hex-len').textContent=`${rec.length} BYTE(S)`;$('hex-detail').textContent=rec.hex||'Sin bytes disponibles';
 $('detail-function').textContent=rec.function_name||'—';$('detail-kind').textContent=rec.kind||'—';
 $('detail-description').textContent=rec.detail||'Sin descripción';$('detail-crc').textContent=rec.crc_ok?`VÁLIDO · ${rec.crc_received}`:`INVÁLIDO · ${rec.crc_received||'—'} / ${rec.crc_calculated||'—'}`;
 if(rec.values?.length){for(const [i,v] of rec.values.slice(0,40).entries())$('values-strip').append(el('span',`${i}: ${v}`,'value-chip'));
  if(rec.values.length>40)$('values-strip').append(el('span',`+${rec.values.length-40} valores`,'value-chip'));
 }
}
function drawGraph(){const svg=$('traffic-chart');svg.replaceChildren();const graph=events.slice(-30);const ns='http://www.w3.org/2000/svg';
 function node(tag,attrs={},text){const n=document.createElementNS(ns,tag);for(const [key,val] of Object.entries(attrs))n.setAttribute(key,String(val));if(text!==undefined)n.textContent=text;return n;}
 for(let i=0;i<5;i++){let y=30+34*i;svg.append(node('line',{x1:18,x2:726,y1:y,y2:y,stroke:'#29414c','stroke-dasharray':'3 7'}));}
 if(!graph.length){svg.append(node('text',{x:370,y:105,'text-anchor':'middle',fill:'#718b98','font-size':13},'Sin tráfico. Inicia el laboratorio.'));return;}
 const width=708/30;for(let i=0;i<graph.length;i++){const x=18+(30-graph.length+i)*width;const good=graph[i].valid;
   svg.append(node('rect',{x,y:good?54:85,width:width*0.65,height:good?103:72,rx:3,fill:good?'#53d6ad':'#e98e81',opacity:good?.88:.95}));
 }
 svg.append(node('text',{x:18,y:188,fill:'#708d9c','font-size':10},'ANTERIORES'));
 svg.append(node('text',{x:722,y:188,fill:'#708d9c','font-size':10,'text-anchor':'end'},'RECIENTES'));
}
let suiteStats=null;
window.ABSuite?.register({snapshot:()=>suiteStats});
function renderState(state){suiteStats={frames:state.events?.length??0,capturing:state.mode!=="detenido",crcErrors:(state.events??[]).filter(e=>e.crc_ok===false).length};$('mode-badge').classList.remove('error');const active=state.mode!=='detenido';working=active;
 $('mode-badge').classList.toggle('active',active);$('mode-badge').textContent=active?(state.mode==='laboratorio'?'● LABORATORIO ACTIVO':'● PUERTO RX ABIERTO'):'● EN ESPERA';
 $('start').disabled=active;$('stop').disabled=!active;
 $('demo-mode').disabled=active;$('serial-mode').disabled=active;
 $('source-label').textContent=active?state.device:'Ninguna';$('link-label').textContent=active?'Capturando':'Desconectado';
 events=state.events;let good=events.filter(x=>x.valid).length,errors=events.filter(x=>!x.valid).length;
 $('kpi-frames').textContent=String(state.count);$('kpi-valid').textContent=String(good);$('kpi-errors').textContent=String(state.errors);
 $('kpi-bytes').textContent=state.rx_bytes.toLocaleString('es-ES');
 const newest=events.at(-1);
 if(newest && lastSeq!==newest.id){lastSeq=newest.id;selected=newest;renderTable();renderDetails();drawGraph();}
 else if(!events.length){selected=null;lastSeq=-1;renderTable();renderDetails();drawGraph();}
 else renderTable();
}
async function refresh(){try{const state=await api('/api/state');renderState(state);hasError=false;}
 catch(error){suiteStats=null;if(!hasError){message('No se pudo consultar el servicio: '+error.message,true);hasError=true;}$('mode-badge').textContent='● SIN SERVICIO';$('mode-badge').classList.add('error');}}
function download(name,text,mime){const blob=new Blob([text],{type:mime});const uri=URL.createObjectURL(blob);const a=el('a');a.href=uri;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(uri),1200);}
const csvcell=x=>'"'+String(x??'').replaceAll('"','""')+'"';
$('export-json').addEventListener('click',()=>{download('AB-Serial-capturas.json',JSON.stringify({schema:1,created_utc:new Date().toISOString(),events},null,2),'application/json');message(`${events.length} eventos exportados a JSON.`);});
$('export-csv').addEventListener('click',()=>{const rows=[['time_utc','id','source','unit','function','kind','crc_ok','length','hex','detail'].join(',')];
 for(const r of events)rows.push([r.time,r.id,r.source,r.unit,r.function,r.kind,r.crc_ok,r.length,r.hex,r.detail].map(csvcell).join(','));
 download('AB-Serial-capturas.csv','\uFEFF'+rows.join('\r\n')+'\r\n','text/csv;charset=utf-8');message(`${events.length} eventos exportados a CSV.`);});
refresh();setInterval(refresh,1100);
