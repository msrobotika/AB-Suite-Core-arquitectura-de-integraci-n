import test from "node:test";
import assert from "node:assert/strict";
import { PLCEngine, validateProgram } from "../src/plc-engine.js";
import { demoProgram } from "../src/demo-program.js";

const cond = tag => ({ op: "contact", tag });
const program = (...rungs) => ({ version: 1, rungs });
const rung = (id, when, action) => ({ id, name: id, when, action });

function demo() {
  const plc = new PLCEngine(demoProgram);
  plc.setInput("I0.1", true);
  plc.setInput("I0.2", true);
  return plc;
}

test("validación del programa de muestra", () => {
  assert.equal(validateProgram(demoProgram), true);
});

test("arranque y enclavamiento sin mantener el pulsador", () => {
  const plc = demo();
  plc.setInput("I0.0", true);
  plc.scan();
  plc.setInput("I0.0", false);
  plc.scan();
  assert.equal(plc.read("Q0.0"), true);
});

test("paro interrumpe el motor en el siguiente ciclo", () => {
  const plc = demo();
  plc.setInput("I0.0", true); plc.scan();
  plc.setInput("I0.0", false); plc.setInput("I0.1", false);
  plc.scan();
  assert.equal(plc.read("Q0.0"), false);
});

test("permisivo de emergencia interrumpe el motor", () => {
  const plc = demo();
  plc.setInput("I0.0", true); plc.scan();
  plc.setInput("I0.2", false); plc.scan();
  assert.equal(plc.read("Q0.0"), false);
});

test("TON 2s contabiliza por ticks y se reinicia cuando cae la condición", () => {
  const plc = demo();
  plc.setInput("I0.0", true);
  for (let i = 0; i < 19; i++) plc.scan(100);
  assert.equal(plc.read("T0"), false);
  plc.scan(100);
  assert.equal(plc.read("T0"), true);
  assert.equal(plc.read("Q0.1"), true);
  plc.setInput("I0.1", false); plc.scan(100);
  assert.equal(plc.read("T0"), false);
  assert.equal(plc.timers.T0.et, 0);
});

test("CTU solo aumenta en flanco ascendente", () => {
  const plc = demo();
  plc.setInput("I0.0", true); plc.scan();
  plc.setInput("I0.3", true);
  for (let i = 0; i < 7; i++) plc.scan();
  assert.equal(plc.counters.C0.cv, 1);
  for (let i = 0; i < 4; i++) {
    plc.setInput("I0.3", false); plc.scan();
    plc.setInput("I0.3", true); plc.scan();
  }
  assert.equal(plc.counters.C0.cv, 5);
  assert.equal(plc.read("Q0.2"), true);
});

test("reset de contador deja CV=0 y apaga la salida", () => {
  const plc = demo();
  plc.setInput("I0.0", true); plc.scan();
  for (let i = 0; i < 5; i++) {
    plc.setInput("I0.3", true); plc.scan();
    plc.setInput("I0.3", false); plc.scan();
  }
  plc.setInput("I0.4", true); plc.scan();
  assert.equal(plc.counters.C0.cv, 0);
  assert.equal(plc.read("Q0.2"), false);
});

test("comparación analógica y contacto normalmente cerrado", () => {
  const plc = new PLCEngine(program(
    rung("R1", { op: "and", items: [
      { op: "compare", tag: "AI0", cmp: ">=", value: 7.5 },
      { op: "contact", tag: "I0.0", nc: true }
    ] }, { type: "coil", target: "Q0.0" })
  ));
  plc.setAnalog("AI0", 7.6); plc.scan();
  assert.equal(plc.read("Q0.0"), true);
  plc.setInput("I0.0", true); plc.scan();
  assert.equal(plc.read("Q0.0"), false);
});

test("TOF conserva salida solo durante la desconexión configurada", () => {
  const plc = new PLCEngine(program(
    rung("R1", cond("I0.0"), { type: "tof", target: "T1", presetMs: 300 }),
    rung("R2", cond("T1"), { type: "coil", target: "Q0.0" })
  ));
  plc.setInput("I0.0", true); plc.scan(100);
  assert.equal(plc.read("Q0.0"), true);
  plc.setInput("I0.0", false); plc.scan(100);
  assert.equal(plc.read("Q0.0"), true);
  plc.scan(100); assert.equal(plc.read("Q0.0"), true);
  plc.scan(100); assert.equal(plc.read("Q0.0"), false);
});

test("SET y RESET conservan estado hasta orden contraria", () => {
  const plc = new PLCEngine(program(
    rung("R1", cond("I0.0"), { type: "set", target: "M0.0" }),
    rung("R2", cond("I0.1"), { type: "reset", target: "M0.0" }),
    rung("R3", cond("M0.0"), { type: "coil", target: "Q0.0" })
  ));
  plc.setInput("I0.0", true); plc.scan();
  plc.setInput("I0.0", false); plc.scan();
  assert.equal(plc.read("Q0.0"), true);
  plc.setInput("I0.1", true); plc.scan();
  assert.equal(plc.read("Q0.0"), false);
});

test("rechaza programas inválidos y entradas mal tipadas", () => {
  assert.throws(() => validateProgram(program(rung("R1", cond("I0.0"),
    { type: "ton", target: "T0", presetMs: -1 }))), /Preset/);
  assert.throws(() => validateProgram(program(rung("R1", { op: "shell" },
    { type: "coil", target: "Q0.0" }))), /soportada/);
  const plc = demo();
  assert.throws(() => plc.setInput("Q0.0", true), /dirección/);
  assert.throws(() => plc.scan(1001), /intervalo/);
});

test("repetición determinista a partir de un mismo programa y secuencia", () => {
  const run = () => {
    const plc = demo();
    for (let i = 0; i < 100; i++) {
      plc.setInput("I0.0", i === 0);
      plc.setInput("I0.3", i % 8 === 4);
      plc.scan(100);
    }
    return plc.snapshot();
  };
  assert.deepEqual(run(), run());
});
