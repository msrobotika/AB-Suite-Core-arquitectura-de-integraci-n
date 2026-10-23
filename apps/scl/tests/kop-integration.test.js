// SPDX-License-Identifier: MIT
const test=require('node:test'),a=require('node:assert/strict'),C=require('../src/core');
const K=require('../../kop/src/engine.js');
test('AB-SCL genera proyectos importables y semánticamente equivalentes al motor real AB-KOP Studio',()=>{
 const programs=[C.sample(),
  'VAR_INPUT A:BOOL; B:BOOL; C:BOOL; END_VAR VAR_OUTPUT Q:BOOL; END_VAR Q:=(A AND B) OR NOT C;',
  'VAR_INPUT A:BOOL; B:BOOL; END_VAR VAR_OUTPUT Q:BOOL; R:BOOL; END_VAR IF A THEN Q:=B; R:=NOT B; ELSE Q:=NOT B; R:=B; END_IF;'
 ];
 for(const program of programs){
  const output=C.analyze(program);
  a.equal(K.validate(output.model),true);
  const names=output.ast.inputNames;
  for(let vector=0;vector<2**names.length;vector++){
   const input=Object.fromEntries(names.map((n,i)=>[n,Boolean(vector&(1<<i))]));
   const result=K.scan(output.model,K.initial(output.model),input);
   for(const name of output.ast.outputNames) a.equal(result.outputs[name],C.evaluate(output.ast.assigns[name],input),
     'Diferencia entre motores para '+name+' / vector '+vector);
  }
 }
});
