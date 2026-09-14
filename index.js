// Custom entry point: start MSW BEFORE expo-router registers the app.
// Synchronous on purpose — an async entry (top-level await) crashes RN on launch
// ("non-std C++ exception" / RCTFatal) because AppRegistry runs synchronously.
import 'react-native-url-polyfill/auto';

if (__DEV__) {
  require('./src/msw.polyfill');
  const { server } = require('./src/mocks/server');
  const { API_URL } = require('./src/api/client');
  server.listen({
    onUnhandledRequest(request, print) {
      // MSW intercepts every `fetch` call globally, including Metro's own
      // dev-server traffic (symbolication, HMR, etc.) — that's not part of
      // this app's mocked API surface, so only warn about requests actually
      // aimed at it (a genuinely missing handler).
      if (!request.url.startsWith(API_URL)) return;
      print.warning();
    },
  });
}

require('expo-router/entry');
