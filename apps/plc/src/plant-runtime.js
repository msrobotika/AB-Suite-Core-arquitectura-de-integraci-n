/**
 * MS ROBOTIKA · AB-PLC Simulator
 * Virtual PLC CPU + deterministic physical process models.
 * This is NOT a safety controller, hardware emulator or certified digital twin.
 */
import { PLCEngine, validateProgram } from "./plc-engine.js";

const clone = value => JSON.parse(JSON.stringify(value));
const c = (tag, nc = false) => ({ op: "contact", tag, nc });
const and = (...items) => ({ op: "and", items });
const or = (...items) => ({ op: "or", items });
const R = (id, name, when, action) => ({ id, name, when, action });

export const plantCatalog = Object.freeze({
  conveyor: {
    name: "Línea de transporte", process: "Transportador con fotocélula y contador",
    io: { "I0.0": "MARCHA", "I0.1": "PARO_OK", "I0.2": "ESTOP_OK",
      "I0.3": "FOTOCÉLULA", "I0.4": "RESET_LOTE", "I0.6": "MOTOR_OK",
      "Q0.0": "MOTOR", "Q0.1": "VELOCIDAD_ESTABLE", "Q0.2": "LOTE_LISTO",
      "AI0": "POSICIÓN SENSOR (%)" },
    faults: ["jam", "sensorStuck"]
  },
  tank: {
    name: "Depósito automático", process: "Llenado, descarga, niveles y fugas",
    io: { "I0.0": "MARCHA", "I0.1": "PARO_OK", "I0.2": "ESTOP_OK",
      "I0.3": "NIVEL_BAJO", "I0.4": "NIVEL_ALTO", "I0.6": "BOMBA_OK",
      "Q0.0": "VÁLVULA_LLENADO", "Q0.1": "VÁLVULA_DESCARGA",
      "Q0.2": "DEPÓSITO_LLENO", "AI0": "NIVEL (%)" },
    faults: ["leak", "levelSensorStuck"]
  },
  rack: {
    name: "Bastidor de E/S", process: "CPU genérica, sin proceso físico conectado",
    io: {}, faults: []
  }
});

export const conveyorProgram = {
  version: 1, name: "PLC · Transportador L-01", rungs: [
    R("CV01", "Enclavamiento de motor con permisos virtuales", and(
      or(c("I0.0"), c("Q0.0")), c("I0.1"), c("I0.2"), c("I0.6")
    ), { type: "coil", target: "Q0.0" }),
    R("CV02", "Motor durante 2 segundos", c("Q0.0"),
      { type: "ton", target: "T0", presetMs: 2000 }),
    R("CV03", "Piloto de marcha estable", c("T0"),
      { type: "coil", target: "Q0.1" }),
    R("CV04", "Contador de piezas, flanco positivo", and(c("Q0.0"), c("I0.3")),
      { type: "ctu", target: "C0", preset: 5 }),
    R("CV05", "Reset del contador", c("I0.4"),
      { type: "resetCounter", target: "C0" }),
    R("CV06", "Lote de 5 piezas completo", c("C0"),
      { type: "coil", target: "Q0.2" })
  ]
};

export const tankProgram = {
  version: 1, name: "PLC · Depósito T-01", rungs: [
    R("TK01", "Orden de llenar", c("I0.0"), { type: "set", target: "M0.0" }),
    R("TK02", "Detener llenado al llegar al alto", c("I0.4"), { type: "reset", target: "M0.0" }),
    R("TK03", "Salida de válvula llenado", and(c("M0.0"), c("I0.1"), c("I0.2"),
      c("I0.4", true), c("I0.6")), { type: "coil", target: "Q0.0" }),
    R("TK04", "Comenzar descarga al alcanzar alto", c("I0.4"),
      { type: "set", target: "M0.1" }),
    R("TK05", "Terminar descarga al alcanzar bajo", c("I0.3"),
      { type: "reset", target: "M0.1" }),
    R("TK06", "Salida de válvula descarga", and(c("M0.1"), c("I0.1"), c("I0.2")),
      { type: "coil", target: "Q0.1" }),
    R("TK07", "Indicador nivel alto", c("I0.4"),
      { type: "coil", target: "Q0.2" })
  ]
};

