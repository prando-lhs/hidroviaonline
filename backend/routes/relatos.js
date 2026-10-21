const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { authenticate, adminOnly } = require('../auth');

const relatoSchema = new mongoose.Schema({
  tipo: { type: String, enum: ['BOIA_DANIFICADA', 'PERIGO', 'ANOMALIA'], required: true },
  titulo: { type: String, trim: true, maxlength: 120, required: true },
  descricao: { type: String, trim: true, maxlength: 2000, default: '' },
  gravidade: { type: String, enum: ['BAIXA', 'MEDIA', 'ALTA'], required: true },
  lat: { type: Number, required: true, min: -90, max: 90 },
  lng: { type: Number, required: true, min: -180, max: 180 },
  status: { type: String, enum: ['PENDENTE', 'ATIVO', 'RESOLVIDO', 'REJEITADO'], default: 'PENDENTE' },
  confirmacoes: { type: Number, default: 0, min: 0 },
  autor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  votos: [{ usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, resposta: { type: String, enum: ['CONFIRMA', 'NAO_CONFIRMA'], required: true } }]
}, { timestamps: true, optimisticConcurrency: true });

const Relato = mongoose.models.Relato || mongoose.model('Relato', relatoSchema);
router.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: 'Banco de dados indisponível.' });
  next();
});

router.get('/', async (_req, res) => {
  try {
    const items = await Relato.find({ status: 'ATIVO' }).sort({ createdAt: -1 }).limit(500).lean();
    res.json(items.map(({ autor, votos, ...r }) => ({ ...r, id: String(r._id), atualizadoEm: r.updatedAt, confirmacoes: (votos || []).filter(v => v.resposta === 'CONFIRMA').length })));
  } catch { res.status(500).json({ error: 'Erro ao consultar relatos.' }); }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { tipo, titulo, descricao, gravidade, lat, lng } = req.body || {};
    const r = await Relato.create({ tipo, titulo, descricao, gravidade, lat, lng, autor: req.user._id });
    res.status(201).json({ id: String(r._id), status: r.status, atualizadoEm: r.updatedAt });
  } catch (err) {
    if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ error: 'Dados inválidos.', details: Object.keys(err.errors || {}) });
    res.status(500).json({ error: 'Erro ao salvar relato.' });
  }
});

router.get('/moderacao', authenticate, adminOnly, async (_req, res) => {
  try {
    const items = await Relato.find({ status: 'PENDENTE' }).sort({ createdAt: 1 }).limit(200).lean();
    res.json(items);
  } catch { res.status(500).json({ error: 'Erro ao consultar moderação.' }); }
});
router.patch('/:id/status', authenticate, adminOnly, async (req, res) => {
  const status = req.body?.status;
  if (!['ATIVO', 'RESOLVIDO', 'REJEITADO'].includes(status) || !mongoose.isValidObjectId(req.params.id))
    return res.status(400).json({ error: 'Status ou ID inválido.' });
  try {
    const item = await Relato.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ error: 'Relato não encontrado.' });
    res.json({ id: String(item._id), status: item.status });
  } catch { res.status(500).json({ error: 'Erro ao atualizar relato.' }); }
});
router.post('/:id/confirmacao', authenticate, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id) || !['CONFIRMA', 'NAO_CONFIRMA'].includes(req.body?.resposta))
    return res.status(400).json({ error: 'ID ou resposta inválida.' });
  try {
    const relato = await Relato.findOne({ _id: req.params.id, status: 'ATIVO' });
    if (!relato) return res.status(404).json({ error: 'Relato ativo não encontrado.' });
    const userId = String(req.user._id);
    if (String(relato.autor) === userId) return res.status(403).json({ error: 'Não é permitido confirmar o próprio relato.' });
    const index = relato.votos.findIndex(v => String(v.usuario) === userId);
    if (index >= 0) relato.votos[index].resposta = req.body.resposta;
    else relato.votos.push({ usuario: req.user._id, resposta: req.body.resposta });
    relato.confirmacoes = relato.votos.filter(v => v.resposta === 'CONFIRMA').length;
    await relato.save();
    res.json({ id: String(relato._id), confirmacoes: relato.confirmacoes, minhaResposta: req.body.resposta });
  } catch (error) {
    if (error.name === 'VersionError') return res.status(409).json({ error: 'O relato recebeu outra confirmação. Atualize e tente novamente.' });
    res.status(500).json({ error: 'Não foi possível registrar a confirmação.' });
  }
});
module.exports = router;
