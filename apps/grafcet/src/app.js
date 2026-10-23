
/* SPDX-License-Identifier: MIT · Copyright (c) 2026 MS ROBOTIKA
   Editor interactivo GRAFCET, representación SVG y simulación local. */
(() => {
'use strict';
const E=window.ABGrafcet, $=id=>document.getElementById(id), S='http://www.w3.org/2000/svg';
const PROJECT_KEY='ab-grafcet-studio-project-v1';
const MAX_UNDO=40,MAX_BACK=200;
const copy=x=>JSON.parse(JSON.stringify(x));
let undoStack=[],redoStack=[],simHistory=[];
let model=E.sample(),state=E.initialState(model),chosen={type:'stage',id:'E1'},events=[],timer=null,drag=null;
const stamp=()=>new Date().toLocaleTimeString('es-ES',{hour12:false});
function notify(message,kind='info'){$('notice').textContent=message;$('notice').classList.toggle('error',kind==='error');}
function log(message,kind='info',detail=''){
  events.unshift({date:new Date().toISOString(),time:stamp(),message,kind,detail});events=events.slice(0,150);renderHistory();
}
function persist(){try{localStorage.setItem(PROJECT_KEY,JSON.stringify(model));}catch(_){/* almacenamiento deshabilitado */}}
function stop(){if(timer){clearInterval(timer);timer=null;$('run').textContent='▷ Auto · 1s';$('run').classList.remove('primary');}}
function replaceModel(next,notice){stop();E.validateModel(next);undoStack.push(copy(model));if(undoStack.length>MAX_UNDO)undoStack.shift();redoStack=[];simHistory=[];model=copy(next);state=E.initialState(model);chosen={type:'stage',id:model.stages[0].id};persist();renderAll();log('Proyecto inicializado','info',notice);notify(notice);}
function saveEdited(next,message){
  try{E.validateModel(next);stop();undoStack.push(copy(model));if(undoStack.length>MAX_UNDO)undoStack.shift();redoStack=[];simHistory=[];model=next;state=E.initialState(model);persist();renderAll();log(message,'info','La simulación se reinicia después de modificar el esquema.');notify(message);}catch(ex){notify(ex.message,'error');}
}
function undoEdit(direction){
  stop();const source=direction==='undo'?undoStack:redoStack;
  const dest=direction==='undo'?redoStack:undoStack;
  if(!source.length){notify('No quedan modificaciones que '+(direction==='undo'?'deshacer.':'rehacer.'));return;}
  dest.push(copy(model));if(dest.length>MAX_UNDO)dest.shift();
  model=source.pop();state=E.initialState(model);simHistory=[];
  chosen={type:'stage',id:model.stages[0].id};persist();renderAll();
  $('sim-message').textContent='Esquema restaurado; simulación reiniciada.';
  log(direction==='undo'?'Modificación deshecha':'Modificación rehecha');
  notify(direction==='undo'?'Se restauró la versión anterior del esquema.':'Modificación rehecha correctamente.');
}
function backStep(){
  stop();if(!simHistory.length){notify('No hay más ciclos que retroceder.');return;}
  const snapshot=simHistory.pop();state=snapshot.state;model.inputs=snapshot.inputs;
  persist();renderDiagram();renderMetrics();renderOutputs();renderInputs();renderTransitionTable();
  $('sim-message').textContent='Restaurado el estado anterior al último avance.';
  $('sim-message').classList.remove('warn');
  log('Ciclo anterior recuperado','info','Marcado: '+state.active.join(', '));
  notify('Simulación retrocedida un ciclo, con sus entradas anteriores.');
}
function node(tag,attrs={},txt){const x=document.createElementNS(S,tag);for(const [k,v] of Object.entries(attrs))x.setAttribute(k,String(v));if(txt!==undefined)x.textContent=String(txt);return x;}
function html(tag,txt,cls){const x=document.createElement(tag);if(txt!==undefined)x.textContent=String(txt);if(cls)x.className=cls;return x;}
function byId(id){return model.stages.find(x=>x.id===id);}
function center(ids){const p=ids.map(byId).filter(Boolean);return {x:p.reduce((n,s)=>n+s.x,0)/p.length,y:p.reduce((n,s)=>n+s.y,0)/p.length};}
function geometry(t){const from=center(t.from),to=center(t.to),back=to.y<=from.y+35;return {from,to,back,x:back?650:(from.x+to.x)/2,y:(from.y+to.y)/2};}
function arrow(svg,x1,y1,x2,y2,active,back=false){
  const stroke=active?'#139573':'#a6bac6';let d;
  if(back){const pathX=Math.max(x1,x2,660);d=`M${x1} ${y1} L${pathX} ${y1} L${pathX} ${y2} L${x2} ${y2}`;}
  else d=`M${x1} ${y1} L${x2} ${y2}`;
  svg.append(node('path',{d,fill:'none',stroke,'stroke-width':active?2.8:1.8,'marker-end':'url(#arrowhead)','stroke-linejoin':'round'}));
}
function renderDiagram(){
  const svg=$('diagram');svg.replaceChildren();let maxY=Math.max(760,...model.stages.map(s=>s.y+80));
  const viewHeight=Math.max(810,maxY+50);svg.setAttribute('viewBox',`0 0 850 ${viewHeight}`);
  svg.style.height=Math.max(610,viewHeight*0.75)+'px';
  const defs=node('defs'),marker=node('marker',{id:'arrowhead',viewBox:'0 0 10 10',refX:8,refY:5,markerWidth:5,markerHeight:5,orient:'auto-start-reverse'});
  marker.append(node('path',{d:'M0 0 L10 5 L0 10',fill:'#8fa9b6'}));defs.append(marker);
  const grid=node('pattern',{id:'grid',width:24,height:24,patternUnits:'userSpaceOnUse'});grid.append(node('circle',{cx:1,cy:1,r:.7,fill:'#d9e3e8'}));defs.append(grid);svg.append(defs);
  svg.append(node('rect',{width:850,height:viewHeight,fill:'url(#grid)'}));
  const previews=E.preview(model,state),active=new Set(state.active);
  for(const t of model.transitions){
    const g=geometry(t),on=previews.find(x=>x.id===t.id).enabled;
    for(const id of t.from){const p=byId(id);arrow(svg,g.back?p.x+67:p.x,g.back?p.y:p.y+32,g.back?g.x-34:g.x,g.back?g.y:g.y-13,on,false);}
    for(const id of t.to){const p=byId(id);arrow(svg,g.x,g.y+13,g.back?p.x+67:p.x,g.back?p.y:p.y-32,on,g.back);}
  }
  for(const s of model.stages){
    const on=active.has(s.id),selected=chosen.type==='stage'&&chosen.id===s.id;
    const g=node('g',{class:'stage',transform:`translate(${s.x} ${s.y})`,tabindex:0,role:'button','aria-label':`Etapa ${s.id}, ${s.name}${on?', activa':''}`,'data-id':s.id});
    if(selected)g.append(node('rect',{x:-74,y:-39,width:148,height:78,rx:11,fill:'#d9f4e9','fill-opacity':.7,stroke:'#77d2b3','stroke-width':1.5}));
    g.append(node('rect',{class:'stage-box',x:-66,y:-32,width:132,height:64,rx:7,fill:on?'#14866d':'#fff',stroke:on?'#0e8066':'#9eb7c3','stroke-width':s.initial?3:2}));
    if(s.initial)g.append(node('rect',{x:-61,y:-27,width:122,height:54,rx:4,fill:'none',stroke:on?'#a9f6d7':'#94abba','stroke-width':1.1}));
    g.append(node('text',{x:0,y:-7,'text-anchor':'middle',fill:on?'white':'#2b5262','font-size':14,'font-family':'Consolas,monospace','font-weight':800},s.id));
    let label=s.name.length>21?s.name.slice(0,20)+'…':s.name;
    g.append(node('text',{x:0,y:13,'text-anchor':'middle',fill:on?'#d7ffed':'#718b9a','font-size':11},label));
    if(s.actions.length){
      const action=node('g',{transform:'translate(80 -22)'});const acWidth=178;
      const aHeight=Math.min(s.actions.length,3)*19+8;
      action.append(node('rect',{x:0,y:0,width:acWidth,height:aHeight,rx:6,fill:on?'#e4f7ee':'#fff',stroke:on?'#a8e5c7':'#dce7ec'}));
      s.actions.slice(0,3).forEach((item,i)=>action.append(node('text',{x:10,y:18+i*19,'font-size':9.5,fill:on?'#0c795f':'#8097a4','font-family':'Consolas,monospace'},item)));
      g.append(action);
    }
    g.addEventListener('click',()=>select('stage',s.id));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select('stage',s.id);}});
    g.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={id:s.id,x0:s.x,y0:s.y,mouseX:e.clientX,mouseY:e.clientY,group:g,moved:false};});
    svg.append(g);
  }
  for(const t of model.transitions){
    const g=geometry(t),on=previews.find(x=>x.id===t.id).enabled,selected=chosen.type==='transition'&&chosen.id===t.id;
    const el=node('g',{class:'transition',tabindex:0,role:'button','aria-label':`Transición ${t.id} ${t.condition}`,'data-id':t.id});
    if(selected)el.append(node('rect',{x:g.x-31,y:g.y-17,width:62,height:34,rx:6,fill:'#fff2de',stroke:'#eabc75'}));
    el.append(node('rect',{class:'transition-bar',x:g.x-24,y:g.y-6,width:48,height:12,rx:2,fill:on?'#e0a346':'#7794a5',stroke:on?'#bd8127':'#68899b','stroke-width':1.3}));
    el.append(node('text',{x:g.x-34,y:g.y+4,'text-anchor':'end','font-size':11,'font-weight':800,fill:'#506c7a'},t.id));
    const text=t.condition.length>26?t.condition.slice(0,25)+'…':t.condition;
    el.append(node('text',{x:g.x+36,y:g.y+4,'font-family':'Consolas,monospace','font-size':10,fill:on?'#b07e37':'#718b9b'},text));
    el.addEventListener('click',()=>select('transition',t.id));
    el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select('transition',t.id);}});
    svg.append(el);
  }
  $('diagram-details').textContent=`${model.stages.length} etapas · ${model.transitions.length} transiciones · ${model.stages.filter(s=>s.initial).length} inicial(es)`;
  $('select-info').textContent=chosen.id?`${chosen.type==='stage'?'Etapa':'Transición'} ${chosen.id} seleccionada`:'Selecciona un elemento';
}
function svgPoint(event){const svg=$('diagram');const p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;const m=svg.getScreenCTM();if(!m)return {x:0,y:0};return p.matrixTransform(m.inverse());}
function onDrag(event){if(!drag)return;const svg=$('diagram'),m=svg.getScreenCTM();if(!m)return;
  const scaleX=m.a||1,scaleY=m.d||1;const dx=(event.clientX-drag.mouseX)/scaleX,dy=(event.clientY-drag.mouseY)/scaleY;
  if(Math.abs(dx)+Math.abs(dy)>4)drag.moved=true;
  if(drag.moved)drag.group.setAttribute('transform',`translate(${Math.max(70,Math.min(800,drag.x0+dx))} ${Math.max(65,Math.min(2750,drag.y0+dy))})`);
}
function endDrag(event){if(!drag)return;const d=drag;drag=null;if(!d.moved)return;const svg=$('diagram'),m=svg.getScreenCTM();if(!m)return;
  const dx=(event.clientX-d.mouseX)/(m.a||1),dy=(event.clientY-d.mouseY)/(m.d||1);
  undoStack.push(copy(model));if(undoStack.length>MAX_UNDO)undoStack.shift();redoStack=[];simHistory=[];
  const s=byId(d.id);s.x=Math.round(Math.max(70,Math.min(800,d.x0+dx))/10)*10;s.y=Math.round(Math.max(65,Math.min(2750,d.y0+dy))/10)*10;
  persist();renderDiagram();renderTransitionTable();log('Etapa recolocada','info',`${d.id} → (${s.x}, ${s.y})`);
}
function select(type,id){chosen={type,id};renderDiagram();renderInspector();}
function field(label,id,value,help='',opts={}){const l=html('label',label);l.htmlFor=id;const f=opts.textarea?html('textarea'):html('input');f.id=id;f.value=value;if(!opts.textarea)f.type='text';f.maxLength=opts.maxLength||256;l.append(f);if(help)l.append(html('small',help,'field-hint'));return l;}
function renderInspector(){const target=$('inspector-content');target.replaceChildren();
  const selected=chosen.type==='stage'?byId(chosen.id):model.transitions.find(t=>t.id===chosen.id);
  if(!selected){target.append(html('p','Selecciona una etapa o transición en el diagrama para editarla.'));return;}
  const isStage=chosen.type==='stage';target.append(html('div',isStage?'ETAPA / ACCIONES':'TRANSICIÓN / RECEPTIVIDAD','editable-title'));
  target.append(html('span',selected.id,'badge-id'));
  target.append(field('Descripción del elemento','edit-name',selected.name,'Nombre visible en el esquema',{maxLength:100}));
  if(isStage){
    target.append(field('Salidas asignadas','edit-actions',selected.actions.join(', '),'Separadas por comas: MOTOR, VALVULA, LUZ. Solo simuladas.'));
    const line=html('label',undefined,'checkbox-line'),chk=html('input');chk.id='edit-initial';chk.type='checkbox';chk.checked=selected.initial;
    line.append(chk,html('span','Etapa inicial (activa tras reiniciar)'));target.append(line);
    target.append(html('p',`Posición: x=${selected.x} · y=${selected.y}. Puedes moverla arrastrando su símbolo.`, 'list-note'));
  } else {
    target.append(field('Etapas de origen','edit-from',selected.from.join(', '),'Una o varias, separadas por comas. Ej.: E0, E1'));
    target.append(field('Etapas de destino','edit-to',selected.to.join(', '),'Una o varias, separadas por comas. Ej.: E2'));
    target.append(field('Receptividad booleana','edit-condition',selected.condition,'Ej.: marcha AND seguridad; NOT fallo; 1.'));
    const preview=html('div',undefined,'list-note');preview.textContent='Las variables nuevas se crearán automáticamente como entradas digitales apagadas.';target.append(preview);
  }
  const btns=html('div',undefined,'edit-actions'),save=html('button','Guardar cambios','button primary'),del=html('button','Eliminar','button delete');save.type=del.type='button';
  save.addEventListener('click',()=>{
    const copy=JSON.parse(JSON.stringify(model));const item=(isStage?copy.stages:copy.transitions).find(x=>x.id===selected.id);
    item.name=$('edit-name').value.trim();
    if(isStage){item.actions=E.parseNames($('edit-actions').value).map(x=>x.toUpperCase());item.initial=$('edit-initial').checked;}
    else{item.from=E.parseNames($('edit-from').value);item.to=E.parseNames($('edit-to').value);item.condition=$('edit-condition').value.trim();
      try{copy.inputs=E.collectInputs(copy);}catch(ex){notify(ex.message,'error');return;}}
    saveEdited(copy,`Cambios guardados en ${item.id}.`);
  });
  del.addEventListener('click',()=>{
    const copy=JSON.parse(JSON.stringify(model));
    if(isStage){if(copy.stages.length===1){notify('No puedes eliminar la última etapa.','error');return;}
      copy.stages=copy.stages.filter(x=>x.id!==selected.id);copy.transitions=copy.transitions.filter(t=>!t.from.includes(selected.id)&&!t.to.includes(selected.id));
    }else copy.transitions=copy.transitions.filter(t=>t.id!==selected.id);
    try{copy.inputs=E.collectInputs(copy);}catch(e){notify(e.message,'error');return;}
    chosen={type:'stage',id:copy.stages[0].id};saveEdited(copy,`${selected.id} eliminado del GRAFCET.`);
  });
  btns.append(save,del);target.append(btns);
}
function renderInputs(){const target=$('inputs');target.replaceChildren();
  const names=Object.keys(model.inputs).sort();if(!names.length)target.append(html('div','Este proyecto no utiliza entradas.','empty'));
  for(const name of names){const btn=html('button',undefined,'signal-row'+(model.inputs[name]?' on':''));btn.type='button';btn.setAttribute('aria-pressed',String(model.inputs[name]));btn.setAttribute('aria-label',`${name}: ${model.inputs[name]?'activo':'inactivo'}`);
    btn.append(html('span',name,'signal-label'),html('span',model.inputs[name]?'ON':'OFF','state'),html('span',undefined,'switch'));
    btn.addEventListener('click',()=>{model.inputs[name]=!model.inputs[name];persist();renderInputs();renderDiagram();renderTransitionTable();log('Entrada modificada','info',name+' = '+(model.inputs[name]?'1':'0'));notify(`${name}: ${model.inputs[name]?'ACTIVADA':'DESACTIVADA'}. Pulsa avanzar para evaluar las transiciones.`);});
    target.append(btn);
  }
}
function renderOutputs(){const target=$('outputs');target.replaceChildren();const all=[...new Set(model.stages.flatMap(s=>s.actions))].sort();
  if(!all.length)target.append(html('div','No hay salidas asociadas a las etapas.','empty'));
  for(const name of all){const on=state.outputs.includes(name);target.append(html('span',`${on?'●':'○'} ${name}`,'output'+(on?' on':'')));}
}
function renderTransitionTable(){
  const target=$('transition-table');if(!target)return;target.replaceChildren();
  const entries=E.explain(model,state);
  for(const item of entries){
    const row=html('div',undefined,'reason-row'+(item.enabled?' ready':''));
    const main=html('div',undefined,'reason-main');
    main.append(html('b',item.id+' · '+item.name),html('small',item.from.join(' + ')+' → '+item.to.join(' + ')));
    const reason=html('div',undefined,'reason-explain');
    reason.append(html('span',item.condition,'reason-expression'));
    reason.append(html('span',item.enabled?'LISTA':item.missing.length?'FALTAN: '+item.missing.join(', '):'CONDICIÓN FALSA',
      'reason-state'+(item.enabled?' green':'')));
    row.append(main,reason);target.append(row);
  }
  if(!entries.length)target.append(html('div','Aún no hay transiciones.','empty'));
}
function renderHistory(){const target=$('history');target.replaceChildren();
  if(!events.length){target.append(html('div','Todavía no hay eventos.','empty'));return;}
  for(const evt of events.slice(0,60)){const row=html('div',undefined,'event'+(evt.kind==='warning'?' warning':''));const icon=html('span',evt.kind==='warning'?'!':'↳','event-icon');
    const body=html('div',undefined,'event-main');body.append(html('strong',evt.message),html('small',evt.detail));const time=html('time',evt.time);row.append(icon,body,time);target.append(row);
  }
}
function renderDiagnostic(){const target=$('diagnostic-list');target.replaceChildren();try{E.validateModel(model);const issues=E.diagnostics(model);
  target.append(html('div','✓ Estructura, referencias e identificadores correctos','check'));
  target.append(html('div','✓ Receptividades booleanas válidas','check'));
  target.append(html('div',`✓ ${model.stages.filter(s=>s.initial).length} etapa(s) inicial(es)`,'check'));
  for(const issue of issues)target.append(html('div','⚠ '+issue,'issue'));
  if(!issues.length)target.append(html('div','✓ Sin etapas inaccesibles detectadas','check'));
}catch(err){target.append(html('div','✕ '+err.message,'error-box'));}}
function renderMetrics(){const status=state.status==='conflict'?'CONFLICTO':state.status==='fired'?'EVOLUCIONÓ':state.status==='waiting'?'ESPERANDO':'LISTO';
  $('metric-active').textContent=state.active.length;$('active-label').textContent=state.active.join(', ')||'ninguna';
  $('metric-transitions').textContent=String(model.transitions.length).padStart(2,'0');
  $('metric-outputs').textContent=String(state.outputs.length).padStart(2,'0');
  $('output-label').textContent=state.outputs.length?state.outputs.slice(0,2).join(', '):'sin salidas';
  $('metric-status').textContent=status;$('metric-status').classList.toggle('error',state.status==='conflict');
  $('metric-cycles').textContent=`Ciclo ${state.cycle} · ${state.status==='conflict'?'simulación bloqueada':'simulación local'}`;
}
function renderAll(){renderDiagram();renderInspector();renderInputs();renderOutputs();renderHistory();renderDiagnostic();renderMetrics();renderTransitionTable();
  $('project-name').value=model.name;$('project-desc').value=model.description||'';}
