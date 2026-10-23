// SPDX-License-Identifier: MIT
const test=require('node:test'),a=require('node:assert/strict'),E=require('../src/engine');
test('modelo inicial e informe sin avisos',()=>{let m=E.sample();a.equal(E.validateModel(m),true);a.deepEqual(E.diagnostics(m),[]);});
test('receptividades booleanas sin evaluación dinámica',()=>{a.equal(E.evalCondition(E.parseCondition('a AND NOT b'),{a:true,b:false}),true);a.throws(()=>E.parseCondition('a; alert(1)'),/./);});
test('secuencias de la instalación de envasado',()=>{let m=E.sample(),s=E.initialState(m);m.inputs.marcha=true;s=E.advance(m,s);a.deepEqual(s.active,['E1']);m.inputs.carga_terminada=true;s=E.advance(m,s);a.deepEqual(s.active,['E2']);a.deepEqual(s.outputs,['RESISTENCIA_SELLO']);});
test('sin receptividad, sin avance',()=>{const m=E.sample();let x=E.advance(m,E.initialState(m));a.deepEqual(x.active,['E0']);a.equal(x.status,'waiting');});
test('divergencia ambigua se bloquea',()=>{let m=E.sample();m.inputs.marcha=true;m.transitions.push({id:'T9',name:'Alternativa',from:['E0'],to:['E3'],condition:'1'});let s=E.advance(m,E.initialState(m));a.equal(s.status,'conflict');a.deepEqual(s.active,['E0']);});
test('disparo simultáneo de transiciones independientes',()=>{let m=E.sample();m.stages[1].initial=true;m.transitions[0].condition='1';m.transitions[1].condition='1';m.inputs=E.collectInputs(m);let s=E.advance(m,E.initialState(m));a.equal(s.status,'fired');a.deepEqual(s.active,['E1','E2']);a.deepEqual(s.last,['T0','T1']);});

test('varias etapas origen requieren convergencia simultánea',()=>{
 const m=E.sample();m.transitions[0].from=['E0','E3'];m.transitions[0].condition='1';m.inputs=E.collectInputs(m);
 let s=E.initialState(m);a.equal(E.advance(m,s).status,'waiting');
 s.active=['E0','E3'];a.deepEqual(E.advance(m,s).active,['E1']);
});
test('OR activa destinos múltiples de una misma transición',()=>{
 const m=E.sample();m.inputs.marcha=true;m.transitions[0].to=['E1','E2'];
 const s=E.advance(m,E.initialState(m));a.deepEqual(s.active,['E1','E2']);
});
test('las salidas virtuales se calculan por OR de etapas activas',()=>{
 const m=E.sample();m.stages[1].actions.push('LISTO');
 a.deepEqual(E.outputState(m,['E0','E1']).sort(),['LISTO','MOTOR_CINTA','VALVULA_CARGA']);
});
test('condiciones paréntesis NOT AND OR y prioridad',()=>{
 const ast=E.parseCondition('(a OR b) AND NOT c');
 a.equal(E.evalCondition(ast,{a:false,b:true,c:false}),true);
 a.equal(E.evalCondition(ast,{a:false,b:true,c:true}),false);
});
test('rechaza ejecución JS, comparaciones y expresiones incompletas',()=>{
 for(const bad of ['a;alert(1)','a == b','a > 1','','a AND','(a OR b','a b'])
  a.throws(()=>E.parseCondition(bad),/./);
});
test('salidas mal identificadas y etapas duplicadas son inválidas',()=>{
 const m=E.sample();m.stages[0].actions=['salida con espacios'];
 a.throws(()=>E.validateModel(m),/Salidas/);
 m.stages[0].actions=['LISTO'];m.stages.push({...m.stages[0]});
 a.throws(()=>E.validateModel(m),/duplicado/);
});
test('no permite variables o destinos de etapa inexistentes',()=>{
 const m=E.sample();m.transitions[0].to=['E404'];
 a.throws(()=>E.validateModel(m),/Etapas/);
 m.transitions[0].to=['E1'];m.transitions[0].condition='sensor_nuevo';
 a.throws(()=>E.validateModel(m),/no declarada/);
});
test('recoge variables en AST de receptividad anidada',()=>{
 a.deepEqual(E.variables(E.parseCondition('a AND (b OR NOT a)')).sort(),['a','b']);
});
test('advertencia de etapa estructuralmente inaccesible',()=>{
 const m=E.sample();m.stages.push({id:'E9',name:'Desconectada',initial:false,actions:[],x:600,y:500});
 a.match(E.diagnostics(m).join(' '),/E9 inaccesible/);
});
