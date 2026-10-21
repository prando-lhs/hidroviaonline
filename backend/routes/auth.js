const express = require('express');
const mongoose = require('mongoose');
const { User, hashPassword, verifyPassword, sign, authenticate, sessionCookie } = require('../auth');
const router = express.Router();
router.use((req, res, next) => mongoose.connection.readyState === 1 ? next() : res.status(503).json({ error: 'Banco indisponível.' }));
router.post('/register', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = req.body?.password;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || typeof password !== 'string' || password.length < 12 || password.length > 128)
    return res.status(400).json({ error: 'Informe e-mail válido e senha de 12 a 128 caracteres.' });
  try {
    await User.create({ email, passwordHash: hashPassword(password) });
    res.status(201).json({ message: 'Conta criada. Faça login.' });
  } catch (err) { res.status(err.code === 11000 ? 409 : 500).json({ error: err.code === 11000 ? 'E-mail já cadastrado.' : 'Erro ao cadastrar.' }); }
});
router.post('/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = req.body?.password;
  if (typeof password !== 'string' || email.length > 254) return res.status(401).json({ error: 'Credenciais inválidas.' });
  try {
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !verifyPassword(password, user.passwordHash)) return res.status(401).json({ error: 'Credenciais inválidas.' });
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) return res.status(503).json({ error: 'Configure SESSION_SECRET com ao menos 32 caracteres.' });
    const token = sign({ sub: String(user._id), exp: Date.now() + 7 * 86400000 });
    res.setHeader('Set-Cookie', sessionCookie(token));
    res.json({ email: user.email, role: user.role });
  } catch { res.status(500).json({ error: 'Erro ao autenticar.' }); }
});
router.get('/me', authenticate, (req, res) => res.json({ email: req.user.email, role: req.user.role }));
router.post('/logout', (_req, res) => {
  res.setHeader('Set-Cookie', 'hidrovia_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
  res.json({ message: 'Sessão encerrada.' });
});
module.exports = router;