function advance(){try{const next=E.advance(model,state);simHistory.push({state:copy(state),inputs:copy(model.inputs)});if(simHistory.length>MAX_BACK)simHistory.shift();state=next;renderDiagram();renderMetrics();renderOutputs();renderTransitionTable();
  const m=$('sim-message');m.classList.toggle('warn',state.status==='conflict');
  if(state.status==='fired'){m.textContent=`Transición(es) ${state.last.join(', ')} disparada(s). Etapas activas: ${state.active.join(', ')}.`;log('Evolución de etapas','info',`${state.last.join(', ')} → ${state.active.join(', ')} · salidas: ${state.outputs.join(', ')||'ninguna'}`);notify('Simulación actualizada sin comunicaciones físicas.');}
  else if(state.status==='conflict'){m.textContent='CONFLICTO: transiciones '+state.conflict.join(', ')+' compiten por una misma etapa. Cambia las receptividades.';log('Conflicto entre transiciones','warning',m.textContent);notify(m.textContent,'error');stop();}
  else{m.textContent='No hay transiciones habilitadas con las entradas actuales.';if(!timer)log('Sin evolución','info','Comprueba receptividades y señales de entrada.');}
}catch(ex){stop();notify(ex.message,'error');log('Error de simulación','warning',ex.message);}}
function reset(){stop();simHistory=[];state=E.initialState(model);renderDiagram();renderMetrics();renderOutputs();renderTransitionTable();$('sim-message').textContent='Estado inicial restaurado';$('sim-message').classList.remove('warn');log('Secuencia reiniciada','info','Activas: '+state.active.join(', '));notify('GRAFCET reiniciado; las entradas se mantienen.');}
function nextId(items,prefix){let i=0;while(items.some(x=>x.id===prefix+i))i++;return prefix+i;}
function addStage(){const copy=JSON.parse(JSON.stringify(model));if(copy.stages.length>=40){notify('Máximo 40 etapas.','error');return;}
 const id=nextId(copy.stages,'E'),last=copy.stages[copy.stages.length-1];let y=Math.min(2700,last.y+160);if(copy.stages.some(s=>s.x===340&&s.y===y))y=Math.min(2700,y+60);
 copy.stages.push({id,name:'Nueva etapa',actions:[],initial:false,x:340,y});chosen={type:'stage',id};saveEdited(copy,`${id} creada; edita nombre y acciones en el inspector.`);}
