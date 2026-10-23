import test from "node:test";
import assert from "node:assert/strict";
import { guideForSnapshot } from "../src/lab-onboarding.js";

function frame(overrides = {}) {
  return {
    scenario: "conveyor",
    mode: "STOP",
    cpu: { inputs: { "I0.2": true }, outputs: { "Q0.0": false } },
    faults: {},
    plant: { delivered: 0, level: 15 },
    ...overrides
  };
}

test("guía sin PLC real: primero arrancar, luego pulsar marcha", () => {
  assert.equal(guideForSnapshot(frame()).step, 1);
  const running = frame({ mode: "RUN" });
  const step2 = guideForSnapshot(running);
  assert.equal(step2.step, 2);
  assert.match(step2.description, /MARCHA/);
});

test("pausa y E-STOP muestran instrucciones para recuperar el proceso", () => {
  assert.match(guideForSnapshot(frame({mode:"PAUSE"})).title, /Reanuda/);
  const x = frame({mode:"RUN", cpu:{inputs:{"I0.2":false},outputs:{"Q0.0":false}}});
  assert.match(guideForSnapshot(x).title, /Rearma/);
});

test("transportador guía hacia una entrega y después a un fallo controlado", () => {
  const on = frame({mode:"RUN",cpu:{inputs:{"I0.2":true},outputs:{"Q0.0":true}}});
  assert.equal(guideForSnapshot(on).step, 3);
  assert.match(guideForSnapshot(frame({...on,plant:{delivered:1}})).title, /fallo/);
  const fault = frame({...on,faults:{jam:true}});
  assert.equal(guideForSnapshot(fault).step, 4);
  assert.match(guideForSnapshot(fault).description, /desmarca/);
});

test("depósito guía desde llenado hasta fuga virtual", () => {
  const tank = frame({scenario:"tank",mode:"RUN"});
  assert.match(guideForSnapshot(tank).description, /llenado/);
  const filling = {...tank,cpu:{inputs:{"I0.2":true},outputs:{"Q0.0":true}},plant:{level:20}};
  assert.equal(guideForSnapshot(filling).step, 3);
  assert.match(guideForSnapshot({...filling,plant:{level:27}}).description, /Fuga/);
});

test("bastidor enseña entrada, salida y temporizador", () => {
  const rack = frame({scenario:"rack",mode:"RUN"});
  assert.match(guideForSnapshot(rack).description, /I0.0/);
  const input = {...rack,cpu:{inputs:{"I0.0":true,"I0.2":true},outputs:{"Q0.0":false}}};
  assert.equal(guideForSnapshot(input).step, 3);
  assert.match(guideForSnapshot({...input,cpu:{...input.cpu,outputs:{"Q0.0":true}}}).description, /Q0.1/);
});

test("no permite mostrar guía incorrecta para escenario no soportado", () => {
  assert.throws(()=>guideForSnapshot(frame({scenario:"unknown"})),/Escenario/);
});
