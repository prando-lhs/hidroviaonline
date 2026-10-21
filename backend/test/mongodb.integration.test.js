const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { app } = require('../server');
const { User } = require('../auth');

test('fluxo real: cadastro, login, moderação e confirmação no MongoDB', { skip: !process.env.MONGODB_TEST_URI }, async () => {
  process.env.SESSION_SECRET = 'segredo-exclusivo-de-testes-com-mais-de-32-caracteres';
  await mongoose.connect(process.env.MONGODB_TEST_URI, { serverSelectionTimeoutMS: 10000 });
  const server = app.listen(0);
  const base = 'http://127.0.0.1:' + server.address().port;
  const unique = Date.now() + '-' + Math.random().toString(36).slice(2);
  const password = 'senha-segura-para-testes-123';
  const request = async (path, method = 'GET', body, cookie) => {
    const response = await fetch(base + path, {
      method, headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    return { response, data: await response.json() };
  };
  const registerLogin = async (prefix) => {
    const email = prefix + '-' + unique + '@example.test';
    const registration = await request('/api/auth/register', 'POST', { email, password });
    assert.equal(registration.response.status, 201, JSON.stringify(registration.data));
    const login = await request('/api/auth/login', 'POST', { email, password });
    assert.equal(login.response.status, 200, JSON.stringify(login.data));
    return { email, cookie: login.response.headers.get('set-cookie').split(';')[0] };
  };
  try {
    const author = await registerLogin('autor');
    const moderator = await registerLogin('moderador');
    const voter = await registerLogin('votante');
    const admin = await User.findOneAndUpdate({ email: moderator.email }, { role: 'admin' }, { new: true });
    assert.equal(admin.role, 'admin');

    const invalid = await request('/api/relatos', 'POST', { tipo: 'PERIGO', titulo: 'Invalido', gravidade: 'ALTA', lat: 999, lng: -48 }, author.cookie);
    assert.equal(invalid.response.status, 400);

    const created = await request('/api/relatos', 'POST', {
      tipo: 'PERIGO', titulo: 'Obstáculo de teste', descricao: 'Apenas teste automatizado',
      gravidade: 'ALTA', lat: -22.49, lng: -48.56
    }, author.cookie);
    assert.equal(created.response.status, 201, JSON.stringify(created.data));
    assert.equal(created.data.status, 'PENDENTE');
    const id = created.data.id;

    const publicBefore = await request('/api/relatos');
    assert.equal(publicBefore.response.status, 200);
    assert.equal(publicBefore.data.some(item => item.id === id), false);

    const forbidden = await request('/api/relatos/moderacao', 'GET', undefined, author.cookie);
    assert.equal(forbidden.response.status, 403);
    const queue = await request('/api/relatos/moderacao', 'GET', undefined, moderator.cookie);
    assert.equal(queue.response.status, 200);
    assert.ok(queue.data.some(item => String(item._id) === id));

    const approved = await request('/api/relatos/' + id + '/status', 'PATCH', { status: 'ATIVO' }, moderator.cookie);
    assert.equal(approved.response.status, 200);
    const publicAfter = await request('/api/relatos');
    assert.ok(publicAfter.data.some(item => item.id === id));

    const selfVote = await request('/api/relatos/' + id + '/confirmacao', 'POST', { resposta: 'CONFIRMA' }, author.cookie);
    assert.equal(selfVote.response.status, 403);
    const vote = await request('/api/relatos/' + id + '/confirmacao', 'POST', { resposta: 'CONFIRMA' }, voter.cookie);
    assert.equal(vote.response.status, 200, JSON.stringify(vote.data));
    assert.equal(vote.data.confirmacoes, 1);
    const repeat = await request('/api/relatos/' + id + '/confirmacao', 'POST', { resposta: 'CONFIRMA' }, voter.cookie);
    assert.equal(repeat.response.status, 200);
    assert.equal(repeat.data.confirmacoes, 1);
    const change = await request('/api/relatos/' + id + '/confirmacao', 'POST', { resposta: 'NAO_CONFIRMA' }, voter.cookie);
    assert.equal(change.response.status, 200);
    assert.equal(change.data.confirmacoes, 0);
    const resolved = await request('/api/relatos/' + id + '/status', 'PATCH', { status: 'RESOLVIDO' }, moderator.cookie);
    assert.equal(resolved.response.status, 200);
    const publicFinal = await request('/api/relatos');
    assert.equal(publicFinal.data.some(item => item.id === id), false);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});
