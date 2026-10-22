const buckets = new Map();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_REPORTS = 12;
function relatoLimit(req, res, next) {
  const key = String(req.user?._id || req.ip);
  const now = Date.now();
  const record = buckets.get(key);
  const state = !record || record.reset <= now ? { count: 0, reset: now + WINDOW_MS } : record;
  state.count += 1;
  buckets.set(key, state);
  if (state.count > MAX_REPORTS) {
    res.setHeader('Retry-After', String(Math.ceil((state.reset - now) / 1000)));
    return res.status(429).json({ error: 'Limite de relatos atingido. Tente novamente mais tarde.' });
  }
  next();
}
module.exports = relatoLimit;
