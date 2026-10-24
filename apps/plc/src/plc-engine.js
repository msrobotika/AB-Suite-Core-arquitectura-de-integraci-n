/**
 * AB-PLC Simulator — deterministic educational IEC-inspired scan engine.
 * @license MIT
 *
 * This engine intentionally does not implement Siemens/Omron/IEC runtimes.
 * Tags: I0.0, Q0.0, M0.0 (boolean), AI0/AQ0 (number), T0, C0 (done bits).
 */
export const ENGINE_VERSION = "0.1.0";

const BOOL_TAG = /^[IQM]\d+\.\d+$/;
const ANALOG_TAG = /^(AI|AQ)\d+$/;
const TIMER_TAG = /^T\d+$/;
const COUNTER_TAG = /^C\d+$/;
const MAX_RUNG_DEPTH = 16;
const MAX_PRESET_MS = 86_400_000;

function assert(ok, message) {
  if (!ok) throw new Error(message);
}

function validTag(value, pattern, label) {
  assert(typeof value === "string" && pattern.test(value), label + ": dirección no válida");
}
function finiteNumber(value, label) {
  assert(typeof value === "number" && Number.isFinite(value), label + ": valor numérico no válido");
}

function validateExpr(expr, depth = 0) {
  assert(depth <= MAX_RUNG_DEPTH, "Expresión demasiado profunda");
  assert(expr && typeof expr === "object" && !Array.isArray(expr), "Condición inválida");
  switch (expr.op) {
    case "contact":
      validTag(expr.tag, /^(?:[IQM]\d+\.\d+|T\d+|C\d+)$/, "Contacto");
      if (expr.nc !== undefined) assert(typeof expr.nc === "boolean", "NC debe ser booleano");
      return;
    case "and":
    case "or":
      assert(Array.isArray(expr.items) && expr.items.length >= 2 && expr.items.length <= 24,
        "AND/OR exige entre 2 y 24 condiciones");
      expr.items.forEach(item => validateExpr(item, depth + 1));
      return;
    case "not":
      validateExpr(expr.item, depth + 1);
      return;
    case "compare":
      validTag(expr.tag, /^(?:AI|AQ)\d+$/, "Comparador");
      assert(["<", "<=", "==", "!=", ">=", ">"].includes(expr.cmp), "Operador de comparación inválido");
      finiteNumber(expr.value, "Comparador");
      return;
    case "always":
      return;
    default:
      throw new Error("Operación lógica no soportada: " + String(expr.op));
  }
}

