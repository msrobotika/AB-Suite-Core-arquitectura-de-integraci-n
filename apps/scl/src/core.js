
/* SPDX-License-Identifier: MIT — Copyright (c) 2026 MS ROBOTIKA.
   Restricted, deterministic IEC 61131-3 Structured Text parser and Boolean KOP converter.
   No eval; unsupported constructs rejected instead of guessing. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ABSclCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const MAX_SOURCE=50000,MAX_VARIABLES=36,MAX_OUTPUTS=40,MAX_BRANCHES=8,MAX_CONTACTS=12;
const IDENT=/^[A-Z][A-Z0-9_]{0,31}$/;
const BAD=new Set(['CONSTRUCTOR','PROTOTYPE','__PROTO__','TRUE','FALSE','AND','OR','NOT','IF','THEN','ELSE','END_IF','VAR_INPUT','VAR_OUTPUT','VAR','END_VAR','PROGRAM','END_PROGRAM','BOOL']);
const ensure=(ok,msg)=>{if(!ok)throw Error(msg);};
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function lex(input){
 ensure(typeof input==='string'&&input.length<=MAX_SOURCE,'El código debe ser texto de hasta 50.000 caracteres.');
 const tokens=[];let pos=0,line=1;
 const rx=/\s+|\(\*[\s\S]*?\*\)|\/\/[^\n]*|:=|[():;]|[A-Za-z_][A-Za-z0-9_]*|\d+|./y;
 while(pos<input.length){rx.lastIndex=pos;const m=rx.exec(input);ensure(m,'Token inesperado');let t=m[0],start=pos;pos+=t.length;const startLine=line;line+=(t.match(/\n/g)||[]).length;
 if(/^\s+$/.test(t)||t.startsWith('//')||t.startsWith('(*'))continue;
 if(t==='('&&input[start+1]==='*')throw Error('Comentario sin cerrar en línea '+startLine);
 if(t===')'||t==='('||t===':'||t===';'||t===':=')tokens.push({v:t,line:startLine});
 else if(/^[A-Za-z_][A-Za-z0-9_]*$/.test(t))tokens.push({v:t.toUpperCase(),line:startLine});
 else throw Error(`Símbolo no admitido «${t}» en línea ${startLine}.`);
 ensure(tokens.length<=8000,'Demasiados tokens para la versión 0.1.');
 }
 tokens.push({v:'<EOF>',line});return tokens;
}
function parse(source){
 const toks=lex(source);let i=0;const peek=()=>toks[i].v,where=()=>toks[i].line;
 function take(v){const t=toks[i];if(v!==undefined&&t.v!==v)throw Error(`Línea ${t.line}: se esperaba ${v}, encontrado «${t.v}».`);i++;return t.v;}
 function id(){const t=toks[i],s=take();ensure(IDENT.test(s)&&!BAD.has(s),`Línea ${t.line}: nombre de variable inválido «${s}».`);return s;}
 function primary(){if(peek()==='NOT'){take();return {op:'NOT',arg:primary()};}if(peek()==='('){take();const a=or();take(')');return a;}
  const t=toks[i],v=take();if(v==='TRUE'||v==='FALSE')return {op:'CONST',value:v==='TRUE'};
  ensure(IDENT.test(v)&&!BAD.has(v),`Línea ${t.line}: expresión no booleana o palabra no soportada «${v}».`);return {op:'VAR',name:v};}
 function and(){let a=primary();while(peek()==='AND'){take();a={op:'AND',a,b:primary()};}return a;}
 function or(){let a=and();while(peek()==='OR'){take();a={op:'OR',a,b:and()};}return a;}
 function assign(){const line=where(),name=id();take(':=');const expr=or();take(';');return {name,expr,line};}
 const declarations={inputs:Object.create(null),outputs:Object.create(null)},types=Object.create(null);
 if(peek()==='PROGRAM'){take();id();}
 let sawBlock=false;
 while(peek()==='VAR_INPUT'||peek()==='VAR_OUTPUT'){
  const section=take(),group=section==='VAR_INPUT'?'inputs':'outputs';sawBlock=true;let count=0;
  while(peek()!=='END_VAR'){
   ensure(peek()!=='<EOF>',`Línea ${where()}: falta END_VAR.`);
   const names=[id()];while(peek()===','){take();names.push(id());} // comma unsupported by lexer, explicit failure; deliberate
   take(':');take('BOOL');let initial=false;
   if(peek()===':='){take();const word=take();ensure(word==='TRUE'||word==='FALSE',`Línea ${where()}: solo BOOL TRUE/FALSE.`);initial=word==='TRUE';}
   take(';');
   for(const name of names){ensure(!own(types,name),'Variable duplicada: '+name);types[name]=group;declarations[group][name]=initial;count++;}
   ensure(count<=MAX_VARIABLES,'Demasiadas variables en una sección.');
  }
  take('END_VAR');
 }
 ensure(sawBlock,'Se requieren declaraciones VAR_INPUT / VAR_OUTPUT.');
 const outputs=Object.keys(declarations.outputs),inputs=Object.keys(declarations.inputs);
 ensure(outputs.length>0&&outputs.length<=MAX_OUTPUTS,'Se requieren entre 1 y 40 salidas BOOL.');
 ensure(inputs.length>0&&inputs.length<=MAX_VARIABLES,'Se requiere al menos una entrada BOOL.');
 for(const o of outputs)ensure(declarations.outputs[o]===false,'La salida '+o+' tiene valor inicial TRUE; no equivale a bobina COIL.');
 function assignmentsUntil(stops){const statements=[];while(!stops.includes(peek())){
  ensure(peek()!=='<EOF>',`Línea ${where()}: fin prematuro, se esperaba ${stops.join(' / ')}.`);
  ensure(peek()!=='IF'&&peek()!=='ELSIF'&&peek()!=='FOR'&&peek()!=='WHILE'&&peek()!=='CASE',`Línea ${where()}: IF anidado, ciclos o CASE aún no son convertibles de forma segura.`);
  statements.push(assign());
  ensure(statements.length<=MAX_OUTPUTS,'Demasiadas asignaciones por bloque.');
 }return statements;}
 const statements=[];
 while(peek()!=='END_PROGRAM'&&peek()!=='<EOF>'){
  if(peek()==='IF'){
   take();const cond=or();take('THEN');const then=assignmentsUntil(['ELSE','END_IF','ELSIF']);
   ensure(peek()==='ELSE',`Línea ${where()}: IF requiere ELSE para evitar retención de salidas.`);
   take('ELSE');const otherwise=assignmentsUntil(['END_IF','ELSIF']);take('END_IF');take(';');
   statements.push({kind:'IF',cond,then,otherwise});
  }else{statements.push({kind:'DIRECT',assignment:assign()});}
  ensure(statements.length<=MAX_OUTPUTS,'El programa contiene demasiadas instrucciones.');
 }
 if(peek()==='END_PROGRAM')take();take('<EOF>');
 ensure(statements.length>0,'El programa no contiene asignaciones.');
 // Compile into a total combinational expression for each output; no implicit latches.
 const assigns=Object.create(null);
 const atom=a=>{ensure(own(declarations.outputs,a.name),'Solo pueden asignarse salidas BOOL declaradas: '+a.name);
  function check(n){if(n.op==='VAR')ensure(own(declarations.inputs,n.name),'La expresión solo puede leer entradas BOOL: '+n.name);else if(n.op==='NOT')check(n.arg);else if(n.op==='AND'||n.op==='OR'){check(n.a);check(n.b);}}
  check(a.expr);return a.expr;};
 function unique(list){let found=Object.create(null);for(const a of list){ensure(!own(found,a.name),'Salida repetida en una misma rama: '+a.name);found[a.name]=atom(a);}return found;}
 for(const s of statements){
  let produced;
  if(s.kind==='DIRECT'){produced=unique([s.assignment]);}
  else{
   function checkCond(n){if(n.op==='VAR')ensure(own(declarations.inputs,n.name),'Condición IF solo admite entradas BOOL: '+n.name);else if(n.op==='NOT')checkCond(n.arg);else if(n.op==='AND'||n.op==='OR'){checkCond(n.a);checkCond(n.b);}}
   checkCond(s.cond);const left=unique(s.then),right=unique(s.otherwise);
   ensure(Object.keys(left).length>0,'La rama THEN debe asignar salidas.');
   ensure(Object.keys(left).length===Object.keys(right).length&&Object.keys(left).every(k=>own(right,k)), 'THEN y ELSE deben asignar exactamente las mismas salidas BOOL.');
   produced=Object.create(null);for(const name of Object.keys(left))produced[name]={op:'OR',a:{op:'AND',a:s.cond,b:left[name]},b:{op:'AND',a:{op:'NOT',arg:s.cond},b:right[name]}};
  }
  for(const [name,expr]of Object.entries(produced)){ensure(!own(assigns,name),'La salida '+name+' se asigna varias veces; su secuenciación ST no puede compilarse a una única bobina.');assigns[name]=expr;}
 }
 ensure(outputs.every(name=>own(assigns,name)),'Faltan asignaciones totales para: '+outputs.filter(x=>!own(assigns,x)).join(', '));
 return {schema:1,source,declarations,assigns,statements,inputNames:inputs,outputNames:outputs};
}
function evaluate(node,signals){switch(node.op){case 'CONST':return node.value;case 'VAR':return signals[node.name]===true;case 'NOT':return !evaluate(node.arg,signals);case 'AND':return evaluate(node.a,signals)&&evaluate(node.b,signals);case 'OR':return evaluate(node.a,signals)||evaluate(node.b,signals);default:throw Error('AST no válido');}}
function negate(n){if(n.op==='CONST')return {op:'CONST',value:!n.value};if(n.op==='NOT')return n.arg;if(n.op==='AND')return {op:'OR',a:negate(n.a),b:negate(n.b)};if(n.op==='OR')return {op:'AND',a:negate(n.a),b:negate(n.b)};return {op:'NOT',arg:n};}
function dnf(ast){
 function calc(n){if(n.op==='CONST')return n.value?[[]]:[];if(n.op==='VAR')return [[{kind:'NO',variable:n.name}]];
  if(n.op==='NOT'){if(n.arg.op==='VAR')return [[{kind:'NC',variable:n.arg.name}]];return calc(negate(n.arg));}
  if(n.op==='OR')return [...calc(n.a),...calc(n.b)];if(n.op==='AND'){
    const x=calc(n.a),y=calc(n.b);ensure(x.length*y.length<=256,'La fórmula genera demasiadas combinaciones para v0.1.');
    return x.flatMap(a=>y.map(b=>[...a,...b]));}throw Error('AST no válido');}
 const raw=calc(ast),seen=new Set(),out=[];
 for(const b of raw){const v=new Map();let impossible=false;for(const c of b){const prev=v.get(c.variable);if(prev&&prev!==c.kind){impossible=true;break;}v.set(c.variable,c.kind);}if(impossible)continue;
  const contacts=[...v].map(([variable,kind])=>({kind,variable})).sort((a,b)=>a.variable.localeCompare(b.variable));
  if(contacts.length===0)throw Error('La fórmula incluye una rama TRUE incondicional; esta edición no dispone de contacto de constante seguro.');
  ensure(contacts.length<=MAX_CONTACTS,'Una rama requiere más de 12 contactos.');
  const key=JSON.stringify(contacts);if(!seen.has(key)){out.push(contacts);seen.add(key);} }
 // Remove redundant longer AND branches if a shorter branch implies them.
 const minimized=out.filter((candidate,i)=>!out.some((other,j)=>i!==j&&other.length<candidate.length&&other.every(c=>candidate.some(d=>d.variable===c.variable&&d.kind===c.kind))));
 ensure(minimized.length>0,'La salida es constante FALSE y no puede expresarse con bobinas KOP de v0.1.');
 ensure(minimized.length<=MAX_BRANCHES,'Se necesitan '+minimized.length+' ramas; AB-KOP Studio admite máximo 8.');
 return minimized;
}
function convert(ast){
 const rungs=ast.outputNames.map((name,i)=>({id:'R'+(i+1),name:'SCL: '+name+' · lógica combinacional',operation:'COIL',target:name,branches:dnf(ast.assigns[name])}));
 const model={schema:1,name:'AB-SCL Studio · conversión verificada',description:'Generado desde un subconjunto ST booleano. Sin escritura a PLC. Revisar antes de implementar.',inputs:{...ast.declarations.inputs},outputs:{...ast.declarations.outputs},rungs};
 return {model,rungs,verification:verify(ast,model)};
}
function evaluateKop(model,signals){const outputs=Object.create(null);for(const rung of model.rungs){const on=rung.branches.some(br=>br.every(c=>c.kind==='NO'?signals[c.variable]===true:signals[c.variable]!==true));outputs[rung.target]=on;}return outputs;}
function verify(ast,model){
 ensure(ast.inputNames.length<=12,'Para una verificación exhaustiva se admiten hasta 12 entradas BOOL; simplifica el proyecto.');
 const total=2**ast.inputNames.length;
 for(let bits=0;bits<total;bits++){
  const signals=Object.create(null);ast.inputNames.forEach((n,i)=>signals[n]=!!(bits&(1<<i)));
  const kop=evaluateKop(model,signals);
  for(const n of ast.outputNames)if(evaluate(ast.assigns[n],signals)!==kop[n])throw Error('Fallo de equivalencia en '+n+' para '+JSON.stringify(signals));
 }
 return {status:'VERIFIED',cases:total,outputs:ast.outputNames.length,method:'Exhaustivo para las 2^N combinaciones de entradas BOOL; semántica combinacional restringida.'};
}
function analyze(source){const ast=parse(source),compiled=convert(ast);return {ast,...compiled};}
function example(){return sample();}
function sample(){return `PROGRAM DemoCinta\nVAR_INPUT\n  START : BOOL;\n  STOP_OK : BOOL := TRUE;\n  ESTOP_OK : BOOL := TRUE;\n  SENSOR : BOOL;\nEND_VAR\nVAR_OUTPUT\n  MOTOR : BOOL;\n  PILOTO : BOOL;\n  ALARMA : BOOL;\nEND_VAR\n\n// Demostración sin retenciones ni temporizadores físicos.\nMOTOR := START AND STOP_OK AND ESTOP_OK;\nIF MOTOR_LOGIC AND SENSOR THEN\n  PILOTO := TRUE;\nELSE\n  PILOTO := FALSE;\nEND_IF;\nALARMA := NOT ESTOP_OK;\nEND_PROGRAM`.replace('MOTOR_LOGIC','START AND STOP_OK AND ESTOP_OK');}
return Object.freeze({lex,parse,evaluate,convert,dnf,verify,analyze,sample,example,evaluateKop});
});
