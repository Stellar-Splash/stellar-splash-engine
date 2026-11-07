import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { rateLimitBypassMiddleware } from '../src/middleware/rate-limit-bypass.middleware';

describe('rateLimitBypassMiddleware', () => {
  it('sets isRateLimitBypassed = true when valid token is supplied', () => {
    const req = {
      headers: { 'x-rate-limit-bypass-token': 'valid-secret-token-xyz' },
    } as unknown as Request;

    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    const middleware = rateLimitBypassMiddleware({
      bypassTokens: ['valid-secret-token-xyz'],
    });

    middleware(req, res, next);

    expect(req.isRateLimitBypassed).toBe(true);
    expect(next).toHaveBeenCalledOnce();
  });

  it('sets isRateLimitBypassed = false when token is invalid or missing', () => {
    const reqMissing = { headers: {} } as unknown as Request;
    const reqInvalid = {
      headers: { 'x-rate-limit-bypass-token': 'wrong-token' },
    } as unknown as Request;

    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    const middleware = rateLimitBypassMiddleware({
      bypassTokens: ['valid-secret-token-xyz'],
    });

    middleware(reqMissing, res, next);
    expect(reqMissing.isRateLimitBypassed).toBe(false);

    middleware(reqInvalid, res, next);
    expect(reqInvalid.isRateLimitBypassed).toBe(false);
  });

  it('does not allow hardcoded dev bypass token in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.RATE_LIMIT_BYPASS_TOKEN;

      const req = {
        headers: { 'x-rate-limit-bypass-token': 'relay-daemon-bypass-token-stellar-splash-2026' },
      } as unknown as Request;

      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      const middleware = rateLimitBypassMiddleware();
      middleware(req, res, next);

      expect(req.isRateLimitBypassed).toBe(false);
      expect(next).toHaveBeenCalledOnce();
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