export function validateProgram(program) {
  assert(program && typeof program === "object" && !Array.isArray(program), "Programa inválido");
  assert(program.version === 1, "Versión de programa no soportada (se requiere 1)");
  assert(Array.isArray(program.rungs) && program.rungs.length <= 100,
    "Máximo 100 redes");
  const ids = new Set();
  for (const rung of program.rungs) {
    assert(rung && typeof rung === "object", "Red inválida");
    assert(typeof rung.id === "string" && /^[a-zA-Z0-9_-]{1,40}$/.test(rung.id), "ID de red inválido");
    assert(!ids.has(rung.id), "ID de red repetido: " + rung.id);
    ids.add(rung.id);
    assert(typeof rung.name === "string" && rung.name.length <= 120, "Nombre de red inválido");
    validateExpr(rung.when);
    const action = rung.action;
    assert(action && typeof action === "object", "Acción ausente en " + rung.id);
    switch (action.type) {
      case "coil":
      case "set":
      case "reset":
        validTag(action.target, /^[QM]\d+\.\d+$/, "Bobina");
        break;
      case "ton":
      case "tof":
        validTag(action.target, TIMER_TAG, "Temporizador");
        finiteNumber(action.presetMs, "Temporizador");
        assert(Number.isInteger(action.presetMs) && action.presetMs >= 0 &&
          action.presetMs <= MAX_PRESET_MS, "Preset de temporizador fuera de rango");
        break;
      case "ctu":
        validTag(action.target, COUNTER_TAG, "Contador");
        assert(Number.isInteger(action.preset) && action.preset >= 1 && action.preset <= 65535,
          "Preset de contador fuera de rango");
        break;
      case "resetCounter":
        validTag(action.target, COUNTER_TAG, "Reset de contador");
        break;
      default:
        throw new Error("Acción no soportada: " + String(action.type));
    }
  }
  return true;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

/** One scan is synchronous, deterministic and has no wall-clock dependency. */
export class PLCEngine {
  constructor(program) {
    this.program = null;
    this.reset();
    if (program) this.loadProgram(program);
  }

  reset() {
    this.inputs = Object.create(null);
    this.outputs = Object.create(null);
    this.memory = Object.create(null);
    this.analog = Object.create(null);
    this.timers = Object.create(null);
    this.counters = Object.create(null);
    this.scanCount = 0;
    this.elapsedMs = 0;
    this.lastRungs = [];
  }

  loadProgram(program) {
    validateProgram(program);
    this.program = clone(program);
    this.reset();
  }

  setInput(tag, value) {
    validTag(tag, /^I\d+\.\d+$/, "Entrada");
    assert(typeof value === "boolean", "La entrada digital debe ser booleana");
    this.inputs[tag] = value;
  }

  setAnalog(tag, value) {
    validTag(tag, /^AI\d+$/, "Entrada analógica");
    finiteNumber(value, "Entrada analógica");
    this.analog[tag] = value;
  }

  read(tag) {
    if (TIMER_TAG.test(tag)) return Boolean(this.timers[tag]?.q);
    if (COUNTER_TAG.test(tag)) return Boolean(this.counters[tag]?.q);
    if (tag.startsWith("I")) return Boolean(this.inputs[tag]);
    if (tag.startsWith("Q")) return Boolean(this.outputs[tag]);
    if (tag.startsWith("M")) return Boolean(this.memory[tag]);
    return false;
  }

  analogValue(tag) {
    return Number(this.analog[tag] ?? 0);
  }

  evaluate(expr) {
    switch (expr.op) {
      case "always": return true;
      case "contact": return expr.nc ? !this.read(expr.tag) : this.read(expr.tag);
      case "not": return !this.evaluate(expr.item);
      case "and": return expr.items.every(item => this.evaluate(item));
      case "or": return expr.items.some(item => this.evaluate(item));
      case "compare": {
        const actual = this.analogValue(expr.tag);
        switch (expr.cmp) {
          case "<": return actual < expr.value;
          case "<=": return actual <= expr.value;
          case "==": return actual === expr.value;
          case "!=": return actual !== expr.value;
          case ">=": return actual >= expr.value;
          case ">": return actual > expr.value;
        }
      }
    }
    throw new Error("Condición desconocida");
  }

  apply(action, enabled, dtMs) {
    const tag = action.target;
    switch (action.type) {
      case "coil":
      case "set":
      case "reset": {
        const bank = tag.startsWith("Q") ? this.outputs : this.memory;
        if (action.type === "coil") bank[tag] = enabled;
        else if (enabled) bank[tag] = action.type === "set";
        break;
      }
      case "ton": {
        const state = this.timers[tag] ?? { et: 0, q: false };
        state.et = enabled ? Math.min(action.presetMs, state.et + dtMs) : 0;
        state.q = enabled && state.et >= action.presetMs;
        this.timers[tag] = state;
        break;
      }
      case "tof": {
        const state = this.timers[tag] ?? { et: 0, q: false };
        if (enabled) { state.et = 0; state.q = true; }
        else if (state.q) {
          state.et = Math.min(action.presetMs, state.et + dtMs);
          state.q = state.et < action.presetMs;
        }
        this.timers[tag] = state;
        break;
      }
      case "ctu": {
        const state = this.counters[tag] ?? { cv: 0, q: false, previous: false };
        if (enabled && !state.previous) state.cv = Math.min(65535, state.cv + 1);
        state.previous = enabled;
        state.q = state.cv >= action.preset;
        this.counters[tag] = state;
        break;
      }
      case "resetCounter": {
        if (enabled) {
          const state = this.counters[tag] ?? { cv: 0, q: false, previous: false };
          state.cv = 0;
          state.q = false;
          this.counters[tag] = state;
        }
        break;
      }
    }
  }

  scan(dtMs = 100) {
    assert(this.program !== null, "No hay programa cargado");
    finiteNumber(dtMs, "Tiempo de escaneo");
    assert(dtMs > 0 && dtMs <= 1000, "El intervalo de escaneo debe estar entre 0 y 1000 ms");
    const old = { ...this.outputs };
    const trace = [];
    for (const rung of this.program.rungs) {
      const enabled = this.evaluate(rung.when);
      this.apply(rung.action, enabled, dtMs);
      trace.push({ id: rung.id, enabled });
    }
    this.lastRungs = trace;
    this.scanCount++;
    this.elapsedMs += dtMs;
    const changes = [];
    for (const tag of new Set([...Object.keys(old), ...Object.keys(this.outputs)])) {
      const before = Boolean(old[tag]);
      const after = Boolean(this.outputs[tag]);
      if (before !== after) changes.push({ tag, before, after });
    }
    return { scanCount: this.scanCount, elapsedMs: this.elapsedMs, changes, trace };
  }

  snapshot() {
    return {
      scanCount: this.scanCount,
      elapsedMs: this.elapsedMs,
      inputs: { ...this.inputs },
      outputs: { ...this.outputs },
      memory: { ...this.memory },
      analog: { ...this.analog },
      timers: clone(this.timers),
      counters: clone(this.counters),
      trace: clone(this.lastRungs)
    };
  }
}
