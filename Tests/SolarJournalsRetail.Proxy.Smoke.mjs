import assert from 'node:assert/strict';
import { createServer, loadConfigFromFile } from 'vite';

const route = '/misapi/api/pucsl/solarJournalsRetail';
const loaded = await loadConfigFromFile({ command: 'serve', mode: 'development' });
const configuredProxy = loaded?.config.server?.proxy?.[route];
assert.equal(typeof configuredProxy, 'object', 'Missing report proxy configuration.');
const server = await createServer({
  configFile: false,
  server: {
    host: '127.0.0.1',
    port: 0,
    proxy: { [route]: { ...configuredProxy, target: 'http://127.0.0.1:1' } },
  },
});
try {
  await server.listen();
  const { port } = server.httpServer.address();
  const response = await fetch(`http://127.0.0.1:${port}${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ areaType: 'Division', locationCode: 'R3', billCycle: '457' }),
  });
  assert.equal(response.status, 503);
  assert.match(response.headers.get('content-type'), /application\/json/);
  const result = await response.json();
  assert.equal(result.data, null);
  assert.match(result.errorMessage, /report service is unavailable/i);
  console.log('PASS: Unreachable report API returns a readable JSON HTTP 503 response.');
} finally {
  await server.close();
}
