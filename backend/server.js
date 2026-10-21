const express = require('express');
const path = require('node:path');
const mongoose = require('mongoose');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const frontendDir = path.resolve(__dirname, '../frontend');

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use(express.static(frontendDir));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'not_connected' });
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Endpoint não implementado nesta etapa.' });
});

async function start() {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
      console.log('MongoDB conectado.');
    } catch (error) {
      console.error('Falha ao conectar MongoDB:', error.message);
      process.exitCode = 1;
      return;
    }
  } else {
    console.warn('MONGODB_URI ausente: iniciando sem banco de dados (modo protótipo).');
  }

  app.listen(PORT, () => console.log(`Hidrovia Online: http://localhost:${PORT}`));
}

if (require.main === module) start();
module.exports = { app, start };
