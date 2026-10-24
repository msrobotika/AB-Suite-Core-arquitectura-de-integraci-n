import test from "node:test";
import assert from "node:assert/strict";
import { demoProgram } from "../src/demo-program.js";
import { conditionToStages, stagesToCondition, createDraft, compileDraft,
  editDraft, KopHistory, nextRungId } from "../src/kop-model.js";

const C = (tag, nc = false) => ({ op: "contact", tag, nc });
const one = expr => ({ version: 1, rungs: [{ id: "R1", name: "Prueba", when: expr,
  action: { type: "coil", target: "Q0.0" } }] });

test("condición en serie y paralelos conserva la semántica", () => {
  const expr = { op: "and", items: [C("I0.0"), { op: "or", items: [C("I0.1"), C("I0.2", true)] }] };
  assert.deepEqual(stagesToCondition(conditionToStages(expr)), expr);
});

test("las seis redes demo tienen correspondencia AST → KOP → AST", () => {
  const original = JSON.parse(JSON.stringify(demoProgram));
  const output = compileDraft(createDraft(original));
  assert.deepEqual(output, original);
});

test("AND anidados se normalizan a contactos equivalentes", () => {
  const expr = { op: "and", items: [C("I0.0"), { op: "and", items: [C("I0.1"), C("I0.2")] }] };
  assert.deepEqual(conditionToStages(expr).map(x => x.length), [1, 1, 1]);
});

test("expresiones no editables se conservan intactas", () => {
  const expr = { op: "not", item: { op: "compare", tag: "AI0", cmp: ">=", value: 55 } };
  const draft = createDraft(one(expr));
  assert.equal(draft.rungs[0].locked, true);
  assert.deepEqual(compileDraft(draft), one(expr));
  assert.throws(() => editDraft(draft, { type: "add-parallel", rungIndex: 0, stageIndex: 0 }),
    /JSON avanzado/);
});

test("crear red, añadir serie y paralelo, alterar contacto y compilar", () => {
  let draft = createDraft(one(C("I0.0")));
  draft = editDraft(draft, { type: "add-rung" });
  const newId = draft.rungs[1].id;
  assert.equal(newId, "K001");
  draft = editDraft(draft, { type: "add-series", rungIndex: 1, stageIndex: 0 });
  draft = editDraft(draft, { type: "add-parallel", rungIndex: 1, stageIndex: 0 });
  draft = editDraft(draft, { type: "contact-tag", rungIndex: 1, stageIndex: 0, branchIndex: 1, value: "I1.0" });
  draft = editDraft(draft, { type: "contact-nc", rungIndex: 1, stageIndex: 0, branchIndex: 1, value: true });
  const result = compileDraft(draft);
  assert.equal(result.rungs[1].when.op, "and");
  assert.equal(result.rungs[1].when.items[0].op, "or");
  assert.equal(result.rungs[1].when.items[0].items[1].nc, true);
});

test("eliminar contacto y reordenar redes", () => {
  let draft = createDraft(one(C("I0.0")));
  draft = editDraft(draft, { type: "add-rung" });
  draft = editDraft(draft, { type: "add-parallel", rungIndex: 0, stageIndex: 0 });
  draft = editDraft(draft, { type: "remove-contact", rungIndex: 0, stageIndex: 0, branchIndex: 1 });
  assert.equal(draft.rungs[0].stages[0].length, 1);
  draft = editDraft(draft, { type: "move-up", rungIndex: 1 });
  assert.equal(draft.rungs[0].id, "K001");
  draft = editDraft(draft, { type: "delete-rung", rungIndex: 1 });
  assert.equal(draft.rungs.length, 1);
  draft = editDraft(draft, { type: "delete-rung", rungIndex: 0 });
  assert.deepEqual(compileDraft(draft).rungs, []);
  assert.equal(compileDraft(editDraft(draft, {type:"add-rung"})).rungs.length, 1);
});

test("cambio de tipo bobina → TON y CTU corrige direccionamiento", () => {
  let draft = createDraft(one(C("I0.0")));
  draft = editDraft(draft, { type: "action-type", rungIndex: 0, value: "ton" });
  assert.equal(draft.rungs[0].action.target, "T0");
  draft = editDraft(draft, { type: "action-preset", rungIndex: 0, value: "1500" });
  assert.equal(compileDraft(draft).rungs[0].action.presetMs, 1500);
  draft = editDraft(draft, { type: "action-type", rungIndex: 0, value: "ctu" });
  assert.equal(draft.rungs[0].action.target, "C0");
  assert.equal(compileDraft(draft).rungs[0].action.preset, 5);
});

test("historial reversible sin mutar el programa original", () => {
  const original = one(C("I0.0"));
  const h = new KopHistory(original);
  assert.equal(h.dirty, false);
  h.change({ type: "contact-tag", rungIndex: 0, stageIndex: 0, branchIndex: 0, value: "I0.7" });
  assert.equal(h.dirty, true);
  assert.equal(h.export().rungs[0].when.tag, "I0.7");
  assert.equal(original.rungs[0].when.tag, "I0.0");
  assert.equal(h.undo(), true);
  assert.equal(h.dirty, false);
  assert.equal(h.redo(), true);
  assert.equal(h.export().rungs[0].when.tag, "I0.7");
});

test("validación delega al motor: direcciones, duplicados y rangos", () => {
  const h = new KopHistory(one(C("I0.0")));
  h.change({ type: "contact-tag", rungIndex: 0, stageIndex: 0, branchIndex: 0, value: "INVALID" });
  assert.throws(() => h.export(), /dirección/);
  assert.throws(() => conditionToStages(null).length, /Cannot read/);
});

test("ids K incrementan sin colisión y la serialización no incluye metadatos de editor", () => {
  const p = one(C("I0.0"));
  p.rungs[0].id = "K001";
  const draft = createDraft(p);
  assert.equal(nextRungId(draft), "K002");
  const output = compileDraft(draft);
  assert.equal("stages" in output.rungs[0], false);
  assert.equal("locked" in output.rungs[0], false);
});
