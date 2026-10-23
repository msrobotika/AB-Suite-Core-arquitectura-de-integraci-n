import { PLCEngine, validateProgram } from "./plc-engine.js";
import { demoProgram, inputLabels, outputLabels } from "./demo-program.js";
import { mountKopEditor } from "./kop-ui.js";
import { startLab } from "./lab-launch.js";

const $ = id => document.getElementById(id);
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));
const engine = new PLCEngine(demoProgram);
const STORAGE_KEY = "ab-plc-program-v1";
let running = true;
let view = "console";
let packages = [{ id: 1, x: 23 }, { id: 2, x: 53 }];
let nextPackageId = 3;
let pulses = new Map();
let events = [];
let lastMotor = false;
let emergency = false;
let toastTimeout;
let kopEditor;

function announce(message, kind = "ok") {
  const el = $("toast");
  el.textContent = message;
  el.className = "show " + kind;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { el.className = ""; }, 3600);
}

function logEvent(message, type = "info") {
  events.unshift({ message, type, time: (engine.elapsedMs / 1000).toFixed(1) + " s" });
  if (events.length > 60) events.length = 60;
}

function initializeInputs() {
  engine.setInput("I0.1", true); // NC stop loop simulated permissive
  engine.setInput("I0.2", true); // NC emergency loop simulated permissive
}

function loadSaved() {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    if (text) engine.loadProgram(JSON.parse(text));
  } catch (err) {
    console.warn("Programa local ignorado:", err);
  }
  initializeInputs();
}

function saveLocal() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(engine.program)); }
  catch (err) { console.warn("No se pudo guardar en el navegador", err); }
}

function resetSimulation(message = "Estado del PLC reiniciado") {
  const program = engine.program;
  engine.loadProgram(program);
  initializeInputs();
  packages = [{ id: 1, x: 23 }, { id: 2, x: 53 }];
  nextPackageId = 3;
  pulses.clear();
  emergency = false;
  lastMotor = false;
  logEvent("Memoria de ejecución reiniciada");
  renderAll();
  announce(message);
}

function queuePulse(tag, ticks = 2, active = true) {
  engine.setInput(tag, active);
  pulses.set(tag, { ticks, release: !active });
}

function simulatePackages() {
  const motor = engine.read("Q0.0");
  if (motor) {
    for (const item of packages) item.x += 1.8; // 18% del ancho / segundo a 100 ms
    packages = packages.filter(item => item.x < 110);
    const leftmost = Math.min(...packages.map(item => item.x), Infinity);
    if (leftmost > 22) packages.push({ id: nextPackageId++, x: -12 });
  }
  const sensorActive = motor && packages.some(item => item.x >= 66 && item.x < 73);
  engine.setInput("I0.3", sensorActive);
}

function tick() {
  if (!running || view === "lab") return;
  simulatePackages();
  const result = engine.scan(100);
  for (const change of result.changes) {
    logEvent(change.tag + " → " + (change.after ? "ON" : "OFF"), change.after ? "on" : "off");
  }
  const motor = engine.read("Q0.0");
  if (motor !== lastMotor) lastMotor = motor;
  for (const [tag, pulse] of pulses) {
    pulse.ticks--;
    if (pulse.ticks <= 0) {
      engine.setInput(tag, pulse.release);
      pulses.delete(tag);
    }
  }
  renderRuntime();
}

function conditionLabel(expr) {
  switch (expr.op) {
    case "contact": return (expr.nc ? "¬ " : "") + expr.tag;
    case "always": return "TRUE";
    case "not": return "NOT (" + conditionLabel(expr.item) + ")";
    case "and": return "(" + expr.items.map(conditionLabel).join(" ∧ ") + ")";
    case "or": return "(" + expr.items.map(conditionLabel).join(" ∨ ") + ")";
    case "compare": return expr.tag + " " + expr.cmp + " " + expr.value;
    default: return "?";
  }
}

