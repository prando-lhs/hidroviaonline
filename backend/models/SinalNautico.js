const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  identificador: { type: String, required: true, unique: true, trim: true },
  nome: { type: String, required: true, trim: true },
  tipo: { type: String, required: true },
  position: { type: { type: String, enum: ['Point'], default: 'Point' }, coordinates: { type: [Number], required: true } },
  fonte: { type: String, required: true },
  verificado: { type: Boolean, default: false },
  verificadoEm: { type: Date },
  atualizadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
schema.index({ position: '2dsphere' });
module.exports = mongoose.models.SinalNautico || mongoose.model('SinalNautico', schema);
