const test = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('../server');

test('GET /api/health retorna status ok', async () => {
  const server = app.listen(0);
  try {
    const port = server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.status, 'ok');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