function actionLabel(action) {
  switch (action.type) {
    case "coil": return "( ) " + action.target;
    case "set": return "(S) " + action.target;
    case "reset": return "(R) " + action.target;
    case "ton": return "TON " + action.target + " · " + action.presetMs + "ms";
    case "tof": return "TOF " + action.target + " · " + action.presetMs + "ms";
    case "ctu": return "CTU " + action.target + " · PV " + action.preset;
    case "resetCounter": return "RES " + action.target;
  }
}

function setView(next) {
  view = next;
  document.querySelectorAll(".view").forEach(section => { section.hidden = section.id !== "view-" + next; });
  document.querySelectorAll(".nav-item").forEach(btn => btn.classList.toggle("active", btn.dataset.view === next));
  const names = {
    lab: ["SIMULADOR PLC", "Virtual PLC Laboratory", "CPU, bastidor, procesos virtuales, fallos, registros y datos para la Suite."],
    console: ["DEMO CLÁSICA", "PLC Simulation Console", "Ejemplo introductorio de lógica por scans."],
    program: ["PROGRAMA PLC", "Logic Program Studio", "Edición estructurada, validación y persistencia local."],
    kop: ["EDITOR KOP", "Graphical Ladder Studio", "Edición visual de contactos, bobinas, temporizadores y redes."],
    diagnostics: ["DIAGNÓSTICO", "Runtime Diagnostics", "Inspección de las variables y registro de transiciones."],
    help: ["MANUAL", "Operator Guide", "Instrucciones de uso para la plataforma de simulación."]
  };
  const [crumb, title, sub] = names[next];
  $("breadcrumb-view").textContent = crumb;
  $("view-title").textContent = title + " /";
  $("view-subtitle").textContent = sub;
  document.querySelector(".heading-actions").style.display = next === "lab" ? "none" : "";
  if (next === "program") renderProgramEditor();
  if (next === "kop") kopEditor?.show();
  renderRuntime();
}

function renderIO() {
  const keys = ["I0.0", "I0.1", "I0.2", "I0.3", "I0.4", "I0.5", "I0.6", "I0.7"];
  $("inputs-active").textContent = keys.filter(tag => engine.read(tag)).length + " ACTIVAS";
  $("input-list").innerHTML = keys.map(tag => {
    const active = engine.read(tag);
    const sensor = tag === "I0.3";
    return '<button class="io-row" data-input="' + tag + '" title="Alternar entrada virtual" aria-pressed="' + active + '">' +
      '<span class="io-bullet ' + (active ? "active" : "") + '"></span>' +
      '<span class="io-address">' + tag + '</span><span class="io-label">' +
      escapeHtml(inputLabels[tag] ?? "Entrada auxiliar") + '</span>' +
      '<span class="io-state ' + (active ? "active" : "") + '">' + (active ? "ON" : "OFF") + '</span>' +
      (sensor ? '<span class="io-auto">AUTO</span>' : "") + '</button>';
  }).join("");
  const outputs = [...new Set(["Q0.0", "Q0.1", "Q0.2", "Q0.3", ...engine.program.rungs.filter(r => r.action.target.startsWith("Q")).map(r => r.action.target)])];
  $("outputs-active").textContent = outputs.filter(tag => engine.read(tag)).length + " ACTIVAS";
  $("output-list").innerHTML = outputs.map(tag => {
    const active = engine.read(tag);
    return '<div class="io-row output-row"><span class="io-bullet ' + (active ? "active" : "") + '"></span>' +
      '<span class="io-address">' + escapeHtml(tag) + '</span><span class="io-label">' +
      escapeHtml(outputLabels[tag] ?? "Salida digital") + '</span><span class="io-state ' +
      (active ? "active" : "") + '">' + (active ? "ON" : "OFF") + '</span></div>';
  }).join("");
}

function renderRungs() {
  const traces = new Map(engine.lastRungs.map(r => [r.id, r.enabled]));
  const markup = engine.program.rungs.map((rung, index) => {
    const active = traces.get(rung.id) ?? false;
    return '<div class="rung-card ' + (active ? "powered" : "") + '">' +
      '<div class="rung-top"><span class="rung-id">' + escapeHtml(rung.id) + '</span>' +
      '<span class="rung-flag">' + (active ? "● ENERGIZADA" : "○ INACTIVA") + '</span></div>' +
      '<div class="rung-name">' + escapeHtml(rung.name || "Red " + (index + 1)) + '</div>' +
      '<div class="rung-logic">' + escapeHtml(conditionLabel(rung.when)) + '</div>' +
      '<div class="rung-action">' + escapeHtml(actionLabel(rung.action)) + '</div></div>';
  }).join("");
  $("rung-strip").innerHTML = markup;
}

