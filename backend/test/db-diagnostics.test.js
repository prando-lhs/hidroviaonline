const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyMongoError } = require('../db-diagnostics');

test('classifies MongoDB connection failures without exposing connection strings', () => {
  const cases = [
    [{ name: 'MongoServerError', code: 18, message: 'Authentication failed' }, 'authentication'],
    [{ code: 'ENOTFOUND', message: 'getaddrinfo ENOTFOUND' }, 'dns'],
    [{ name: 'MongoServerSelectionError', message: 'Server selection timed out' }, 'network_or_timeout'],
    [{ name: 'MongoParseError', message: 'Invalid scheme' }, 'configuration'],
    [{ code: 'CERT_HAS_EXPIRED' }, 'tls'],
    [{ message: 'unexpected error' }, 'unknown'],
  ];
  for (const [error, expected] of cases) assert.equal(classifyMongoError(error), expected);
});
test('diagnostics never return a URI or secret from an error', () => {
  const secret = 'mongodb+srv://user:supersecret@example.mongodb.net/db';
  assert.equal(classifyMongoError({ message: secret }), 'unknown');
});
