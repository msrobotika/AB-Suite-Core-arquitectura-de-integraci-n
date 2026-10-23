/**
 * AB-PLC Simulator / KOP graphical editor model.
 * Visual dialect: series of stages, with contacts connected in parallel inside a stage.
 * Unsupported AST conditions are preserved verbatim as read-only networks.
 * No DOM or side effects. MIT / MS ROBOTIKA.
 */
import { validateProgram } from "./plc-engine.js";

export const KOP_EDITOR_VERSION = "0.2.0";
export const clone = value => JSON.parse(JSON.stringify(value));
const contact = (tag = "I0.0", nc = false) => ({ op: "contact", tag, nc });

export function conditionToStages(expr) {
  if (!expr || typeof expr !== "object") return null;
  if (expr.op === "contact") return [[clone(expr)]];
  if (expr.op === "or") {
    if (!Array.isArray(expr.items) || expr.items.length < 2 ||
        !expr.items.every(child => child?.op === "contact")) return null;
    return [expr.items.map(clone)];
  }
  if (expr.op === "and") {
    if (!Array.isArray(expr.items) || expr.items.length < 2) return null;
    const all = [];
    for (const item of expr.items) {
      const next = conditionToStages(item);
      if (!next) return null;
      all.push(...next);
    }
    return all;
  }
  return null;
}

export function stagesToCondition(stages) {
  if (!Array.isArray(stages) || !stages.length) throw new Error("Se necesita al menos un contacto");
  const groups = stages.map(branches => {
    if (!Array.isArray(branches) || !branches.length) throw new Error("Rama vacía");
    return branches.length === 1
      ? clone(branches[0])
      : { op: "or", items: branches.map(clone) };
  });
  return groups.length === 1 ? groups[0] : { op: "and", items: groups };
}

export function createDraft(program) {
  validateProgram(program);
  const base = clone(program);
  return {
    ...base,
    rungs: base.rungs.map(rung => ({
      ...rung,
      stages: conditionToStages(rung.when),
      locked: conditionToStages(rung.when) === null
    }))
  };
}

export function compileDraft(draft) {
  const program = clone(draft);
  program.rungs = program.rungs.map(rung => {
    const { stages, locked, ...original } = rung;
    if (!locked) original.when = stagesToCondition(stages);
    return original;
  });
  validateProgram(program);
  return program;
}

export function nextRungId(draft) {
  const existing = new Set(draft.rungs.map(rung => rung.id));
  let n = 1;
  while (existing.has("K" + String(n).padStart(3, "0"))) n++;
  return "K" + String(n).padStart(3, "0");
}

export function addRung(draft) {
  const output = clone(draft);
  if (output.rungs.length >= 100) throw new Error("Límite de 100 redes");
  const id = nextRungId(output);
  output.rungs.push({
    id,
    name: "Nueva red " + id,
    when: contact("I0.5"),
    stages: [[contact("I0.5")]],
    locked: false,
    action: { type: "coil", target: "Q0.3" }
  });
  return output;
}

export function editDraft(draft, operation) {
  const result = clone(draft);
  const { type, rungIndex: ri, stageIndex: si, branchIndex: bi } = operation;
  if (type === "add-rung") return addRung(result);
  const rung = result.rungs[ri];
  if (!rung) throw new Error("Red no encontrada");
  if (type === "move-up" || type === "move-down") {
    const other = ri + (type === "move-up" ? -1 : 1);
    if (other < 0 || other >= result.rungs.length) return result;
    [result.rungs[ri], result.rungs[other]] = [result.rungs[other], result.rungs[ri]];
    return result;
  }
  if (type === "delete-rung") {
    if (result.rungs.length === 1) throw new Error("El programa debe tener al menos una red");
    result.rungs.splice(ri, 1);
    return result;
  }
  if (type === "rename") {
    rung.name = operation.value;
    return result;
  }
  if (type === "action-type") {
    const value = operation.value;
    if (!["coil", "set", "reset", "ton", "tof", "ctu", "resetCounter"].includes(value))
      throw new Error("Acción no soportada");
    const old = rung.action;
    const isTimer = value === "ton" || value === "tof";
    const isCounter = value === "ctu" || value === "resetCounter";
    const expected = isTimer ? "T" : isCounter ? "C" : "Q";
    const target = old.target.startsWith(expected) ? old.target : expected + (expected === "Q" ? "0.0" : "0");
    rung.action = { type: value, target };
    if (isTimer) rung.action.presetMs = old.presetMs ?? 1000;
    if (value === "ctu") rung.action.preset = old.preset ?? 5;
    return result;
  }
  if (type === "action-target") {
    rung.action.target = operation.value.toUpperCase();
    return result;
  }
  if (type === "action-preset") {
    if (rung.action.type === "ctu") rung.action.preset = Number(operation.value);
    else rung.action.presetMs = Number(operation.value);
    return result;
  }
  if (rung.locked) throw new Error("Esta red requiere el editor JSON avanzado");
  const stages = rung.stages;
  if (type === "add-series") {
    if (stages.length >= 24) throw new Error("Demasiados contactos en serie");
    stages.splice(si + 1, 0, [contact("I0.0")]);
    return result;
  }
  if (!stages[si]) throw new Error("Etapa no encontrada");
  if (type === "add-parallel") {
    if (stages[si].length >= 24) throw new Error("Demasiadas ramas en paralelo");
    stages[si].push(contact("I0.0"));
    return result;
  }
  if (type === "remove-contact") {
    if (!stages[si][bi]) throw new Error("Contacto no encontrado");
    if (stages[si].length > 1) stages[si].splice(bi, 1);
    else if (stages.length > 1) stages.splice(si, 1);
    else throw new Error("La red necesita al menos un contacto");
    return result;
  }
  const node = stages[si][bi];
  if (!node) throw new Error("Contacto no encontrado");
  if (type === "contact-tag") node.tag = operation.value.toUpperCase();
  else if (type === "contact-nc") node.nc = Boolean(operation.value);
  else throw new Error("Operación no válida: " + type);
  return result;
}

export class KopHistory {
  constructor(program) { this.load(program); }
  load(program) {
    this.current = createDraft(program);
    this.past = [];
    this.future = [];
    this.saved = JSON.stringify(compileDraft(this.current));
  }
  get dirty() { return JSON.stringify(compileDraft(this.current)) !== this.saved; }
  change(operation) {
    const next = editDraft(this.current, operation);
    if (JSON.stringify(next) === JSON.stringify(this.current)) return;
    this.past.push(clone(this.current));
    if (this.past.length > 60) this.past.shift();
    this.current = next;
    this.future = [];
  }
  undo() {
    if (!this.past.length) return false;
    this.future.push(clone(this.current));
    this.current = this.past.pop();
    return true;
  }
  redo() {
    if (!this.future.length) return false;
    this.past.push(clone(this.current));
    this.current = this.future.pop();
    return true;
  }
  export() { return compileDraft(this.current); }
}
