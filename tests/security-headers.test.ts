import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { securityHeadersMiddleware } from '../src/middleware/security-headers.middleware';

describe('securityHeadersMiddleware', () => {
  it('sets standard OWASP security headers on outbound responses', () => {
    const headers: Record<string, string> = {};
    const req = {} as Request;
    const res = {
      setHeader: vi.fn((key: string, val: string) => {
        headers[key.toLowerCase()] = val;
      }),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;

    const middleware = securityHeadersMiddleware();
    middleware(req, res, next);

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['strict-transport-security']).toContain('max-age=31536000');
    expect(headers['content-security-policy']).toBe("default-src 'self'; frame-ancestors 'none';");
    expect(next).toHaveBeenCalledOnce();
  });

  it('respects configuration flags for disabling specific headers', () => {
    const headers: Record<string, string> = {};
    const req = {} as Request;
    const res = {
      setHeader: vi.fn((key: string, val: string) => {
        headers[key.toLowerCase()] = val;
      }),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;

    const middleware = securityHeadersMiddleware({
      enableHsts: false,
      enableCsp: false,
      enableFrameGuard: false,
    });
    middleware(req, res, next);

    expect(headers['x-frame-options']).toBeUndefined();
    expect(headers['strict-transport-security']).toBeUndefined();
    expect(headers['content-security-policy']).toBeUndefined();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(next).toHaveBeenCalledOnce();
  });
});