function addTransition(){const copy=JSON.parse(JSON.stringify(model));if(copy.transitions.length>=80){notify('Máximo 80 transiciones.','error');return;}
 const id=nextId(copy.transitions,'T'),source=chosen.type==='stage'&&copy.stages.some(x=>x.id===chosen.id)?chosen.id:copy.stages[0].id;
 const index=copy.stages.findIndex(x=>x.id===source),to=copy.stages[(index+1)%copy.stages.length].id;
 copy.transitions.push({id,name:'Nueva transición',from:[source],to:[to],condition:'0'});chosen={type:'transition',id};saveEdited(copy,`${id} creada con condición 0 (inactiva hasta que la edites).`);}
function download(name,content,type){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob),a=html('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
function safeFilename(){return model.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9_-]+/g,'-').replace(/^-|-$/g,'').slice(0,45)||'AB-GRAFCET';}
function exportSvg(){const orig=$('diagram');const clone=orig.cloneNode(true);clone.setAttribute('xmlns',S);clone.removeAttribute('style');clone.setAttribute('width','850');clone.setAttribute('height',orig.viewBox.baseVal.height);const xml=new XMLSerializer().serializeToString(clone);download(safeFilename()+'.svg',xml,'image/svg+xml;charset=utf-8');notify('SVG del esquema exportado.');}
function technicalReport(){
  const escape=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const row=values=>'<tr>'+values.map(v=>'<td>'+escape(v)+'</td>').join('')+'</tr>';
  const issues=E.diagnostics(model);
  const stages=model.stages.map(s=>row([s.id,s.name,s.initial?'SÍ':'NO',s.actions.join(', ')||'—'])).join('');
  const transitions=model.transitions.map(t=>row([t.id,t.name,t.from.join(' + '),t.condition,t.to.join(' + ')])).join('');
  const inputs=Object.entries(model.inputs).map(([key,v])=>row([key,v?'1':'0'])).join('');
  const notes=issues.length?issues.map(x=>'<li>'+escape(x)+'</li>').join(''):'<li>Sin advertencias estructurales detectadas.</li>';
  const htmlDoc=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Informe GRAFCET · ${escape(model.name)}</title>
  <style>body{font:15px/1.6 system-ui,sans-serif;color:#203443;max-width:1020px;margin:auto;padding:35px}h1{color:#147b66}h2{border-bottom:2px solid #d9eee6;padding-bottom:6px}table{width:100%;border-collapse:collapse;margin:14px 0 28px}th,td{padding:10px;border:1px solid #dce7e9;text-align:left;vertical-align:top}th{background:#eaf5f1}code{overflow-wrap:anywhere}aside{background:#fff5df;padding:17px;border-radius:8px}footer{color:#768a96;font-size:12px;margin-top:40px}@media print{body{padding:0}h2,table{break-inside:avoid}}</style></head><body>
  <h1>AB-GRAFCET Studio · informe de especificación</h1><p><b>Proyecto:</b> ${escape(model.name)}</p><p>${escape(model.description||'')}</p>
  <p><b>Fecha:</b> ${escape(new Date().toISOString())} · <b>Formato:</b> esquema 1 · <b>Versión del programa:</b> 0.2</p>
  <aside><strong>SOLO ESPECIFICACIÓN Y SIMULACIÓN.</strong> No es un KOP, SFC ni código PLC ejecutable. Verifica en hardware real las funciones de seguridad, enclavamientos, temporizaciones y arquitectura.</aside>
  <h2>Etapas / acciones virtuales</h2><table><thead><tr><th>ID</th><th>Descripción</th><th>Inicial</th><th>Acciones</th></tr></thead><tbody>${stages}</tbody></table>
  <h2>Transiciones / receptividades</h2><table><thead><tr><th>ID</th><th>Nombre</th><th>Origen</th><th>Condición</th><th>Destino</th></tr></thead><tbody>${transitions}</tbody></table>
  <h2>Entradas virtuales</h2><table><thead><tr><th>Identificador</th><th>Valor actual</th></tr></thead><tbody>${inputs}</tbody></table>
  <h2>Diagnóstico estructural</h2><ul>${notes}</ul>
  <footer>© 2026 MS ROBOTIKA · Licencia MIT · Generado localmente sin transmisión de datos.</footer></body></html>`;
  download(safeFilename()+'-informe.html',htmlDoc,'text/html;charset=utf-8');
  log('Informe técnico exportado','info','Incluye etapas, transiciones, E/S y diagnóstico estructural.');
  notify('Informe técnico HTML generado. Solo simulación y especificación.');
}
function exportCsv(){const lines=[['timestamp_iso','tipo','evento','detalle'].join(',')];const q=x=>'"'+String(x??'').replaceAll('"','""')+'"';for(const e of [...events].reverse())lines.push([e.date,e.kind,e.message,e.detail].map(q).join(','));download(safeFilename()+'-simulacion.csv',lines.join('\r\n')+'\r\n','text/csv;charset=utf-8');}
function init(){try{const raw=localStorage.getItem(PROJECT_KEY);if(raw){const candidate=JSON.parse(raw);E.validateModel(candidate);model=candidate;state=E.initialState(model);}}catch(_){model=E.sample();state=E.initialState(model);}
  renderAll();log('Aplicación iniciada','info',model.name+' · simulación local');
  $('diagram').addEventListener('pointermove',onDrag);window.addEventListener('pointerup',endDrag);
  $('step').addEventListener('click',advance);$('reset').addEventListener('click',reset);
  $('back').addEventListener('click',backStep);
  $('undo-edit').addEventListener('click',()=>undoEdit('undo'));
  $('redo-edit').addEventListener('click',()=>undoEdit('redo'));
  $('run').addEventListener('click',()=>{if(timer){stop();notify('Ejecución automática detenida.');return;}
    timer=setInterval(advance,1000);$('run').textContent='■ Detener auto';$('run').classList.add('primary');log('Automático iniciado','info','Intervalo de simulación: 1000 ms');advance();});
  $('add-stage').addEventListener('click',addStage);$('add-transition').addEventListener('click',addTransition);
  $('fit').addEventListener('click',()=>{$('diagram-viewport').scrollTo(0,0);notify('Esquema ajustado al comienzo del lienzo.');});
  $('clear-log').addEventListener('click',()=>{events=[];renderHistory();log('Historial limpiado');});
  $('export-log').addEventListener('click',exportCsv);
  $('save-project').addEventListener('click',()=>{download(safeFilename()+'.json',JSON.stringify(model,null,2),'application/json;charset=utf-8');notify('Proyecto JSON exportado.');});
  $('export-svg').addEventListener('click',exportSvg);
  $('export-report').addEventListener('click',technicalReport);
  $('project-name').addEventListener('change',()=>{const next=JSON.parse(JSON.stringify(model));next.name=$('project-name').value.trim();saveEdited(next,'Nombre de proyecto actualizado.');});
  $('project-desc').addEventListener('change',()=>{const next=copy(model);next.description=$('project-desc').value;saveEdited(next,'Descripción del proyecto actualizada.');});
  $('load-demo').addEventListener('click',()=>replaceModel(E.sample(),'Ejemplo de envasado restaurado.'));
  $('import-project').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{if(f.size>200000)throw Error('Archivo supera 200 KB.');replaceModel(JSON.parse(await f.text()),'Proyecto importado y validado.');}catch(ex){notify('Importación rechazada: '+ex.message,'error');}finally{e.target.value='';}});
  $('help').addEventListener('click',()=>{$('help-dialog').hidden=false;$('close-help').focus();});
  $('close-help').addEventListener('click',()=>{$('help-dialog').hidden=true;});
  $('help-dialog').addEventListener('click',e=>{if(e.target===$('help-dialog'))$('help-dialog').hidden=true;});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')$('help-dialog').hidden=true;
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)){e.preventDefault();undoEdit(e.shiftKey?'redo':'undo');}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)){e.preventDefault();undoEdit('redo');}
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  window.addEventListener('pagehide',stop);
}
window.ABSuite?.register({snapshot:()=>Object.fromEntries([...model.stages.map(s=>['stages.'+s.id,state.active.includes(s.id)]),...[...new Set(model.stages.flatMap(s=>s.actions))].map(name=>['actions.'+name,state.outputs.includes(name)])])});
init();
})();
