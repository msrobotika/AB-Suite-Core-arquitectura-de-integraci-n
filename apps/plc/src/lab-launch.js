import { labMarkup } from "./lab-markup.js";
import { mountLabSimulator } from "./lab-ui.js";

export function startLab(notify) {
  document.getElementById("lab-root").innerHTML = labMarkup();
  return mountLabSimulator({ notify });
}
