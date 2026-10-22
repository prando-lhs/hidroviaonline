const express = require('express');
const path = require('node:path');
const mongoose = require('mongoose');
const { classifyMongoError } = require('./db-diagnostics');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const frontendDir = path.resolve(__dirname, '../frontend');
const relatoRoutes = require('./routes/relatos');
const authRoutes = require('./routes/auth');
const sinalizacaoRoutes = require('./routes/sinalizacao');

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use((req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const origin = req.get('origin');
  const host = req.get('host');
  if (origin) {
    try { if (new URL(origin).host !== host) return res.status(403).json({ error: 'Origem não autorizada.' }); }
    catch { return res.status(403).json({ error: 'Origem inválida.' }); }
  }
  next();
});
app.use('/api', (req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
app.use(express.static(frontendDir));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'not_connected' });
});

// Em ambientes serverless, estabelecer conexao antes de atender rotas persistentes.
let connectionPromise;
app.use('/api', async (req, res, next) => {
  if (req.path === '/health' || !['/auth', '/relatos', '/sinalizacao'].some(prefix => req.path === prefix || req.path.startsWith(prefix + '/'))) return next();
  if (mongoose.connection.readyState === 1) return next();
  if (!process.env.MONGODB_URI) return res.status(503).json({ error: 'Banco de dados nao configurado.' });
  try {
    if (!connectionPromise) {
      connectionPromise = mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
        .catch(error => { connectionPromise = null; throw error; });
    }
    await connectionPromise;
    next();
  } catch (error) {
    console.error('[mongodb] connection_failed category=' + classifyMongoError(error));
    res.status(503).json({ error: 'Banco de dados indisponivel.' });
  }
});
app.use('/api/auth', authRoutes);
app.use('/api/relatos', relatoRoutes);
app.use('/api/sinalizacao', sinalizacaoRoutes);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Endpoint não implementado nesta etapa.' });
});

async function start() {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    console.error('Defina SESSION_SECRET com no mínimo 32 caracteres.');
    process.exitCode = 1;
    return;
  }
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
      console.log('MongoDB conectado.');
    } catch (error) {
      console.error('[mongodb] startup_connection_failed category=' + classifyMongoError(error));
      process.exitCode = 1;
      return;
    }
  } else {
    console.error('MONGODB_URI não configurada. Configure o MongoDB antes de iniciar.');
    process.exitCode = 1;
    return;
  }

  app.listen(PORT, () => console.log(`Hidrovia Online: http://localhost:${PORT}`));
}

if (require.main === module) start();
module.exports = { app, start };
