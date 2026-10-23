// SPDX-License-Identifier: MIT
const test=require('node:test'),a=require('node:assert/strict'),E=require('../src/engine');
test('diagnóstico explica receptividad falsa y etapas faltantes',()=>{
 const m=E.sample(),s=E.initialState(m),d=E.explain(m,s);
 a.equal(d.length,4);a.equal(d[0].verdict,'RECEPTIVIDAD FALSA');
 a.deepEqual(d[1].missing,['E1']);m.inputs.marcha=true;
 a.equal(E.explain(m,s)[0].enabled,true);
});
test('secuencia completa reproducible T0-T1-T2-T3 sin mutar el proyecto',()=>{
 const m=E.sample(),saved=JSON.stringify(m);
 const x=E.runScenario(m,[
  {inputs:{marcha:true},expectActive:['E1']},
  {inputs:{carga_terminada:true},expectActive:['E2']},
  {inputs:{sellado_terminado:true},expectActive:['E3']},
  {inputs:{caja_fuera:true},expectActive:['E0']}
 ]);
 a.equal(x.ok,true);a.deepEqual(x.results.map(r=>r.fired),[['T0'],['T1'],['T2'],['T3']]);
 a.equal(JSON.stringify(m),saved);
});
test('escenario falla si no coincide el marcado esperado',()=>{
 const r=E.runScenario(E.sample(),[{inputs:{marcha:true},expectActive:['E2']}]);
 a.equal(r.ok,false);a.deepEqual(r.final.active,['E1']);
});
test('escenario bloquea conflicto de bifurcación simultánea',()=>{
 const m=E.sample();m.transitions.push({id:'T9',name:'Rama competitiva',from:['E0'],to:['E3'],condition:'marcha'});
 const r=E.runScenario(m,[{inputs:{marcha:true}}]);
 a.equal(r.ok,false);a.equal(r.final.status,'conflict');
});
test('validación estricta de escenario y máximo 200 pasos',()=>{
 const m=E.sample();a.throws(()=>E.runScenario(m,[{inputs:{marcha:1}}]),/Entrada de escenario/);
 a.throws(()=>E.runScenario(m,[{inputs:{desconocida:true}}]),/Entrada de escenario/);
 a.throws(()=>E.runScenario(m,Array(201).fill({inputs:{}})),/200/);
});
test('el parser rechaza claves peligrosas',()=>{
 for(const key of ['constructor','__proto__','prototype']){
  a.throws(()=>E.parseCondition(key),/Token inesperado/);
  const m=E.sample();Object.defineProperty(m.inputs,key,{value:true,enumerable:true,configurable:true});
  a.throws(()=>E.validateModel(m),/Entrada inválida/);
 }
});
test('diagnóstico señala receptividad constante falsa y ramas compartidas',()=>{
 const m=E.sample();m.transitions.push({id:'T9',name:'Alternativa',from:['E0'],to:['E3'],condition:'0'});
 const d=E.diagnostics(m).join(' ');
 a.match(d,/T9 tiene receptividad constante falsa/);a.match(d,/T0 y T9 comparten/);
});
test('compatibilidad del schema 1 anterior',()=>{
 const m=E.sample();a.equal(E.VERSION,1);a.equal(E.validateModel(JSON.parse(JSON.stringify(m))),true);
});
