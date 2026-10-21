const test = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, verifyPassword, sign, sessionCookie } = require('../auth');

test('senha é armazenada com hash e salt aleatório', () => {
  const a = hashPassword('uma-senha-bem-longa-123');
  const b = hashPassword('uma-senha-bem-longa-123');
  assert.notEqual(a, b);
  assert.equal(verifyPassword('uma-senha-bem-longa-123', a), true);
  assert.equal(verifyPassword('senha-incorreta', a), false);
});
test('cookie de sessão impede leitura por JavaScript', () => {
  const cookie = sessionCookie('token-exemplo');
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Max-Age=604800/);
});
test('assinatura gera token verificável em formato compacto', () => {
  const old = process.env.SESSION_SECRET;
  try {
    process.env.SESSION_SECRET = 'chave-de-teste-com-mais-de-trinta-e-dois-caracteres';
    const token = sign({ sub: '123', exp: Date.now() + 10000 });
    assert.equal(token.split('.').length, 2);
  } finally {
    if (old === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = old;
  }
});
