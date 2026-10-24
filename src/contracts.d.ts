/** AB Suite versioned public interfaces. Runtime validation is still required. MIT. */
export type CpuMode = 'RUN' | 'PAUSE' | 'STOP';
export type SuiteSource =
  | 'ab-plc-simulator'
  | 'ab-vision-inspector'
  | 'ab-grafcet-studio'
  | 'ab-bi-studio'
  | 'ab-kop-studio'
  | 'ab-scl-studio'
  | 'ab-modbus-studio';
export type BooleanSignals = Record<string, boolean>;
export type NumericSignals = Record<string, number>;
export interface EventEnvelope {
  schema: 'msrobotika.suite.event.v1';
  trace_id: string;
  simulated_ms?: number;
}
export interface PlcSnapshotData {
  scan: number;
  scenario: string;
  mode: CpuMode;
  inputs: BooleanSignals;
  outputs: BooleanSignals;
  analog: NumericSignals;
  [key: string]: unknown;
}
type EventVariant<
  S extends SuiteSource,
  T extends string,
  D
> = EventEnvelope & { source: S; topic: T; data: D };
export type SuiteEvent =
  | EventVariant<'ab-plc-simulator', 'plc.snapshot', PlcSnapshotData>
  | EventVariant<
      'ab-plc-simulator',
      'plc.status',
      { mode: CpuMode; [key: string]: unknown }
    >
  | EventVariant<
      'ab-vision-inspector',
      'vision.inspection.result',
      {
        image_id: string;
        passed: boolean;
        defects: number;
        [key: string]: unknown;
      }
    >
  | EventVariant<
      'ab-grafcet-studio',
      'grafcet.stage.changed',
      { step_id: string; active: boolean; [key: string]: unknown }
    >
  | EventVariant<
      'ab-bi-studio',
      'bi.metric.updated',
      { metric: string; value: number; [key: string]: unknown }
    >
  | EventVariant<
      'ab-kop-studio' | 'ab-scl-studio',
      'project.updated',
      { project_id: string; format: string; [key: string]: unknown }
    >;
export type ReceivedSuiteEvent = SuiteEvent & {
  sequence: number;
  id: string;
  received_at: string;
};
export const SUITE_EVENT_SCHEMA: 'msrobotika.suite.event.v1';
export const SUITE_API_VERSION: 1;
export const SUITE_TOPICS: Readonly<
  Record<SuiteSource, readonly SuiteEvent['topic'][]>
>;
export function validateSuiteEvent(
  raw: unknown,
  authenticatedSource: SuiteSource
): SuiteEvent;
export const SCHEMA: 'ab-suite.signals.v1';
export const PREFIX: 'ab-suite:signals:';
export interface SignalSnapshot {
  schema: typeof SCHEMA;
  source: string;
  instance: string;
  at: number;
  tags: Record<string, boolean | number>;
}
export type SignalQuality = 'good' | 'stale' | 'missing';
export type SignalValue =
  | { quality: 'good'; value: boolean | number }
  | { quality: 'stale' | 'missing'; value: null };
export function validSnapshot(value: unknown): value is SignalSnapshot;
export function parseSnapshot(raw: string | null): SignalSnapshot | null;
export function quality(snapshot: unknown, now?: number): SignalQuality;
export function signalValue(
  snapshots: Record<string, SignalSnapshot | undefined | null>,
  source: string,
  tag: string,
  now?: number
): SignalValue;
