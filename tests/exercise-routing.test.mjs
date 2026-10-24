import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { startWorkspace } from '../src/workspace-server.js';
test('exercise entry parameters remain in the browser shell while native API queries are preserved', async (t) => {
  const seen = [];
  const native = createServer((req, res) => {
    seen.push(req.url);
    res.setHeader('Content-Type', 'text/html');
    res.end('<head></head><body>Native entry</body>');
  });
  await new Promise((resolve) => native.listen(0, '127.0.0.1', resolve));
  const suite = await startWorkspace({
    port: 0,
    engines: {
      modbus: { port: native.address().port },
      serial: { port: native.address().port }
    }
  });
  t.after(async () => {
    await suite.close();
    await new Promise((resolve) => native.close(resolve));
  });
  for (const tool of ['modbus', 'serial']) {
    const response = await fetch(
      suite.url + '/apps/' + tool + '/?exercise=own-document'
    );
    assert.equal(response.status, 200);
    assert.match(await response.text(), /suite\/boot.js/);
    assert.equal(seen.at(-1), '/');
    await fetch(suite.url + '/apps/' + tool + '/api/example?offset=10');
    assert.equal(seen.at(-1), '/api/example?offset=10');
  }
});
