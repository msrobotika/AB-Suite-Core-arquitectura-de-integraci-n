import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, dirname, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 4173);
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };

createServer(async (req, res) => {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405).end("Method Not Allowed"); return;
    }
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    const target = resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
    if (target !== root && !target.startsWith(root + sep)) {
      res.writeHead(403).end("Forbidden"); return;
    }
    const info = await stat(target);
    if (!info.isFile()) { res.writeHead(404).end("Not Found"); return; }
    const body = await readFile(target);
    res.writeHead(200, {
      "Content-Type": (types[extname(target)] ?? "application/octet-stream") + "; charset=utf-8",
      "Content-Length": body.length,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store"
    });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch (err) {
    res.writeHead(err?.code === "ENOENT" ? 404 : 400).end("Not Found");
  }
}).listen(port, host, () => process.stdout.write("AB-PLC Simulator: http://" + host + ":" + port + "\n"));
