
/* SPDX-License-Identifier: MIT · Copyright (c) 2026 MS ROBOTIKA
   Motor de simulación GRAFCET educativo; no genera código PLC ejecutable. */
(function (root, factory) {
  const engine = factory();
  if (typeof module === 'object' && module.exports) module.exports = engine;
  root.ABGrafcet = engine;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = 1;
  const ident = /^[A-Za-z_][A-Za-z0-9_]*$/;
  const stageId = /^[A-Z][A-Z0-9_]*$/;
  const MAX_STAGES = 40, MAX_TRANSITIONS = 80;
  const forbidden = new Set(['__proto__','prototype','constructor']);
  const tokensOf = expr => {
    if (typeof expr !== 'string' || expr.length > 256) throw Error('La receptividad debe tener entre 1 y 256 caracteres.');
    const tokens = []; let i = 0;
    while (i < expr.length) {
      if (/\s/.test(expr[i])) { i++; continue; }
      const v = expr.slice(i).match(/^(\&\&|\|\||[()!&|]|[A-Za-z_][A-Za-z0-9_]*|[01])/);
      if (!v) throw Error(`Carácter inválido en la receptividad: ${expr[i]}`);
      let t = v[0]; i += t.length;
      if (t === '&&' || t === '&') t = 'AND';
      if (t === '||' || t === '|') t = 'OR';
      if (t === '!') t = 'NOT';
      if (/^(AND|OR|NOT|TRUE|FALSE)$/i.test(t)) t = t.toUpperCase();
      tokens.push(t);
      if (tokens.length > 100) throw Error('Receptividad demasiado compleja.');
    }
    if (!tokens.length) throw Error('La receptividad no puede estar vacía.');
    return tokens;
  };
  const parseCondition = expression => {
    const tok = tokensOf(expression); let i = 0;
    function primary() {
      const x = tok[i++];
      if (x === undefined) throw Error('Falta operando en la receptividad.');
      if (x === 'NOT') return {op:'not',child:primary()};
      if (x === '(') { const n = orExpr(); if (tok[i++] !== ')') throw Error('Paréntesis sin cerrar.'); return n; }
      if (x === '1' || x === 'TRUE') return {op:'const',v:true};
      if (x === '0' || x === 'FALSE') return {op:'const',v:false};
      if (ident.test(x) && !['AND','OR','NOT'].includes(x) && !forbidden.has(x)) return {op:'var',key:x};
      throw Error('Token inesperado: '+x);
    }
    function andExpr() {let left=primary();while(tok[i]==='AND'){i++;left={op:'and',left,right:primary()};}return left;}
    function orExpr() {let left=andExpr();while(tok[i]==='OR'){i++;left={op:'or',left,right:andExpr()};}return left;}
    const result=orExpr();if(i!==tok.length)throw Error('Receptividad mal formada cerca de '+tok[i]);return result;
  };
  const variables = ast => {
    const set=new Set();
    function visit(n){if(n.op==='var')set.add(n.key);else if(n.op==='not')visit(n.child);else if(n.op==='and'||n.op==='or'){visit(n.left);visit(n.right);}}
    visit(ast);return [...set];
  };
  function evalCondition(ast, inputs) {
    switch(ast.op){
      case 'var':return inputs[ast.key] === true;
      case 'const':return ast.v;
      case 'not':return !evalCondition(ast.child,inputs);
      case 'and':return evalCondition(ast.left,inputs)&&evalCondition(ast.right,inputs);
      case 'or':return evalCondition(ast.left,inputs)||evalCondition(ast.right,inputs);
      default:throw Error('Nodo de expresión inválido');
    }
  }
  const parseNames = text => [...new Set(String(text||'').split(',').map(s=>s.trim()).filter(Boolean))];
  const collectInputs = model => {
    const next=Object.create(null);
    for(const transition of model.transitions) for(const name of variables(parseCondition(transition.condition)))
      next[name]=model.inputs && model.inputs[name]===true;
    return next;
  };
  function validateModel(model) {
    if(!model || typeof model!=='object'||Array.isArray(model) ||model.schema!==VERSION)throw Error('Proyecto GRAFCET incompatible (esquema 1).');
    if(typeof model.name!=='string'||!model.name.trim()||model.name.length>90)throw Error('El nombre del proyecto no es válido.');
    if(!Array.isArray(model.stages)||!model.stages.length||model.stages.length>MAX_STAGES)throw Error('Se requieren de 1 a 40 etapas.');
    if(!Array.isArray(model.transitions)||model.transitions.length>MAX_TRANSITIONS)throw Error('Máximo 80 transiciones.');
    const ids=new Set();let initial=0;
    for(const s of model.stages){
      if(!s||typeof s.id!=='string'||!stageId.test(s.id)||ids.has(s.id))throw Error('Identificador de etapa duplicado o inválido.');ids.add(s.id);
      if(typeof s.name!=='string'||s.name.length>100)throw Error('Nombre de etapa inválido en '+s.id);
      if(typeof s.initial!=='boolean')throw Error('Estado inicial inválido en '+s.id);
      if(s.initial)initial++;
      if(!Number.isFinite(s.x)||!Number.isFinite(s.y)||s.x<40||s.x>1900||s.y<40||s.y>2800)throw Error('Coordenadas de etapa inválidas.');
      if(!Array.isArray(s.actions)||s.actions.length>15||s.actions.some(a=>typeof a!=='string'||!stageId.test(a)||forbidden.has(a)))throw Error('Salidas inválidas en '+s.id);
    }
    if(!initial)throw Error('El proyecto requiere alguna etapa inicial.');
    if(typeof model.description!=='undefined'&&(typeof model.description!=='string'||model.description.length>300))throw Error('Descripción de proyecto inválida.');
    const tids=new Set();const iMap=model.inputs;
    if(!iMap||typeof iMap!=='object'||Array.isArray(iMap)||Object.keys(iMap).length>60)throw Error('Entradas digitales inválidas.');
    for(const [name,value] of Object.entries(iMap))if(!ident.test(name)||forbidden.has(name)||typeof value!=='boolean')throw Error('Entrada inválida: '+name);
    for(const t of model.transitions){
      if(!t||typeof t.id!=='string'||!stageId.test(t.id)||tids.has(t.id))throw Error('Identificador de transición duplicado o inválido.');tids.add(t.id);
      if(typeof t.name!=='string'||t.name.length>100)throw Error('Nombre de transición inválido.');
      for(const key of ['from','to']){
        const refs=t[key];if(!Array.isArray(refs)||!refs.length||refs.length>15||new Set(refs).size!==refs.length||refs.some(id=>!ids.has(id)))throw Error('Etapas '+key+' inválidas en '+t.id);
      }
      const ast=parseCondition(t.condition);
      for(const v of variables(ast))if(!Object.prototype.hasOwnProperty.call(iMap,v))throw Error('Entrada no declarada: '+v+' en '+t.id);
    }
    return true;
  }
  const outputState = (model,active) => [...new Set(model.stages.filter(s=>active.includes(s.id)).flatMap(s=>s.actions))].sort();
  const initialState = model => {validateModel(model);const active=model.stages.filter(s=>s.initial).map(s=>s.id);return {active,outputs:outputState(model,active),cycle:0,last:[],conflict:[],status:'ready'};};
  function preview(model,state) {
    validateModel(model);const current=new Set(state.active);
    return model.transitions.map(t=>({id:t.id,
      structural:t.from.every(s=>current.has(s)),
      receptivity:evalCondition(parseCondition(t.condition),model.inputs),
      enabled:t.from.every(s=>current.has(s)) && evalCondition(parseCondition(t.condition),model.inputs)}));
  }
  function explain(model,state){
    const status=preview(model,state);
    return model.transitions.map((t,i)=>({
      id:t.id, name:t.name, condition:t.condition,
      from:t.from.slice(), to:t.to.slice(),
      missing:t.from.filter(id=>!state.active.includes(id)),
      structural:status[i].structural, receptivity:status[i].receptivity,
      enabled:status[i].enabled,
      verdict:status[i].enabled?'HABILITADA':status[i].structural?'RECEPTIVIDAD FALSA':'ETAPAS PRECEDENTES INACTIVAS'
    }));
  }
  // Prueba determinista y sin efectos secundarios: útil para verificar ciclos.
  function runScenario(model,steps,initialInputs){
    validateModel(model);
    if(!Array.isArray(steps)||steps.length>200)throw Error('El escenario admite como máximo 200 pasos.');
    let copy=JSON.parse(JSON.stringify(model));
    if(initialInputs!==undefined){
      if(!initialInputs||typeof initialInputs!=='object'||Array.isArray(initialInputs))throw Error('Entradas iniciales inválidas.');
      for(const [name,value] of Object.entries(initialInputs)){
        if(!Object.prototype.hasOwnProperty.call(copy.inputs,name)||typeof value!=='boolean')throw Error('Entrada de escenario inválida: '+name);
        copy.inputs[name]=value;
      }
    }
    let current=initialState(copy),results=[];
    for(const [i,step] of steps.entries()){
      if(!step||typeof step!=='object'||Array.isArray(step)||!step.inputs||typeof step.inputs!=='object'||Array.isArray(step.inputs))
        throw Error('Paso '+(i+1)+' inválido.');
      for(const [name,value] of Object.entries(step.inputs)){
        if(!Object.prototype.hasOwnProperty.call(copy.inputs,name)||typeof value!=='boolean')throw Error('Entrada de escenario inválida: '+name);
        copy.inputs[name]=value;
      }
      const before=current.active.slice();current=advance(copy,current);
      const expected=step.expectActive;
      if(expected!==undefined&&(!Array.isArray(expected)||expected.some(x=>typeof x!=='string')))throw Error('Expectativa inválida en paso '+(i+1));
      const ok=expected===undefined||JSON.stringify(current.active.slice().sort())===JSON.stringify(expected.slice().sort());
      results.push({step:i+1,before,active:current.active.slice(),outputs:current.outputs.slice(),
        fired:current.last.slice(),status:current.status,ok});
      if(current.status==='conflict')break;
    }
    return {ok:results.every(r=>r.ok&&r.status!=='conflict'),results,final:current};
  }
  function advance(model,state){
    const entries=preview(model,state);const enabled=entries.filter(e=>e.enabled).map(e=>e.id);
    if(!enabled.length)return {...state,last:[],conflict:[],status:'waiting',cycle:state.cycle+1};
    const selected=model.transitions.filter(t=>enabled.includes(t.id));
    // La divergencia O debe excluir condiciones mutuamente activas. No se elige
    // arbitrariamente una rama para evitar una simulación engañosa.
    const consumed=new Set(),conflict=new Set();
    for(const t of selected)for(const id of t.from){if(consumed.has(id)){for(const other of selected.filter(x=>x.from.includes(id)))conflict.add(other.id);}consumed.add(id);}
    if(conflict.size)return {...state,last:[],conflict:[...conflict],status:'conflict',cycle:state.cycle+1};
    const next=new Set(state.active);for(const t of selected)for(const id of t.from)next.delete(id);
    for(const t of selected)for(const id of t.to)next.add(id);
    const active=model.stages.filter(s=>next.has(s.id)).map(s=>s.id);
    return {active,outputs:outputState(model,active),cycle:state.cycle+1,last:enabled,conflict:[],status:'fired'};
  }
  function diagnostics(model){
    validateModel(model);const found=new Set(model.stages.filter(s=>s.initial).map(s=>s.id));let changed=true;
    while(changed){changed=false;for(const t of model.transitions)if(t.from.every(id=>found.has(id))){for(const id of t.to)if(!found.has(id)){found.add(id);changed=true;}}}
    const issues=[];for(const s of model.stages)if(!found.has(s.id))issues.push(`Etapa ${s.id} inaccesible desde el estado inicial (análisis estructural).`);
    for(const s of model.stages)if(!model.transitions.some(t=>t.from.includes(s.id)))issues.push(`${s.id} no tiene transición de salida.`);
    for(const t of model.transitions){
      if(t.from.length===t.to.length && t.from.every(id=>t.to.includes(id)))
        issues.push(`${t.id} devuelve exactamente las mismas etapas; comprueba el bucle.`);
      if(t.condition.trim()==='0'||t.condition.trim().toUpperCase()==='FALSE')
        issues.push(`${t.id} tiene receptividad constante falsa (0): nunca se disparará.`);
    }
    for(const [i,t] of model.transitions.entries())for(const other of model.transitions.slice(i+1)){
      if(t.from.some(id=>other.from.includes(id)))issues.push(`${t.id} y ${other.id} comparten etapa(s) precedente(s): comprueba la exclusividad de sus receptividades.`);
    }
    return issues;
  }
  const sample = () => ({
    schema:1,name:'Ciclo de envasado · demostración',description:'Secuencia didáctica sin conexión a PLC físico.',
    stages:[
      {id:'E0',name:'Espera de marcha',actions:['LISTO'],initial:true,x:340,y:85},
      {id:'E1',name:'Carga de producto',actions:['MOTOR_CINTA','VALVULA_CARGA'],initial:false,x:340,y:270},
      {id:'E2',name:'Sellado de bolsa',actions:['RESISTENCIA_SELLO'],initial:false,x:340,y:455},
      {id:'E3',name:'Expulsión',actions:['EXPULSOR'],initial:false,x:340,y:640}
    ],
    transitions:[
      {id:'T0',name:'Arranque autorizado',from:['E0'],to:['E1'],condition:'marcha AND seguridad'},
      {id:'T1',name:'Carga completada',from:['E1'],to:['E2'],condition:'carga_terminada'},
      {id:'T2',name:'Fin de sellado',from:['E2'],to:['E3'],condition:'sellado_terminado AND seguridad'},
      {id:'T3',name:'Caja retirada',from:['E3'],to:['E0'],condition:'caja_fuera'}
    ],
    inputs:{marcha:false,seguridad:true,carga_terminada:false,sellado_terminado:false,caja_fuera:false}
  });
  return Object.freeze({VERSION,parseCondition,variables,evalCondition,parseNames,collectInputs,validateModel,outputState,initialState,preview,explain,runScenario,advance,diagnostics,sample});
});
