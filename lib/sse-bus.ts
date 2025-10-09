// lib/sse-bus.ts
type Listener = (payload?: unknown) => void;

class SSEBus {
  private listeners = new Set<Listener>();

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(payload?: unknown) {
    for (const fn of Array.from(this.listeners)) {
      try {
        fn(payload);
      } catch {
        // ignoramos errores de handlers individuales
      }
    }
  }
}

// Reutiliza instancia en hot-reload / serverless
declare global {
  // eslint-disable-next-line no-var
  var __SSE_BUS__: SSEBus | undefined;
}

const bus: SSEBus =
  globalThis.__SSE_BUS__ ?? (globalThis.__SSE_BUS__ = new SSEBus());

export default bus;
export type { Listener };