export const rackProgram = {
  version: 1, name: "PLC · Bastidor libre", rungs: [
    R("IO01", "Entrada activa salida", c("I0.0"), { type: "coil", target: "Q0.0" }),
    R("IO02", "Temporización de salida", c("Q0.0"),
      { type: "ton", target: "T0", presetMs: 1000 }),
    R("IO03", "Señal temporal", c("T0"), { type: "coil", target: "Q0.1" })
  ]
};
for (const program of [conveyorProgram, tankProgram, rackProgram]) validateProgram(program);
export const builtInPrograms = { conveyor: conveyorProgram, tank: tankProgram, rack: rackProgram };
export const faultDescriptions = {
  jam: "Motor atascado · abre permiso MOTOR_OK",
  sensorStuck: "Fotocélula permanentemente activada",
  leak: "Fuga · pierde volumen al margen de las válvulas",
  levelSensorStuck: "Sonda de nivel alto bloqueada en ON"
};

class ConveyorPlant {
  constructor() { this.reset(); }
  reset() { this.items = [20, 58]; this.delivered = 0; this.sensor = false; this.spawnTimer = 0; }
  advance(dtMs, outputs, faults) {
    const moving = Boolean(outputs["Q0.0"]) && !faults.jam;
    if (moving) {
      this.items = this.items.map(x => x + 23 * dtMs / 1000);
      const arrived = this.items.filter(x => x >= 100).length;
      this.delivered += arrived;
      this.items = this.items.filter(x => x < 100);
      this.spawnTimer += dtMs;
      while (this.spawnTimer >= 1700) {
        this.spawnTimer -= 1700;
        if (this.items.length < 12) this.items.push(0);
      }
    }
    this.sensor = Boolean(faults.sensorStuck) || this.items.some(x => x >= 70 && x <= 79);
  }
  sensors(faults) {
    return { digital: { "I0.3": this.sensor, "I0.6": !faults.jam },
      analog: { "AI0": this.items.length ? this.items[0] : 0 } };
  }
  state() {
    return { kind: "conveyor", items: [...this.items], delivered: this.delivered, sensor: this.sensor };
  }
}
class TankPlant {
  constructor() { this.reset(); }
  reset() { this.level = 15; this.totalFill = 0; this.totalDrain = 0; }
  advance(dtMs, outputs, faults) {
    const seconds = dtMs / 1000;
    const fill = Boolean(outputs["Q0.0"]) ? 19 * seconds : 0;
    const drain = Boolean(outputs["Q0.1"]) ? 15 * seconds : 0;
    const leak = faults.leak ? 3 * seconds : 0;
    const next = Math.max(0, Math.min(100, this.level + fill - drain - leak));
    this.totalFill += fill;
    this.totalDrain += drain + leak;
    this.level = Number(next.toFixed(5));
  }
  sensors(faults) {
    return { digital: { "I0.3": this.level <= 12, "I0.4": this.level >= 82 || Boolean(faults.levelSensorStuck), "I0.6": true },
      analog: { "AI0": this.level } };
  }
  state() {
    return { kind: "tank", level: this.level, totalFill: Number(this.totalFill.toFixed(3)),
      totalDrain: Number(this.totalDrain.toFixed(3)) };
  }
}
class RackPlant {
  reset() {}
  advance() {}
  sensors() { return { digital: {}, analog: {} }; }
  state() { return { kind: "rack" }; }
}

const PLANTS = { conveyor: ConveyorPlant, tank: TankPlant, rack: RackPlant };
const assertBool = (tag, value) => {
  if (!/^I\d+\.\d+$/.test(tag) || typeof value !== "boolean") throw new Error("Entrada digital inválida");
};

export class VirtualPLC {
  constructor(scenario = "conveyor", program) {
    this.loadScenario(scenario, program);
  }

  loadScenario(scenario, program) {
    if (!Object.hasOwn(PLANTS, scenario)) throw new Error("Proceso virtual desconocido: " + scenario);
    const selected = program ?? builtInPrograms[scenario];
    validateProgram(selected);
    this.scenario = scenario;
    this.program = clone(selected);
    this.engine = new PLCEngine(this.program);
    this.plant = new PLANTS[scenario]();
    this.mode = "STOP";
    this.manual = { "I0.0": false, "I0.1": true, "I0.2": true, "I0.4": false };
    this.force = {};
    this.faults = {};
    this.pulses = {};
    this.samples = [];
    this.events = [];
    this.simulatedMs = 0;
    this.scanNumber = 0;
    this.addEvent("CPU inicializada en STOP");
  }

