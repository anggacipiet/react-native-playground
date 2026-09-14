// Stream-capable Fetch polyfill for React Native / Hermes — NATIVE ONLY.
//
// RN's built-in fetch is the whatwg-fetch polyfill layered on XMLHttpRequest. It
// does NOT implement `Response.prototype.body` as a ReadableStream (returns
// `undefined` — facebook/react-native#27741). MSW's FetchInterceptor rebuilds every
// mocked response via `new FetchResponse(rawResponse.body, ...)`, so on RN the body
// is dropped and `response.text()` / `.json()` come back empty ("JSON Parse error:
// Unexpected end of input").
//
// Fix: replace fetch/Response/Request/Headers with `react-native-fetch-api` (which
// exposes a real streaming body via `reactNative: { textStreaming: true }`) and
// provide `ReadableStream` + `TextEncoder`/`TextDecoder` that it and MSW rely on.
// Must run BEFORE msw/native is imported (see msw.polyfill.ts import order).
//
// Web is explicitly excluded: browsers already have a spec-correct fetch/Response
// with a real streaming `.body`, so this bug never occurs there. Overriding a
// working native browser fetch with react-native-fetch-api would only add risk
// for zero benefit — and would actively break web anyway, because
// react-native-fetch-api's Fetch.js does `import { Networking } from "react-native"`,
// which pulls in RN's real native bridge (NativeBlobModule via TurboModuleRegistry)
// and throws "Invariant Violation: __fbBatchedBridgeConfig is not set" when there is
// no native bridge (i.e. on web). Static `import` runs that chain unconditionally at
// bundle-load time regardless of any Platform.OS check around its usage — so the
// whole require() must itself be deferred behind the platform check, not just the
// call sites.
import { Platform } from 'react-native';

// RN's babel preset auto-inserts a `console.warn(...)` call for every deep
// `react-native/Libraries/...` import found anywhere in this file (appended
// at the end of the file's compiled output, regardless of any runtime
// Platform check around the actual require below). `PolyfillFunctions` has
// no public, non-deep-import equivalent, so this warning is unavoidable.
// `LogBox.ignoreLogs` only hides it from the in-app overlay — the raw
// console.warn still reaches the DevTools Console panel (it reads the JS
// engine's console directly, a different path than LogBox) and `adb
// logcat`. Filter the message at the source instead.
const originalConsoleWarn = console.warn;
console.warn = (...args: unknown[]) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes("Deep imports from the 'react-native' package are deprecated")
  ) {
    return;
  }
  originalConsoleWarn(...args);
};

if (Platform.OS !== 'web') {
  const { polyfillGlobal } =
    require('react-native/Libraries/Utilities/PolyfillFunctions') as typeof import('react-native/Libraries/Utilities/PolyfillFunctions');
  const { TextDecoder, TextEncoder } = require('text-encoding');
  const { ReadableStream } = require('web-streams-polyfill');
  const { fetch, Headers, Request, Response } = require('react-native-fetch-api');

  polyfillGlobal('TextEncoder', () => TextEncoder);
  polyfillGlobal('TextDecoder', () => TextDecoder);
  polyfillGlobal('ReadableStream', () => ReadableStream);

  polyfillGlobal(
    'fetch',
    () =>
      (...args: any[]) =>
        fetch(args[0], { ...args[1], reactNative: { textStreaming: true } })
  );
  polyfillGlobal('Headers', () => Headers);
  polyfillGlobal('Request', () => Request);
  polyfillGlobal('Response', () => Response);

  // Fix react-native-fetch-api's broken `body` getter.
  //
  // MSW's FetchInterceptor rebuilds every mocked response via
  // `new FetchResponse(rawResponse.body, ...)`, so it reads the body as a stream.
  // react-native-fetch-api's original getter encodes text with `new Uint8Array(text)`
  // (a string is NOT byte-encoded — every char becomes 0) and enqueues each byte as a
  // separate NUMBER, which its own `drainStream` cannot consume (`[...number]` throws).
  // Result: the JSON body is silently lost -> "JSON Parse error: Unexpected end of input".
  //
  // Replace it with a spec-correct getter that emits ONE properly UTF-8 encoded
  // Uint8Array chunk. `drainStream` handles a single typed-array chunk fine, so
  // `response.text()` / `.json()` read back the real body.
  const ResponseProto = Response.prototype;
  const originalBodyDescriptor = Object.getOwnPropertyDescriptor(ResponseProto, 'body');
  Object.defineProperty(ResponseProto, 'body', {
    configurable: true,
    get(this: any) {
      const b = this._body;
      if (!b) return originalBodyDescriptor?.get?.call(this) ?? null;
      // An actual upstream stream (e.g. passthrough) — leave it alone.
      if (b._bodyReadableStream) return b._bodyReadableStream;

      let bytes: Uint8Array;
      if (b._bodyArrayBuffer) {
        bytes = ArrayBuffer.isView(b._bodyArrayBuffer)
          ? new Uint8Array(
              b._bodyArrayBuffer.buffer,
              b._bodyArrayBuffer.byteOffset,
              b._bodyArrayBuffer.byteLength
            )
          : new Uint8Array(b._bodyArrayBuffer);
      } else if (b._bodyBlob) {
        // Blob bodies aren't used by our mocks; defer to the original behaviour.
        return originalBodyDescriptor?.get?.call(this) ?? null;
      } else {
        bytes = new TextEncoder().encode(b._bodyText ?? '');
      }

      const RS = (globalThis as any).ReadableStream;
      return new RS({
        start(controller: any) {
          controller.enqueue(bytes);
          controller.close();
        },
      });
    },
  });

  // Fix react-native-fetch-api's broken `clone()` for stream-backed bodies.
  //
  // MSW itself calls `response.clone()` before re-emitting a response to its
  // `response:mocked`/`response:bypass` listeners (see src/mocks/server.ts),
  // so the original response passed to `apiFetch` stays untouched. The
  // original `clone()` just re-passes `this._body._bodyInit` as the new
  // body — for a ReadableStream that's the SAME stream instance, so reading
  // the "clone" locks the original stream too:
  // "TypeError: This stream has already been locked for exclusive reading
  // by another reader". `tee()` the stream into two independent branches
  // instead — one replaces this instance's (now-consumed) stream reference,
  // the other backs the clone.
  const originalClone = ResponseProto.clone;
  Object.defineProperty(ResponseProto, 'clone', {
    configurable: true,
    value(this: any) {
      const b = this._body;
      if (b?._bodyReadableStream) {
        const [forSelf, forClone] = b._bodyReadableStream.tee();
        b._bodyReadableStream = forSelf;
        b._bodyInit = forSelf;
        return new Response(forClone, {
          status: this.status,
          statusText: this.statusText,
          headers: new Headers(this.headers),
          url: this.url,
        });
      }
      return originalClone.call(this);
    },
  });
}
