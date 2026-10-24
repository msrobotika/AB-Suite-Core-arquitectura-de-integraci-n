/** Consumer compilation: source/topic, payload and unknown signals must stay typed. */
import {
  validateSuiteEvent,
  validSnapshot,
  signalValue,
  SUITE_EVENT_SCHEMA,
  type SuiteEvent,
  type SignalSnapshot
} from '@msrobotika/ab-suite-core/contracts';
const frame: SuiteEvent = {
  schema: SUITE_EVENT_SCHEMA,
  source: 'ab-plc-simulator',
  topic: 'plc.snapshot',
  trace_id: 'practice-1',
  data: {
    scan: 1,
    scenario: 'rack',
    mode: 'PAUSE',
    inputs: { 'I0.0': true },
    outputs: { 'Q0.0': true },
    analog: { AI0: 42 }
  }
};
const checked = validateSuiteEvent(frame, 'ab-plc-simulator');
if (checked.topic === 'plc.snapshot') {
  const enabled: boolean = checked.data.outputs['Q0.0'];
  // @ts-expect-error PLC outputs are boolean, not text.
  const wrong: string = checked.data.outputs['Q0.0'];
  void enabled;
  void wrong;
}
// @ts-expect-error A PLC cannot publish a Vision result.
const spoofed: SuiteEvent = {
  schema: SUITE_EVENT_SCHEMA,
  source: 'ab-plc-simulator',
  topic: 'vision.inspection.result',
  trace_id: 'x',
  data: { image_id: 'x', passed: true, defects: 0 }
};
const metric: SuiteEvent = {
  schema: SUITE_EVENT_SCHEMA,
  source: 'ab-bi-studio',
  topic: 'bi.metric.updated',
  trace_id: 'x',
  // @ts-expect-error A BI metric must be numeric.
  data: { metric: 'm', value: '42' }
};
const incoming: unknown = JSON.parse('{}');
if (validSnapshot(incoming)) {
  const snapshot: SignalSnapshot = incoming;
  const reading = signalValue({ plc: snapshot }, 'plc', 'outputs.Q0.0');
  if (reading.quality === 'good') {
    const value: number | boolean = reading.value;
    void value;
  } else {
    const missing: null = reading.value;
    void missing;
  }
}
void spoofed;
void metric;
