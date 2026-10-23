/* AB BI · Espacios de datos. Own workspace flow; examples are optional. MIT. */
(()=>{
 const make=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node};
 const library=make('section',undefined,'bi-space-switcher');
 const label=make('label','ESPACIO DE DATOS');label.htmlFor='space-select';
 const picker=make('select');picker.id='space-select';picker.setAttribute('aria-label','Espacio de datos guardado');
 const actions=make('div',undefined,'bi-space-actions');
 const create=make('button','＋ Nuevo espacio','btn primary');create.id='new-workspace';
 const rename=make('button','Renombrar','btn outline');rename.id='rename-workspace';
 const copy=make('button','Duplicar','btn outline');copy.id='copy-workspace';
 actions.append(create,rename,copy);library.append(label,picker,actions);document.querySelector('.rail .brand').after(library);
 let current='',lastLibrary='',pendingFiles=[];
 async function stopCapture(){if(window.ABSuite)try{const response=await fetch('/suite/bi-capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:false})});if(response.ok)window.dispatchEvent(new CustomEvent('ab-suite:bi-capture-state',{detail:await response.json()}))}catch{}}
 async function refreshLibrary(){const data=await req('/api/workspaces');const key=JSON.stringify(data);if(key===lastLibrary)return;lastLibrary=key;picker.replaceChildren();for(const space of data.spaces){const option=make('option',space.name+' · '+space.tables+' tablas');option.value=space.id;option.disabled=Boolean(space.error);picker.append(option)}picker.value=data.active;current=data.active}
 const nativeLoad=loadModel;
 window.loadModel=async()=>{
  const previous=F.model?.workspace_id;await nativeLoad();
  if(previous!==F.model.workspace_id){
   F.dataPage=0;F.editedMeasure='';F.filters={};F.lastVisuals=[];F.filterSelection.clear();
   C.steps=[];C.preview=null;C.table='';
   for(const id of ['dataHead','dataBody','sqlResults','sqlError','profileGrid','cleanPreview','cleanHistory']){const node=$(id);if(node)node.replaceChildren()}
   const table=F.model.tables[0]?.name;$('sqlSource').value=table?'SELECT * FROM "'+table.replaceAll('"','""')+'" LIMIT 50':'';$('daxSource').value='';$('measureName').value='';
  }
  await refreshLibrary();
 };
 const dialog=make('dialog',undefined,'bi-workspace-dialog');dialog.id='workspace-dialog';dialog.setAttribute('aria-labelledby','workspace-heading');
 const form=make('form');const heading=make('h2','Nuevo espacio de datos');heading.id='workspace-heading';
 const description=make('p','Un espacio independiente para tus tablas, expresiones e informes. El actual se conserva en la biblioteca.');
 const nameLabel=make('label','Nombre del espacio'),name=make('input');name.id='workspace-name';name.required=true;name.maxLength=90;nameLabel.append(name);
 const typeLabel=make('label','Punto de partida'),type=make('select');type.id='workspace-template';for(const [v,t] of [['blank','Vacío · para mis propios datos'],['demo','Ejemplo opcional · datos ficticios'],['copy','Copia del espacio actual']]){const option=make('option',t);option.value=v;type.append(option)}typeLabel.append(type);
 const error=make('p',undefined,'bi-space-error');error.setAttribute('role','alert');
 const row=make('div',undefined,'bi-dialog-actions'),cancel=make('button','Cancelar','btn outline'),submit=make('button','Crear espacio','btn primary');cancel.type='button';submit.type='submit';cancel.onclick=()=>dialog.close();row.append(cancel,submit);form.append(heading,description,nameLabel,typeLabel,error,row);dialog.append(form);document.body.append(dialog);
 let renaming=false;
 function open(template='blank',isRename=false){renaming=isRename;heading.textContent=isRename?'Renombrar espacio':'Nuevo espacio de datos';submit.textContent=isRename?'Guardar nombre':'Crear espacio';typeLabel.hidden=isRename;type.value=template;name.value=isRename?F.model.name:template==='demo'?'Ejemplo de análisis':template==='copy'?F.model.name+' · copia':'';error.textContent='';dialog.showModal();name.focus()}
 create.onclick=()=>open();rename.onclick=()=>open('blank',true);copy.onclick=()=>open('copy');
 form.onsubmit=async event=>{event.preventDefault();submit.disabled=true;error.textContent='';try{
  await stopCapture();await post(renaming?'/api/workspaces/rename':'/api/workspaces',renaming?{name:name.value}:{name:name.value,template:type.value});
  await loadModel();show('dashboard');dialog.close();toast(renaming?'Nombre actualizado':'Espacio creado. Empieza importando tus datos.');
 }catch(failure){error.textContent=failure.message}finally{submit.disabled=false}};
 picker.onchange=async()=>{const target=picker.value;picker.disabled=true;try{await stopCapture();await post('/api/workspaces/'+encodeURIComponent(target)+'/activate',{});await loadModel();show('dashboard');toast('Espacio abierto: '+F.model.name)}catch(failure){picker.value=current;toast(failure.message,true)}finally{picker.disabled=false}};
 const importDialog=make('dialog',undefined,'bi-workspace-dialog');importDialog.id='import-destination-dialog';importDialog.setAttribute('aria-labelledby','import-space-heading');
 const importForm=make('form'),importHeading=make('h2','Importar tus datos');importHeading.id='import-space-heading';const fileList=make('p',undefined,'bi-import-files');
 const destinationLabel=make('label','Destino'),destination=make('select');destination.id='import-destination';for(const [v,t] of [['new','Crear un espacio nuevo'],['current','Añadir tablas al espacio actual']]){const option=make('option',t);option.value=v;destination.append(option)}destinationLabel.append(destination);
 const importNameLabel=make('label','Nombre del espacio nuevo'),importName=make('input');importName.id='import-workspace-name';importName.required=true;importName.maxLength=90;importNameLabel.append(importName);
 const importNote=make('p','Primero se validan todos los archivos. Si uno falla, el espacio actual se conserva sin cambios.');
 const importError=make('p',undefined,'bi-space-error');importError.setAttribute('role','alert');
 const importActions=make('div',undefined,'bi-dialog-actions'),importCancel=make('button','Cancelar','btn outline'),importSubmit=make('button','Importar y abrir','btn primary');importCancel.type='button';importSubmit.type='submit';importCancel.onclick=()=>importDialog.close();importActions.append(importCancel,importSubmit);
 importForm.append(importHeading,fileList,destinationLabel,importNameLabel,importNote,importError,importActions);importDialog.append(importForm);document.body.append(importDialog);
 destination.onchange=()=>{importNameLabel.hidden=destination.value!=='new';importName.required=destination.value==='new'};
 window.uploadFiles=files=>{if(!files.length)return;pendingFiles=[...files];fileList.textContent=pendingFiles.map(f=>f.name).join(' · ');destination.value='new';importNameLabel.hidden=false;importName.required=true;importName.value=pendingFiles[0].name.replace(/\.[^.]+$/,'').slice(0,90);importError.textContent='';importDialog.showModal();importName.focus()};
 importForm.onsubmit=async event=>{event.preventDefault();importSubmit.disabled=true;importError.textContent='';try{
  const body=new FormData();for(const file of pendingFiles)body.append('files',file);body.append('destination',destination.value);body.append('name',importName.value);body.append('workspace_id',F.model.workspace_id);
  await stopCapture();const result=await req('/api/data/import',{method:'POST',body});await loadModel();show('data');importDialog.close();toast(`Importadas ${result.added.length} tablas en ${F.model.name}`);
 }catch(failure){importError.textContent=failure.message}finally{importSubmit.disabled=false}};
 $('resetDemo').textContent='Abrir ejemplo';$('resetDemo').onclick=()=>open('demo');
 setTheme('dark');$('themeToggle').hidden=true;
 const cancelVisual=document.querySelector('#visualForm button[value=cancel]');cancelVisual.type='button';cancelVisual.onclick=closeModal;
 for(const button of document.querySelectorAll('[data-template]'))button.onclick=async()=>{
  try{
   const table=F.model.tables.find(t=>t.name===F.dataTable)??F.model.tables[0];if(!table)throw Error('Importa una tabla antes de crear una expresión.');
   const profile=await req('/api/profile/'+encodeURIComponent(table.name));const numeric=profile.columns.find(column=>column.type==='Número');
   const quote=name=>"'"+name.replaceAll("'","''")+"'",column=name=>'['+name.replaceAll(']',']]')+']';
   const sum=numeric?'SUM('+quote(table.name)+column(numeric.name)+')':null;let expression;
   if(button.dataset.template==='RELATED'){
    const relation=F.model.relationships.find(r=>r.from_table===table.name);if(!relation)throw Error('Crea una relación desde esta tabla antes de utilizar RELATED.');
    expression='SUMX('+quote(table.name)+', RELATED('+quote(relation.to_table)+column(relation.to_column)+'))';
   }else{
    if(!sum)throw Error('Esta plantilla necesita una columna numérica. Revisa el perfil de calidad o prepara los datos.');
    expression=({SUM:sum,CALCULATE:'CALCULATE('+sum+')',SUMX:'SUMX('+quote(table.name)+', '+quote(table.name)+column(numeric.name)+')',DIVIDE:'DIVIDE('+sum+', COUNTROWS('+quote(table.name)+'), 0)'})[button.dataset.template];
   }
   $('daxSource').value=expression;$('daxSource').focus();
  }catch(failure){toast(failure.message,true)}
 };
 const originalReq=req;
 window.req=(url,options={})=>originalReq(url,{...options,headers:{...options.headers,...(F.model?.workspace_id?{'X-ABBI-Workspace':F.model.workspace_id}:{})}});
 // Native expressions keep documented compatibility; visible concepts belong to AB BI.
 $('quickExplore').textContent='Explorar mis tablas';$('quickImport').textContent='Importar datos';$('quickPrepare').textContent='Preparar y limpiar';
 document.querySelector('#quickstart .bi-quick-content>p').textContent='Crea un espacio vacío, importa tus datos y explóralos a tu ritmo. Puedes abrir el ejemplo en un espacio independiente cuando quieras.';
 refreshLibrary().catch(failure=>toast(failure.message,true));
 setInterval(()=>refreshLibrary().catch(()=>{}),5000);
})();
