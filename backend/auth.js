const crypto = require('node:crypto');
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' }
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const hashPassword = password => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return salt + ':' + hash;
};
const verifyPassword = (password, stored) => {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const calculated = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return calculated.length === expected.length && crypto.timingSafeEqual(calculated, expected);
};
const secret = () => process.env.SESSION_SECRET;
const sign = (payload) => {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', secret()).update(data).digest('base64url');
  return data + '.' + mac;
};
const parseCookie = req => {
  const part = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('hidrovia_session='));
  return part ? part.slice('hidrovia_session='.length) : '';
};
const authenticate = async (req, res, next) => {
  if (!secret() || secret().length < 32) return res.status(503).json({ error: 'SESSION_SECRET não configurado.' });
  const token = parseCookie(req);
  if (token.length > 4096) return res.status(401).json({ error: 'Sessão inválida.' });
  const [data, signature] = token.split('.');
  if (!data || !signature) return res.status(401).json({ error: 'Faça login para continuar.' });
  const mac = crypto.createHmac('sha256', secret()).update(data).digest('base64url');
  const a = Buffer.from(mac), b = Buffer.from(signature);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: 'Sessão inválida.' });
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (!Number.isFinite(payload.exp) || payload.exp < Date.now()) return res.status(401).json({ error: 'Sessão expirada.' });
    const user = await User.findById(payload.sub).select('_id email role');
    if (!user) return res.status(401).json({ error: 'Usuário não encontrado.' });
    req.user = user;
    next();
  } catch { res.status(401).json({ error: 'Sessão inválida.' }); }
};
const adminOnly = (req, res, next) => req.user?.role === 'admin' ? next() : res.status(403).json({ error: 'Acesso restrito a administradores.' });
const sessionCookie = token => `hidrovia_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
module.exports = { User, hashPassword, verifyPassword, sign, authenticate, adminOnly, sessionCookie };
