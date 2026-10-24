import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as shared from '@msrobotika/ab-suite-core/contracts';
import { validateSuiteEvent } from '../src/protocol.js';
import { validSnapshot } from '../web/signal-contract.js';
test('public contract module reuses the same live validators', () => {
  assert.equal(shared.validateSuiteEvent, validateSuiteEvent);
  assert.equal(shared.validSnapshot, validSnapshot);
  assert.equal(shared.SUITE_API_VERSION, 1);
});
test('public contracts reject incompatible versions and unavailable signals', () => {
  assert.throws(
    () =>
      shared.validateSuiteEvent(
        { schema: 'msrobotika.suite.event.v2' },
        'ab-plc-simulator'
      ),
    /incompatible/
  );
  assert.equal(shared.parseSnapshot('{"schema":"ab-suite.signals.v2"}'), null);
  assert.deepEqual(shared.signalValue({}, 'plc', 'outputs.Q0.0'), {
    quality: 'missing',
    value: null
  });
});
