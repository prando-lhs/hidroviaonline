const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { app } = require('../server');

async function withServer(callback) {
  const server = app.listen(0);
  try { return await callback('http://127.0.0.1:' + server.address().port); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
test('endpoints dependentes de MongoDB retornam 503 sem conexão', async () => {
  assert.notEqual(mongoose.connection.readyState, 1);
  await withServer(async base => {
    for (const path of ['/api/relatos', '/api/auth/me']) {
      const response = await fetch(base + path);
      assert.equal(response.status, 503, path);
      assert.match(response.headers.get('cache-control'), /no-store/);
    }
  });
});
test('requisições de escrita de origem diferente são bloqueadas', async () => {
  await withServer(async base => {
    const response = await fetch(base + '/api/auth/login', {
      method: 'POST', headers: { origin: 'https://site-externo.example', 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'teste@example.com', password: 'senha' })
    });
    assert.equal(response.status, 403);
  });
});
test('rotas inexistentes da API retornam 404', async () => {
  await withServer(async base => {
    const response = await fetch(base + '/api/nao-existe');
    assert.equal(response.status, 404);
  });
});
test('rotas de API não devem ser armazenadas em cache', async () => {
  await withServer(async base => {
    const response = await fetch(base + '/api/health');
    assert.match(response.headers.get('cache-control'), /no-store/);
  });
});
