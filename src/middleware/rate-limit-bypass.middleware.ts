import { Request, Response, NextFunction } from 'express';

// Extend Express Request interface to include bypass flag
declare global {
  namespace Express {
    interface Request {
      isRateLimitBypassed?: boolean;
    }
  }
}

export interface RateLimitBypassOptions {
  bypassTokens?: string[];
}

/**
 * Middleware evaluating cryptographic bypass tokens for high-throughput
 * background workers and internal relay daemons.
 */
export function rateLimitBypassMiddleware(options: RateLimitBypassOptions = {}) {
  const isProd = process.env.NODE_ENV === 'production';
  const defaultTokens = isProd ? [] : ['relay-daemon-bypass-token-stellar-splash-2026'];
  const envToken = process.env.RATE_LIMIT_BYPASS_TOKEN;
  const authorizedTokens = options.bypassTokens || (envToken ? [envToken] : defaultTokens);

  return (req: Request, _res: Response, next: NextFunction): void => {
    const token = req.headers['x-rate-limit-bypass-token'] as string | undefined;

    if (token && authorizedTokens.includes(token)) {
      req.isRateLimitBypassed = true;
    } else {
      req.isRateLimitBypassed = false;
    }

    next();
  };
}
