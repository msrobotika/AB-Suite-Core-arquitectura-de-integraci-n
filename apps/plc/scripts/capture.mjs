/** Browser-generated screenshots used by CI; never synthetic renders. */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const base = process.env.CAPTURE_URL ?? "http://127.0.0.1:4173";
await mkdir("docs/screenshots", { recursive: true });
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 1536, height: 1050 }, deviceScaleFactor: 1 });
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.goto(base, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.removeItem("ab-plc-program-v1"));
  await page.reload({ waitUntil: "networkidle" });
  // v0.3: virtual PLC rack, physical scenario and faults.
  await page.locator("#lab-run").click();
  await page.locator("#lab-start").click();
  await page.waitForTimeout(2300);
  const plcScans = Number((await page.locator("#lab-scan").innerText()).replace(/\D/g, ""));
  if (plcScans < 10) throw new Error("La CPU del laboratorio no ejecuta scans");
  if ((await page.locator("#lab-mode").innerText()).trim() !== "RUN") throw new Error("Modo RUN incorrecto");
  await page.screenshot({ path: "docs/screenshots/lab-conveyor.png", fullPage: true, animations: "disabled" });
  await page.locator('[data-lab-fault="jam"]').check();
  await page.waitForTimeout(350);
  if (!(await page.locator("#lab-events").innerText()).includes("jam")) throw new Error("Fallo no registrado");
  await page.screenshot({ path: "docs/screenshots/lab-fault.png", fullPage: true, animations: "disabled" });
  await page.locator("#lab-scenario").selectOption("tank");
  await page.locator("#lab-run").click();
  await page.locator("#lab-start").click();
  await page.waitForTimeout(900);
  if (!(await page.locator("#lab-plant-visual").innerText()).includes("LIT-01")) throw new Error("Depósito no renderizado");
  await page.screenshot({ path: "docs/screenshots/lab-tank.png", fullPage: true, animations: "disabled" });
  // Real import of a schema 1 program created by AB-KOP Studio.
  const abKop = {schema:1,name:"Interop smoke",inputs:{START:false,STOP_OK:true},outputs:{MOTOR:false},
    rungs:[{id:"R1",name:"Arranque",operation:"COIL",target:"MOTOR",
      branches:[[{kind:"NO",variable:"START"},{kind:"NO",variable:"STOP_OK"}]]}]};
  await page.locator("#lab-file").setInputFiles({
    name:"ab-kop-project.json",mimeType:"application/json",
    buffer:Buffer.from(JSON.stringify(abKop),"utf8")
  });
  await page.waitForTimeout(300);
  if (!(await page.locator("#lab-symbol-table").innerText()).includes("START"))
    throw new Error("Importación AB-KOP falló");
  await page.screenshot({ path: "docs/screenshots/lab-suite-import.png", fullPage: true, animations: "disabled" });
  // Legacy educational example remains available without being the product home.
  await page.locator('.nav-item[data-view="console"]').click();
  await page.locator("#start-motor").click();
  await page.waitForTimeout(2800);
  if (pageErrors.length) throw new Error("Errores JavaScript: " + pageErrors.join("; "));
  const state = (await page.locator("#stat-state").innerText()).trim();
  if (state !== "RUNNING") throw new Error("La consola no está ejecutándose");
  const motor = await page.locator("#output-list").innerText();
  if (!motor.includes("ON")) throw new Error("La marcha no energizó una salida");
  await page.screenshot({ path: "docs/screenshots/dashboard.png", fullPage: true, animations: "disabled" });
  await page.locator('.nav-item[data-view="program"]').click();
  await page.screenshot({ path: "docs/screenshots/program.png", fullPage: true, animations: "disabled" });
  await page.locator('.nav-item[data-view="kop"]').click();
  await page.locator("#kop-canvas .kop-rung").first().waitFor();
  if (await page.locator("#kop-canvas .kop-rung").count() !== 6) throw new Error("No se renderizan las seis redes");
  await page.screenshot({ path: "docs/screenshots/kop-editor.png", fullPage: true, animations: "disabled" });
  // Browser E2E: edit a new visual network, undo/redo, and load the compiled program.
  await page.locator("#kop-add").click();
  if (await page.locator("#kop-canvas .kop-rung").count() !== 7) throw new Error("No se crea la red");
  await page.locator("#kop-undo").click();
  if (await page.locator("#kop-canvas .kop-rung").count() !== 6) throw new Error("Undo falló");
  await page.locator("#kop-redo").click();
  await page.locator('#kop-canvas [data-op="add-parallel"]').last().click();
  await page.locator("#kop-apply").click();
  if (await page.locator("#kop-canvas .kop-rung").count() !== 7) throw new Error("La carga KOP falló");
  if (pageErrors.length) throw new Error("Errores de navegador: " + pageErrors.join("; "));
  process.stdout.write("Capturas PLC hardware/process + fallo + interoperabilidad + KOP completadas\n");
} finally {
  await browser.close();
}
