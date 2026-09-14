// Ambient types for packages/internal RN modules used only by the dev-only
// MSW polyfill chain (see src/polyfills/fetch-streams.ts), which ship no
// TypeScript declarations of their own (and have no @types/* package).

declare module 'react-native/Libraries/Utilities/PolyfillFunctions' {
  export function polyfillGlobal<T>(name: string, getValue: () => T): void;
}

declare module 'react-native-fetch-api' {
  export const fetch: typeof globalThis.fetch;
  export const Headers: typeof globalThis.Headers;
  export const Request: typeof globalThis.Request;
  export const Response: typeof globalThis.Response;
}
