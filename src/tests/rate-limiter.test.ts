import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SlidingWindowRateLimiter } from '../middleware/rate-limiter.middleware';
import { Request, Response } from 'express';

describe('SlidingWindowRateLimiter Middleware', () => {
  let limiter: SlidingWindowRateLimiter;

  beforeEach(() => {
    limiter = new SlidingWindowRateLimiter({
      windowMs: 1000,
      maxRequests: 3,
      message: 'Test rate limit exceeded',
    });
  });

  afterEach(() => {
    limiter.destroy();
  });

  const createMockReqRes = (ip = '192.168.1.100') => {
    const req = {
      ip,
      headers: {},
      socket: { remoteAddress: ip },
    } as unknown as Request;

    const headers: Record<string, string> = {};
    let statusCode = 200;
    let jsonBody: any = null;

    const res = {
      setHeader: vi.fn((key: string, val: string) => {
        headers[key] = val;
      }),
      status: vi.fn((code: number) => {
        statusCode = code;
        return res;
      }),
      json: vi.fn((body: any) => {
        jsonBody = body;
        return res;
      }),
    } as unknown as Response;

    return { req, res, headers, getStatusCode: () => statusCode, getJsonBody: () => jsonBody };
  };

  it('allows requests below the threshold and sets RateLimit headers', () => {
    const middleware = limiter.middleware();
    const nextMock = vi.fn();

    const { req, res, headers } = createMockReqRes();
    middleware(req, res, nextMock);

    expect(nextMock).toHaveBeenCalledTimes(1);
    expect(headers['RateLimit-Limit']).toBe('3');
    expect(headers['RateLimit-Remaining']).toBe('2');
  });

  it('blocks excess requests with HTTP 429 when maxRequests is reached', () => {
    const middleware = limiter.middleware();
    const nextMock = vi.fn();

    // Send 3 allowed requests
    for (let i = 0; i < 3; i++) {
      const { req, res } = createMockReqRes();
      middleware(req, res, nextMock);
    }
    expect(nextMock).toHaveBeenCalledTimes(3);

    // 4th request must be rate limited
    const { req, res, getStatusCode, getJsonBody, headers } = createMockReqRes();
    middleware(req, res, nextMock);

    expect(nextMock).toHaveBeenCalledTimes(3); // Not called again
    expect(getStatusCode()).toBe(429);
    expect(getJsonBody().error).toBe('RATE_LIMIT_EXCEEDED');
    expect(getJsonBody().message).toBe('Test rate limit exceeded');
    expect(headers['Retry-After']).toBeDefined();
  });

  it('differentiates client rate limit windows by IP address', () => {
    const middleware = limiter.middleware();
    const nextMock = vi.fn();

    // Exhaust client A
    for (let i = 0; i < 3; i++) {
      const { req, res } = createMockReqRes('10.0.0.1');
      middleware(req, res, nextMock);
    }

    // Client B should still be allowed
    const { req, res, getStatusCode } = createMockReqRes('10.0.0.2');
    middleware(req, res, nextMock);

    expect(getStatusCode()).toBe(200);
    expect(nextMock).toHaveBeenCalledTimes(4);
  });
});
