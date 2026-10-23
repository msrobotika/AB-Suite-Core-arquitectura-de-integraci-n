#!/usr/bin/env node
/**
 * AB-Suite Core standalone localhost event bus (no PLC simulation required).
 * Node.js 20+, no third-party runtime dependencies.
 */
import { startSuiteCore } from "../src/server.js";

const args=process.argv.slice(2);
const i=args.indexOf("--port");
const port=i===-1?4175:Number(args[i+1]);
try {
  const core=await startSuiteCore({port});
  process.stdout.write([
    "",
    "MS ROBOTIKA · AB-SUITE CORE 0.1.0",
    "Servidor de eventos local (sin PLC conectado)",
    "HTTP/SSE: "+core.url,
    "Health: "+core.url+"/v1/health",
    "",
    "Credenciales de esta sesión (NO compartir ni publicar):",
    ...Object.entries(core.tokens).map(([id,key])=>"  "+id+": "+key),
    "",
    "Para conectar telemetría PLC en vivo, usa npm run suite:core",
    "desde AB-PLC-Simulator (paquete integrado de compatibilidad).",
    "Ctrl+C para detener.",
    ""
  ].join("\n"));
  let closing=false;
  const stop=async()=>{
    if(closing)return;
    closing=true;
    process.off("SIGINT",stop);
    process.off("SIGTERM",stop);
    await core.close();
    process.exitCode=0;
  };
  process.on("SIGINT",stop);
  process.on("SIGTERM",stop);
} catch(err) {
  process.stderr.write("Error AB-Suite Core: "+err.message+"\n");
  process.exitCode=1;
}
