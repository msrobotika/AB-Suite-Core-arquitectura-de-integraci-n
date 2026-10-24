/** Single local origin for the nine native tools. No runtime dependency. MIT. */
import { createServer, request as httpRequest } from 'node:http';
import { readFile, stat, realpath } from 'node:fs/promises';
import { resolve, extname, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { timingSafeEqual } from 'node:crypto';
export const workspaceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..'
);
export const appIds = [
  'plc',
  'kop',
  'scl',
  'grafcet',
  'scada',
  'vision',
  'modbus',
  'serial',
  'bi'
];
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.csv': 'text/csv; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};
export function integrateHTML(html, id) {
  // Native backends use root-relative assets. Keep all browser requests on the suite origin.
  html = html.replace(/(src|href|action)=(['"])\/(?!\/)/g, `$1=$2/apps/${id}/`);
  const resources = `<link rel="stylesheet" href="/suite/shell.css"><script src="/apps/${id}/suite-session.js"></script><script src="/suite/boot.js" data-app="${id}"></script>`;
  return html.replace(/<head[^>]*>/i, (match) => match + resources);
}
export async function startWorkspace({
  port = 4170,
  engines = {},
  capture = null,
  signalSource = null,
  root = workspaceRoot
} = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65535)
    throw Error('Puerto inválido');
  const sockets = new Set();
  let server;
  const send = (
    res,
    status,
    body,
    type = 'application/json; charset=utf-8',
    extra = {}
  ) => {
    const data = Buffer.from(
      typeof body === 'string' ? body : JSON.stringify(body)
    );
    res.writeHead(status, {
      'Content-Type': type,
      'Content-Length': data.length,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Cross-Origin-Resource-Policy': 'same-origin',
      ...extra
    });
    res.end(data);
  };
  server = createServer(async (req, res) => {
    try {
      const authority = `127.0.0.1:${server.address().port}`;
      if (
        req.headers.host !== authority ||
        (req.headers.origin && req.headers.origin !== `http://${authority}`) ||
        req.headers['sec-fetch-site'] === 'cross-site'
      )
        return send(res, 403, { error: 'Origen no autorizado' });
      const url = new URL(req.url, `http://${authority}`);
      if (url.pathname === '/suite/signals/plc') {
        if (req.method !== 'GET')
          return send(res, 405, { error: 'Método no permitido' });
        if (!signalSource || !engines.plc?.token)
          return send(res, 503, { error: 'CPU residente no disponible' });
        const supplied = Buffer.from(req.headers.authorization ?? ''),
          expected = Buffer.from('Bearer ' + engines.plc.token);
        if (
          supplied.length !== expected.length ||
          !timingSafeEqual(supplied, expected)
        )
          return send(res, 401, { error: 'Sesión no autorizada' });
        try {
          return send(res, 200, await signalSource());
        } catch {
          return send(res, 503, {
            error:
              'No se pudo leer la CPU residente. Comprueba el servicio de la suite.'
          });
        }
      }
      if (url.pathname === '/suite/bi-capture') {
        if (!capture)
          return send(res, 503, { error: 'Motor BI no disponible' });
        if (req.method === 'GET') return send(res, 200, capture.status());
        if (req.method !== 'POST')
          return send(res, 405, { error: 'Método no permitido' });
        if (!req.headers['content-type']?.startsWith('application/json'))
          return send(res, 415, { error: 'Se requiere JSON' });
        let raw = '';
        for await (const chunk of req) {
          raw += chunk;
          if (raw.length > 100)
            return send(res, 413, { error: 'Solicitud demasiado grande' });
        }
        const data = JSON.parse(raw);
        if (typeof data.enabled !== 'boolean' || Object.keys(data).length !== 1)
          return send(res, 400, { error: 'Configuración inválida' });
        return send(res, 200, capture.set(data.enabled));
      }
      if (url.pathname === '/suite/status')
        return send(res, 200, {
          apps: appIds.map((id) => ({
            id,
            ready:
              !['modbus', 'serial', 'bi'].includes(id) || Boolean(engines[id]),
            runtime: ['modbus', 'serial', 'bi'].includes(id)
              ? 'python'
              : 'browser'
          }))
        });
      const match = url.pathname.match(/^\/apps\/([a-z]+)(\/.*)?$/);
      if (match && !appIds.includes(match[1]))
        return send(res, 404, { error: 'Aplicación desconocida' });
      if (match && !match[2]) {
        res.writeHead(302, { Location: url.pathname + '/' });
        return res.end();
      }
      if (match && match[2] === '/suite-session.js') {
        if (req.method !== 'GET')
          return send(res, 405, { error: 'Método no permitido' });
        const id = match[1],
          token = engines[id]?.token;
        const key =
          id === 'modbus'
            ? 'ab-session'
            : id === 'serial'
              ? 'ab-serial-token'
              : id === 'vision'
                ? 'ab-vision-session'
                : null;
        const session =
          token && key
            ? `sessionStorage.setItem(${JSON.stringify(key)},${JSON.stringify(token)});`
            : '';
        const plc = engines.plc
          ? `window.ABSuitePLC=${JSON.stringify({ token: engines.plc.token, modbusPort: engines.plc.modbusPort })};`
          : '';
        return send(res, 200, session + plc, mime['.js']);
      }
      if (
        match &&
        ((['modbus', 'serial', 'bi'].includes(match[1]) &&
          !/\.(md|txt)$/.test(match[2])) ||
          (match[1] === 'plc' && match[2].startsWith('/api/live/')) ||
          (match[1] === 'vision' && match[2].startsWith('/api/')))
      ) {
        const id = match[1],
          engine = engines[id];
        if (!engine)
          return send(
            res,
            503,
            'Motor no disponible. Ejecuta node scripts/setup.mjs y vuelve a iniciar la suite.',
            'text/plain; charset=utf-8'
          );
        const headers = {
          ...req.headers,
          host: `127.0.0.1:${engine.port}`,
          'accept-encoding': 'identity'
        };
        if (headers.origin) headers.origin = `http://127.0.0.1:${engine.port}`;
        delete headers.connection;
        const upstream = httpRequest(
          {
            host: '127.0.0.1',
            port: engine.port,
            path: match[2] + url.search,
            method: req.method,
            headers
          },
          (up) => {
            const chunks = [];
            let size = 0;
            up.on('data', (chunk) => {
              size += chunk.length;
              if (size > 40 * 1024 * 1024) {
                up.destroy();
                res.destroy();
                return;
              }
              chunks.push(chunk);
            });
            up.on('end', () => {
              let data = Buffer.concat(chunks);
              const type =
                up.headers['content-type'] ?? 'application/octet-stream';
              if (type.includes('text/html'))
                data = Buffer.from(integrateHTML(data.toString('utf8'), id));
              const outputHeaders = {
                ...up.headers,
                'content-length': data.length
              };
              delete outputHeaders['transfer-encoding'];
              delete outputHeaders.connection;
              // Redirects remain inside this app; credentials are never put in links.
              if (outputHeaders.location?.startsWith('/'))
                outputHeaders.location = `/apps/${id}${outputHeaders.location}`;
              res.writeHead(up.statusCode, outputHeaders);
              res.end(data);
            });
            up.on('error', () => res.destroy());
          }
        );
        upstream.setTimeout(15000, () =>
          upstream.destroy(Error('Motor sin respuesta'))
        );
        upstream.on('error', () => {
          if (!res.headersSent)
            send(res, 502, {
              error: 'El motor se ha detenido. Reinicia la suite.'
            });
          else res.destroy();
        });
        req.pipe(upstream);
        return;
      }
      if (!['GET', 'HEAD'].includes(req.method))
        return send(res, 405, { error: 'Método no permitido' });
      let relative;
      if (url.pathname === '/') relative = 'web/index.html';
      else if (
        ['/README.md', '/AGENTS.md'].includes(url.pathname) ||
        url.pathname.startsWith('/docs/')
      )
        relative = decodeURIComponent(url.pathname.slice(1));
      else if (url.pathname.startsWith('/suite/'))
        relative = 'web/' + decodeURIComponent(url.pathname.slice(7));
      else if (match)
        relative =
          `apps/${match[1]}/` +
          decodeURIComponent(match[2].slice(1) || 'index.html');
      else return send(res, 404, { error: 'Ruta desconocida' });
      if (
        relative
          .split(/[\\/]/)
          .some((part) => part.startsWith('.') || part === 'node_modules') ||
        !mime[extname(relative)]
      )
        return send(res, 404, { error: 'Recurso no público' });
      const path = resolve(root, relative),
        resolved = await realpath(path);
      if (
        !resolved.startsWith(resolve(root) + sep) ||
        (await stat(resolved)).isDirectory()
      )
        return send(res, 404, { error: 'Ruta desconocida' });
      let data = await readFile(path);
      const type = mime[extname(path)];
      if (match && extname(path) === '.html')
        data = Buffer.from(integrateHTML(data.toString('utf8'), match[1]));
      res.writeHead(200, {
        'Content-Type': type,
        'Content-Length': data.length,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        'Cross-Origin-Resource-Policy': 'same-origin'
      });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch {
      if (!res.headersSent) send(res, 404, { error: 'Recurso no disponible' });
      else res.destroy();
    }
  });
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  await new Promise((ok, bad) => {
    server.once('error', bad);
    server.listen(port, '127.0.0.1', ok);
  });
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: async () => {
      for (const socket of sockets) socket.destroy();
      await new Promise((ok) => server.close(ok));
    }
  };
}
