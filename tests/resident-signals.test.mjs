import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VirtualPLC } from '../apps/plc/src/plant-runtime.js';
import { residentSignals } from '../src/resident-signals.js';
import { startWorkspace } from '../src/workspace-server.js';
import { createResidentSource } from '../web/resident-source.js';
import { quality } from '../web/signal-contract.js';

test('resident telemetry is the actual executed CPU, not prepared inputs or another engine', () => {
  const cpu = new VirtualPLC('rack');
  cpu.setInput('I0.0', true);
  const before = residentSignals(cpu, 'server-1', 1000);
  assert.equal(before.tags['inputs.I0.0'], undefined);
  assert.equal(before.tags.scan, 0);
  cpu.tick(100, true);
  const after = residentSignals(cpu, 'server-1', 2000);
  assert.equal(after.tags['inputs.I0.0'], true);
  assert.equal(after.tags['outputs.Q0.0'], true);
  assert.equal(after.instance, before.instance);
  assert.equal(after.tags.scan, cpu.snapshot().scan);
});

test('resident HTTP reads require the session and allowed origin; they cannot issue commands', async (t) => {
  const cpu = new VirtualPLC('rack');
  let reads = 0;
  const suite = await startWorkspace({
    port: 0,
    engines: { plc: { token: 'test-only-token' } },
    signalSource: () => {
      reads++;
      return residentSignals(cpu, 'server-1');
    }
  });
  t.after(() => suite.close());
  const url = suite.url + '/suite/signals/plc',
    headers = { Authorization: 'Bearer test-only-token' };
  assert.equal((await fetch(url)).status, 401);
  assert.equal(reads, 0);
  assert.equal(
    (
      await fetch(url, {
        headers: { ...headers, Origin: 'https://external.test' }
      })
    ).status,
    403
  );
  assert.equal((await fetch(url, { method: 'POST', headers })).status, 405);
  assert.equal(reads, 0);
  cpu.tick(100, true);
  const response = await fetch(url, { headers });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).tags.scan, 1);
  assert.equal(reads, 1);
  assert.equal(cpu.snapshot().scan, 1);
});

test('failed resident reads return unavailable instead of a fabricated snapshot', async (t) => {
  const suite = await startWorkspace({
    port: 0,
    engines: { plc: { token: 'test-only-token' } },
    signalSource: () => {
      throw Error('private detail');
    }
  });
  t.after(() => suite.close());
  const response = await fetch(suite.url + '/suite/signals/plc', {
    headers: { Authorization: 'Bearer test-only-token' }
  });
  assert.equal(response.status, 503);
  const text = await response.text();
  assert.ok(!text.includes('private detail'));
});

test('observer does not refresh time or invent zero on failed or incompatible responses', async () => {
  const source = {
    schema: 'ab-suite.signals.v1',
    source: 'plc',
    instance: 'server-1',
    at: 1000,
    tags: { 'outputs.Q0.0': true }
  };
  let result = { ok: true, json: async () => source },
    calls = 0;
  const client = createResidentSource({
    token: 'test',
    fetcher: async () => {
      calls++;
      return result;
    }
  });
  await client.poll();
  assert.equal(client.get().tags['outputs.Q0.0'], true);
  result = { ok: false };
  await client.poll();
  assert.equal(client.get().at, 1000);
  assert.equal(quality(client.get(), 6001), 'stale');
  result = {
    ok: true,
    json: async () => ({ ...source, schema: 'unknown', at: 9999 })
  };
  await client.poll();
  assert.equal(client.get().at, 1000);
  client.stop();
  await client.poll();
  assert.equal(calls, 3);
});
