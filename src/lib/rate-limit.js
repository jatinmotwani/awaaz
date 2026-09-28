// In-memory fixed-window limiter. Fine for a single instance; per-page PIN lockout
// lives in Postgres, so a restart can't be used to brute-force a PIN.
export function rateLimit({ windowMs, max, key = (req) => req.ip, message }) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, entry] of hits) if (entry.reset <= now) hits.delete(k);
  }, windowMs).unref();

  return (req, res, next) => {
    const k = key(req);
    const now = Date.now();
    let entry = hits.get(k);
    if (!entry || entry.reset <= now) {
      entry = { count: 0, reset: now + windowMs };
      hits.set(k, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.reset - now) / 1000)));
      return res.status(429).json({ error: message || 'Too many tries. Please wait a few minutes and try again.' });
    }
    return next();
  };
}
