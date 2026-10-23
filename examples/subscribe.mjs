/** Real consumer example: monitor the event bus (no credentials in source code). */
import { SuiteClient } from "../src/client.js";
const token=process.env.AB_SUITE_TOKEN;
if(!token)throw new Error("Define AB_SUITE_TOKEN con el token monitor");
const client=new SuiteClient({url:process.env.AB_SUITE_URL??"http://127.0.0.1:4175",token});
console.log("Escuchando eventos Suite; Ctrl+C para salir...");
for await(const event of client.events()){
  console.log("seq",event.sequence,event.topic,event.source,
    "sim_ms",event.simulated_ms??"—",JSON.stringify(event.data));
}
