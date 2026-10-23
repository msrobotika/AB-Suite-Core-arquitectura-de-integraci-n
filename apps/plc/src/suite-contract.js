/**
 * MS ROBOTIKA Suite exchange contract v1 — offline, read-only exports.
 * The contract is a documented file format, NOT a live integration with other apps.
 */
const escapeCSV = value => {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
};
export const SUITE_SCHEMA = "msrobotika.suite.telemetry.v1";
export const suiteCatalog = Object.freeze([
  { id: "ab-kop", name: "AB-KOP Studio", role: "Editor Ladder", repository: "msrobotika/AB-KOP-Studio-v0.1" },
  { id: "ab-scl", name: "AB-SCL Studio", role: "Editor ST/SCL", repository: "msrobotika/AB-SCL-Studio" },
  { id: "ab-grafcet", name: "AB-GRAFCET Studio", role: "Editor GRAFCET", repository: "msrobotika/AB-GRAFCET-Studio-v0.1-c" },
  { id: "ab-modbus", name: "AB-Modbus Studio", role: "Monitor Modbus y SCADA", repository: "msrobotika/AB-Modbus-Studio" },
  { id: "ab-bi", name: "AB-BI Studio", role: "Análisis y reporting", repository: "msrobotika/AB-BI-Studio" },
  { id: "ab-vision", name: "AB-Vision Inspector", role: "Inspección visual", repository: "msrobotika/-AB-Vision-Inspector" }
]);

export function flattenSnapshot(frame) {
  if (frame?.schema !== "msrobotika.plc.snapshot.v1") throw new Error("Snapshot de PLC incompatible");
  const row = {
    scan: frame.scan, simulated_ms: frame.simulatedMs,
    scenario: frame.scenario, cpu_mode: frame.mode,
    process_value: frame.plant.kind === "tank" ? frame.plant.level :
      frame.plant.kind === "conveyor" ? frame.plant.delivered : 0,
    process_unit: frame.plant.kind === "tank" ? "percent" :
      frame.plant.kind === "conveyor" ? "packages" : "none",
    motor_or_fill: Number(Boolean(frame.cpu.outputs["Q0.0"])),
    lamp_or_drain: Number(Boolean(frame.cpu.outputs["Q0.1"])),
    count: frame.cpu.counters.C0?.cv ?? 0,
    analog_ai0: frame.cpu.analog.AI0 ?? 0,
    active_faults: Object.entries(frame.faults).filter(([,v])=>v).map(([k])=>k).join("|")
  };
  return row;
}

export function telemetryCSV(samples) {
  if (!Array.isArray(samples)) throw new Error("Las muestras deben formar un array");
  const keys = ["scan", "simulated_ms", "scenario", "cpu_mode", "process_value", "process_unit",
    "motor_or_fill", "lamp_or_drain", "count", "analog_ai0", "active_faults"];
  return [keys.join(","), ...samples.map(s => {
    const row = flattenSnapshot(s);
    return keys.map(key => escapeCSV(row[key])).join(",");
  })].join("\r\n") + "\r\n";
}

export function telemetryEnvelope(simulator) {
  const samples = simulator.samples.map(flattenSnapshot);
  return {
    schema: SUITE_SCHEMA,
    producer: { app: "AB-PLC-Simulator", version: "0.4.0" },
    source: "virtual",
    scenario: simulator.scenario,
    sample_period_ms: 100,
    fields: { scan: "count", simulated_ms: "ms", process_value: "process_unit",
      motor_or_fill: "bool", lamp_or_drain: "bool", count: "count", analog_ai0: "virtual" },
    samples
  };
}

// Explicit local register preview. No network socket and no wire-level Modbus server.
// Addresses are documented 0-based, 16-bit non-negative and saturate rather than wrap.
const word = value => Math.max(0, Math.min(65535, Math.trunc(Number(value) || 0)));
export function modbusPreview(frame) {
  const row = flattenSnapshot(frame);
  return {
    address_base: 0,
    holding_registers: [
      word(row.scan),
      word(row.simulated_ms / 100),
      word(row.count),
      word(row.analog_ai0 * 100),
      word(row.process_value * 100)
    ],
    input_registers: [word(row.analog_ai0*100),word(row.process_value*100)],
    coils: [
      Boolean(frame.cpu.outputs["Q0.0"]),
      Boolean(frame.cpu.outputs["Q0.1"]),
      Boolean(frame.cpu.outputs["Q0.2"])
    ],
    discrete_inputs: [
      Boolean(frame.cpu.inputs["I0.0"]),
      Boolean(frame.cpu.inputs["I0.1"]),
      Boolean(frame.cpu.inputs["I0.2"]),
      Boolean(frame.cpu.inputs["I0.3"])
    ]
  };
}

export function downloadText(content, filename, type = "application/json") {
  const blob = new Blob([content], { type: type + ";charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