function renderProgramEditor() {
  $("program-rung-total").textContent = engine.program.rungs.length + " REDES";
  const traces = new Map(engine.lastRungs.map(r => [r.id, r.enabled]));
  $("program-rungs").innerHTML = engine.program.rungs.map(r => {
    return '<article class="program-rung"><div class="rung-top"><span class="rung-id">' + escapeHtml(r.id) +
      '</span><span class="rung-flag">' + (traces.get(r.id) ? "● ACTIVA" : "○ LISTA") + '</span></div>' +
      '<h3>' + escapeHtml(r.name) + '</h3><div class="program-logic"><span>IF</span>' +
      escapeHtml(conditionLabel(r.when)) + '<span>THEN</span><b>' +
      escapeHtml(actionLabel(r.action)) + '</b></div></article>';
  }).join("");
  $("program-json").value = JSON.stringify(engine.program, null, 2);
}

function renderDiagnostics() {
  if (view !== "diagnostics") return;
  const snapshot = engine.snapshot();
  $("diag-json").textContent = JSON.stringify({
    scans: snapshot.scanCount,
    simulatedMs: snapshot.elapsedMs,
    inputs: snapshot.inputs,
    outputs: snapshot.outputs,
    memory: snapshot.memory,
    analog: snapshot.analog,
    timers: snapshot.timers,
    counters: snapshot.counters
  }, null, 2);
  $("event-list").innerHTML = events.map(event =>
    '<div class="event"><span class="event-time">' + escapeHtml(event.time) +
    '</span><span class="event-dot ' + escapeHtml(event.type) +
    '"></span><span>' + escapeHtml(event.message) + '</span></div>'
  ).join("") || '<p class="hint">Aún no hay eventos.</p>';
}

function renderRuntime() {
  const count = engine.counters.C0?.cv ?? 0;
  $("stat-state").textContent = running ? "RUNNING" : "PAUSED";
  $("stat-state").className = running ? "green-text" : "amber-text";
  $("status-dot").classList.toggle("paused", !running);
  $("stat-scans").textContent = engine.scanCount.toLocaleString("es-ES");
  $("stat-time").innerHTML = (engine.elapsedMs / 1000).toFixed(1) + " <small>s</small>";
  $("stat-count").innerHTML = count + " <small>/ " + (engine.program.rungs.find(r => r.action.type === "ctu" && r.action.target === "C0")?.action.preset ?? "—") + "</small>";
  $("stat-count-label").textContent = count >= 5 ? "Lote virtual completado" : "Contador CTU C0";
  $("run-btn").innerHTML = running ? "Ⅱ &nbsp; Pausar" : "▶ &nbsp; Reanudar";
  const motor = engine.read("Q0.0");
  $("belt").classList.toggle("is-moving", motor && running);
  $("belt-items").innerHTML = packages.map(p =>
    '<div class="package" style="left:' + p.x.toFixed(2) + '%"><span>BOX</span><i></i></div>'
  ).join("");
  $("sensor-led").classList.toggle("lit", engine.read("I0.3"));
  $("estop").classList.toggle("engaged", emergency);
  $("estop").setAttribute("aria-pressed", String(emergency));
  $("estop").innerHTML = emergency ? "⬟ &nbsp; REARMAR" : "⬟ &nbsp; E-STOP";
  renderIO();
  renderRungs();
  renderDiagnostics();
}

function renderAll() {
  if (view === "program") renderProgramEditor();
  renderRuntime();
}

