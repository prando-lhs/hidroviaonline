// Categorias de diagnóstico sem incluir mensagens, URIs ou credenciais do driver.
function classifyMongoError(error) {
  const code = String(error?.code || '');
  const name = String(error?.name || '');
  const message = String(error?.message || '');
  if (/Authentication|auth failed|bad auth|not authorized|code 18|code 13/i.test(name + ' ' + message) || ['18', '13'].includes(code)) return 'authentication';
  if (/ENOTFOUND|EAI_AGAIN|querySrv|queryTxt|DNS|ETIMEOUT/i.test(code + ' ' + name + ' ' + message)) return 'dns';
  if (/ECONNREFUSED|ENETUNREACH|EHOSTUNREACH|ETIMEDOUT|ServerSelection|timed out|IP whitelist|IP access list/i.test(code + ' ' + name + ' ' + message)) return 'network_or_timeout';
  if (/MongoParseError|Invalid scheme|URI malformed|MongoAPIError/i.test(name + ' ' + message)) return 'configuration';
  if (/TLS|SSL|CERT|certificate/i.test(code + ' ' + name + ' ' + message)) return 'tls';
  return 'unknown';
}
module.exports = { classifyMongoError };
