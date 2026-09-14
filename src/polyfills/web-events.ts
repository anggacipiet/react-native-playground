// Minimal Web event globals for React Native / Hermes.
//
// msw@2.15 -> msw/native transitively imports rettime and the @mswjs/interceptors
// WebSocket interceptor, which declare classes extending `MessageEvent`, `Event`,
// and `EventTarget` at module-evaluation time:
//   - rettime:            class TypedEvent extends MessageEvent
//   - WebSocket interceptor: CloseEvent extends Event, WebSocketOverride extends EventTarget, ...
// None of these globals exist in RN/Hermes (only in browsers / react-native-web),
// so importing msw/native throws a ReferenceError before setupServer is ever created.
//
// Only the Fetch and XMLHttpRequest interceptors are actually exercised here; the
// WebSocket classes are merely imported, so these globals only need to be
// constructable and expose the surface the base classes touch — full DOM fidelity
// is not required. Each is guarded so real globals (e.g. on web) are left intact.

const g = globalThis as any;

if (typeof g.Event === 'undefined') {
  class Event {
    type: string;
    bubbles: boolean;
    cancelable: boolean;

    constructor(type: string, init: Record<string, any> = {}) {
      this.type = type;
      this.bubbles = init.bubbles ?? false;
      this.cancelable = init.cancelable ?? false;
    }

    // No-ops: consumers that need real prevented/stopped state (rettime's
    // TypedEvent) track it themselves. Do NOT add a `defaultPrevented` property
    // here — TypedEvent defines it as a getter and an own property would shadow it.
    preventDefault(): void {}
    stopPropagation(): void {}
    stopImmediatePropagation(): void {}
  }
  g.Event = Event;
}

if (typeof g.MessageEvent === 'undefined') {
  class MessageEvent {
    type: string;
    data: unknown;
    origin: string;
    lastEventId: string;
    ports: readonly unknown[];
    source: unknown;

    constructor(type: string, init: Record<string, any> = {}) {
      this.type = type;
      this.data = init.data ?? null;
      this.origin = init.origin ?? '';
      this.lastEventId = init.lastEventId ?? '';
      this.ports = init.ports ?? [];
      this.source = init.source ?? null;
    }

    preventDefault(): void {}
    stopPropagation(): void {}
    stopImmediatePropagation(): void {}
  }
  g.MessageEvent = MessageEvent;
}

if (typeof g.BroadcastChannel === 'undefined') {
  // msw's core barrel (`import { http } from "msw"`) evaluates ws.mjs, which does
  // `new BroadcastChannel(...)` at module top level. WebSocket mocking is never
  // exercised here, so a minimal constructable stub is sufficient.
  class BroadcastChannel {
    name: string;
    onmessage: ((event: any) => void) | null = null;
    onmessageerror: ((event: any) => void) | null = null;

    constructor(name: string) {
      this.name = name;
    }

    postMessage(_message: unknown): void {}
    close(): void {}
    addEventListener(): void {}
    removeEventListener(): void {}
    dispatchEvent(): boolean {
      return true;
    }
  }
  g.BroadcastChannel = BroadcastChannel;
}

if (typeof g.EventTarget === 'undefined') {
  class EventTarget {
    _listeners: Map<string, Set<any>> = new Map();

    addEventListener(type: string, listener: any): void {
      if (!listener) return;
      let set = this._listeners.get(type);
      if (!set) {
        set = new Set();
        this._listeners.set(type, set);
      }
      set.add(listener);
    }

    removeEventListener(type: string, listener: any): void {
      this._listeners.get(type)?.delete(listener);
    }

    dispatchEvent(event: any): boolean {
      const set = this._listeners.get(event?.type);
      if (set) {
        for (const listener of [...set]) {
          if (typeof listener === 'function') {
            listener.call(this, event);
          } else {
            listener?.handleEvent?.(event);
          }
        }
      }
      return true;
    }
  }
  g.EventTarget = EventTarget;
}
