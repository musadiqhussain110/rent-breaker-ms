function createRateLimit({ windowMs = 60_000, max = 60 } = {}) {
  const buckets = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = `${req.ip}:${req.baseUrl}:${req.path}`;
    const item = buckets.get(key);

    if (!item || now - item.windowStart > windowMs) {
      buckets.set(key, { windowStart: now, count: 1 });
      return next();
    }

    if (item.count >= max) {
      return res.status(429).json({ message: "Too many requests. Try again later." });
    }

    item.count += 1;
    return next();
  };
}

module.exports = createRateLimit;
