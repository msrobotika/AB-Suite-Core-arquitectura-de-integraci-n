/**
 * Standalone, accessible KOP diagram editor; programs remain JSON AST.
 * Nothing is executed before the operator clicks "Validar y cargar".
 */
import { KopHistory } from "./kop-model.js";

const E = s => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));
const actionTypes = ["coil", "set", "reset", "ton", "tof", "ctu", "resetCounter"];
const actionNames = { coil: "Bobina ( )", set: "SET (S)", reset: "RESET (R)",
  ton: "TON", tof: "TOF", ctu: "CTU", resetCounter: "Reset CTU" };

function btn(text, action, r, s, b, title = "") {
  return '<button type="button" class="kop-small-btn" data-op="' + E(action) +
    '" data-r="' + r + '" data-s="' + s + '" data-b="' + b +
    '" title="' + E(title) + '">' + E(text) + '</button>';
}
function selectOptions(values, active) {
  return values.map(([value, label]) => '<option value="' + E(value) + '"' +
    (value === active ? " selected" : "") + '>' + E(label) + "</option>").join("");
}
function contactCard(node, r, s, b, readTag, locked) {
  const active = readTag(node.tag);
  const kind = node.nc ? "NC" : "NO";
  return '<div class="kop-contact ' + (active ? "kop-live" : "") + '">' +
    '<div class="kop-contact-symbol" aria-hidden="true">' + (node.nc ? "─|/|─" : "─| |─") + '</div>' +
    '<label class="kop-field-label">DIRECCIÓN<input ' + (locked ? "disabled " : "") +
    'data-edit="contact-tag" data-r="' + r + '" data-s="' + s + '" data-b="' + b +
    '" value="' + E(node.tag) + '" maxlength="14" spellcheck="false" aria-label="Dirección contacto ' +
    E(node.tag) + '"></label>' +
    '<div class="kop-contact-tools"><label>TIPO <select ' + (locked ? "disabled " : "") +
    'data-edit="contact-nc" data-r="' + r + '" data-s="' + s + '" data-b="' + b +
    '">' + selectOptions([["false","NO"],["true","NC"]], String(Boolean(node.nc))) +
    '</select></label>' + btn("×", "remove-contact", r, s, b, "Eliminar contacto") + '</div>' +
    '</div>';
}
function diagram(rung, ri, readTag) {
  if (rung.locked) return '<div class="kop-locked"><span>◇</span><div><strong>Red avanzada protegida</strong>' +
    '<p>Esta condición no se puede dibujar sin pérdida de información. Se conserva intacta. ' +
    'Puedes cambiar su nombre o acción, o editar la condición desde Programa PLC → JSON.</p></div></div>';
  const stageHtml = rung.stages.map((branches, si) =>
    '<div class="kop-stage"><div class="kop-branches">' +
      branches.map((node, bi) => '<div class="kop-branch">' + contactCard(node, ri, si, bi, readTag, false) +
        '</div>').join("") + '</div>' +
      '<div class="kop-stage-actions">' +
      btn("+ PAR", "add-parallel", ri, si, 0, "Añadir contacto en paralelo (OR)") +
      btn("+ SER", "add-series", ri, si, 0, "Añadir contacto en serie (AND)") +
      '</div></div>'
  ).join("");
  return '<div class="kop-diagram-scroll"><div class="kop-diagram">' +
    '<div class="kop-rail rail-left" title="Barra L">L+</div>' +
    '<div class="kop-stages">' + stageHtml + '</div>' +
    '<div class="kop-coil"><span class="kop-wire"></span>' +
    '<div class="kop-coil-icon">' + (rung.action.type === "coil" ? "( )" :
      rung.action.type === "set" ? "(S)" : rung.action.type === "reset" ? "(R)" :
      rung.action.type.toUpperCase()) +
    '</div><strong>' + E(rung.action.target) + '</strong></div>' +
    '<div class="kop-rail rail-right" title="Barra N">N</div></div></div>';
}
function rungCard(rung, ri, readTag, total) {
  const action = rung.action;
  const hasPreset = ["ton", "tof", "ctu"].includes(action.type);
  return '<article class="kop-rung" data-rung-id="' + E(rung.id) + '">' +
    '<header class="kop-rung-head"><span class="kop-rung-tag">' + E(rung.id) +
    '</span><label class="kop-rung-name">NOMBRE DE RED<input data-edit="rename" data-r="' + ri +
    '" value="' + E(rung.name) + '" maxlength="120" aria-label="Nombre de ' + E(rung.id) +
    '"></label><div class="kop-rung-actions">' +
    btn("↑", "move-up", ri, 0, 0, "Mover red arriba") +
    btn("↓", "move-down", ri, 0, 0, "Mover red abajo") +
    btn("Eliminar", "delete-rung", ri, 0, 0, "Eliminar la red " + rung.id) +
    '</div></header>' +
    diagram(rung, ri, readTag) +
    '<div class="kop-coil-settings">' +
    '<label>INSTRUCCIÓN <select data-edit="action-type" data-r="' + ri + '">' +
    selectOptions(actionTypes.map(x => [x, actionNames[x]]), action.type) +
    '</select></label>' +
    '<label>DESTINO <input data-edit="action-target" data-r="' + ri +
    '" value="' + E(action.target) + '" spellcheck="false"></label>' +
    (hasPreset ? '<label>' + (action.type === "ctu" ? "PRESET · unidades" : "PRESET · ms") +
    '<input type="number" data-edit="action-preset" data-r="' + ri +
    '" value="' + (action.type === "ctu" ? action.preset : action.presetMs) +
    '" min="0" step="1"></label>' : "") +
    '</div></article>';
}
export function mountKopEditor({ element, getProgram, applyProgram, readTag, notify }) {
  const history = new KopHistory(getProgram());
  let lastCommitted = JSON.stringify(getProgram());
  const toolbar = element.querySelector("#kop-toolbar");
  const canvas = element.querySelector("#kop-canvas");
  const feedback = element.querySelector("#kop-feedback");
  const buttons = {
    undo: element.querySelector("#kop-undo"),
    redo: element.querySelector("#kop-redo"),
    save: element.querySelector("#kop-apply")
  };

  function render() {
    // Compile only for validation. Broken drafts remain editable for correction.
    let valid = true;
    let error = "";
    try { history.export(); } catch (err) { valid = false; error = err.message; }
    let dirty = true;
    try { dirty = history.dirty; } catch { dirty = true; }
    toolbar.querySelector("#kop-count").textContent = history.current.rungs.length + " REDES";
    canvas.innerHTML = history.current.rungs.map((r, i) =>
      rungCard(r, i, readTag, history.current.rungs.length)).join("") || '<section class="kop-empty"><h2>Tu programa empieza aquí</h2><p>No hay redes. Pulsa + Nueva red para definir contactos y acciones; después valida y carga tus cambios.</p></section>';
    buttons.undo.disabled = !history.past.length;
    buttons.redo.disabled = !history.future.length;
    buttons.save.disabled = !valid || !dirty;
    feedback.textContent = !valid ? "ERROR · " + error :
      dirty ? "● Cambios sin cargar · el PLC sigue ejecutando el programa anterior" :
      "✓ Programa sincronizado con el motor";
    feedback.classList.toggle("kop-error", !valid);
    feedback.classList.toggle("kop-dirty", valid && dirty);
  }

  function sync(force = false) {
    const current = JSON.stringify(getProgram());
    if (force || (current !== lastCommitted && !history.past.length)) {
      history.load(getProgram());
      lastCommitted = current;
    }
    render();
  }

  function update(op) {
    try { history.change(op); render(); }
    catch (err) { notify(err.message, "error"); }
  }

  canvas.addEventListener("click", event => {
    const el = event.target.closest("button[data-op]");
    if (!el || !canvas.contains(el)) return;
    update({ type: el.dataset.op, rungIndex: Number(el.dataset.r),
      stageIndex: Number(el.dataset.s), branchIndex: Number(el.dataset.b) });
  });
  canvas.addEventListener("change", event => {
    const el = event.target.closest("[data-edit]");
    if (!el || !canvas.contains(el)) return;
    const field = el.dataset.edit;
    update({ type: field, rungIndex: Number(el.dataset.r),
      stageIndex: Number(el.dataset.s), branchIndex: Number(el.dataset.b),
      value: field === "contact-nc" ? el.value === "true" : el.value.trim() });
  });
  element.querySelector("#kop-add").addEventListener("click", () => update({ type: "add-rung" }));
  buttons.undo.addEventListener("click", () => { history.undo(); render(); });
  buttons.redo.addEventListener("click", () => { history.redo(); render(); });
  element.querySelector("#kop-discard").addEventListener("click", () => {
    history.load(getProgram());
    lastCommitted = JSON.stringify(getProgram());
    render();
    notify("Borrador descartado");
  });
  buttons.save.addEventListener("click", async () => {
    try {
      const program = history.export();
      const ok = await applyProgram(program);
      if (!ok) return;
      history.load(getProgram());
      lastCommitted = JSON.stringify(getProgram());
      render();
      notify("Programa KOP validado y cargado al simulador");
    } catch (err) { notify(err.message, "error"); }
  });
  element.addEventListener("keydown", event => {
    const tag = event.target.tagName;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    if (event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) history.redo();
      else history.undo();
      render();
    } else if (event.key.toLowerCase() === "y") {
      event.preventDefault(); history.redo(); render();
    }
  });
  render();
  return { sync, show: () => sync(false), isDirty: () => {
    try { return history.dirty; } catch { return true; }
  } };
}
