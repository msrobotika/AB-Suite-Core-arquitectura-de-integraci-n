/** Creates a real Chromium screenshot verifying that Suite Live web controls the server CPU. */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { startSuiteLive } from "../src/suite-live-server.js";

const suite=await startSuiteLive({httpPort:0,modbusPort:0,clock:true});
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
try{
  await mkdir("docs/screenshots",{recursive:true});
  const page=await browser.newPage({viewport:{width:1512,height:1000},deviceScaleFactor:1});
  const errors=[];
  page.on("pageerror",err=>errors.push(err.message));
  await page.goto(suite.url,{waitUntil:"domcontentloaded"});
  await page.locator("#lab-connection").filter({hasText:"CPU COMPARTIDA"}).waitFor({timeout:9000});
  if((await page.locator("#global-runtime-mode").innerText())!=="Suite Live activa")
    throw Error("El panel lateral no informa del modo compartido");
  await page.locator("#lab-run").click();
  await page.locator("#lab-start").click();
  await page.waitForTimeout(1100);
  if(suite.cpu.scanNumber<7)throw Error("El servidor PLC no avanza");
  if(!suite.cpu.engine.read("Q0.0"))throw Error("La web no activó el motor del PLC compartido");
  if(errors.length)throw Error("Errores de navegador: "+errors.join("; "));
  await page.waitForTimeout(2800); // cerrar la notificación temporal antes de capturar
  await page.screenshot({path:"docs/screenshots/lab-suite-live.png",
    fullPage:true,animations:"disabled"});
  process.stdout.write("Screenshot Suite Live y CPU remota: OK\n");
} finally {
  await browser.close();
  await suite.close();
}
