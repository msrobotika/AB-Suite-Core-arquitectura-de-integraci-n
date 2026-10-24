/** A view of server telemetry: a failed read never refreshes cached timestamps. MIT. */
import { validSnapshot } from './signal-contract.js';
export function createResidentSource({
  fetcher,
  token,
  onChange = () => {},
  intervalMs = 750
}) {
  let snapshot = null,
    busy = false,
    closed = false,
    timer = null,
    controller = null;
  async function poll() {
    if (busy || closed) return;
    busy = true;
    controller = new AbortController();
    const timeout = setTimeout(() => controller?.abort(), 4000);
    try {
      const response = await fetcher('/suite/signals/plc', {
        headers: { Authorization: 'Bearer ' + token },
        cache: 'no-store',
        signal: controller.signal
      });
      if (!response.ok) throw Error('CPU no disponible');
      const next = await response.json();
      if (!validSnapshot(next) || next.source !== 'plc')
        throw Error('Contrato PLC incompatible');
      if (!closed) {
        snapshot = next;
        onChange();
      }
    } catch {
      /* Keep the original timestamp so consumers show stale/missing. */
    } finally {
      clearTimeout(timeout);
      controller = null;
      busy = false;
    }
  }
  return {
    get: () => snapshot,
    poll,
    start() {
      if (closed || timer) return;
      poll();
      timer = setInterval(poll, intervalMs);
    },
    stop() {
      closed = true;
      clearInterval(timer);
      controller?.abort();
    }
  };
}
