export class FixedWindowRateLimiter {
  constructor({ max, windowMs }) {
    this.max = max;
    this.windowMs = windowMs;
    this.buckets = new Map();
  }

  consume(key, now = Date.now()) {
    const id = String(key);
    let bucket = this.buckets.get(id);
    if (!bucket || now - bucket.startedAt >= this.windowMs) {
      bucket = { startedAt: now, count: 0 };
      this.buckets.set(id, bucket);
    }
    bucket.count += 1;
    const allowed = bucket.count <= this.max;
    const retryAfterMs = allowed ? 0 : Math.max(1, this.windowMs - (now - bucket.startedAt));
    if (this.buckets.size > 10_000) this.prune(now);
    return { allowed, remaining: Math.max(0, this.max - bucket.count), retryAfterMs };
  }

  prune(now = Date.now()) {
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.startedAt >= this.windowMs) this.buckets.delete(key);
    }
  }
}

export function rateLimitMiddleware(limiter, keySelector = req => req.session?.telegramId) {
  return (req, res, next) => {
    const key = keySelector(req);
    if (!key) return next();
    const result = limiter.consume(key);
    res.setHeader('X-RateLimit-Remaining', String(result.remaining));
    if (result.allowed) return next();
    res.setHeader('Retry-After', String(Math.ceil(result.retryAfterMs / 1000)));
    return res.status(429).json({
      ok: false,
      error: 'RATE_LIMITED',
      message: 'Too many requests. Give the station a few seconds.'
    });
  };
}
