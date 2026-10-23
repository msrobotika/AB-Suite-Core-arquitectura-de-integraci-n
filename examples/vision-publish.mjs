/** Synthetic demonstration publisher: it does NOT connect AB-Vision Inspector yet. */
import { SuiteClient } from "../src/client.js";
const token=process.env.AB_VISION_TOKEN;
if(!token)throw new Error("Define AB_VISION_TOKEN con el token de AB-Vision Inspector");
const client=new SuiteClient({url:process.env.AB_SUITE_URL??"http://127.0.0.1:4175",
  token,source:"ab-vision-inspector"});
const event=await client.publish({
  topic:"vision.inspection.result",
  trace_id:"demo-inspection-0001",
  data:{image_id:"SIMULATED-IMAGE-001",passed:true,defects:0,source:"synthetic-demo"}
});
console.log("Publicado evento de prueba",event.id);