function applyProgram(source) {
  let data;
  try {
    data = JSON.parse(source);
    validateProgram(data);
    engine.loadProgram(data);
    initializeInputs();
    packages = [{ id: 1, x: 23 }, { id: 2, x: 53 }];
    pulses.clear();
    emergency = false;
    saveLocal();
    logEvent("Programa validado y cargado: " + (data.name || "sin título"));
    kopEditor?.sync(true);
    renderAll();
    announce("Programa cargado: " + data.rungs.length + " redes válidas");
    return true;
  } catch (err) {
    announce("Error de programa: " + err.message, "error");
    return false;
  }
}

function addRung() {
  const type = $("new-action").value;
  const tag = $("new-contact").value.trim().toUpperCase();
  const target = $("new-target").value.trim().toUpperCase();
  const preset = Number($("new-preset").value);
  const action = { type, target };
  if (type === "ton" || type === "tof") action.presetMs = preset;
  if (type === "ctu") action.preset = preset;
  const id = "R" + String(Math.max(0, ...engine.program.rungs.map(r => Number(r.id.replace(/^R/, "")) || 0)) + 1).padStart(2, "0");
  const program = JSON.parse(JSON.stringify(engine.program));
  program.rungs.push({ id, name: "Red personalizada " + id,
    when: { op: "contact", tag, nc: $("new-nc").checked }, action });
  applyProgram(JSON.stringify(program));
}

function exportProgram() {
  const blob = new Blob([JSON.stringify(engine.program, null, 2) + "\n"], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = "ab-plc-program.json";
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  announce("Programa JSON exportado");
}

function bindEvents() {
  document.querySelectorAll("[data-view]").forEach(node => node.addEventListener("click", () => setView(node.dataset.view)));
  $("reset-btn").addEventListener("click", () => resetSimulation());
  $("run-btn").addEventListener("click", () => {
    running = !running;
    logEvent(running ? "CPU virtual reanudada" : "CPU virtual pausada");
    renderRuntime();
  });
  $("start-motor").addEventListener("click", () => {
    if (emergency) return announce("Rearma el E-STOP antes de arrancar", "error");
    if (!running) return announce("Reanuda la CPU virtual para arrancar", "error");
    queuePulse("I0.0"); logEvent("Pulsador de marcha");
  });
  $("stop-motor").addEventListener("click", () => {
    if (!running) return announce("La CPU está pausada", "error");
    queuePulse("I0.1", 3, false); logEvent("Pulsador de paro", "off");
  });
  $("estop").addEventListener("click", () => {
    emergency = !emergency;
    engine.setInput("I0.2", !emergency);
    logEvent(emergency ? "E-STOP virtual accionado" : "E-STOP virtual rearmado", emergency ? "off" : "on");
    renderRuntime();
  });
  $("input-list").addEventListener("click", event => {
    const row = event.target.closest("[data-input]");
    if (!row) return;
    const tag = row.dataset.input;
    if (tag === "I0.2") {
      $("estop").click(); return;
    }
    if (tag === "I0.3") return announce("I0.3 pertenece al sensor virtual automático");
    engine.setInput(tag, !engine.read(tag));
    if (tag === "I0.1") pulses.delete(tag);
    logEvent("Entrada manual " + tag + " → " + (engine.read(tag) ? "ON" : "OFF"));
    renderRuntime();
  });
  $("load-json").addEventListener("click", () => applyProgram($("program-json").value));
  $("add-rung-btn").addEventListener("click", addRung);
  $("export-json").addEventListener("click", exportProgram);
  $("import-json").addEventListener("click", () => $("file-json").click());
  $("file-json").addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) { announce("Archivo demasiado grande (máx. 500 kB)", "error"); return; }
    $("program-json").value = await file.text();
    announce("Archivo leído. Valida y carga para aplicarlo.");
    event.target.value = "";
  });
  $("clear-logs").addEventListener("click", () => { events = []; renderDiagnostics(); });
}

loadSaved();
bindEvents();
startLab(announce);
kopEditor = mountKopEditor({
  element: $("kop-editor"),
  getProgram: () => engine.program,
  applyProgram: program => applyProgram(JSON.stringify(program)),
  readTag: tag => engine.read(tag),
  notify: announce
});
logEvent("AB-PLC Engine inicializado · 100 ms por scan");
setView("lab");
setInterval(tick, 100);
