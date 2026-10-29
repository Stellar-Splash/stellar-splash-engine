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
});
