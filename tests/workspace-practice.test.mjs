import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTcp, registerViews, hexBytes } from '../web/protocol-lab.js';
import { VirtualPLC } from '../apps/plc/src/plant-runtime.js';
import {
  suiteLiveState,
  suiteLiveCommand
} from '../apps/plc/src/suite-live-server.js';
test('TCP: MBAP and FC03 request retain addresses and quantity', () => {
  const r = parseTcp('00 01 00 00 00 06 01 03 00 10 00 02');
  assert.equal(r.transaction, 1);
  assert.equal(r.address, 16);
  assert.equal(r.quantity, 2);
  assert.equal(r.unit, 1);
});
test('TCP: register response uses network byte order', () => {
  const r = parseTcp('00 07 00 00 00 07 02 03 04 FF FF 3F 80', 'response');
  assert.deepEqual(r.values, [65535, 16256]);
  assert.equal(r.unit, 2);
});
test('TCP: bit responses and exception PDUs remain distinct', () => {
  assert.deepEqual(
    parseTcp('00 01 00 00 00 04 01 01 01 05', 'response').values,
    [true, false, true, false, false, false, false, false]
  );
  const e = parseTcp('00 01 00 00 00 03 01 83 02', 'response');
  assert.equal(e.kind, 'Excepción');
  assert.equal(e.exception, 2);
});
test('TCP: incomplete, non-Modbus, inconsistent and excessive reads are rejected', () => {
  for (const text of [
    '',
    '0',
    'GG',
    '00 01',
    '00 01 00 01 00 06 01 03 00 00 00 02',
    '00 01 00 00 00 05 01 03 00 00 00 02',
    '00 01 00 00 00 06 01 03 00 00 00 00',
    '00 01 00 00 00 06 01 03 FF FF 00 02'
  ])
    assert.throws(() => parseTcp(text), text);
  assert.throws(() => parseTcp('00 01 00 00 00 05 01 03 02 FF', 'response'));
  assert.throws(() => parseTcp('00 01 00 00 00 06 01 10 00 00 00 01'));
});
test('Registers: signed, unsigned, binary and float32 layouts are explicit', () => {
  assert.equal(registerViews([65535]).rows[0].signed, -1);
  assert.equal(registerViews([1]).rows[0].binary, '0000000000000001');
  for (const [words, order] of [
    [[0x3f80, 0], 'ABCD'],
    [[0, 0x3f80], 'CDAB'],
    [[0x803f, 0], 'BADC'],
    [[0, 0x803f], 'DCBA']
  ])
    assert.equal(registerViews(words, order).float, 1);
  assert.equal(registerViews([0x3f80]).float, null);
  assert.throws(() => registerViews([-1]));
  assert.throws(() => registerViews([1, 2], 'unknown'));
  assert.equal(hexBytes('AB cd\n01').length, 3);
});
test('CPU observation: prepared inputs are real manual values, not an executed scan', () => {
  const cpu = new VirtualPLC('rack');
  suiteLiveCommand(cpu, { command: 'input', tag: 'I0.0', value: true });
  const before = suiteLiveState(cpu);
  assert.equal(before.preparedInputs['I0.0'], true);
  assert.equal(before.snapshot.scan, 0);
  assert.equal(before.snapshot.cpu.inputs['I0.0'], undefined);
  suiteLiveCommand(cpu, { command: 'step' });
  const after = suiteLiveState(cpu);
  assert.equal(after.snapshot.cpu.inputs['I0.0'], true);
  assert.equal(after.snapshot.scan, 1);
  assert.equal(after.snapshot.cpu.outputs['Q0.0'], true);
});

test('CPU vacía: crear sin demo, ejecutar sin salidas y cargar lógica propia', () => {
  const cpu = new VirtualPLC('rack');
  suiteLiveCommand(cpu, {
    command: 'scenario',
    scenario: 'rack',
    program: { version: 1, name: 'Desde cero', rungs: [] }
  });
  assert.deepEqual(suiteLiveState(cpu).program.rungs, []);
  suiteLiveCommand(cpu, { command: 'step' });
  assert.deepEqual(suiteLiveState(cpu).snapshot.cpu.outputs, {});
  assert.equal(suiteLiveState(cpu).snapshot.mode, 'PAUSE');
});
