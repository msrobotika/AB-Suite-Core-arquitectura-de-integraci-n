/** Read-only projection of the existing resident CPU; never creates a CPU. MIT. */
import { validSnapshot } from '../web/signal-contract.js';
export function residentSignals(cpu, instance, now = Date.now()) {
  const frame = cpu.snapshot();
  const tags = {};
  const put = (key, value) => {
    if (
      typeof value === 'boolean' ||
      (typeof value === 'number' && Number.isFinite(value))
    )
      tags[key] = value;
  };
  for (const group of ['inputs', 'outputs', 'memory', 'analog'])
    for (const [tag, value] of Object.entries(frame.cpu[group] ?? {}))
      put(group + '.' + tag, value);
  for (const [tag, value] of Object.entries(frame.faults ?? {}))
    put('faults.' + tag, value);
  for (const [tag, value] of Object.entries(frame.plant ?? {}))
    put('process.' + tag, value);
  put('scan', frame.scan);
  put('simulatedMs', frame.simulatedMs);
  put('running', frame.mode === 'RUN');
  const snapshot = {
    schema: 'ab-suite.signals.v1',
    source: 'plc',
    instance,
    at: now,
    tags
  };
  if (!validSnapshot(snapshot))
    throw Error('La CPU no cumple el contrato de señales');
  return snapshot;
}
