const express = require('express');
const { authenticate, adminOnly } = require('../auth');
const SinalNautico = require('../models/SinalNautico');
const router = express.Router();
router.get('/', async (_req, res) => {
  try { res.json(await SinalNautico.find({ verificado: true }).limit(1000).lean()); }
  catch { res.status(500).json({ error: 'Falha ao consultar sinalização.' }); }
});
router.post('/', authenticate, adminOnly, async (req, res) => {
  const { identificador, nome, tipo, position, fonte } = req.body || {};
  if (!identificador || !nome || !tipo || !fonte || position?.type !== 'Point' ||
      !Array.isArray(position.coordinates) || position.coordinates.length !== 2 ||
      !position.coordinates.every(Number.isFinite) || Math.abs(position.coordinates[0]) > 180 || Math.abs(position.coordinates[1]) > 90)
    return res.status(400).json({ error: 'Dados de sinalização inválidos.' });
  try {
    const item = await SinalNautico.create({ identificador, nome, tipo, position, fonte, atualizadoPor: req.user._id });
    res.status(201).json({ id: item.id, verificado: false });
  } catch (e) { res.status(e.code === 11000 ? 409 : 500).json({ error: 'Não foi possível cadastrar sinal.' }); }
});
module.exports = router;