  setMode(mode) {
    if (!["RUN", "PAUSE", "STOP"].includes(mode)) throw new Error("Modo de CPU inválido");
    if (mode === "STOP") {
      this.engine.loadProgram(this.program);
      this.pulses = {};
      this.manual["I0.0"] = false;
      this.manual["I0.4"] = false;
    }
    this.mode = mode;
    this.addEvent("CPU → " + mode);
  }

  reset() { this.loadScenario(this.scenario, this.program); }

  loadProgram(program) {
    validateProgram(program);
    this.loadScenario(this.scenario, program);
  }

  setInput(tag, value) {
    assertBool(tag, value);
    this.manual[tag] = value;
  }
  pulse(tag, ticks = 1) {
    assertBool(tag, true);
    if (!Number.isInteger(ticks) || ticks < 1 || ticks > 20) throw new Error("Duración de pulso inválida");
    this.manual[tag] = true;
    this.pulses[tag] = ticks;
  }
  pressStop() {
    this.manual["I0.1"] = false;
    this.pulses["I0.1"] = 2;
  }
  toggleEstop() {
    this.manual["I0.2"] = !this.manual["I0.2"];
    this.addEvent(this.manual["I0.2"] ? "Permiso E-STOP virtual restaurado" : "Permiso E-STOP virtual abierto");
  }
  setFault(name, enabled) {
    if (!plantCatalog[this.scenario].faults.includes(name) || typeof enabled !== "boolean")
      throw new Error("Fallo no disponible para este proceso");
    this.faults[name] = enabled;
    this.addEvent((enabled ? "FALLO → " : "RECUPERADO → ") + name);
  }
  forceInput(tag, value) {
    assertBool(tag, value === null ? false : value);
    if (value !== null && typeof value !== "boolean") throw new Error("Forzado inválido");
    if (value === null) delete this.force[tag];
    else this.force[tag] = value;
    this.addEvent(value === null ? "Liberado " + tag : "FORCE " + tag + "=" + Number(value));
  }

  addEvent(message) {
    this.events.unshift({ scan: this.scanNumber ?? 0, simulatedMs: this.simulatedMs ?? 0, message });
    if (this.events.length > 120) this.events.length = 120;
  }

  tick(dtMs = 100, step = false) {
    if (!step && this.mode !== "RUN") return null;
    if (step && this.mode === "STOP") this.setMode("PAUSE");
    if (!Number.isInteger(dtMs) || dtMs < 1 || dtMs > 1000) throw new Error("Intervalo de scan inválido");
    const previousQ = { ...this.engine.outputs };
    this.plant.advance(dtMs, previousQ, this.faults);
    const sensed = this.plant.sensors(this.faults);
    const digital = { ...this.manual, ...sensed.digital, ...this.force };
    for (const [tag, value] of Object.entries(digital)) this.engine.setInput(tag, value);
    for (const [tag, value] of Object.entries(sensed.analog)) this.engine.setAnalog(tag, value);
    const execution = this.engine.scan(dtMs);
    this.scanNumber++;
    this.simulatedMs += dtMs;
    for (const [tag, value] of Object.entries(this.pulses)) {
      this.pulses[tag] = value - 1;
      if (this.pulses[tag] <= 0) {
        this.manual[tag] = tag === "I0.1";
        delete this.pulses[tag];
      }
    }
    for (const change of execution.changes) this.addEvent(change.tag + " = " + Number(change.after));
    const sample = this.snapshot();
    this.samples.push(sample);
    if (this.samples.length > 1200) this.samples.shift();
    return sample;
  }

  snapshot() {
    const cpu = this.engine.snapshot();
    return {
      schema: "msrobotika.plc.snapshot.v1",
      scenario: this.scenario,
      mode: this.mode,
      scan: this.scanNumber,
      simulatedMs: this.simulatedMs,
      cpu: { inputs: cpu.inputs, outputs: cpu.outputs, memory: cpu.memory,
        analog: cpu.analog, timers: cpu.timers, counters: cpu.counters, trace: cpu.trace },
      plant: this.plant.state(),
      faults: { ...this.faults },
      forces: { ...this.force }
    };
  }
}
