import { Request, Response, NextFunction } from 'express';

export interface RateLimiterOptions {
  windowMs?: number;
  maxRequests?: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

export interface RateLimitEntry {
  timestamps: number[];
}

export class SlidingWindowRateLimiter {
  private hits = new Map<string, RateLimitEntry>();
  private windowMs: number;
  private maxRequests: number;
  private message: string;
  private keyGenerator: (req: Request) => string;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(options: RateLimiterOptions = {}) {
    this.windowMs = options.windowMs ?? 60_000;
    this.maxRequests = options.maxRequests ?? 60;
    this.message = options.message ?? 'Too many requests. Please slow down and try again later.';
    this.keyGenerator =
      options.keyGenerator ??
      ((req: Request) => {
        const forwarded = req.headers['x-forwarded-for'];
        if (typeof forwarded === 'string') {
          return forwarded.split(',')[0].trim();
        }
        return req.ip || req.socket.remoteAddress || '127.0.0.1';
      });

    // Cleanup stale entries every 2 windows
    this.cleanupInterval = setInterval(
      () => {
        this.evictStaleEntries();
      },
      Math.max(10_000, this.windowMs * 2),
    );

    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  public evictStaleEntries(): void {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    for (const [key, entry] of this.hits.entries()) {
      entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);
      if (entry.timestamps.length === 0) {
        this.hits.delete(key);
      }
    }
  }

  public reset(): void {
    this.hits.clear();
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.hits.clear();
  }

  public middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const now = Date.now();
      const cutoff = now - this.windowMs;
      const key = this.keyGenerator(req);

      let entry = this.hits.get(key);
      if (!entry) {
        entry = { timestamps: [] };
        this.hits.set(key, entry);
      }

      // Filter out timestamps outside the active sliding window
      entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);

      const currentCount = entry.timestamps.length;
      const remaining = Math.max(0, this.maxRequests - currentCount);
      const resetTime =
        entry.timestamps.length > 0
          ? Math.ceil((entry.timestamps[0] + this.windowMs - now) / 1000)
          : Math.ceil(this.windowMs / 1000);

      res.setHeader('RateLimit-Limit', this.maxRequests.toString());
      res.setHeader('RateLimit-Remaining', Math.max(0, remaining - 1).toString());
      res.setHeader('RateLimit-Reset', resetTime.toString());

      if (currentCount >= this.maxRequests) {
        res.setHeader('Retry-After', resetTime.toString());
        res.status(429).json({
          success: false,
          error: 'RATE_LIMIT_EXCEEDED',
          message: this.message,
          retryAfter: resetTime,
          timestamp: now,
        });
        return;
      }

      entry.timestamps.push(now);
      next();
    };
  }
}

export const createRateLimiter = (options?: RateLimiterOptions) => {
  const limiter = new SlidingWindowRateLimiter(options);
  return limiter.middleware();
};
