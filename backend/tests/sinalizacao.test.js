const test = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('../server');

async function withServer(callback) {
  const server = app.listen(0);
  try {
    const address = server.address();
    return await callback('http://127.0.0.1:' + address.port);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('health exposes database readiness without credentials', async () => {
  await withServer(async base => {
    const response = await fetch(base + '/api/health');
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.status, 'ok');
    assert.ok(['connected', 'not_connected'].includes(data.database));
  });
});

test('signal API returns 503 when MongoDB is unavailable', async () => {
  await withServer(async base => {
    const response = await fetch(base + '/api/sinalizacao');
    assert.equal(response.status, 503);
    const data = await response.json();
    assert.match(data.error, /Banco de dados (indisponivel|nao configurado)/);
  });
});

test('cross-origin mutations are rejected', async () => {
  await withServer(async base => {
    const response = await fetch(base + '/api/sinalizacao', {
      method: 'POST',
      headers: { origin: 'https://example.org', 'content-type': 'application/json' },
      body: '{}'
    });
    assert.equal(response.status, 403);
  });
});
