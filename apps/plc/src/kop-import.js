/**
 * Strict format adapter: AB-KOP Studio schema:1 → AB-PLC Simulator version:1.
 * Can also accept AB-SCL Studio's exported AB-KOP JSON, which shares that format.
 * The formats are not identical; this adapter documents exact mapping and limits.
 */
import { validateProgram } from "./plc-engine.js";
const ident = /^[A-Z][A-Z0-9_]{0,31}$/;
const assert = (ok,msg) => { if(!ok) throw new Error(msg); };
const c = (tag,nc=false) => ({ op:"contact",tag,nc });
const combo = (op,items) => items.length === 1 ? items[0] : ({op,items});

export function importABKop(source, scanMs = 100) {
  assert(Number.isInteger(scanMs) && scanMs >= 1 && scanMs <= 1000,"Periodo del scan inválido");
  assert(source && typeof source === "object" && source.schema === 1, "No es un proyecto AB-KOP schema 1");
  assert(source.inputs && !Array.isArray(source.inputs) && typeof source.inputs === "object", "Faltan entradas AB-KOP");
  assert(source.outputs && !Array.isArray(source.outputs) && typeof source.outputs === "object", "Faltan salidas AB-KOP");
  const inputs = Object.entries(source.inputs);
  const outputs = Object.entries(source.outputs);
  assert(inputs.length <= 60 && outputs.length <= 60,"Máximo 60 entradas y 60 salidas");
  assert(Array.isArray(source.rungs) && source.rungs.length >= 1 && source.rungs.length <= 40,"Se requieren entre 1 y 40 redes AB-KOP");
  const names = new Set();
  for (const [name,value] of [...inputs,...outputs]) {
    assert(ident.test(name) && !["__PROTO__","CONSTRUCTOR","PROTOTYPE"].includes(name), "Nombre de variable AB-KOP inválido");
    assert(!names.has(name),"Nombre de variable duplicado");
    assert(typeof value === "boolean","Entrada/salida AB-KOP debe ser booleana");
    names.add(name);
  }
  const symbols = Object.create(null);
  inputs.forEach(([name],i)=> { symbols[name] = "I0."+i; });
  outputs.forEach(([name],i)=> { symbols[name] = "Q0."+i; });
  const timers = [...new Set(source.rungs.filter(r=>r.operation==="TON").map(r=>r.target))];
  timers.forEach((name,i)=> {
    assert(ident.test(name) && !names.has(name) && !names.has(name+"_DONE"), "Símbolo TON inválido o ambiguo");
    symbols[name+"_DONE"] = "T"+i;
  });
  const ids = new Set();
  const rungs = source.rungs.map((r,i) => {
    assert(r && ident.test(r.id) && !ids.has(r.id), "ID de red AB-KOP inválido o duplicado");
    ids.add(r.id);
    assert(typeof r.name === "string" && r.name.length <= 120, "Nombre de red inválido");
    assert(Array.isArray(r.branches) && r.branches.length >= 1 && r.branches.length <= 8,"Número de ramas inválido");
    const branches = r.branches.map(branch=>{
      assert(Array.isArray(branch) && branch.length >= 1 && branch.length <= 12,"Contactos de rama inválidos");
      return combo("and",branch.map(x=>{
        assert(x && ["NO","NC"].includes(x.kind) && ident.test(x.variable),"Contacto AB-KOP inválido");
        assert(Object.hasOwn(symbols,x.variable),"Contacto sin símbolo conocido: "+x.variable);
        return c(symbols[x.variable],x.kind==="NC");
      }));
    });
    const when = combo("or",branches);
    let action;
    if(r.operation==="TON") {
      assert(timers.includes(r.target),"Temporizador inexistente");
      assert(Number.isInteger(r.preset) && r.preset >= 1 && r.preset <= 3600, "Preset TON inválido");
      action = { type:"ton", target:symbols[r.target+"_DONE"], presetMs:r.preset*scanMs };
    } else {
      assert(["COIL","SET","RESET"].includes(r.operation),"Operación AB-KOP no soportada");
      assert(Object.hasOwn(source.outputs,r.target),"El destino no está declarado como salida");
      action={type:r.operation.toLowerCase()==="coil"?"coil":r.operation.toLowerCase(),target:symbols[r.target]};
    }
    return { id:"IMP"+String(i+1).padStart(3,"0"),name:r.name,when,action };
  });
  const program = { version:1,name:"Importado · "+String(source.name??"AB-KOP").slice(0,80),rungs };
  validateProgram(program);
  return {
    program,
    inputDefaults:Object.fromEntries(inputs.map(([k,v])=>[symbols[k],v])),
    symbols:Object.fromEntries(Object.entries(symbols)),
    sourceFormat:"ab-kop.schema-1",
    warnings:[
      "Los TON de AB-KOP cuentan exploraciones; cada ciclo se traduce a "+scanMs+" ms virtuales.",
      "AB-KOP y AB-PLC tienen semánticas de ejecución propias; no se garantiza equivalencia en redes que leen otras salidas ni en casos límite temporizados.",
      "Es un programa en el bastidor virtual. Los nombres simbólicos se traducen a direcciones I/Q/T."
    ]
  };
}
