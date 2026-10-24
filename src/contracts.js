/** Shared public contracts. The original validators remain authoritative. MIT. */
export {
  validateSuiteEvent,
  SUITE_EVENT_SCHEMA,
  SUITE_API_VERSION,
  SUITE_TOPICS
} from './protocol.js';
export {
  SCHEMA,
  PREFIX,
  validSnapshot,
  parseSnapshot,
  quality,
  signalValue
} from '../web/signal-contract.js';
