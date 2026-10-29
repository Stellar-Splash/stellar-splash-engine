import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { StoreService } from '../src/services/store.service';
import { adminAuthMiddleware } from '../src/middleware/admin-auth.middleware';

describe('adminAuthMiddleware', () => {
  beforeEach(() => {
    StoreService.reset();
  });

  it('allows access when valid x-admin-key header is provided', () => {
    const req = {
      headers: { 'x-admin-key': 'test-secret-123' },
      path: '/api/admin/maintenance',
      method: 'POST',
    } as unknown as Request;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;

    const next = vi.fn() as NextFunction;

    const middleware = adminAuthMiddleware({ customSecret: 'test-secret-123' });
    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows access when Bearer token matches admin secret', () => {
    const req = {
      headers: { authorization: 'Bearer bearer-secret-456' },
      path: '/api/admin/disputes/resolve',
      method: 'POST',
    } as unknown as Request;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;

    const next = vi.fn() as NextFunction;

    const middleware = adminAuthMiddleware({ customSecret: 'bearer-secret-456' });
    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('allows access when x-admin-wallet matches authorized wallet list', () => {
    const req = {
      headers: { 'x-admin-wallet': 'GA2C5RFPE6GCKMY3US5PAB6UZLKIGAHWKXX2GAKVOOUMVQHGASVMOROB' },
      path: '/api/admin/upgrade',
      method: 'POST',
    } as unknown as Request;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;

    const next = vi.fn() as NextFunction;

    const middleware = adminAuthMiddleware();
    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('rejects unauthorized requests with HTTP 403 and records audit log', () => {
    const req = {
      headers: {},
      path: '/api/admin/reconcile',
      method: 'POST',
      ip: '192.168.1.1',
    } as unknown as Request;

    const jsonMock = vi.fn();
    const res = {
      status: vi.fn().mockReturnValue({ json: jsonMock }),
    } as unknown as Response;

    const next = vi.fn() as NextFunction;

    const middleware = adminAuthMiddleware({ customSecret: 'my-super-secret' });
    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'ADMIN_UNAUTHORIZED' }),
      })
    );

    const auditLogs = StoreService.getAuditLogs();
    expect(auditLogs.some((l) => l.eventType === 'ADMIN_AUTH_FAILED')).toBe(true);
  });
});
