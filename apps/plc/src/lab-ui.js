/**
 * AB-PLC Simulator · Virtual CPU / I/O rack / plant lab and Suite export.
 * This module owns only #view-lab. No remote PLC writes, sockets or network APIs.
 */
import { VirtualPLC, plantCatalog, faultDescriptions } from "./plant-runtime.js";
import { suiteCatalog, telemetryCSV, telemetryEnvelope, modbusPreview, downloadText } from "./suite-contract.js";
import { importABKop } from "./kop-import.js";
import { validateProgram } from "./plc-engine.js";
import { connectSuiteLive } from "./suite-live-client.js";
import { guideForSnapshot } from "./lab-onboarding.js";

const $ = id => document.getElementById(id);
const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[ch]));
const fmt = x => typeof x === "number" ? x.toLocaleString("es-ES",{maximumFractionDigits:1}) : String(x);
const stateClass = active => active ? "lab-on" : "lab-off";

function sparkline(samples, scenario) {
  const data = samples.slice(-100);
  if (data.length < 2) return '<p class="lab-muted">La tendencia aparece al ejecutar el proceso.</p>';
  const width = 800, height = 115, max = scenario === "tank" ? 100 :
    Math.max(5, ...data.map(s => s.plant.delivered ?? 0));
  const points = data.map((item, i) => {
    const val = scenario === "tank" ? item.plant.level : scenario === "conveyor" ?
      item.plant.delivered : Object.values(item.cpu.outputs).filter(Boolean).length;
    const x = i * width / (data.length - 1);
    const y = height - Math.max(0, Math.min(1, val / max)) * (height - 13) - 5;
    return x.toFixed(2) + "," + y.toFixed(2);
  }).join(" ");
  return '<svg class="lab-trend-svg" role="img" aria-label="Tendencia del proceso en tiempo simulado" ' +
    'viewBox="0 0 '+ width + ' '+height+'" preserveAspectRatio="none">' +
    '<path d="M0 110 H800 M0 60 H800 M0 10 H800" stroke="#263c54" stroke-width="1" fill="none"/>' +
    '<polyline points="' + points + '" stroke="#3de2b6" stroke-width="2.8" fill="none" ' +
    'stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

function plantVisual(frame) {
  if (frame.scenario === "tank") {
    const level = frame.plant.level;
    return '<div class="lab-tank-scene">' +
      '<div class="lab-pipe lab-pipe-in">↘ <span>ENTRADA</span></div>' +
      '<div class="lab-tank-shell"><div class="lab-liquid" style="height:' + level +
      '%"></div><div class="lab-tank-level">LIT-01 · ' + fmt(level) +
      '%</div><span class="lab-high-mark">L+</span><span class="lab-low-mark">L−</span></div>' +
      '<div class="lab-pipe lab-pipe-out">↙ <span>SALIDA</span></div>' +
      '<div class="lab-scene-caption">T-01 · CAPACIDAD NORMALIZADA 0–100 %</div></div>';
  }
  if (frame.scenario === "rack") return '<div class="lab-rack-scene"><div>▣</div>' +
    '<strong>Bastidor de señales</strong><p>Sin proceso físico conectado. ' +
    'Configura entradas digitales virtuales para ejecutar el programa.</p></div>';
  return '<div class="lab-belt-scene"><div class="lab-sensor-line"></div>' +
    '<div class="lab-conveyor-belt ' + (frame.cpu.outputs["Q0.0"] ? "lab-belt-active" : "") +
    '"><div class="lab-conveyor-markers"></div>' + frame.plant.items.map(x =>
      '<span class="lab-parcel" style="left:' + Math.min(x,96) + '%">▣</span>').join("") +
    '</div><div class="lab-belt-label"><span>CV-01 MOTOR</span>' +
    '<span>FOTOCÉLULA PE-01</span><span>FINAL DE CINTA</span></div></div>';
}
function indicators(label, tags, values) {
  return '<div class="lab-rack-bank"><span class="lab-slot-label">' + esc(label) + '</span>' +
    '<div class="lab-leds">' + tags.map(t => '<div title="' + esc(t) + '" class="lab-led ' +
      stateClass(Boolean(values[t])) + '"><span></span><small>' + esc(t) + '</small></div>').join("") + '</div></div>';
}
function cpuRack(frame) {
  const ins = Array.from({length:8},(_,i)=>"I0."+i);
  const outs = Array.from({length:8},(_,i)=>"Q0."+i);
  return '<div class="lab-rack"><div class="lab-rack-psu"><strong>AB</strong><small>POWER<br>24 VDC*</small><div class="lab-power-ind"></div></div>' +
    '<div class="lab-rack-cpu"><strong>AB-CPU 01</strong><small>SIMULATED PLC</small><div class="lab-cpu-lights">' +
    '<i class="' + (frame.mode === "RUN" ? "active" : "") + '"></i><span>RUN</span>' +
    '<i class="' + (frame.mode !== "RUN" ? "active-amber" : "") + '"></i><span>STOP</span>' +
    '</div><div class="lab-cpu-port">ETHERNET<br>DISABLED</div></div>' +
    indicators("DI · 8 CANALES",ins,frame.cpu.inputs) +
    indicators("DO · 8 CANALES",outs,frame.cpu.outputs) + '</div>' +
    '<p class="lab-rack-foot">* Alimentación, bornes y Ethernet exclusivamente ilustrativos. Sin E/S físicas.</p>';
}
function ioRows(frame,catalog,cpu) {
  const entries = [...new Set([...Object.keys(catalog.io),...Object.keys(frame.cpu.inputs),...Object.keys(frame.cpu.outputs)])];
  return entries.filter(t=>/^[IQ]\d+\.\d+$/.test(t)).slice(0,32).map(tag=>{
    const input=tag.startsWith("I");
    const val = Boolean(input ? frame.cpu.inputs[tag] : frame.cpu.outputs[tag]);
    const auto = cpu.scenario !== "rack" && ["I0.3","I0.4","I0.6"].includes(tag);
    const forced = Object.hasOwn(frame.forces,tag);
    return '<button type="button" class="lab-io-row" data-lab-tag="' + esc(tag) + '" ' +
      (!input || auto ? 'disabled title="Señal automática o salida: usar forzado virtual"' : 'title="Alternar entrada digital manual"') + '>' +
      '<span class="lab-led-mini ' + stateClass(val) + '"></span>' +
      '<code>' + esc(tag) + '</code><span class="lab-io-description">' +
      esc(catalog.io[tag] ?? (input ? "ENTRADA AUXILIAR" : "SALIDA DIGITAL")) + '</span>' +
      (forced ? '<span class="lab-io-hint lab-forced">FORCE</span>' : auto ?
        '<span class="lab-io-hint">AUTO</span>' : "") +
      '<strong class="' + stateClass(val) + '">' + Number(val) + '</strong></button>';
  }).join("");
}
function renderFaultOptions(cpu) {
  const flags = plantCatalog[cpu.scenario].faults;
  $("lab-fault-controls").innerHTML = flags.length ? flags.map(f =>
    '<label class="lab-fault-option"><input type="checkbox" data-lab-fault="' + esc(f) + '"' +
    (cpu.faults[f] ? " checked" : "") + '> ' + esc(faultDescriptions[f]) + '</label>').join("") :
    '<p class="lab-muted">Sin componentes físicos en este bastidor.</p>';
}
function suiteCards() {
  if(window.ABSuite)return ["kop","scl","grafcet","scada","modbus","serial","vision","bi"].map(id=>`<a class="lab-suite-card" href="/apps/${id}/" target="_blank" rel="noopener"><strong>AB ${id.toUpperCase()}</strong><span>Abrir herramienta ↗</span></a>`).join("");
  return suiteCatalog.map(app => '<a class="lab-suite-card" href="https://github.com/' +
    encodeURI(app.repository) + '" target="_blank" rel="noopener noreferrer">' +
    '<strong>' + esc(app.name) + ' ↗</strong><small>' + esc(app.role) +
    '</small><span>Repositorio público verificado</span></a>').join("");
}

export function mountLabSimulator({ notify = (message)=>window.alert(message) } = {}) {
  let cpu = new VirtualPLC("conveyor");
  let remote = null;
  let ready = Promise.resolve();
  let pollClock = null;
  let lastViewScenario = cpu.scenario;
  let clock = null;
  let rate = 1;
  let importInfo = null;
  let paintCounter = 0;
  let lastGuideKey = "";

  function outputDownload(content,name,type) {
    downloadText(content,name,type);
    notify("Archivo generado: " + name);
  }
  function rebuildOptions() {
    renderFaultOptions(cpu);
    const observed = cpu.scenario === "rack" ?
      Array.from({length:8},(_,i)=>"I0."+i) : ["I0.3","I0.4","I0.6"];
    $("lab-force-tag").innerHTML = observed.map(tag =>
      '<option value="' + tag + '">' + tag + " · " +
      esc(plantCatalog[cpu.scenario].io[tag] || "Canal digital") + "</option>").join("");
  }
  function frameRender() {
    const f = cpu.snapshot();
    const labels = plantCatalog[cpu.scenario];
    if (lastViewScenario !== cpu.scenario) {
      lastViewScenario=cpu.scenario;
      rebuildOptions();
      $("lab-scenario").value=cpu.scenario;
    }
    $("lab-connection").textContent=remote ? "LIVE · CPU COMPARTIDA CON MODBUS" : "LOCAL · CPU EN NAVEGADOR";
    $("lab-connection").className=remote ? "lab-live-state" : "lab-local-state";
    $("lab-scan").textContent = fmt(f.scan);
    $("lab-time").textContent = (f.simulatedMs/1000).toFixed(1) + " s";
    $("lab-mode").textContent = f.mode;
    $("lab-mode").className = f.mode === "RUN" ? "lab-green" : f.mode === "PAUSE" ? "lab-amber" : "lab-red";
    $("lab-fault-count").textContent = Object.values(f.faults).filter(Boolean).length +
      " / " + Object.keys(f.forces).length;
    const guide = guideForSnapshot(f);
    const guideKey = guide.step + "|" + guide.title + "|" + guide.description;
    if (guideKey !== lastGuideKey) {
      lastGuideKey = guideKey;
      $("lab-guide-progress").textContent = "Paso " + guide.step + " de 4";
      $("lab-guide-title").textContent = guide.title;
      $("lab-guide-description").textContent = guide.description;
      document.querySelectorAll("[data-lab-guide-step]").forEach(node => {
        const step = Number(node.dataset.labGuideStep);
        node.classList.toggle("is-current", step === guide.step);
        node.classList.toggle("is-done", step < guide.step);
      });
    }
    $("lab-plant-name").textContent = labels.name;
    $("lab-process-subtitle").textContent = labels.process;
    $("lab-rack-panel").innerHTML = cpuRack(f);
    $("lab-plant-visual").innerHTML = plantVisual(f);
    $("lab-io").innerHTML = ioRows(f,labels,cpu);
    $("lab-trend").innerHTML = sparkline(cpu.samples,cpu.scenario);
    const value = f.plant.kind==="tank" ? fmt(f.plant.level)+" %" :
      f.plant.kind==="conveyor" ? f.plant.delivered+" paquetes entregados" :
      Object.values(f.cpu.outputs).filter(Boolean).length+" salidas activas";
    $("lab-plant-kpi").textContent = value;
    const registers=modbusPreview(f);
    $("lab-register-table").innerHTML = [
      ...registers.holding_registers.map((v,i)=>["HR"+i,v]),
      ...registers.coils.map((v,i)=>["C"+i,Number(v)]),
      ...registers.discrete_inputs.map((v,i)=>["DI"+i,Number(v)])
    ].map(([addr,value])=>'<span>' + esc(addr) + '</span><strong>' +
      esc(value) + '</strong>').join("");
    $("lab-events").innerHTML = cpu.events.slice(0,9).map(event=>
      '<div class="lab-event"><code>' + (event.simulatedMs/1000).toFixed(1) + 's</code>' +
      '<span>' + esc(event.message) + '</span></div>').join("");
    $("lab-run").disabled = cpu.mode==="RUN";
    $("lab-pause").disabled = cpu.mode!=="RUN";
    $("lab-stop").disabled = cpu.mode==="STOP";
    $("lab-import-map").textContent = importInfo ?
      "AB-KOP importado · " + Object.keys(importInfo.symbols).length +
      " señales mapeadas. " + importInfo.warnings[0] :
      "Carga un proyecto AB-KOP Studio (JSON schema 1) o un programa AB-PLC (JSON version 1).";
    $("lab-sample-count").textContent = cpu.samples.length + " muestras en memoria";
  }

  async function setScenario(name,program,info) {
    await cpu.loadScenario(name,program,info?.inputDefaults);
    importInfo=info??null;
    if(info && !remote) {
      for(const [tag,value] of Object.entries(info.inputDefaults)) cpu.setInput(tag,value);
    }
    $("lab-scenario").value=name;
    lastViewScenario=name;
    rebuildOptions();
    frameRender();
    notify("Simulador preparado: " + (program?.name ?? plantCatalog[name].name));
  }
  async function handler(action) {
    try { await action(); frameRender(); }
    catch(err) { notify(err.message,"error"); }
  }
  function tick() {
    if (remote || cpu.mode!=="RUN") return;
    try {
      for (let i=0;i<rate;i++) cpu.tick(100);
      if (++paintCounter % 2===0) frameRender();
    } catch(err) {
      cpu.setMode("PAUSE");
      notify("Error de simulación: "+err.message,"error");
      frameRender();
    }
  }

  $("lab-run").addEventListener("click",()=>handler(()=>cpu.setMode("RUN")));
  $("lab-pause").addEventListener("click",()=>handler(()=>cpu.setMode("PAUSE")));
  $("lab-stop").addEventListener("click",()=>handler(()=>cpu.setMode("STOP")));
  $("lab-step").addEventListener("click",()=>handler(()=>cpu.tick(100,true)));
  $("lab-reset").addEventListener("click",()=>handler(()=>{cpu.reset();importInfo=null;rebuildOptions();}));
  $("lab-start").addEventListener("click",()=>handler(()=>cpu.pulse("I0.0")));
  $("lab-stop-input").addEventListener("click",()=>handler(()=>cpu.pressStop()));
  $("lab-estop").addEventListener("click",()=>handler(()=>cpu.toggleEstop()));
  $("lab-scenario").addEventListener("change",event=>handler(()=>setScenario(event.target.value)));
  $("lab-rate").addEventListener("change",event=>{if(!remote)rate=Number(event.target.value);});
  $("lab-fault-controls").addEventListener("change",event=>{
    const fault=event.target.dataset.labFault;
    if(fault) handler(()=>cpu.setFault(fault,Boolean(event.target.checked)));
  });
  $("lab-io").addEventListener("click",event=>{
    const target=event.target.closest("button[data-lab-tag]");
    if(!target || target.disabled) return;
    handler(()=>cpu.setInput(target.dataset.labTag,!cpu.engine.read(target.dataset.labTag)));
  });
  $("lab-force-on").addEventListener("click",()=>handler(()=>cpu.forceInput($("lab-force-tag").value,true)));
  $("lab-force-off").addEventListener("click",()=>handler(()=>cpu.forceInput($("lab-force-tag").value,false)));
  $("lab-force-clear").addEventListener("click",()=>handler(()=>cpu.forceInput($("lab-force-tag").value,null)));
  $("lab-export-csv").addEventListener("click",()=>handler(()=>
    outputDownload(telemetryCSV(cpu.samples),"ab-plc-telemetry.csv","text/csv")));
  $("lab-export-json").addEventListener("click",()=>handler(()=>
    outputDownload(JSON.stringify(telemetryEnvelope(cpu),null,2),"ab-plc-suite-telemetry.json","application/json")));
  $("lab-export-registers").addEventListener("click",()=>handler(()=>
    outputDownload(JSON.stringify({schema:"msrobotika.plc.modbus-preview.v1",
      source:"read-only in-memory, NOT Modbus server",registers:modbusPreview(cpu.snapshot())},null,2),
      "ab-plc-register-map.json","application/json")));
  $("lab-export-program").addEventListener("click",()=>handler(()=>
    outputDownload(JSON.stringify(cpu.program,null,2),"ab-plc-program.json","application/json")));
  $("lab-import-program").addEventListener("click",()=>$("lab-file").click());
  $("lab-file").addEventListener("change",async(event)=>{
    const file=event.target.files?.[0];event.target.value="";if(!file)return;
    try{
      if(file.size>300_000)throw new Error("Archivo superior a 300 kB");
      const data=JSON.parse(await file.text());
      if(data.schema===1){
        const imported=importABKop(data);
        await setScenario("rack",imported.program,imported);
        $("lab-symbol-table").innerHTML=Object.entries(imported.symbols).map(([k,v])=>
          '<div><code>'+esc(k)+'</code><span>→</span><strong>'+esc(v)+'</strong></div>').join("");
      }else{
        validateProgram(data);
        await setScenario("rack",data);
        $("lab-symbol-table").innerHTML="";
      }
    }catch(err){notify("Importación rechazada: "+err.message,"error");}
  });
  $("lab-suite-grid").innerHTML=suiteCards();
  rebuildOptions();
  frameRender();
  clock=setInterval(tick,100);
  if(window.ABSuitePLC || location.hash.includes("suite=")) {
    ready=connectSuiteLive().then(shared=>{
      if(!shared)return;
      remote=shared;cpu=shared;
      $("global-runtime-mode").textContent="Suite Live activa";
      $("global-runtime-description").textContent="CPU compartida en localhost · Modbus solo lectura.";
      lastViewScenario="";
      $("lab-rate").value="1";
      $("lab-rate").disabled=true;
      $("lab-rate").title="El servidor Suite Live establece el tiempo de scan";
      rebuildOptions();frameRender();
      notify("CPU compartida: pantalla y Modbus consultan el mismo autómata");
      pollClock=setInterval(async()=>{
        try {
          const changed=await shared.poll();
          if(changed)frameRender();
        } catch(err) {
          $("lab-connection").textContent="SUITE LIVE · SIN CONEXIÓN";
          $("lab-connection").className="lab-disconnected";
        }
      },350);
    }).catch(err=>{
      $("lab-connection").textContent="SUITE LIVE · TOKEN O SERVICIO INCORRECTO";
      $("lab-connection").className="lab-disconnected";
      $("global-runtime-mode").textContent="Suite Live desconectada";
      $("global-runtime-description").textContent="Verifica el servicio y el token privado.";
      document.querySelectorAll("#lab-root button, #lab-root select, #lab-root input").forEach(el=>{ el.disabled=true; });
      notify("No se pudo conectar a la CPU compartida: "+err.message,"error");
    });
  }
  window.ABSuite?.register({
    snapshot:()=>{if(window.ABSuitePLC&&!remote)return null;const f=cpu.snapshot();return Object.fromEntries([
      ...['inputs','outputs','memory','analog'].flatMap(group=>Object.entries(f.cpu[group]??{}).map(([key,value])=>[group+'.'+key,value])),
      ['scan',f.scan],['simulatedMs',f.simulatedMs],['running',f.mode==='RUN'],
      ...Object.entries(f.plant).filter(([,v])=>typeof v==='number'||typeof v==='boolean').map(([key,value])=>['process.'+key,value])]);},
    receive:async source=>{await ready;if(window.ABSuitePLC&&!remote)throw Error('CPU sin conexión');const imported=importABKop(source);await setScenario('rack',imported.program,imported);}
  });
  return { get cpu(){return cpu;}, ready, loadProgram:async program=>{validateProgram(program);await setScenario(cpu.scenario,program);}, refresh:frameRender,
    dispose:()=>{clearInterval(clock);if(pollClock)clearInterval(pollClock);} };
}
