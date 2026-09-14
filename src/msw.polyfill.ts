// Order matters. Install everything msw/native touches BEFORE it is imported.
//  1. Web event globals (Event/MessageEvent/EventTarget/BroadcastChannel) that
//     msw's WebSocket interceptor + rettime declare classes against at eval time.
//  2. Stream-capable fetch/Response/Request/Headers + ReadableStream + Text(De|En)coder,
//     so mocked response bodies are actually readable on Hermes (RN#27741).
//  3. URL / URLSearchParams.
import 'react-native-url-polyfill/auto';
import './polyfills/fetch-streams';
import './polyfills/web-events';
