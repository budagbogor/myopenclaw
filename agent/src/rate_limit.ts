import type { Request, Response, NextFunction } from 'express';

type Bucket = { count: number; resetAt: number };

export function rateLimit(options: { windowMs: number; max: number }) {
  const buckets = new Map<string, Bucket>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const b = buckets.get(key);

    if (!b || now >= b.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    b.count += 1;
    if (b.count > options.max) {
      res.status(429).json({ error: 'Rate limit exceeded' });
      return;
    }

    next();
  };
}

