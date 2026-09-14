import { setupServer } from 'msw/native';

import { handlers } from '@/mocks/handlers';

export const server = setupServer(...handlers);

// MSW-mocked requests never hit native networking, so they never show up in
// React Native DevTools' Network panel (it only observes real XHR/fetch
// traffic — see docs/react-native-devtools-debugging.md). Log the lifecycle
// events instead so mocked calls, including their JSON bodies, are still
// visible in the Console panel.
//
// Must read a `.clone()`, never the original — `request`/`response` are the
// same objects the handler and `apiFetch` go on to read via `.json()`, and a
// body can only be read once (`bodyUsed`). Reading the original here would
// make those downstream reads throw "Already read".
async function readJsonBody(message: Request | Response): Promise<unknown> {
  const text = await message.clone().text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

server.events.on('request:start', async ({ request }) => {
  console.log(`[MSW] ${request.method} ${request.url}`, await readJsonBody(request));
});

server.events.on('response:mocked', async ({ request, response }) => {
  console.log(
    `[MSW] ${request.method} ${request.url} -> ${response.status} (mocked)`,
    await readJsonBody(response)
  );
});

server.events.on('request:unhandled', ({ request }) => {
  console.warn(`[MSW] ${request.method} ${request.url} has no matching handler`);
});
